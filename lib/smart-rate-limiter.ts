import { getSupabaseAdmin } from "./supabase/client";
import { getPlanLimits } from "./pricing";
import { logger } from "./logger";

/**
 * Rate Limiting Strategy:
 *
 * META_RATE_LIMITS (Actual Meta Platform Limits):
 * - Platform Rate Limit (app token): 200 * DAU / rolling 1hr (Per app)
 * - Instagram BUC (content APIs): 4,800 * Impressions / 24hr (Per app+user pair)
 * - Send API (DMs - text/links/stickers): 100 calls/second (Per IG pro account)
 * - Send API (DMs - audio/video): 10 calls/second (Per IG pro account)
 * - Private Replies API (posts/reels comments): 750 calls/HOUR (Per IG pro account)
 * - Private Replies API (Live comments): 100 calls/second (Per IG pro account)
 * - Conversations API: 2 calls/second (Per IG pro account)
 * 
 * Our Internal Application Limits (this file):
 * - Hourly speed limit (plan-based): controls burst speed, safely beneath Meta's 750/hr limit.
 * - Monthly quota (plan-based): total DMs allowed per billing cycle.
 * - These are INTERNAL limits; Meta's own throttling is handled separately.
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
    },
    userCreatedDate?: string | Date // New: For Layer 6 Warm-up
): Promise<{
    allowed: boolean;
    queuePosition?: number;
    estimatedSendTime?: Date;
    remaining: { hourly: number; monthly: number };
}> {
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // ==========================================
    // ANTI-BAN ENGINE V2 (SaaS LEVEL)
    // ==========================================
    let effectiveHourlyLimit = config.hourlyLimit;

    // LAYER 6: Account Warm-up (Tenure Ramp)
    if (userCreatedDate) {
        const created = new Date(userCreatedDate);
        const daysOld = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

        if (daysOld < 3) {
            effectiveHourlyLimit *= 0.15; // 15% speed for newborns
        } else if (daysOld < 7) {
            effectiveHourlyLimit *= 0.40; // 40% speed for week 1
        } else if (daysOld < 14) {
            effectiveHourlyLimit *= 0.70; // 70% speed for week 2
        }
    }

    // LAYER 7: Behavior Mimicry (Circadian Diurnal Cycles)
    const hour = now.getUTCHours();
    let mimicryMultiplier = 1.0;

    if (hour >= 0 && hour <= 4) {
        mimicryMultiplier = 0.40; // Deep night: 40% speed
    } else if (hour === 5 || hour === 23) {
        mimicryMultiplier = 0.70; // Transition: 70% speed
    } else if (hour >= 17 && hour <= 21) {
        mimicryMultiplier = 1.10; // Peak hours: 10% boost (Meta allows slightly more session burst in evening)
    }

    effectiveHourlyLimit *= mimicryMultiplier;

    // LAYER 5: Trust Factor Placeholder
    // TODO: In future, multiply effectiveHourlyLimit by trustScore/100

    // Final safety floor (cannot be less than 1/hr if plan allows any)
    effectiveHourlyLimit = Math.max(1, Math.floor(effectiveHourlyLimit));

    if (effectiveHourlyLimit < config.hourlyLimit) {
        logger.debug("[Anti-Ban] Effective limit adjusted", {
            userId,
            original: config.hourlyLimit,
            effective: effectiveHourlyLimit,
            reason: mimicryMultiplier < 1 ? "Slow Period Active" : "Warm-up Active"
        });
    }

    // 1. Monthly Check... (remaining logic uses effectiveHourlyLimit)
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
    const { data: newHourlyCount, error: rpcError } = await (supabase as any)
        .rpc("increment_rate_limit", { p_user_id: userId });

    if (rpcError) {
        logger.error("Rate limit RPC failed", { userId, error: rpcError, category: "rate-limiter" });
        return {
            allowed: false,
            remaining: { hourly: 0, monthly: monthlyRemaining }
        };
    }

    const hourlyUsed = newHourlyCount as number;
    const hourlyRemaining = Math.max(0, effectiveHourlyLimit - hourlyUsed);

    // 3. Logic Check
    if (hourlyUsed > effectiveHourlyLimit) {
        // Rollback
        await (supabase as any).rpc("decrement_rate_limit", { p_user_id: userId });

        const hourStart = new Date(now);
        hourStart.setMinutes(0, 0, 0);

        return {
            allowed: false,
            estimatedSendTime: new Date(hourStart.getTime() + 60 * 60 * 1000), // Next hour
            remaining: { hourly: 0, monthly: monthlyRemaining }
        };
    }

    // 4. Spread Delay
    if (config.spreadDelay && hourlyUsed > 1) {
        const delaySeconds = Math.floor((60 * 60) / effectiveHourlyLimit);
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
 * Helper to generate a non-uniform random delay (mimicking human memory/busy-ness)
 * 60% chance: 30-90s (Normal response)
 * 30% chance: 90-300s (Delayed/Distracted response)
 * 10% chance: 300-600s (Slow response)
 */
