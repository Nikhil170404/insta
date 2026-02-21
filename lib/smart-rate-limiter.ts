import { getSupabaseAdmin } from "./supabase/client";
import { getPlanLimits } from "./pricing";
import { logger } from "./logger";

/**
 * Rate Limiting Strategy:
 *
 * Meta Platform Rate Limits (external):
 * - ~200 API calls per hour per user (via X-Business-Use-Case-Usage header)
 * - Monitored automatically via parseMetaRateLimitHeaders() in service.ts
 *
 * Our Internal Application Limits (this file):
 * - Hourly speed limit (plan-based): controls burst speed
 * - Monthly quota (plan-based): total DMs allowed per billing cycle
 * - These are INTERNAL limits; Meta's own throttling is handled separately
 */

let upstashLimiter: any = null;

async function getUpstashLimiter() {
    if (upstashLimiter) return upstashLimiter;
    try {
        const { createRateLimiter } = await import("./upstash");
        upstashLimiter = createRateLimiter;
        return upstashLimiter;
    } catch (e) {
        return null;
    }
}

export interface RateLimitConfig {
    hourlyLimit: number;
    monthlyLimit: number; // monthly limit
    spreadDelay: boolean; // Spread DMs over time
}

export async function smartRateLimit(
    userId: string,
    config: RateLimitConfig = {
        hourlyLimit: 190,
        monthlyLimit: 1000,
        spreadDelay: true,
    }
): Promise<{
    allowed: boolean;
    queuePosition?: number;
    estimatedSendTime?: Date;
    remaining: { hourly: number; monthly: number };
}> {
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // 1. Monthly Check (Read-Only Sum)
    // We check this first to avoid incrementing hourly if monthly is already blocked
    const monthStart = new Date(now);
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const { data: monthlyData, error: monthlyError } = await (supabase as any)
        .from("rate_limits")
        .select("dm_count")
        .eq("user_id", userId)
        .gte("hour_bucket", monthStart.toISOString());

    const monthlyUsed = monthlyData?.reduce((sum: number, row: any) => sum + (row.dm_count || 0), 0) || 0;
    const monthlyRemaining = Math.max(0, config.monthlyLimit - monthlyUsed);

    if (monthlyRemaining <= 0) {
        return {
            allowed: false,
            estimatedSendTime: new Date(monthStart.getTime() + 30 * 24 * 60 * 60 * 1000), // Next month approx
            remaining: { hourly: 0, monthly: 0 }
        };
    }

    // 2. Hourly Check (Atomic Increment)
    // We use the RPC to atomically increment and check the result
    // This prevents race conditions where 2 requests see "199" and both send
    const { data: newHourlyCount, error: rpcError } = await (supabase as any)
        .rpc("increment_rate_limit", { p_user_id: userId });

    if (rpcError) {
        logger.error("Rate limit RPC failed", { userId, error: rpcError, category: "rate-limiter" });
        // Fail open or closed? Closed (queue it) is safer for rate limits.
        return {
            allowed: false,
            remaining: { hourly: 0, monthly: monthlyRemaining }
        };
    }

    const hourlyUsed = newHourlyCount as number;
    const hourlyRemaining = Math.max(0, config.hourlyLimit - hourlyUsed);

    // 3. Logic Check
    if (hourlyUsed > config.hourlyLimit) {
        // The increment pushed us over the limit (Phantom Increment).
        // Rollback the increment to keep counts accurate.
        const { error: decrementError } = await (supabase as any)
            .rpc("decrement_rate_limit", { p_user_id: userId });

        if (decrementError) {
            logger.error("Decrement rollback failed", { userId, error: decrementError, category: "rate-limiter" });
        }

        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);

        return {
            allowed: false,
            estimatedSendTime: new Date(hourStart.getTime() + 60 * 60 * 1000), // Next hour
            remaining: { hourly: 0, monthly: monthlyRemaining }
        };
    }

    // 4. Spread Delay (optional)
    if (config.spreadDelay && hourlyUsed > 1) {
        const delaySeconds = Math.floor((60 * 60) / config.hourlyLimit);
        const estimatedSendTime = new Date(now.getTime() + delaySeconds * 1000);

        return {
            allowed: true,
            queuePosition: hourlyUsed,
            estimatedSendTime,
            remaining: { hourly: hourlyRemaining, monthly: monthlyRemaining }
        };
    }

    return {
        allowed: true,
        remaining: { hourly: hourlyRemaining, monthly: monthlyRemaining }
    };
}

/**
 * Queue a DM for later sending
 */
