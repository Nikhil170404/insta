import { getSupabaseAdmin } from "./supabase/client";

/**
 * Instagram API Rate Limits (2025):
 * - 200 API calls per hour per user
 * - 4,800 API calls per day per user
 * 
 * Our Smart Limits (Competitive with ManyChat):
 */
export const RATE_LIMITS = {
    // FOR APP REVIEW (show restraint)
    INITIAL: {
        hourly: 100,
        daily: 500,
    },

    // AFTER APPROVAL (ramp up gradually)
    PRODUCTION: {
        hourly: 180,  // Close to ManyChat
        daily: 1500,  // 3x initial
    }
};

export interface RateLimitConfig {
    hourlyLimit: number;
    dailyLimit: number;
    spreadDelay: boolean; // Spread DMs over time
}

export async function smartRateLimit(
    userId: string,
    config: RateLimitConfig = {
        hourlyLimit: RATE_LIMITS.INITIAL.hourly,
        dailyLimit: RATE_LIMITS.INITIAL.daily,
        spreadDelay: true,
    }
): Promise<{
    allowed: boolean;
    queuePosition?: number;
    estimatedSendTime?: Date;
    remaining: { hourly: number; daily: number };
}> {
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // Check current usage
    const hourStart = new Date(now);
    hourStart.setMinutes(0, 0, 0);

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);

    // Count DMs sent in current windows
    const { count: hourlyCount } = await (supabase as any)
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("reply_sent", true)
        .gte("created_at", hourStart.toISOString());

    const { count: dailyCount } = await (supabase as any)
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("reply_sent", true)
        .gte("created_at", dayStart.toISOString());

    const hourlyUsed = hourlyCount || 0;
    const dailyUsed = dailyCount || 0;

    const hourlyRemaining = Math.max(0, config.hourlyLimit - hourlyUsed);
    const dailyRemaining = Math.max(0, config.dailyLimit - dailyUsed);

    // Check if allowed
    const allowed = hourlyRemaining > 0 && dailyRemaining > 0;

    if (!allowed) {
        // Calculate when next slot available
        const nextSlot =
            hourlyRemaining === 0
                ? new Date(hourStart.getTime() + 60 * 60 * 1000)
                : new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        return {
            allowed: false,
            estimatedSendTime: nextSlot,
            remaining: {
                hourly: hourlyRemaining,
                daily: dailyRemaining,
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
                daily: dailyRemaining,
            },
        };
    }

    return {
        allowed: true,
        remaining: {
            hourly: hourlyRemaining,
            daily: dailyRemaining,
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
    sendAt: Date
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
    });

    if (error) {
        console.error("❌ Failed to queue DM:", error);
        throw error;
    }

    console.log(`📬 DM queued for ${sendAt.toISOString()}`);
}

/**
 * Process pending DMs in the queue
 */
import { sendInstagramDM, incrementAutomationCount } from "./instagram/service";

export async function processQueuedDMs() {
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // Get pending DMs that should be sent now
    // Join with users and automations to get necessary tokens and data
    const { data: queuedDMs, error } = await (supabase as any)
        .from("dm_queue")
        .select(`
      *,
      users (instagram_access_token, instagram_user_id),
      automations (button_text, link_url, media_thumbnail_url)
    `)
        .eq("status", "pending")
        .lte("scheduled_send_at", now.toISOString())
        .order("scheduled_send_at", { ascending: true })
        .limit(20); // Process small batches per minute

    if (error) {
        console.error("Error fetching queue:", error);
        return;
    }

    if (!queuedDMs || queuedDMs.length === 0) return;

    console.log(`📤 Processing ${queuedDMs.length} queued DMs...`);

    for (const dm of queuedDMs) {
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
                // Update analytics
                await incrementAutomationCount(supabase, dm.automation_id, "dm_sent_count");

                // Log in dm_logs for rate limit tracking
                await (supabase as any).from("dm_logs").insert({
                    user_id: dm.user_id,
                    instagram_comment_id: dm.instagram_comment_id,
                    instagram_user_id: dm.instagram_user_id,
                    keyword_matched: "QUEUED",
                    comment_text: "Processed from queue",
                    reply_sent: true,
                    reply_sent_at: new Date().toISOString(),
                });

                // Mark as sent
                await (supabase as any)
                    .from("dm_queue")
                    .update({
                        status: "sent",
                        sent_at: new Date().toISOString(),
                    })
                    .eq("id", dm.id);
            } else {
                throw new Error("DM delivery failed");
            }
        } catch (error) {
            console.error(`❌ Failed to process queued DM ${dm.id}:`, error);
            // Mark as failed
            await (supabase as any)
                .from("dm_queue")
                .update({
                    status: "failed",
                    error_message: (error as Error).message,
                })
                .eq("id", dm.id);

            await incrementAutomationCount(supabase, dm.automation_id, "dm_failed_count");
        }
    }
}