function getNonUniformDelay(): number {
    const roll = Math.random();
    // User tuned: 10-30s (Avg 18s)
    if (roll < 0.6) return Math.floor(Math.random() * 9) + 10; // 10-18s (Avg 14)
    return Math.floor(Math.random() * 13) + 18; // 18-30s (Avg 24)
}

/**
 * Queue a DM for later sending with a mandatory human-like delay
 * 
 * PRO SAAS SAFETY (Level 9.5/10):
 * - Non-uniform randomness (60/30/10 model)
 * - Micro-staggering: Staggers multiple actions for the same lead
 */
export async function queueDM(
    userId: string,
    dmData: {
        commentId: string;
        commenterId: string;
        message: string;
        automation_id: string;
    },
    sendAt?: Date,
    priority: number = 5
) {
    const supabase = getSupabaseAdmin();

    // If no specific time, calculate a safe human-like scheduled time
    let scheduledTime: Date;
    if (sendAt) {
        scheduledTime = sendAt;
    } else {
        const delaySeconds = getNonUniformDelay();
        scheduledTime = new Date(Date.now() + delaySeconds * 1000);

        // MICRO-STAGGERING: Check if there's already something queued for this lead
        // If yes, push this item further to avoid "instant burst" of Public Reply + DM
        try {
            const { data: existing } = await (supabase as any)
                .from("dm_queue")
                .select("scheduled_send_at")
                .eq("user_id", userId)
                .eq("instagram_comment_id", dmData.commentId)
                .eq("status", "pending")
                .order("scheduled_send_at", { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existing && (existing as any).scheduled_send_at) {
                const existingTime = new Date((existing as any).scheduled_send_at).getTime();
                // If it's scheduled within 60s of this, push this one 5-15s further
                if (Math.abs(existingTime - scheduledTime.getTime()) < 60000) {
                    const staggerDelay = Math.floor(Math.random() * 11) + 5;
                    scheduledTime = new Date(existingTime + staggerDelay * 1000);
                    logger.debug("[Anti-Ban] Micro-staggering applied to lead interaction", { userId, commentId: dmData.commentId });
                }
            }
        } catch (err) {
            // Fail open (default delay) if check fails
            logger.warn("Micro-staggering check failed, using default delay", { userId, commentId: dmData.commentId, error: err });
        }
    }

    const { error } = await (supabase as any).from("dm_queue").insert({
        user_id: userId,
        instagram_comment_id: dmData.commentId,
        instagram_user_id: dmData.commenterId,
        message: dmData.message,
        automation_id: dmData.automation_id,
        scheduled_send_at: scheduledTime.toISOString(),
        status: "pending",
        priority: priority,
    });

    if (error) {
        logger.error("Failed to queue DM", { category: "rate-limiter" }, error);
        throw error;
    }

    logger.info("DM queued with human-like safety delay", {
        scheduledFor: scheduledTime.toISOString(),
        category: "rate-limiter"
    });
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

    if (!candidates || candidates.length === 0) {
        // Log at debug level to avoid spam, but provide clarity if user is looking
        logger.debug("No DMs ready for delivery (Safety delays active)", { category: "rate-limiter" });
        return;
    }

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

        // Monthly Window (Read-Only Sum) - Applies only to DMs per user plan
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);

        const { data: monthlyData } = await (supabase as any)
            .from("rate_limits")
            .select("dm_count") // Comments don't count towards plan quotas, but we track them
            .eq("user_id", userId)
            .gte("hour_bucket", monthStart.toISOString());

        const monthlyUsed = monthlyData?.reduce((sum: number, row: any) => sum + (row.dm_count || 0), 0) || 0;

        // Hourly Window limit fetches
        const { data: hourlyUsedData } = await (supabase as any)
            .rpc("get_rate_limit", { p_user_id: userId });
        const hourlyDMUsed = (hourlyUsedData as number) || 0;

        const { data: hourlyCommentData } = await (supabase as any)
            .rpc("get_comment_rate_limit", { p_user_id: userId });
        const hourlyCommentUsed = (hourlyCommentData as number) || 0;

        const hourlyDMLimit = limits.dmsPerHour || 200;
        const monthlyDMLimit = limits.dmsPerMonth || 1000;
        const hourlyCommentLimit = limits.commentsPerHour || 190;

        // C. Split Logic (DMs vs Comment Replies have separate Meta pools)
        const allDMs = userDMs.filter((dm: any) => !dm.message.startsWith("__PUBLIC_REPLY__:"));
        const allReplies = userDMs.filter((dm: any) => dm.message.startsWith("__PUBLIC_REPLY__:"));

        // D. Calculate Availability Separately
        const dmSlots = Math.min(
            Math.max(0, hourlyDMLimit - hourlyDMUsed),
            Math.max(0, monthlyDMLimit - monthlyUsed)
        );
        const commentSlots = Math.max(0, hourlyCommentLimit - hourlyCommentUsed);

        // E. Filter "Send Now" and "Reschedule"
        const dmsToSend = allDMs.slice(0, dmSlots);
        const repliesToSend = allReplies.slice(0, commentSlots);

        const dmsToReschedule = allDMs.slice(dmSlots);
        const repliesToReschedule = allReplies.slice(commentSlots);
        const toReschedule = [...dmsToReschedule, ...repliesToReschedule];

        // F. Reschedule Excess Actions
        if (toReschedule.length > 0) {
            let nextAvailableTime: Date;

            if (monthlyDMLimit - monthlyUsed <= 0 && dmsToReschedule.length > 0) {
                // Reschedule to next month if monthly limit triggered it
                const nextMonth = new Date(monthStart);
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                nextAvailableTime = nextMonth;
                logger.warn("User hit MONTHLY DM limit during queue processing", { userId, rescheduleCount: dmsToReschedule.length, nextAvailableTime: nextAvailableTime.toISOString(), category: "rate-limiter" });
            } else {
                // Reschedule to next hour
                const hourStart = new Date();
                hourStart.setMinutes(0, 0, 0);
                const nextHour = new Date(hourStart);
                nextHour.setHours(nextHour.getHours() + 1);
                const jitterMinutes = Math.floor(Math.random() * 10);
                nextHour.setMinutes(jitterMinutes);
                nextAvailableTime = nextHour;
                logger.warn("User hit HOURLY limit during queue processing", { userId, rescheduleCount: toReschedule.length, nextAvailableTime: nextAvailableTime.toISOString(), category: "rate-limiter" });
            }

            const idsToReschedule = toReschedule.map((d: any) => d.id);
            await (supabase as any)
                .from("dm_queue")
                .update({
                    status: "pending",
                    scheduled_send_at: nextAvailableTime.toISOString(),
                    priority: limits.priorityQueue ? 10 : 5
                })
                .in("id", idsToReschedule);
        }

        const toSend = [...dmsToSend, ...repliesToSend];

        // G. Send Allowed Actions
        if (toSend.length > 0) {
            logger.info("Sending queued actions", { userId, count: toSend.length, planType, category: "rate-limiter" });

            await Promise.allSettled(toSend.map(async (dm: any) => {
                try {
                    const isPublicReply = dm.message.startsWith("__PUBLIC_REPLY__:");
                    const actualMessage = isPublicReply ? dm.message.replace("__PUBLIC_REPLY__:", "") : dm.message;
                    let actionSent = false;

                    if (isPublicReply) {
                        const { replyToComment } = await import("./instagram/service");
                        actionSent = await replyToComment(
                            dm.users.instagram_access_token,
                            dm.instagram_comment_id,
                            actualMessage,
                            supabase,
                            dm.user_id
                        );
                    } else {
                        actionSent = await sendInstagramDM(
                            dm.users.instagram_access_token,
                            dm.users.instagram_user_id,
                            dm.instagram_comment_id,
                            dm.instagram_user_id,
                            actualMessage,
                            dm.automation_id,
                            dm.automations.button_text,
                            undefined, // FORCES POSTBACK for follow-gate check
                            dm.automations.media_thumbnail_url || undefined,
                            supabase,
                            dm.user_id
                        );
                    }

                    if (actionSent) {
                        // CRITICAL: Atomically increment rate limit after successful send
                        if (isPublicReply) {
                            await (supabase as any).rpc("increment_comment_rate_limit", { p_user_id: dm.user_id });
                            await incrementAutomationCount(supabase, dm.automation_id, "comment_count");
                        } else {
                            await (supabase as any).rpc("increment_rate_limit", { p_user_id: dm.user_id });
                            await incrementAutomationCount(supabase, dm.automation_id, "dm_sent_count");

                            // Update DM Log only for private messages
                            await (supabase as any).from("dm_logs").update({
                                reply_sent: true,
                                reply_sent_at: new Date().toISOString(),
                                keyword_matched: "QUEUED",
                            }).eq("instagram_comment_id", dm.instagram_comment_id);
                        }

                        // Update queue log
                        await (supabase as any).from("dm_queue").update({
                            status: "sent",
                            sent_at: new Date().toISOString()
                        }).eq("id", dm.id);
                    } else {
                        throw new Error("Action delivery failed");
                    }
                } catch (error) {
                    logger.error(`Failed to process queued ${dm.message.startsWith("__PUBLIC_REPLY__:") ? 'Reply' : 'DM'}`, { dmId: dm.id, category: "rate-limiter" }, error as Error);
                    await (supabase as any).from("dm_queue").update({ status: "failed", error_message: (error as Error).message }).eq("id", dm.id);

                    if (!dm.message.startsWith("__PUBLIC_REPLY__:_")) {
                        await incrementAutomationCount(supabase, dm.automation_id, "dm_failed_count");
                    }
                }
            }));
        }
    });

    await Promise.allSettled(userPromises);
    logger.info("Queue Processing Complete", { category: "rate-limiter" });
}


