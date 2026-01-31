import { Redis } from '@upstash/redis';

// Initialize Redis only if environment variables are present
const redis = (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    : null;

const CACHE_TTL = 300; // 5 minutes

/**
 * Get cached user data
 */
export async function getCachedUser(instagramUserId: string) {
    if (!redis) return null;
    try {
        const cached = await redis.get(`user:${instagramUserId}`);
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch (error) {
        console.error("Cache get error (user):", error);
        return null;
    }
}

/**
 * Cache user data
 */
export async function setCachedUser(instagramUserId: string, userData: any) {
    if (!redis) return;
    try {
        await redis.set(`user:${instagramUserId}`, JSON.stringify(userData), { ex: CACHE_TTL });
    } catch (error) {
        console.error("Cache set error (user):", error);
    }
}

/**
 * Get cached automation rules
 */
export async function getCachedAutomation(cacheKey: string) {
    if (!redis) return null;
    try {
        const cached = await redis.get(cacheKey);
        return typeof cached === 'string' ? JSON.parse(cached) : cached;
    } catch (error) {
        console.error("Cache get error (automation):", error);
        return null;
    }
}

/**
 * Cache automation rules
 */
export async function setCachedAutomation(cacheKey: string, automation: any) {
    if (!redis) return;
    try {
        await redis.set(cacheKey, JSON.stringify(automation), { ex: CACHE_TTL });
    } catch (error) {
        console.error("Cache set error (automation):", error);
    }
}

/**
 * Clear user cache
 */
export async function clearUserCache(instagramUserId: string) {
    if (!redis) return;
    try {
        await redis.del(`user:${instagramUserId}`);
    } catch (error) {
        console.error("Cache clear error:", error);
    }
}
