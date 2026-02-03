import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { AppError, RateLimitError, formatErrorResponse, getErrorStatusCode } from "./errors";
import logger from "./logger";

// Types
interface RateLimiterConfig {
    prefix: string;
    limiter: Ratelimit | null;
}

interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

// Initialize Redis connection
let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        logger.warn("Rate limiting disabled - Upstash Redis not configured");
        return null;
    }

    redis = new Redis({ url, token });
    return redis;
}

// Pre-configured rate limiters
const rateLimiters: Record<string, RateLimiterConfig> = {
    // Auth endpoints - strict limit
    auth: {
        prefix: "ratelimit:auth",
        limiter: null,
    },
    // General API endpoints
    api: {
        prefix: "ratelimit:api",
        limiter: null,
    },
    // Analytics - lighter load expected
    analytics: {
        prefix: "ratelimit:analytics",
        limiter: null,
    },
    // Automations CRUD
    automations: {
        prefix: "ratelimit:automations",
        limiter: null,
    },
};

// Initialize limiters lazily
function getOrCreateLimiter(type: keyof typeof rateLimiters): Ratelimit | null {
    const config = rateLimiters[type];
    if (config.limiter) return config.limiter;

    const redisClient = getRedis();
    if (!redisClient) return null;

    // Different limits for different endpoint types
    const limits: Record<string, { requests: number; window: `${number} ${"s" | "m" | "h" | "d"}` }> = {
        auth: { requests: 10, window: "1 m" },
        api: { requests: 100, window: "1 m" },
        analytics: { requests: 30, window: "1 m" },
        automations: { requests: 60, window: "1 m" },
    };

    const limit = limits[type] || limits.api;

    config.limiter = new Ratelimit({
        redis: redisClient,
        limiter: Ratelimit.slidingWindow(limit.requests, limit.window),
        prefix: config.prefix,
        analytics: true,
    });

    return config.limiter;
}

/**
 * Check rate limit for a given identifier
 */
export async function checkRateLimit(
    type: keyof typeof rateLimiters,
    identifier: string
): Promise<RateLimitResult> {
    const limiter = getOrCreateLimiter(type);

    // If no limiter available, allow request
    if (!limiter) {
        return {
            success: true,
            limit: -1,
            remaining: -1,
            reset: Date.now(),
        };
    }

    try {
        const result = await limiter.limit(identifier);

        return {
            success: result.success,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
        };
    } catch (error) {
        // On error, allow request (fail open)
        logger.error("Rate limit check failed", { type, identifier }, error as Error);
        return {
            success: true,
            limit: -1,
            remaining: -1,
            reset: Date.now(),
        };
    }
}

/**
 * Extract rate limit identifier from request
 * Uses session user ID if available, falls back to IP
 */
export function getRateLimitIdentifier(request: NextRequest, userId?: string): string {
    if (userId) {
        return `user:${userId}`;
    }

    // Try to get real IP from various headers
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");

    const ip = forwarded?.split(",")[0].trim() ||
        realIp ||
        "unknown";

    return `ip:${ip}`;
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
    response: NextResponse,
    result: RateLimitResult
): NextResponse {
    if (result.limit > 0) {
        response.headers.set("X-RateLimit-Limit", result.limit.toString());
        response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
        response.headers.set("X-RateLimit-Reset", result.reset.toString());
    }
    return response;
}

/**
 * Rate limit middleware for API routes
 * Use in API route handlers
 */
export async function withRateLimit<T>(
    request: NextRequest,
    type: keyof typeof rateLimiters,
    userId: string | undefined,
    handler: () => Promise<T>
): Promise<T | NextResponse> {
    const identifier = getRateLimitIdentifier(request, userId);
    const result = await checkRateLimit(type, identifier);

    if (!result.success) {
        const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

        logger.warn("Rate limit exceeded", {
            type,
            identifier,
            retryAfter,
        });

        const response = NextResponse.json(
            formatErrorResponse(new RateLimitError("Rate limit exceeded", retryAfter)),
            { status: 429 }
        );

        response.headers.set("Retry-After", retryAfter.toString());
        return addRateLimitHeaders(response, result);
    }

    return handler();
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 */
export function createRateLimitedHandler(
    type: keyof typeof rateLimiters,
    getUserId: (request: NextRequest) => string | undefined
) {
    return function <T>(
        handler: (request: NextRequest) => Promise<NextResponse<T>>
    ) {
        return async (request: NextRequest): Promise<NextResponse> => {
            const userId = getUserId(request);
            const identifier = getRateLimitIdentifier(request, userId);
            const result = await checkRateLimit(type, identifier);

            if (!result.success) {
                const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

                const response = NextResponse.json(
                    formatErrorResponse(new RateLimitError("Rate limit exceeded", retryAfter)),
                    { status: 429 }
                );

                response.headers.set("Retry-After", retryAfter.toString());
                return addRateLimitHeaders(response, result);
            }

            const response = await handler(request);
            return addRateLimitHeaders(response, result);
        };
    };
}

export type { RateLimitResult };
