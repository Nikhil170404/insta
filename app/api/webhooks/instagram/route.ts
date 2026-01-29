import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
    sendInstagramDM,
    replyToComment,
    checkFollowStatus,
    getUniqueMessage,
    incrementAutomationCount
} from "@/lib/instagram/service";
import { smartRateLimit, queueDM, RATE_LIMITS } from "@/lib/smart-rate-limiter";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

/**
 * GET Handler - Used by Meta to verify the webhook URL.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse("Forbidden", { status: 403 });
        }
    }

    return new NextResponse("Bad Request", { status: 400 });
}

/**
 * POST Handler - Receives comment updates from Instagram and sends DMs.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log("Webhook received:", JSON.stringify(body, null, 2));

        if (body.object === "instagram") {
            // Process each entry
            for (const entry of body.entry || []) {
                const instagramUserId = entry.id;

                for (const change of entry.changes || []) {
                    // Handle comment events
                    if (change.field === "comments") {
                        await handleCommentEvent(instagramUserId, change.value);
                    }
                }

                for (const messaging of entry.messaging || []) {
                    // Handle messaging events (Quick Reply clicks)
                    if (messaging.message?.is_echo) continue;

                    console.log("📥 Messaging event received:", JSON.stringify(messaging, null, 2));
                    await handleMessagingEvent(instagramUserId, messaging);
                }
            }

            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        return new NextResponse("Not Found", { status: 404 });
    } catch (error) {
        console.error("❌ Webhook processing error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

/**
 * Handle a new comment event
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleCommentEvent(instagramUserId: string, eventData: any) {
    try {
        console.log("===========================================");
        console.log("📥 WEBHOOK RECEIVED - COMMENT EVENT");
        console.log("===========================================");
        console.log("Time:", new Date().toISOString());
        console.log("Instagram Account ID (Webhook Entry):", instagramUserId);
        console.log("Event Data:", JSON.stringify(eventData, null, 2));
        console.log("-------------------------------------------");

        const { id: commentId, text: commentText, from, media, parent_id } = eventData;
        const commenterId = from?.id;
        const commenterUsername = from?.username;
        const mediaId = media?.id;

        console.log("📊 Parsed Event:");
        console.log("- Comment ID:", commentId);
        console.log("- Parent ID:", parent_id || "None (Top-level)");
        console.log("- Comment Text:", commentText);
        console.log("- Commenter ID:", commenterId);
        console.log("- Commenter Username:", commenterUsername);
        console.log("- Media ID:", mediaId);

        if (!mediaId || !commenterId) {
            console.error("❌ MISSING REQUIRED DATA");
            return;
        }

        // 1. IGNORE REPLIES (Prevent Loops)
        if (parent_id) {
            console.log("ℹ️ Comment is a reply (parent_id detected). Ignoring to prevent loops.");
            return;
        }

        const supabase = getSupabaseAdmin();

        // 2. Find the user who owns this Instagram account
        const targetId = String(instagramUserId).trim();
        console.log(`Searching database for user with ID: "${targetId}"`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user, error: userError } = await (supabase as any)
            .from("users")
            .select("id, instagram_access_token, instagram_user_id")
            .eq("instagram_user_id", targetId)
            .single();

        if (userError || !user) {
            console.error(`❌ ERROR: No user found in 'users' table with instagram_user_id: "${targetId}"`);
            return;
        }

        console.log("✅ Match found! System User ID:", user.id);

        // 3. IMPROVED SELF-COMMENT DETECTION
        // Accurate comparison using the recorded account ID from our database
        if (commenterId === user.instagram_user_id) {
            console.log("⚠️ Self-comment detected. Skipping to avoid infinite loop.");
            return;
        }

        // 4. Idempotency Check: Don't process the same comment twice (handles Meta retries)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingLog } = await (supabase as any)
            .from("dm_logs")
            .select("id")
            .eq("instagram_comment_id", commentId)
            .single();

        if (existingLog) {
            console.log(`⚠️ Comment ${commentId} already processed. Skipping duplicate event.`);
            return;
        }

        // 5. Find automation for this media
        console.log("Looking for automation with media_id:", mediaId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: automation } = await (supabase as any)
            .from("automations")
            .select("*")
            .eq("user_id", user.id)
            .eq("media_id", mediaId)
            .eq("is_active", true)
            .single();

        console.log("📊 Automation Found:", {
            id: automation.id,
            trigger_type: automation.trigger_type,
            trigger_keyword: automation.trigger_keyword,
            respond_to_replies: automation.respond_to_replies,
            ignore_self_comments: automation.ignore_self_comments
        });

        // Detect if SQL migration is missing
        if (automation.respond_to_replies === undefined) {
            console.warn("⚠️ WARNING: 'respond_to_replies' column missing in database. Have you run the SQL migration?");
        }

        // 6. DYNAMIC FILTERING
        // Check 1: Reply Filtering
        if (parent_id && !automation.respond_to_replies) {
            console.log("ℹ️ Comment is a reply and automation is set to Top-level only (or SQL migration missing). Skipping.");
            return;
        }

        // Check 2: Self-Comment Filtering
        if (commenterId === user.instagram_user_id && automation.ignore_self_comments !== false) {
            console.log("⚠️ Self-comment detected. Skipping to avoid loops.");
            return;
        }

        // 7. Check keyword match
        const shouldTrigger = checkKeywordMatch(
            automation.trigger_type,
            automation.trigger_keyword,
            commentText
        );

        if (!shouldTrigger) {
            console.log("Comment does not match trigger:", commentText);
            return;
        }

        console.log("Trigger matched! Preparing to send DM and Reply...");

        // 8. Send Public Reply (High Engagement)
        // We do this BEFORE the "One DM per user" check so that we always engage 
        // with the commenter publicly, even if they've received a DM before.
        if (automation.comment_reply && automation.comment_reply.trim().length > 0) {
            console.log(`💬 Sending public engagement reply: "${automation.comment_reply}"`);
            const uniqueReply = getUniqueMessage(automation.comment_reply);
            const replySent = await replyToComment(
                user.instagram_access_token,
                commentId,
                uniqueReply
            );
            if (replySent) {
                console.log("✅ Public reply sent successfully!");
            }
        } else {
            console.log("ℹ️ Skipping public reply: No reply text configured in this automation.");
        }

        // 9. Check follow status if required
        if (automation.require_follow) {
            const isFollowing = await checkFollowStatus(
                user.instagram_access_token,
                instagramUserId,
                commenterId
            );

            if (!isFollowing) {
                console.log("User is not following, skipping DM");
                await incrementAutomationCount(supabase, automation.id, "comment_count");
                return;
            }
        }

        // 10. ONE DM PER USER CHECK
        // Check if we've already sent a DM to this user for THIS specific automation keyword
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: userAlreadyDmed } = await (supabase as any)
            .from("dm_logs")
            .select("id")
            .eq("instagram_user_id", commenterId)
            .eq("keyword_matched", automation.trigger_keyword || "ANY")
            .eq("user_id", user.id)
            .single();

        if (userAlreadyDmed) {
            console.log(`ℹ️ User @${commenterUsername} already received a DM for "${automation.trigger_keyword || "ANY"}". Skipping duplicate DM but engaged publicly.`);
            return;
        }

        // 10. SMART RATE LIMITING (ManyChat Style)
        const rateLimitResult = await smartRateLimit(user.id, {
            hourlyLimit: RATE_LIMITS.INITIAL.hourly, // Use Safe limits for App Review
            dailyLimit: RATE_LIMITS.INITIAL.daily,
            spreadDelay: true,
        });

        if (!rateLimitResult.allowed) {
            console.log(`⏸️ Rate limit reached. Queueing for next slot: ${rateLimitResult.estimatedSendTime}`);
            await queueDM(user.id, {
                commentId,
                commenterId,
                message: automation.reply_message,
                automation_id: automation.id,
            }, rateLimitResult.estimatedSendTime!);

            // Log as queued
            await (supabase as any).from("dm_logs").insert({
                user_id: user.id,
                instagram_comment_id: commentId,
                instagram_user_id: commenterId,
                instagram_username: commenterUsername,
                keyword_matched: automation.trigger_keyword || "ANY",
                comment_text: commentText,
                reply_sent: false,
                error_message: "Queued: Rate limit reached",
            });
            return;
        }

        // If time spreading requires a delay
        if (rateLimitResult.estimatedSendTime && rateLimitResult.estimatedSendTime > new Date()) {
            console.log(`⏳ Spreading load. Queueing for: ${rateLimitResult.estimatedSendTime}`);
            await queueDM(user.id, {
                commentId,
                commenterId,
                message: automation.reply_message,
                automation_id: automation.id,
            }, rateLimitResult.estimatedSendTime);
            return;
        }

        // 11. Send DM (Private Reply)
        const dmSent = await sendInstagramDM(
            user.instagram_access_token,
            instagramUserId,          // Sender
            commentId,                // Trigger
            commenterId,              // Recipient for logging
            automation.reply_message, // Message text
            automation.id,            // Automation ID for payload
            automation.button_text,   // Button text
            automation.link_url,      // Final link
            automation.media_thumbnail_url // Card image
        );

        // 12. Log the result and update analytics
        await (supabase as any).from("dm_logs").insert({
            user_id: user.id,
            instagram_comment_id: commentId,
            instagram_user_id: commenterId,
            instagram_username: commenterUsername,
            keyword_matched: automation.trigger_keyword || "ANY",
            comment_text: commentText,
            reply_sent: dmSent,
            reply_sent_at: dmSent ? new Date().toISOString() : null,
        });

        if (dmSent) {
            await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
            console.log("✅ DM sent successfully!");
        } else {
            await incrementAutomationCount(supabase, automation.id, "dm_failed_count");
            console.log("❌ Failed to send DM");
        }

    } catch (error) {
        console.error("Error handling comment event:", error);
    }
}

/**
 * Check if comment matches the trigger keyword
 */