export async function queueDM(
    userId: string,
    dmData: {
        commentId: string;
        commenterId: string;
        message: string;
        automation_id: string;
    },
    sendAt: Date,
    priority: number = 5
) {
    const supabase = getSupabaseAdmin();

    const { error } = await (supabase as any).from("dm_queue").insert({
        user_id: userId,
        instagram_comment_id: dmData.commentId,
        instagram_user_id: dmData.commenterId,
        message: dmData.message,
        automation_id: dmData.automation_id,
        scheduled_send_at: sendAt.toISOString(),
        status: "pending",
        priority: priority,
    });

    if (error) {
        logger.error("Failed to queue DM", { category: "rate-limiter" }, error);
        throw error;
    }

    logger.info("DM queued", { sendAt: sendAt.toISOString(), category: "rate-limiter" });
}

/**
 * Process pending DMs in the queue
 * - Handles rate limits "brutally" like ManyChat
 * - Reschedules excess queue items to next hour/month
 * - Prioritizes sending based on user plan
 */
import { sendInstagramDM, incrementAutomationCount } from "./instagram/service";

export async function processQueuedDMs() {
    const supabase = getSupabaseAdmin();
    const now = new Date();

    logger.info("Default Cron Processing Started", { category: "rate-limiter" });

    // 1. Fetch Processable DMs ATOMICALLY to prevent Race Conditions
    // We cannot just SELECT here, because two simultaneous crons would fetch the same rows.
    // We must UPDATE their status to 'processing' atomically and return them.
    // Note: Supabase JS doesn't have a direct UPDATE ... LIMIT RETURNING.
    // Instead of raw RPC, we first fetch ID candidates, then attempt to atomically lock them.
    const { data: candidates, error: candidateError } = await (supabase as any)
        .from("dm_queue")
        .select("id")
        .eq("status", "pending")
        .lte("scheduled_send_at", now.toISOString())
        .order("priority", { ascending: false }) // Process High Priority First
        .order("scheduled_send_at", { ascending: true })
        .limit(200); // Fetch sizeable batch

    if (candidateError) {
        logger.error("Error fetching queue candidates", { category: "rate-limiter" }, candidateError);
        return;
    }

    if (!candidates || candidates.length === 0) return;

    // ATOMIC LOCK: Only rows that are CURRENTLY "pending" get updated to "processing"
    const idsToLock = candidates.map((c: any) => c.id);
    const { data: queuedDMs, error } = await (supabase as any)
        .from("dm_queue")
        .update({ status: "processing" })
        .eq("status", "pending") // Strict condition: must still be pending
        .in("id", idsToLock)
        .select(`
      *,
      users (id, plan_type, instagram_access_token, instagram_user_id),
      automations (button_text, link_url, media_thumbnail_url)
    `);

    if (error) {
        logger.error("Error securing atomic lock on queue", { category: "rate-limiter" }, error);
        return;
    }

    if (!queuedDMs || queuedDMs.length === 0) {
        logger.info("Cron: Another process already claimed the queue batch", { category: "rate-limiter" });
        return;
    }

    logger.info("Processing queued DMs in PARALLEL", { count: queuedDMs.length, category: "rate-limiter" });

    // 2. Group DMs by User for Bulk Limit Checking
    const userGroups: { [key: string]: typeof queuedDMs } = {};
    queuedDMs.forEach((dm: any) => {
        if (!userGroups[dm.user_id]) userGroups[dm.user_id] = [];
        userGroups[dm.user_id].push(dm);
    });

    // 3. Process Each User Group
    const userPromises = Object.keys(userGroups).map(async (userId) => {
        const userDMs = userGroups[userId];
        const user = userDMs[0].users; // User data is same for all

        // A. Determine Limits based on User Plan
        const planType = user.plan_type || "free";
        const limits = getPlanLimits(planType);

        // B. Check Counters (Optimized: Rate Limits Table)

        // Monthly Window (Read-Only Sum)
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);

        const { data: monthlyData } = await (supabase as any)
            .from("rate_limits")
            .select("dm_count")
            .eq("user_id", userId)
            .gte("hour_bucket", monthStart.toISOString());

        const monthlyUsed = monthlyData?.reduce((sum: number, row: any) => sum + (row.dm_count || 0), 0) || 0;

        // Hourly Window (Read-Only RPC)
        const { data: hourlyUsedData } = await (supabase as any)
            .rpc("get_rate_limit", { p_user_id: userId });

        const hourlyUsed = (hourlyUsedData as number) || 0;

        const hourlyLimit = limits.dmsPerHour || 200;
        const monthlyLimit = limits.dmsPerMonth || 1000;

        // C. Calculate Availability
        const hourlySlots = Math.max(0, hourlyLimit - hourlyUsed);
        const monthlySlots = Math.max(0, monthlyLimit - monthlyUsed);

        // Strict available is min of both
        const availableSlots = Math.min(hourlySlots, monthlySlots);

        // D. Split into "Send Now" and "Reschedule"
        const dmsToSend = userDMs.slice(0, availableSlots);
        const dmsToReschedule = userDMs.slice(availableSlots);

        // E. Reschedule Excess DMs
        if (dmsToReschedule.length > 0) {
            let nextAvailableTime: Date;

            if (monthlySlots <= 0) {
                // Reschedule to next month
                const nextMonth = new Date(monthStart);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                nextAvailableTime = nextMonth;
                logger.warn("User hit MONTHLY limit during queue processing", { userId, rescheduleCount: dmsToReschedule.length, nextAvailableTime: nextAvailableTime.toISOString(), category: "rate-limiter" });
            } else {
                // Reschedule to next hour
                const hourStart = new Date();
                hourStart.setMinutes(0, 0, 0);
                const nextHour = new Date(hourStart);
                nextHour.setHours(nextHour.getHours() + 1);
                // Add jitter
                const jitterMinutes = Math.floor(Math.random() * 10);
                nextHour.setMinutes(jitterMinutes);
                nextAvailableTime = nextHour;
                logger.warn("User hit HOURLY limit during queue processing", { userId, rescheduleCount: dmsToReschedule.length, nextAvailableTime: nextAvailableTime.toISOString(), category: "rate-limiter" });
            }

            // Bulk Update Rescheduled DMs (from 'processing' back to 'pending' + delay)
            const idsToReschedule = dmsToReschedule.map((d: any) => d.id);
            await (supabase as any)
                .from("dm_queue")
                .update({
                    status: "pending", // Unlock them for the future
                    scheduled_send_at: nextAvailableTime.toISOString(),
                    priority: limits.priorityQueue ? 10 : 5
                })
                .in("id", idsToReschedule);
        }

        // F. Send Allowed DMs
        if (dmsToSend.length > 0) {
            logger.info("Sending queued DMs", { userId, count: dmsToSend.length, planType, category: "rate-limiter" });

            await Promise.allSettled(dmsToSend.map(async (dm: any) => {
                try {
                    const dmSent = await sendInstagramDM(
                        dm.users.instagram_access_token,
                        dm.users.instagram_user_id,
                        dm.instagram_comment_id,
                        dm.instagram_user_id,
                        dm.message,
                        dm.automation_id,
                        dm.automations.button_text,
                        dm.automations.link_url,
                        dm.automations.link_url ? dm.automations.media_thumbnail_url : undefined
                    );

                    if (dmSent) {
                        // CRITICAL: Atomically increment rate limit after successful send
                        // This ensures the rate_limits table stays in sync with actual sends
                        await (supabase as any).rpc("increment_rate_limit", { p_user_id: dm.user_id });

                        await incrementAutomationCount(supabase, dm.automation_id, "dm_sent_count");

                        // ATOMIC CLAIM FIX: Check placeholder logs
                        let existingLog = null;
                        if (dm.instagram_comment_id) {
                            const { data } = await (supabase as any)
                                .from("dm_logs")
                                .select("id")
                                .eq("user_id", dm.user_id)
                                .eq("instagram_comment_id", dm.instagram_comment_id)
                                .maybeSingle();
                            existingLog = data;
                        }

                        if (existingLog) {
                            await (supabase as any).from("dm_logs").update({
                                reply_sent: true,
                                reply_sent_at: new Date().toISOString(),
                                keyword_matched: "QUEUED",
                                comment_text: "Processed from queue",
                            }).eq("id", existingLog.id);
                        } else {
                            await (supabase as any).from("dm_logs").insert({
                                user_id: dm.user_id,
                                instagram_comment_id: dm.instagram_comment_id,
                                instagram_user_id: dm.instagram_user_id,
                                instagram_username: dm.instagram_username || null,
                                automation_id: dm.automation_id,
                                keyword_matched: "QUEUED",
                                comment_text: "Processed from queue",
                                reply_sent: true,
                                reply_sent_at: new Date().toISOString(),
                            });
                        }
                        await (supabase as any).from("dm_queue").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", dm.id);
                    } else {
                        throw new Error("DM delivery failed");
                    }
                } catch (error) {
                    logger.error("Failed to send queued DM", { dmId: dm.id, category: "rate-limiter" }, error as Error);
                    await (supabase as any).from("dm_queue").update({ status: "failed", error_message: (error as Error).message }).eq("id", dm.id);
                    await incrementAutomationCount(supabase, dm.automation_id, "dm_failed_count");
                }
            }));
        }
    });

    await Promise.allSettled(userPromises);
    logger.info("Queue Processing Complete", { category: "rate-limiter" });
}


