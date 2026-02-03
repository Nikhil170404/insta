import { getSupabaseAdmin } from "./supabase/client";
import { getPlanLimits } from "./pricing";
import { logger } from "./logger";

/**
 * Instagram API Rate Limits (2025):
 * - 200 API calls per hour per user
 * - 4,800 API calls per day per user
 * 
 * Our Smart Limits (High-Speed & Safe):
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
        hourlyLimit: 200,
        monthlyLimit: 1000, // Default to free tier
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

    // Check current usage
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Count DMs sent in current windows
    const { count: hourlyCount } = await (supabase as any)
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("reply_sent", true)
        .gte("created_at", hourStart.toISOString());

    const { count: monthlyCount } = await (supabase as any)
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("reply_sent", true)
        .gte("created_at", monthStart.toISOString());

    const hourlyUsed = hourlyCount || 0;
    const monthlyUsed = monthlyCount || 0;

    const hourlyRemaining = Math.max(0, config.hourlyLimit - hourlyUsed);
    const monthlyRemaining = Math.max(0, config.monthlyLimit - monthlyUsed);

    // Check if allowed
    const allowed = hourlyRemaining > 0 && monthlyRemaining > 0;

    if (!allowed) {
        // Calculate when next slot available
        const nextSlot =
            hourlyRemaining === 0
                ? new Date(hourStart.getTime() + 60 * 60 * 1000)
                : new Date(monthStart.getTime() + 30 * 24 * 60 * 60 * 1000); // Next month approx

        return {
            allowed: false,
            estimatedSendTime: nextSlot,
            remaining: {
                hourly: hourlyRemaining,
                monthly: monthlyRemaining,
            },
        };
    }

    // If spreading enabled, add small delay to avoid "burst" spam
    if (config.spreadDelay && hourlyUsed > 0) {
        // Spread limits over 60 minutes
        const delaySeconds = Math.floor((60 * 60) / config.hourlyLimit);
        const estimatedSendTime = new Date(now.getTime() + delaySeconds * 1000);

        return {
            allowed: true,
            queuePosition: hourlyUsed + 1,
            estimatedSendTime,
            remaining: {
                hourly: hourlyRemaining,
                monthly: monthlyRemaining,
            },
        };
    }

    return {
        allowed: true,
        remaining: {
            hourly: hourlyRemaining,
            monthly: monthlyRemaining,
        },
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

    // 1. Fetch Processable DMs
    // Join with users and automations
    const { data: queuedDMs, error } = await (supabase as any)
        .from("dm_queue")
        .select(`
      *,
      users (id, plan_type, instagram_access_token, instagram_user_id),
      automations (button_text, link_url, media_thumbnail_url)
    `)
        .eq("status", "pending")
        .lte("scheduled_send_at", now.toISOString())
        .order("priority", { ascending: false }) // Process High Priority First
        .order("scheduled_send_at", { ascending: true })
        .limit(200); // Fetch sizeable batch

    if (error) {
        logger.error("Error fetching queue", { category: "rate-limiter" }, error);
        return;
    }

    if (!queuedDMs || queuedDMs.length === 0) return;

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

        // B. Check Counters (Hourly & Monthly)
        // Hourly Window
        const hourStart = new Date();
        hourStart.setMinutes(0, 0, 0);

        // Monthly Window
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { count: hourlyCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("reply_sent", true)
            .gte("created_at", hourStart.toISOString());

        const { count: monthlyCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("reply_sent", true)
            .gte("created_at", monthStart.toISOString());

        const currentHourly = hourlyCount || 0;
        const currentMonthly = monthlyCount || 0;

        const hourlyLimit = limits.dmsPerHour || 200;
        const monthlyLimit = limits.dmsPerMonth || 1000;

        // C. Calculate Availability
        const hourlySlots = Math.max(0, hourlyLimit - currentHourly);
        const monthlySlots = Math.max(0, monthlyLimit - currentMonthly);

        // Strict available is min of both
        const availableSlots = Math.min(hourlySlots, monthlySlots);

        // D. Split into "Send Now" and "Reschedule"
        const dmsToSend = userDMs.slice(0, availableSlots);
        const dmsToReschedule = userDMs.slice(availableSlots);

        // E. Reschedule Excess DMs (The "Brutal" Part)
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
                const nextHour = new Date(hourStart);
                nextHour.setHours(nextHour.getHours() + 1);
                // Add jitter to avoid thundering herd at top of hour
                const jitterMinutes = Math.floor(Math.random() * 10);
                nextHour.setMinutes(jitterMinutes);
                nextAvailableTime = nextHour;
                logger.warn("User hit HOURLY limit during queue processing", { userId, rescheduleCount: dmsToReschedule.length, nextAvailableTime: nextAvailableTime.toISOString(), category: "rate-limiter" });
            }

            // Bulk Update Rescheduled DMs
            const idsToReschedule = dmsToReschedule.map((d: any) => d.id);
            await (supabase as any)
                .from("dm_queue")
                .update({
                    scheduled_send_at: nextAvailableTime.toISOString(),
                    priority: limits.priorityQueue ? 10 : 5 // Bump priority for delayed items? Maybe keep same.
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
                        dm.automations.media_thumbnail_url
                    );

                    if (dmSent) {
                        await incrementAutomationCount(supabase, dm.automation_id, "dm_sent_count");
                        // ATOMIC CLAIM FIX: Check if we already have a placeholder log for this comment
                        // If so, update it to "success" instead of creating a duplicate
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
                                keyword_matched: "QUEUED", // Mark as queued so user knows
                                comment_text: "Processed from queue",
                            }).eq("id", existingLog.id);
                        } else {
                            // Fallback: Insert new if no placeholder (e.g. strict mode or missed claim)
                            await (supabase as any).from("dm_logs").insert({
                                user_id: dm.user_id,
                                instagram_comment_id: dm.instagram_comment_id,
                                instagram_user_id: dm.instagram_user_id,
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
                    // Mark failed, but maybe retry logic could go here later
                    await (supabase as any).from("dm_queue").update({ status: "failed", error_message: (error as Error).message }).eq("id", dm.id);
                    await incrementAutomationCount(supabase, dm.automation_id, "dm_failed_count");
                }
            }));
        }
    });

    await Promise.allSettled(userPromises);
    logger.info("Queue Processing Complete", { category: "rate-limiter" });
}
