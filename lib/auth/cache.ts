
import { getSession } from "./session";

export async function invalidateSessionCache(userId: string) {
    if (!userId) return;

    const cacheKey = `session_user:${userId}`;

    try {
        // @ts-ignore
        const { Redis: redisInstance } = await import("@/lib/redis") as any;
        const redis = redisInstance;

        if (redis) {
            await (redis as any).del(cacheKey);
            console.log(`Invalidated session cache for user: ${userId}`);
        }
    } catch (error) {
        console.error("Failed to invalidate session cache:", error);
    }
}
