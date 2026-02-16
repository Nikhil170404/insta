import { Redis } from "@upstash/redis";

// Use Upstash Redis for production-ready caching (survives serverless cold starts)
let redis: Redis | null = null;

function getRedis(): Redis | null {
    if (redis) return redis;

    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        console.warn("⚠️ Upstash Redis not configured - caching disabled");
        return null;
    }

    redis = new Redis({ url, token });
    return redis;
}

// Fallback in-memory cache for development
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();
const DEFAULT_TTL = 300; // 5 minutes in seconds

/**
 * Get cached item from Redis (or memory fallback)
 */
export async function getCached<T>(key: string): Promise<T | null> {
    const client = getRedis();

    if (client) {
        try {
            const data = await client.get<T>(key);
            return data;
        } catch (error) {
            console.error("Redis GET error:", error);
            return null;
        }
    }

    // Memory fallback for development
    const entry = memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
        memoryCache.delete(key);
        return null;
    }
    return entry.data as T;
}

/**
 * Set cached item in Redis (or memory fallback)
 */
export async function setCached<T>(key: string, data: T, ttlSeconds = DEFAULT_TTL): Promise<void> {
    const client = getRedis();

    if (client) {
        try {
            await client.setex(key, ttlSeconds, JSON.stringify(data));
            return;
        } catch (error) {
            console.error("Redis SET error:", error);
        }
    }

    // Memory fallback for development
    memoryCache.set(key, {
        data,
        expiresAt: Date.now() + (ttlSeconds * 1000)
    });

    // Size management: Clear oldest if cache grows too large (> 1000 items)
    if (memoryCache.size > 1000) {
        const firstKey = memoryCache.keys().next().value;
        if (firstKey) memoryCache.delete(firstKey);
    }
}

/**
 * Delete cached item
 */
export async function deleteCached(key: string): Promise<void> {
    const client = getRedis();

    if (client) {
        try {
            await client.del(key);
        } catch (error) {
            console.error("Redis DEL error:", error);
        }
    }

    memoryCache.delete(key);
}

// User-specific cache helpers
export interface CachedUser {
    id: string;
    instagram_access_token: string;
    instagram_user_id: string;
    instagram_username?: string;
    plan_type: string;
}

export const getCachedUser = (id: string) => getCached<CachedUser>(`user:${id}`);
export const setCachedUser = (id: string, data: CachedUser) => setCached(`user:${id}`, data);
export const clearUserCache = (id: string) => deleteCached(`user:${id}`);

// Automation-specific cache helpers
export interface CachedAutomation {
    id: string;
    user_id: string;
    media_id: string;
    trigger_keyword?: string;
    trigger_type: string;
    reply_message: string;
    comment_reply?: string;
    comment_reply_templates?: string[];
    button_text?: string;
    link_url?: string;
    require_follow: boolean;
    is_active: boolean;
    media_thumbnail_url?: string;
    follow_gate_message?: string;
    final_message?: string;
    final_button_text?: string;
    created_at: string;
}

export const getCachedAutomation = (key: string) => getCached<CachedAutomation>(key);
export const setCachedAutomation = (key: string, data: CachedAutomation) => setCached(key, data);
export const clearAutomationCache = (key: string) => deleteCached(key);
