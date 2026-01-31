// In-memory cache with TTL support for Free Tier endurance
const cache = new Map<string, { data: any; expiresAt: number }>();

const CACHE_TTL = 300 * 1000; // 5 minutes in ms

/**
 * Get cached item
 */
export async function getCached(key: string) {
    const entry = cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

/**
 * Set cached item
 */
export async function setCached(key: string, data: any, ttl = CACHE_TTL) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttl
    });

    // Size management: Clear oldest if cache grows too large (> 1000 items)
    if (cache.size > 1000) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
    }
}

export const getCachedUser = (id: string) => getCached(`user:${id}`);
export const setCachedUser = (id: string, data: any) => setCached(`user:${id}`, data);

export const getCachedAutomation = (id: string) => getCached(`auto:${id}`);
export const setCachedAutomation = (id: string, data: any) => setCached(`auto:${id}`, data);

export const clearUserCache = (id: string) => cache.delete(`user:${id}`);
