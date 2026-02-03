import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
    sendInstagramDM,
    replyToComment,
    checkFollowStatus,
    checkIsFollowing,
    getUniqueMessage,
    incrementAutomationCount,
    sendFollowGateCard,
    hasReceivedFollowGate
} from "@/lib/instagram/service";
import { smartRateLimit, RATE_LIMITS } from "@/lib/smart-rate-limiter";
import { getCachedUser, setCachedUser, getCachedAutomation, setCachedAutomation } from "@/lib/cache";

/**
 * Handle a comment event from the batch
 */
export async function handleCommentEvent(instagramUserId: string, eventData: any, supabase: any) {
    try {
        const { id: commentId, text: commentText, from, media, parent_id } = eventData;
        const commenterId = from?.id;
        const commenterUsername = from?.username;
        const mediaId = media?.id;

        if (!mediaId || !commenterId) return;

        // 1. IGNORE REPLIES (Prevent Loops) - Unless strictly configured (later)
        if (parent_id) return;

        // 2. Find the user (with caching)
        let user = await getCachedUser(instagramUserId);
        if (!user) {
            const { data: dbUser } = await supabase
                .from("users")
                .select("id, instagram_access_token, instagram_user_id")
                .eq("instagram_user_id", instagramUserId)
                .single();

            if (!dbUser) return;
            user = dbUser;
            await setCachedUser(instagramUserId, dbUser);
        }

        // 3. Self-comment detection
        if (commenterId === user.instagram_user_id) return;

        // 4. Idempotency Check
        const { data: existingLog } = await supabase
            .from("dm_logs")
            .select("id")
            .eq("instagram_comment_id", commentId)
            .single();

        if (existingLog) return;

        // 5. Find automation (with caching)
        const automationCacheKey = `automation:${user.id}:${mediaId}`;
        let automation = await getCachedAutomation(automationCacheKey);

        if (!automation) {
            const { data: dbAutomation } = await supabase
                .from("automations")
                .select("*")
                .eq("user_id", user.id)
                .eq("media_id", mediaId)
                .eq("is_active", true)
                .single();

            if (!dbAutomation) return;
            automation = dbAutomation;
            await setCachedAutomation(automationCacheKey, dbAutomation);
        }

        // 6. Check keyword match
        if (!checkKeywordMatch(automation.trigger_type, automation.trigger_keyword, commentText)) {
            return;
        }

        // 7. Send Public Reply
        if (automation.comment_reply && automation.comment_reply.trim().length > 0) {
            const uniqueReply = getUniqueMessage(automation.comment_reply);
            await replyToComment(user.instagram_access_token, commentId, uniqueReply);
        }

        // 8. ONE DM PER USER CHECK
        const { data: userAlreadyDmed } = await supabase
            .from("dm_logs")
            .select("id")
            .eq("instagram_user_id", commenterId)
            .eq("keyword_matched", automation.trigger_keyword || "ANY")
            .eq("user_id", user.id)
            .single();

        if (userAlreadyDmed) return;

        // 9. Rate Limit Check
        const rateLimitResult = await smartRateLimit(user.id, {
            hourlyLimit: RATE_LIMITS.INITIAL.hourly,
            dailyLimit: RATE_LIMITS.INITIAL.daily,
            spreadDelay: false,
        });

        if (!rateLimitResult.allowed) {
            // Fallback public reply
            await replyToComment(
                user.instagram_access_token,
                commentId,
                "Thanks! 🔥 We're seeing huge demand right now. Please DM us directly for the link! ✨"
            );

            await supabase.from("dm_logs").insert({
                user_id: user.id,
                automation_id: automation.id,
                instagram_comment_id: commentId,
                instagram_user_id: commenterId,
                instagram_username: commenterUsername,
                keyword_matched: automation.trigger_keyword || "ANY",
                comment_text: commentText,
                reply_sent: false,
                error_message: "Rate limit reached - public fallback sent",
            });
            return;
        }

        // 10. FOLLOW-GATE CHECK (if enabled) - ManyChat style
        if (automation.require_follow) {
            // First check: Has user already received a follow-gate message for this automation?
            // If yes, they've likely followed since then - send the content!
            const alreadyReceivedGate = await hasReceivedFollowGate(
                supabase,
                user.id,
                automation.id,
                commenterId
            );

            if (alreadyReceivedGate) {
                // They commented again after receiving follow-gate
                // Do a REAL-TIME check via Instagram API to verify they followed
                const isFollowingNow = await checkIsFollowing(
                    user.instagram_access_token,
                    commenterId
                );

                if (isFollowingNow) {
                    console.log(`✅ User ${commenterUsername} is now following! Sending content.`);
                    // Continue to send content (falls through to step 11)
                } else {
                    // Still not following - send gate again
                    console.log(`❌ User ${commenterUsername} still not following after gate`);
                    const cardSent = await sendFollowGateCard(
                        user.instagram_access_token,
                        instagramUserId,
                        commentId,
                        commenterId,
                        automation.id,
                        user.instagram_username || '',
                        automation.media_thumbnail_url,
                        `Hey ${commenterUsername}! 👀 Hmm, looks like you haven't followed yet. Please follow us first to unlock this!`
                    );
                    if (cardSent) {
                        await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                    }
                    return;
                }
            } else {
                // First time - use REAL-TIME Instagram API to check if following
                // This uses the is_user_follow_business API field (like ManyChat/SuperProfile)
                const isFollowing = await checkIsFollowing(
                    user.instagram_access_token,
                    commenterId
                );

                if (!isFollowing) {
                    // Send ManyChat-style follow-gate CARD with two buttons:
                    // 1. "Follow & Get Access" - links to profile
                    // 2. "I'm Following ✓" - triggers postback verification
                    const followGateMsg = automation.follow_gate_message ||
                        `Hey ${commenterUsername}! 👋 To unlock this, please follow us first!`;

                    const cardSent = await sendFollowGateCard(
                        user.instagram_access_token,
                        instagramUserId,
                        commentId,
                        commenterId,
                        automation.id,
                        user.instagram_username || '',
                        automation.media_thumbnail_url,
                        followGateMsg
                    );

                    // Log as follow-gate attempt
                    await supabase.from("dm_logs").insert({
                        user_id: user.id,
                        automation_id: automation.id,
                        instagram_comment_id: commentId,
                        instagram_user_id: commenterId,
                        instagram_username: commenterUsername,
                        keyword_matched: automation.trigger_keyword || "ANY",
                        comment_text: commentText,
                        reply_sent: cardSent,
                        reply_sent_at: cardSent ? new Date().toISOString() : null,
                        is_follow_gate: true,
                        user_is_following: false,
                    });

                    if (cardSent) {
                        await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                    }

                    return; // Stop here, don't send main message yet
                }
            }
        }

        // 11. Send DM
        const dmSent = await sendInstagramDM(
            user.instagram_access_token,
            instagramUserId,
            commentId,
            commenterId,
            automation.reply_message,
            automation.id,
            automation.button_text,
            undefined,
            automation.media_thumbnail_url
        );

        // 11. Log and Update
        await supabase.from("dm_logs").insert({
            user_id: user.id,
            automation_id: automation.id,
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
        } else {
            await incrementAutomationCount(supabase, automation.id, "dm_failed_count");
        }

    } catch (error) {
        console.error("Error in batch processor handleCommentEvent:", error);
    }
}

/**
 * Handle messaging events
 */
export async function handleMessageEvent(instagramUserId: string, messaging: any, supabase: any) {
    try {
        const senderIgsid = messaging.sender?.id;
        const message = messaging.message;

        // story reply, quick reply click, etc.
        // Similar to your current handleMessagingEvent but optimized

        // Let's implement the story reply part for now
        if (message?.reply_to?.story_id) {
            let user = await getCachedUser(instagramUserId);
            if (!user) {
                const { data: dbUser } = await supabase
                    .from("users")
                    .select("*")
                    .eq("instagram_user_id", instagramUserId)
                    .single();
                if (!dbUser) return;
                user = dbUser;
                await setCachedUser(instagramUserId, dbUser);
            }

            const { data: automation } = await supabase
                .from("automations")
                .select("*")
                .eq("user_id", user.id)
                .eq("trigger_type", "story_reply")
                .eq("is_active", true)
                .maybeSingle();

            if (automation) {
                await sendInstagramDM(
                    user.instagram_access_token,
                    instagramUserId,
                    null,
                    senderIgsid,
                    automation.reply_message,
                    automation.id,
                    automation.button_text,
                    automation.link_url,
                    undefined
                );
                await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
            }
            return;
        }

        // Quick Reply / Postback
        const quickReply = message?.quick_reply;
        if (quickReply?.payload?.startsWith("CLICK_LINK_")) {
            const automationId = quickReply.payload.replace("CLICK_LINK_", "");

            const { data: automation } = await supabase
                .from("automations")
                .select("*")
                .eq("id", automationId)
                .single();

            if (!automation || !automation.link_url) return;

            const { data: user } = await supabase
                .from("users")
                .select("instagram_access_token")
                .eq("id", automation.user_id)
                .single();

            if (!user) return;

            const dmSent = await sendInstagramDM(
                user.instagram_access_token,
                instagramUserId,
                null,
                senderIgsid,
                `Here is the link you requested! ✨`,
                automation.id,
                automation.button_text || "Open Link",
                automation.link_url,
                automation.media_thumbnail_url
            );

            if (dmSent) {
                await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                await incrementAutomationCount(supabase, automation.id, "click_count");
                await supabase
                    .from("dm_logs")
                    .update({ is_clicked: true })
                    .eq("instagram_user_id", senderIgsid)
                    .eq("automation_id", automation.id)
                    .order("created_at", { ascending: false })
                    .limit(1);
            }
        }

        // Handle "I'm Following" button click for follow-gate verification
        const postback = messaging.postback?.payload || quickReply?.payload;
        if (postback?.startsWith("VERIFY_FOLLOW_")) {
            const automationId = postback.replace("VERIFY_FOLLOW_", "");

            const { data: automation } = await supabase
                .from("automations")
                .select("*")
                .eq("id", automationId)
                .single();

            if (!automation) return;

            const { data: user } = await supabase
                .from("users")
                .select("id, instagram_access_token, instagram_username")
                .eq("id", automation.user_id)
                .single();

            if (!user) return;

            // Check if they are NOW following via REAL-TIME Instagram API
            // This uses is_user_follow_business field (like ManyChat/SuperProfile)
            const isFollowing = await checkIsFollowing(
                user.instagram_access_token,
                senderIgsid
            );

            if (isFollowing) {
                // They are following! Send the content
                console.log(`✅ User ${senderIgsid} verified as following, sending content`);

                const dmSent = await sendInstagramDM(
                    user.instagram_access_token,
                    instagramUserId,
                    null,
                    senderIgsid,
                    automation.reply_message,
                    automation.id,
                    automation.button_text,
                    automation.link_url,
                    automation.media_thumbnail_url
                );

                if (dmSent) {
                    await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                    // Update the follow-gate log to mark as converted
                    await supabase
                        .from("dm_logs")
                        .update({ followed_after_gate: true, user_is_following: true })
                        .eq("instagram_user_id", senderIgsid)
                        .eq("automation_id", automation.id)
                        .eq("is_follow_gate", true);
                }
            } else {
                // Not following yet - send the gate card again with a hint
                console.log(`❌ User ${senderIgsid} not yet following, sending gate again`);

                const { sendFollowGateCard } = await import("@/lib/instagram/service");
                await sendFollowGateCard(
                    user.instagram_access_token,
                    instagramUserId,
                    null,
                    senderIgsid,
                    automation.id,
                    user.instagram_username || '',
                    automation.media_thumbnail_url,
                    "Hmm, looks like you haven't followed yet! 🤔\n\nPlease follow us first, then tap 'I'm Following' again!"
                );
            }
        }
    } catch (error) {
        console.error("Error in batch processor handleMessageEvent:", error);
    }
}

function checkKeywordMatch(triggerType: string, triggerKeyword: string | null, commentText: string): boolean {
    if (triggerType === "any") return true;
    if (!triggerKeyword) return false;
    const normalizedComment = commentText.toLowerCase().trim();
    const normalizedKeyword = triggerKeyword.toLowerCase().trim();
    return normalizedComment.includes(normalizedKeyword);
}
