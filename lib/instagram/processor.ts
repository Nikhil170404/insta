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
import { logger } from "@/lib/logger";

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

        // If user not in cache OR user in cache is missing critical username (needed for follow-gate)
        if (!user || !user.instagram_username) {
            const { data: dbUser } = await supabase
                .from("users")
                .select("id, instagram_access_token, instagram_user_id, instagram_username, plan_type")
                .eq("instagram_user_id", instagramUserId)
                .single();

            if (!dbUser) return;
            user = dbUser;
            // Update cache with fresh data including username
            await setCachedUser(instagramUserId, dbUser);
        }

        // 3. Self-comment detection
        if (!user || commenterId === user.instagram_user_id) {
            if (user) logger.info("Skipping self-comment", { instagramUserId });
            return;
        }

        // 4. Idempotency Check
        const { data: existingLog } = await supabase
            .from("dm_logs")
            .select("id")
            .eq("instagram_comment_id", commentId)
            .single();

        if (existingLog) {
            logger.info("Skipping duplicate comment ID", { commentId });
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
                logger.info("User has no active automations", { userId: user.id });
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
                    logger.info("Using global all_posts fallback automation", { automationId: matchedAutomation.id });
                }
            }

            if (!matchedAutomation) {
                logger.info("No matching automation for media", { mediaId, activeIds: allAutomations.map((a: any) => a.media_id) });
                return;
            }

            automation = matchedAutomation;
            await setCachedAutomation(automationCacheKey, matchedAutomation);
        }

        // Guard against null automation (TypeScript strict)
        if (!automation) {
            logger.info("No automation found after cache/db lookup", { userId: user.id, mediaId });
            return;
        }

        // 6. Check keyword match
        if (!checkKeywordMatch(automation.trigger_type, automation.trigger_keyword ?? null, commentText)) {
            logger.info("Keyword mismatch", { commentText, triggerKeyword: automation.trigger_keyword || "any" });
            return;
        }

        // 7. Send Public Reply (pick random template)
        const templates: string[] = automation.comment_reply_templates || [];
        const singleReply = automation.comment_reply;
        if (templates.length > 0) {
            const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
            const uniqueReply = getUniqueMessage(randomTemplate);
            await replyToComment(user.instagram_access_token, commentId, uniqueReply);
        } else if (singleReply && singleReply.trim().length > 0) {
            const uniqueReply = getUniqueMessage(singleReply);
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
            logger.info("Skipping: User already DMed for this automation", { commenterUsername, automationId: automation.id });
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
                logger.info("Race condition prevented: Another request already processing", { commenterUsername });
                return;
            }
            // Log other errors but continue (non-critical)
            logger.error("Claim insert warning", { commenterUsername }, new Error(claimError.message));
        }

        // 9. Rate Limit Check
        const planLimits = getPlanLimits(user.plan_type || 'free');

        const rateLimitResult = await smartRateLimit(user.id, {
            hourlyLimit: planLimits.dmsPerHour,
            monthlyLimit: planLimits.dmsPerMonth || 1000,
            spreadDelay: false,
        });

        if (!rateLimitResult.allowed) {
            logger.info("Rate limit hit, queuing DM", { userId: user.id, planType: user.plan_type, remaining: rateLimitResult.remaining });

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
                    logger.info("User is now following, sending direct link", { commenterUsername });
                    // User is now following - send direct link (single Open Link button)
                    const greetingSent = await sendInstagramDM(
                        user.instagram_access_token,
                        instagramUserId,
                        commentId,
                        commenterId,
                        automation.final_message || automation.reply_message,
                        automation.id,
                        automation.final_button_text || "Open Link",
                        automation.link_url, // Direct link - single button experience for followers
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
                    logger.info("User still not following after gate", { commenterUsername });
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

                        // [FIX] Log the re-sent gate card as a sent message
                        await supabase.from("dm_logs")
                            .update({
                                reply_sent: true,
                                reply_sent_at: new Date().toISOString(),
                                is_follow_gate: true
                            })
                            .eq("instagram_comment_id", commentId);
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
                    // Non-follower gets greeting message first (same as followers)
                    // Follow-gate check happens when they click the button
                    logger.info("User not following, sending greeting with button", { commenterUsername });

                    const greetingSent = await sendInstagramDM(
                        user.instagram_access_token,
                        instagramUserId,
                        commentId,
                        commenterId,
                        automation.reply_message,
                        automation.id,
                        automation.button_text || "Get Link",
                        undefined, // No direct link - follow check happens on button click
                        automation.media_thumbnail_url
                    );

                    // Log as non-follower greeting (placeholder was already created in step 8b)
                    await supabase.from("dm_logs")
                        .update({
                            reply_sent: greetingSent,
                            reply_sent_at: greetingSent ? new Date().toISOString() : null,
                            user_is_following: false,
                        })
                        .eq("instagram_comment_id", commentId);

                    if (greetingSent) {
                        await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                    }

                    return; // Stop here, follow-gate check happens on button click
                } else {
                    // User IS following on first comment - send greeting message with button
                    // Same experience as non-followers but without follow-gate
                    logger.info("User already following, sending greeting with button", { commenterUsername });

                    const greetingSent = await sendInstagramDM(
                        user.instagram_access_token,
                        instagramUserId,
                        commentId,
                        commenterId,
                        automation.reply_message,
                        automation.id,
                        automation.button_text || "Get Link",
                        undefined, // No direct link - user must click button to get link (for click tracking)
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
        logger.error("Error in handleCommentEvent", { instagramUserId }, error as Error);
    }
}

/**
 * Handle messaging events
 */
export async function handleMessageEvent(instagramUserId: string, messaging: any, supabase: any) {
    try {
        const senderIgsid = messaging.sender?.id;
        const message = messaging.message;

        // Detect story interaction: reply_to.story_id OR story_mention attachment
        const isStoryReply = !!message?.reply_to?.story_id;
        const isStoryMention = message?.attachments?.some(
            (att: any) => att.type === 'story_mention'
        );

        if (isStoryReply || isStoryMention) {
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

            // Guard against null user (TypeScript strict)
            if (!user) return;

            const { data: automation } = await supabase
                .from("automations")
                .select("*")
                .eq("user_id", user.id)
                .eq("trigger_type", "story_reply")
                .eq("is_active", true)
                .maybeSingle();

            if (!automation) {
                logger.info("No active story_reply automation found", { userId: user.id });
                return;
            }

            // Idempotency: prevent duplicate DMs for the same sender + automation
            const storyInteractionId = message?.reply_to?.story_id
                || `story_mention_${messaging.timestamp || Date.now()}`;

            const { data: alreadySent } = await supabase
                .from("dm_logs")
                .select("id")
                .eq("instagram_user_id", senderIgsid)
                .eq("automation_id", automation.id)
                .eq("instagram_comment_id", storyInteractionId)
                .maybeSingle();

            if (alreadySent) {
                logger.info("Skipping duplicate story DM", { senderIgsid, storyInteractionId });
                return;
            }

            // Rate limit check
            const planLimits = getPlanLimits(user.plan_type || 'free');
            const rateLimitResult = await smartRateLimit(user.id, {
                hourlyLimit: planLimits.dmsPerHour,
                monthlyLimit: planLimits.dmsPerMonth || 1000,
                spreadDelay: false,
            });

            if (!rateLimitResult.allowed) {
                logger.info("Rate limit hit for story DM, queuing", {
                    userId: user.id,
                    remaining: rateLimitResult.remaining
                });
                await queueDM(
                    user.id,
                    {
                        commentId: storyInteractionId,
                        commenterId: senderIgsid,
                        message: automation.reply_message,
                        automation_id: automation.id
                    },
                    rateLimitResult.estimatedSendTime || new Date(Date.now() + 60000),
                    user.plan_type === 'pro' || user.plan_type === 'starter' ? 10 : 5
                );
                return;
            }

            // Send the DM
            const dmSent = await sendInstagramDM(
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

            if (dmSent) {
                await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
            } else {
                await incrementAutomationCount(supabase, automation.id, "dm_failed_count");
            }

            // Log the DM so it appears in Analytics
            await supabase.from("dm_logs").insert({
                user_id: user.id,
                automation_id: automation.id,
                instagram_comment_id: storyInteractionId,
                instagram_user_id: senderIgsid,
                instagram_username: messaging.sender?.username || "Instagram User",
                keyword_matched: isStoryMention ? "STORY_MENTION" : "STORY_REPLY",
                comment_text: message?.text || (isStoryMention ? "Story Mention" : "Story Reply"),
                reply_sent: dmSent,
                reply_sent_at: dmSent ? new Date().toISOString() : null,
                is_follow_gate: false,
                user_is_following: true
            });

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
                .select("id, instagram_access_token, instagram_username")
                .eq("id", automation.user_id)
                .single();

            if (!user) return;

            // Check if follow-gate is required
            if (automation.require_follow) {
                const isFollowing = await checkIsFollowing(
                    user.instagram_access_token,
                    senderIgsid
                );

                if (!isFollowing) {
                    // User is not following - send follow-gate card
                    logger.info("User clicked but not following, sending follow-gate", { senderIgsid });

                    const followGateMsg = automation.follow_gate_message ||
                        `To unlock this, please follow us first! 👋`;

                    const cardSent = await sendFollowGateCard(
                        user.instagram_access_token,
                        instagramUserId,
                        null,
                        senderIgsid,
                        automation.id,
                        user.instagram_username || '',
                        automation.media_thumbnail_url,
                        followGateMsg
                    );

                    if (cardSent) {
                        await incrementAutomationCount(supabase, automation.id, "click_count");

                        // Mark the ORIGINAL interaction (Greeting) as clicked
                        const { data: latestLog } = await supabase
                            .from("dm_logs")
                            .select("id, instagram_username")
                            .eq("instagram_user_id", senderIgsid)
                            .eq("automation_id", automation.id)
                            .order("created_at", { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (latestLog) {
                            await supabase
                                .from("dm_logs")
                                .update({ is_clicked: true })
                                .eq("id", latestLog.id);
                        }

                        // Log as follow-gate attempt
                        // Use username from previous log if available
                        const username = latestLog?.instagram_username || "";

                        await supabase.from("dm_logs").insert({
                            user_id: user.id,
                            automation_id: automation.id,
                            instagram_comment_id: `${Date.now()}_followgate`,
                            instagram_user_id: senderIgsid,
                            instagram_username: username,
                            keyword_matched: automation.trigger_keyword || "ANY",
                            comment_text: "Button click - follow gate",
                            reply_sent: true,
                            reply_sent_at: new Date().toISOString(),
                            is_follow_gate: true,
                            user_is_following: false,
                        });
                    }
                    return;
                }
            }

            // User is following (or no follow-gate required) - send final link
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

                // FIX: Only update the specific log for this interaction
                const { data: latestLog } = await supabase
                    .from("dm_logs")
                    .select("id")
                    .eq("instagram_user_id", senderIgsid)
                    .eq("automation_id", automation.id)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                if (latestLog) {
                    await supabase
                        .from("dm_logs")
                        .update({ is_clicked: true })
                        .eq("id", latestLog.id);
                }
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
                // They are following! Send FINAL message with actual link
                logger.info("User verified as following, sending final link", { senderIgsid });

                const dmSent = await sendInstagramDM(
                    user.instagram_access_token,
                    instagramUserId,
                    null,
                    senderIgsid,
                    automation.final_message || automation.reply_message,
                    automation.id,
                    automation.final_button_text || "Open Link",
                    automation.link_url, // Send actual link - creates single "Open Link" button
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
                logger.info("User not yet following, sending gate again", { senderIgsid });

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
        logger.error("Error in handleMessageEvent", { instagramUserId }, error as Error);
    }
}

function checkKeywordMatch(triggerType: string, triggerKeyword: string | null, commentText: string): boolean {
    if (triggerType === "any") return true;
    if (!triggerKeyword) return false;
    const normalizedComment = commentText.toLowerCase().trim();
    const normalizedKeyword = triggerKeyword.toLowerCase().trim();
    return normalizedComment.includes(normalizedKeyword);
}
