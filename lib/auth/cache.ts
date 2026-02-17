
import { logger } from "@/lib/logger";

export async function invalidateSessionCache(userId: string) {
    if (!userId) return;

    const cacheKey = `session_user:${userId}`;

    try {
        // @ts-ignore
        const { Redis: redisInstance } = await import("@/lib/redis") as any;
        const redis = redisInstance;

        if (redis) {
            await (redis as any).del(cacheKey);
            logger.info("Invalidated session cache", { userId, category: "auth" });
        }
    } catch (error) {
        logger.error("Failed to invalidate session cache", { userId, category: "auth" }, error as Error);
    }
}
