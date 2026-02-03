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
import { smartRateLimit, queueDM } from "@/lib/smart-rate-limiter";
import { getCachedUser, setCachedUser, getCachedAutomation, setCachedAutomation } from "@/lib/cache";
import { getPlanLimits } from "@/lib/pricing";

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
                .select("id, instagram_access_token, instagram_user_id, plan_type")
                .eq("instagram_user_id", instagramUserId)
                .single();

            if (!dbUser) return;
            user = dbUser;
            await setCachedUser(instagramUserId, dbUser);
        }

        // 3. Self-comment detection
        if (commenterId === user.instagram_user_id) {
            console.log("ℹ️ Skipping self-comment");
            return;
        }

        // 4. Idempotency Check
        const { data: existingLog } = await supabase
            .from("dm_logs")
            .select("id")
            .eq("instagram_comment_id", commentId)
            .single();

        if (existingLog) {
            console.log(`ℹ️ Skipping duplicate comment ID: ${commentId}`);
            return;
        }

        // 5. Find automation (with caching) - FAST SINGLE QUERY with Global Fallback
        const automationCacheKey = `automation:${user.id}:${mediaId}`;
        let automation = await getCachedAutomation(automationCacheKey);

        if (!automation) {
            // Single optimized query: Get ALL active automations for user, then pick best match
            const { data: allAutomations } = await supabase
                .from("automations")
                .select("*")
                .eq("user_id", user.id)
                .eq("is_active", true);

            if (!allAutomations || allAutomations.length === 0) {
                console.log(`ℹ️ User has NO active automations.`);
                return;
            }

            // Priority 1: Exact media_id match
            let matchedAutomation = allAutomations.find((a: any) => a.media_id === mediaId);

            // Priority 2: Global fallback (trigger_type = 'all_posts' OR media_id is null/empty)
            if (!matchedAutomation) {
                matchedAutomation = allAutomations.find((a: any) =>
                    a.trigger_type === 'all_posts' || !a.media_id
                );
                if (matchedAutomation) {
                    console.log(`✅ Using GLOBAL 'all_posts' fallback automation.`);
                }
            }

            if (!matchedAutomation) {
                console.log(`ℹ️ No matching automation for media ${mediaId}. Active IDs: ${allAutomations.map((a: any) => a.media_id).join(', ')}`);
                return;
            }

            automation = matchedAutomation;
            await setCachedAutomation(automationCacheKey, matchedAutomation);
        }

        // 6. Check keyword match
        if (!checkKeywordMatch(automation.trigger_type, automation.trigger_keyword, commentText)) {
            console.log(`ℹ️ Keyword mismatch: '${commentText}' vs '${automation.trigger_keyword || "params"}'`);
            return;
        }

        // 7. Send Public Reply
        if (automation.comment_reply && automation.comment_reply.trim().length > 0) {
            const uniqueReply = getUniqueMessage(automation.comment_reply);
            await replyToComment(user.instagram_access_token, commentId, uniqueReply);
        }

        // 8. ONE DM PER USER CHECK + ATOMIC CLAIM
        // Use atomic insert to prevent race conditions when multiple comments arrive simultaneously
        // First do a fast check, then insert a placeholder to claim the slot atomically
        const { data: userAlreadyDmed } = await supabase
            .from("dm_logs")
            .select("id")
            .eq("instagram_user_id", commenterId)
            .eq("automation_id", automation.id)
            .eq("user_id", user.id)
            .eq("is_follow_gate", false)
            .maybeSingle();

        if (userAlreadyDmed) {
            console.log(`⚠️ Skipping: User ${commenterUsername} already DMed for this automation.`);
            return;
        }

        // 8b. ATOMIC CLAIM - Insert placeholder to prevent race conditions
        // Uses unique index idx_dm_logs_unique_user_automation to prevent duplicates
        const placeholderRecord = {
            user_id: user.id,
            automation_id: automation.id,
            instagram_comment_id: commentId,
            instagram_user_id: commenterId,
            instagram_username: commenterUsername,
            keyword_matched: automation.trigger_keyword || "ANY",
            comment_text: commentText,
            reply_sent: false,
            is_follow_gate: false,
        };

        const { error: claimError } = await supabase
            .from("dm_logs")
            .insert(placeholderRecord);

        if (claimError) {
            // Unique constraint violation (code 23505) means another request already claimed this
            if (claimError.code === '23505') {
                console.log(`⚠️ Race condition prevented: Another request already processing for user ${commenterUsername}`);
                return;
            }
            // Log other errors but continue (non-critical)
            console.error(`⚠️ Claim insert warning:`, claimError.message);
        }

        // 9. Rate Limit Check
        const planLimits = getPlanLimits(user.plan_type || 'free');

        const rateLimitResult = await smartRateLimit(user.id, {
            hourlyLimit: planLimits.dmsPerHour,
            monthlyLimit: planLimits.dmsPerMonth || 1000,
            spreadDelay: false,
        });

        if (!rateLimitResult.allowed) {
            console.log(`⚠️ Rate limit hit for user ${user.id} (${user.plan_type}). Queuing DM... Details:`, JSON.stringify(rateLimitResult.remaining));

            // Determine Priority
            let priority = 5; // Default/Free
            if (user.plan_type === 'pro' || user.plan_type === 'starter') priority = 10;

            // Queue the DM for later
            await queueDM(
                user.id,
                {
                    commentId,
                    commenterId,
                    message: automation.reply_message, // Use automation.reply_message directly
                    automation_id: automation.id
                },
                rateLimitResult.estimatedSendTime || new Date(Date.now() + 60000), // Default to 1 min later
                priority
            );

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
                    console.log(`✅ User ${commenterUsername} is now following! Sending greeting with button.`);
                    // Send greeting message with button - NOT direct link
                    // When they click button, CLICK_LINK_ handler will send the actual link
                    const greetingSent = await sendInstagramDM(
                        user.instagram_access_token,
                        instagramUserId,
                        commentId,
                        commenterId,
                        automation.reply_message,
                        automation.id,
                        automation.button_text || "Get Access",
                        undefined, // NO link_url - this triggers quick_reply button flow
                        automation.media_thumbnail_url
                    );

                    // Update placeholder record
                    await supabase.from("dm_logs")
                        .update({
                            reply_sent: greetingSent,
                            reply_sent_at: greetingSent ? new Date().toISOString() : null,
                            user_is_following: true,
                        })
                        .eq("instagram_comment_id", commentId);

                    if (greetingSent) {
                        await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                    } else {
                        await incrementAutomationCount(supabase, automation.id, "dm_failed_count");
                    }
                    return;
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

                    // Log as follow-gate attempt (separate from placeholder - this is follow-gate specific)
                    await supabase.from("dm_logs").insert({
                        user_id: user.id,
                        automation_id: automation.id,
                        instagram_comment_id: `${commentId}_followgate`,
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
                } else {
                    // User IS following on first comment - send greeting with button
                    // NOT direct link - they click button to get the link
                    console.log(`✅ User ${commenterUsername} is already following! Sending greeting with button.`);

                    const greetingSent = await sendInstagramDM(
                        user.instagram_access_token,
                        instagramUserId,
                        commentId,
                        commenterId,
                        automation.reply_message,
                        automation.id,
                        automation.button_text || "Get Access",
                        undefined, // NO link_url - triggers quick_reply button flow
                        automation.media_thumbnail_url
                    );

                    // Update placeholder record
                    await supabase.from("dm_logs")
                        .update({
                            reply_sent: greetingSent,
                            reply_sent_at: greetingSent ? new Date().toISOString() : null,
                            user_is_following: true,
                        })
                        .eq("instagram_comment_id", commentId);

                    if (greetingSent) {
                        await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                    } else {
                        await incrementAutomationCount(supabase, automation.id, "dm_failed_count");
                    }
                    return;
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
            automation.link_url,
            automation.media_thumbnail_url
        );

        // 12. Update placeholder record with result (placeholder was inserted in step 8b)
        await supabase.from("dm_logs")
            .update({
                reply_sent: dmSent,
                reply_sent_at: dmSent ? new Date().toISOString() : null,
            })
            .eq("instagram_comment_id", commentId);

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

        // Quick Reply / Postback - Handle CLICK_LINK_ from both quick_reply and postback
        const quickReply = message?.quick_reply;
        const postbackPayload = messaging.postback?.payload || quickReply?.payload;

        if (postbackPayload?.startsWith("CLICK_LINK_")) {
            const automationId = postbackPayload.replace("CLICK_LINK_", "");

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
                automation.final_message || "Here is the link you requested! ✨",
                automation.id,
                automation.final_button_text || "Open Link",
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
                // They are following! Send greeting with button (NOT direct link)
                // They click button to get the actual link
                console.log(`✅ User ${senderIgsid} verified as following, sending greeting with button`);

                const dmSent = await sendInstagramDM(
                    user.instagram_access_token,
                    instagramUserId,
                    null,
                    senderIgsid,
                    automation.reply_message,
                    automation.id,
                    automation.button_text || "Get Access",
                    undefined, // NO link_url - triggers quick_reply button flow
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
        console.error("Error in batch processor handleCommentEvent:", error);
    }
}

function checkKeywordMatch(triggerType: string, triggerKeyword: string | null, commentText: string): boolean {
    if (triggerType === "any") return true;
    if (!triggerKeyword) return false;
    const normalizedComment = commentText.toLowerCase().trim();
    const normalizedKeyword = triggerKeyword.toLowerCase().trim();
    return normalizedComment.includes(normalizedKeyword);
}