function checkKeywordMatch(
    triggerType: string,
    triggerKeyword: string | null,
    commentText: string
): boolean {
    if (triggerType === "any") {
        return true;
    }

    if (!triggerKeyword) return false;

    // Case-insensitive match
    const normalizedComment = commentText.toLowerCase().trim();
    const normalizedKeyword = triggerKeyword.toLowerCase().trim();

    // Check if the keyword is in the comment
    return normalizedComment.includes(normalizedKeyword);
}

/**
 * Handle messaging events (Quick Reply clicks)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMessagingEvent(instagramUserId: string, messaging: any) {
    try {
        const senderIgsid = messaging.sender?.id;
        const message = messaging.message;

        // 1. STORY REPLY DETECTION
        // Check if this message is a reply to any story
        if (message?.reply_to?.story_id) {
            console.log("📸 STORY REPLY DETECTED from User:", senderIgsid);
            const text = message.text || "";
            const supabase = getSupabaseAdmin();

            // Fetch the system user who owns this IG account
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: user } = await (supabase as any)
                .from("users")
                .select("*")
                .eq("instagram_user_id", instagramUserId)
                .single();

            if (!user) {
                console.log(`❌ No system user found for IG account ${instagramUserId}`);
                return;
            }

            // Find an active automation of type 'story_reply'
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: automation } = await (supabase as any)
                .from("automations")
                .select("*")
                .eq("user_id", user.id)
                .eq("trigger_type", "story_reply")
                .eq("is_active", true)
                .maybeSingle();

            if (automation) {
                console.log("✅ Story Reply Automation Found! Triggering DM...");

                await sendInstagramDM(
                    user.instagram_access_token,
                    instagramUserId,
                    null, // No comment ID for stories
                    senderIgsid,
                    automation.reply_message,
                    automation.id,
                    automation.button_text,
                    automation.link_url,
                    undefined // No thumbnail
                );

                // Update analytics
                await incrementAutomationCount(supabase, automation.id, "dm_sent_count");

                // Log DM for history
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (supabase as any).from("dm_logs").insert({
                    user_id: user.id,
                    instagram_user_id: senderIgsid,
                    keyword_matched: "STORY_REPLY",
                    comment_text: text,
                    reply_sent: true,
                    reply_sent_at: new Date().toISOString(),
                });
            } else {
                console.log("ℹ️ No active 'story_reply' automation found for this user.");
            }
            return;
        }

        // 2. QUICK REPLY / POSTBACK LOGIC
        const quickReply = message?.quick_reply;
        if (!quickReply || !quickReply.payload) return;

        const payload = quickReply.payload;
        console.log(`🔗 Postback Logic: Payload "${payload}" from User ${senderIgsid}`);

        if (payload.startsWith("CLICK_LINK_")) {
            const automationId = payload.replace("CLICK_LINK_", "");
            const supabase = getSupabaseAdmin();

            // 1. Fetch automation details
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: automation } = await (supabase as any)
                .from("automations")
                .select("*")
                .eq("id", automationId)
                .single();

            if (!automation) {
                console.log(`❌ Automation with ID "${automationId}" not found in database.`);
                return;
            }

            if (!automation.link_url) {
                console.log(`ℹ️ Automation found but has no "link_url" configured. Skipping delivery.`);
                return;
            }

            // 2. Fetch user's access token
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: user } = await (supabase as any)
                .from("users")
                .select("instagram_access_token")
                .eq("id", automation.user_id)
                .single();

            if (!user) {
                console.log(`❌ No user found for automation owner: ${automation.user_id}`);
                return;
            }

            const trimmedToken = user.instagram_access_token.trim();

            // 3. Send the final link
            console.log(`🚀 Sending final link to ${senderIgsid}: ${automation.link_url}`);

            const dmSent = await sendInstagramDM(
                user.instagram_access_token,
                instagramUserId,
                null,
                senderIgsid,
                `Here is your link: ${automation.link_url}`
            );

            if (dmSent) {
                console.log("✅ Final link delivered successfully!");
                await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
            } else {
                console.error("❌ Failed to deliver link");
            }
        }
    } catch (error) {
        console.error("❌ Error in handleMessagingEvent:", error);
    }
}
