import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
    sendInstagramDM,
    replyToComment,
    checkFollowStatus,
    checkIsFollowing,
    getUniqueMessage,
    incrementAutomationCount,
    sendFollowGateCard,
    hasReceivedFollowGate,
    getMediaDetails
} from "@/lib/instagram/service";
import { smartRateLimit, queueDM } from "@/lib/smart-rate-limiter";
import { getCachedUser, setCachedUser, getCachedAutomation, setCachedAutomation } from "@/lib/cache";
import { getPlanLimits } from "@/lib/pricing";
import { logger } from "@/lib/logger";

/**
 * Handle a comment event from the batch
 */
export async function handleCommentEvent(instagramUserId: string, eventData: any, supabase: any, webhookCreatedAt?: string) {
    try {
        const { id: commentId, text: commentText, from, media, parent_id } = eventData;
        const commenterId = from?.id;
        const commenterUsername = from?.username;
        const mediaId = media?.id;

        if (!mediaId || !commenterId) return;

        // 1. IGNORE REPLIES (Prevent Loops) - Unless strictly configured (later)
        if (parent_id) return;

        // 1b. ENFORCE 24-HOUR WINDOW (Meta Policy)
        const eventTime = webhookCreatedAt ? new Date(webhookCreatedAt).getTime() : Date.now();
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

        // Add a 5-minute buffer for processing delays to be perfectly safe
        if (eventTime < (twentyFourHoursAgo + 5 * 60 * 1000)) {
            logger.warn("Skipping comment older than 24 hours", { instagramUserId, commenterId, eventTime: new Date(eventTime).toISOString() });
            return;
        }

        // 2. Find the user (with caching)
        let user = await getCachedUser(instagramUserId);

        // If user not in cache OR user in cache is missing critical username (needed for follow-gate)
        if (!user || !user.instagram_username) {
            const { data: dbUser } = await supabase
                .from("users")
                .select("id, instagram_access_token, instagram_user_id, instagram_username, plan_type, created_at")
                .eq("instagram_user_id", instagramUserId)
                .single();

            if (!dbUser) return;
            user = dbUser;
            // Update cache with fresh data including username
            await setCachedUser(instagramUserId, dbUser);
        }

        // P1 Audit Fix: Enforce Plan Expiry (Cache Override)
        // Even if cache says 'pro', check the timestamp to prevent 5-min leak
        if (user && user.plan_type !== 'free' && user.plan_expires_at) {
            if (new Date(user.plan_expires_at).getTime() < Date.now()) {
                logger.info("Plan expired during cached session — enforcing FREE limits", { userId: user.id });
                user.plan_type = 'free';
            }
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

            // Priority 2: Global fallback (Any Post / Next Post)
            if (!matchedAutomation) {
                // Try Any Post first
                matchedAutomation = allAutomations.find((a: any) =>
                    a.trigger_type === 'all_posts' || a.media_id === 'ALL_MEDIA' || !a.media_id
                );

                // Then try Next Post
                if (!matchedAutomation) {
                    matchedAutomation = allAutomations.find((a: any) =>
                        a.trigger_type === 'next_posts' || a.media_id === 'NEXT_MEDIA'
                    );
                }

                if (matchedAutomation) {
                    logger.info("Using global fallback automation", {
                        automationId: matchedAutomation.id,
                        type: matchedAutomation.trigger_type
                    });
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

        // 5b. Timestamp Check for 'Next Post'
        if (automation.trigger_type === 'next_posts' || automation.media_id === 'NEXT_MEDIA') {
            const mediaDetails = await getMediaDetails(user.instagram_access_token, mediaId);
            if (!mediaDetails) {
                logger.warn("Could not fetch media details for Next Post validation", { mediaId });
                return;
            }

            const mediaTime = new Date(mediaDetails.timestamp).getTime();
            const automationTime = new Date(automation.created_at).getTime();

            if (mediaTime <= automationTime) {
                logger.info("Skipping 'Next Post' trigger: Media created before automation", {
                    mediaId,
                    mediaTime: new Date(mediaTime).toISOString(),
                    automationTime: new Date(automationTime).toISOString()
                });
                return;
            }
        }

        // 6. Check keyword match
        if (!checkKeywordMatch(automation.trigger_type, automation.trigger_keyword ?? null, commentText)) {
            logger.info("Keyword mismatch", { commentText, triggerKeyword: automation.trigger_keyword || "any" });
            return;
        }

        // ENFORCE FREQUENCY CAPPING (1 message per user per 24 hours PER AUTOMATION)
        const twentyFourHoursAgoISO = new Date(twentyFourHoursAgo).toISOString();
        const { data: recentDms, error: recentDmError } = await supabase
            .from("dm_logs")
            .select("id")
            .eq("user_id", user.id) // From this Creator
            .eq("instagram_user_id", commenterId) // To this specific commenter
            .eq("automation_id", automation.id) // Scoped to THIS automation
            .gte("created_at", twentyFourHoursAgoISO)
            .limit(1);

        if (recentDmError && recentDmError.code !== 'PGRST116') {
            logger.warn("Error checking recent DMs", { error: recentDmError });
        } else if (recentDms && recentDms.length > 0) {
            logger.info("Frequency cap hit: User already received THIS automation DM in the last 24h", { commenterUsername, "automation_id": automation.id });
            return;
        }

        // 7. QUEUE PUBLIC REPLY (Safety First - Human Delay)
        // Meta counts both Public Replies and DMs towards the 200/hour limit.
        // We now queue the reply to include a random human-like delay (30-120s).
        const templates: string[] = automation.comment_reply_templates || [];
        const singleReply = automation.comment_reply;
        let selectedReply = "";

        if (templates.length > 0) {
            const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
            selectedReply = getUniqueMessage(randomTemplate, commenterUsername);
        } else if (singleReply && singleReply.trim().length > 0) {
            selectedReply = getUniqueMessage(singleReply, commenterUsername);
        }

        if (selectedReply) {
            // Check Rate Limit for Public Reply
            const limits = getPlanLimits(user.plan_type || "free");
            const rateLimit = await smartRateLimit(
                user.id,
                {
                    hourlyLimit: limits.commentsPerHour || 190,
                    monthlyLimit: limits.dmsPerMonth || 1000,
                    spreadDelay: false,
                    type: 'comment',
                    dryRun: false // Increment instantly if sent
                },
                user.created_at
            );

            if (rateLimit.allowed) {
                const replySent = await replyToComment(
                    user.instagram_access_token,
                    commentId,
                    selectedReply,
                    supabase,
                    user.id
                );

                if (replySent) {
                    await incrementAutomationCount(supabase, automation.id, "comment_count");
                    logger.info("Public reply sent instantly", { commenterUsername, automationId: automation.id });
                }
            } else {
                logger.warn("Public reply rate limited, pushing to queue", { userId: user.id });
                await queueDM(user.id, {
                    commentId: commentId,
                    commenterId: commenterId,
                    message: `__PUBLIC_REPLY__:${selectedReply}`,
                    automation_id: automation.id
                });
            }
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

        // 9. QUEUE THE DM (Safety First - Human Delay)
        // Instead of sending instantly, we ALWAYS queue the initial greeting/DM.
        // This ensures every lead gets a random delay, which is safer than ManyChat.

        let dmMessage = getUniqueMessage(automation.reply_message, commenterUsername);
        let buttonText = automation.button_text || "Get Link";
        let directLink = automation.link_url || undefined;
        // The Opening DM ALWAYS uses a postback button.
        // We never send the direct link in step 1, matching the wizard flow explicitly.
        const finalLinkUrlToSend = undefined;

        const limits = getPlanLimits(user.plan_type || "free");
        const rateLimit = await smartRateLimit(
            user.id,
            {
                hourlyLimit: limits.dmsPerHour || 190,
                monthlyLimit: limits.dmsPerMonth || 1000,
                spreadDelay: false,
                type: 'dm',
                dryRun: false // Increment instantly if sent
            },
            user.created_at
        );

        if (rateLimit.allowed) {
            // STEP 1: Send exact wizard match (Text + Button in one card)
            const dmSent = await sendInstagramDM(
                user.instagram_access_token,
                user.instagram_user_id,
                commentId,
                commenterId,
                dmMessage,
                automation.id,
                buttonText,
                finalLinkUrlToSend,
                automation.media_thumbnail_url || undefined,
                supabase,
                user.id
            );

            if (dmSent) {
                await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                logger.info("Direct DM sent instantly (Wizard Matched Card)", { commenterUsername, automationId: automation.id });
            }
        } else {
            logger.warn("Direct DM rate limited, pushing to queue", { userId: user.id });
            await queueDM(user.id, {
                commentId: commentId,
                commenterId: commenterId,
                message: dmMessage,
                automation_id: automation.id
            });
        }

    } catch (error) {
        logger.error("Error in handleCommentEvent", { instagramUserId }, error as Error);
    }
}

/**
 * Handle messaging events
 */
export async function handleMessageEvent(instagramUserId: string, messaging: any, supabase: any, webhookCreatedAt?: string) {
    try {
        const senderIgsid = messaging.sender?.id;
        const message = messaging.message;

        logger.info("Handling message event", {
            instagramUserId,
            sender: senderIgsid,
            messageSnippet: message?.text?.substring(0, 20),
            hasReplyTo: !!message?.reply_to,
            hasAttachments: !!message?.attachments,
            payload: JSON.stringify(messaging).substring(0, 500) // Log first 500 chars of payload
        });

        // ENFORCE 24-HOUR WINDOW (Meta Policy)
        const eventTime = webhookCreatedAt ? new Date(webhookCreatedAt).getTime() : Date.now();
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        if (eventTime < (twentyFourHoursAgo + 5 * 60 * 1000)) {
            logger.warn("Skipping message older than 24 hours", { instagramUserId, senderIgsid, eventTime: new Date(eventTime).toISOString() });
            return;
        }

        // Detect story interaction: reply_to.story object exists
        const isStoryReply = !!message?.reply_to?.story;
        const isStoryMention = message?.attachments?.some(
            (att: any) => att.type === 'story_mention'
        );

        if (isStoryReply || isStoryMention) {
            logger.info("Processing story event", {
                isStoryReply,
                isStoryMention,
                sender: senderIgsid,
                recipient: instagramUserId
            });

            let user = await getCachedUser(instagramUserId);
            if (!user) {
                const { data: dbUser } = await supabase
                    .from("users")
                    .select("*")
                    .eq("instagram_user_id", instagramUserId)
                    .single();
                if (!dbUser) {
                    logger.warn("User not found for story event", { instagramUserId });
                    return;
                }
                user = dbUser;
                await setCachedUser(instagramUserId, dbUser);
            }

            // P1 Audit Fix: Enforce Plan Expiry (Cache Override)
            if (user && user.plan_type !== 'free' && user.plan_expires_at) {
                if (new Date(user.plan_expires_at).getTime() < Date.now()) {
                    logger.info("Plan expired during cached session (story) — enforcing FREE limits", { userId: user.id });
                    user.plan_type = 'free';
                }
            }

            // Guard against null user (TypeScript strict)
            if (!user) return;

            const { data: automation, error: automationError } = await supabase
                .from("automations")
                .select("*")
                .eq("user_id", user.id)
                .eq("trigger_type", "story_reply")
                .eq("is_active", true)
                .maybeSingle();

            if (automationError) {
                logger.error("Error fetching automation", { userId: user.id, error: automationError });
                return;
            }

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

            // ENFORCE FREQUENCY CAPPING (1 message per user per 24 hours PER AUTOMATION)
            const twentyFourHoursAgoISO = new Date(twentyFourHoursAgo).toISOString();
            const { data: recentDms, error: recentDmError } = await supabase
                .from("dm_logs")
                .select("id")
                .eq("user_id", user.id) // From this Creator
                .eq("instagram_user_id", senderIgsid) // To this specific commenter
                .eq("automation_id", automation.id) // Scoped to THIS automation
                .gte("created_at", twentyFourHoursAgoISO)
                .limit(1);

            if (recentDmError && recentDmError.code !== 'PGRST116') {
                logger.warn("Error checking recent story DMs", { error: recentDmError });
            } else if (recentDms && recentDms.length > 0) {
                logger.info("Frequency cap hit: User already received a Story DM from this automation in the last 24h", { senderIgsid, userId: user.id, automationId: automation.id });
                return;
            }

            // 9. Send the Story DM (Safety First - Rate Limit check)
            const limits = getPlanLimits(user.plan_type || "free");
            const rateLimit = await smartRateLimit(
                user.id,
                {
                    hourlyLimit: limits.dmsPerHour || 190,
                    monthlyLimit: limits.dmsPerMonth || 1000,
                    spreadDelay: false,
                    type: 'dm',
                    dryRun: false // Increment instantly if sent
                },
                user.created_at
            );

            if (rateLimit.allowed) {
                const dmMessage = getUniqueMessage(automation.reply_message, messaging.sender?.username);
                const buttonText = automation.button_text || "View Link";

                // STEP 1: Send exact wizard match (Text + Button in one card)
                // The initial message ALWAYS uses a postback button, never a direct web_url.
                const dmSent = await sendInstagramDM(
                    user.instagram_access_token,
                    user.instagram_user_id,
                    storyInteractionId,
                    senderIgsid,
                    dmMessage,
                    automation.id,
                    buttonText,
                    undefined, // Forces postback
                    automation.media_thumbnail_url || undefined,
                    supabase,
                    user.id
                );

                if (dmSent) {
                    await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
                    logger.info("Story interaction completed instantly (Wizard Matched Card)", { senderIgsid, automationId: automation.id });
                }
            } else {
                logger.warn("Story DM rate limited, pushing to queue", { userId: user.id });
                const dmMessage = getUniqueMessage(automation.reply_message, messaging.sender?.username);
                await queueDM(user.id, {
                    commentId: storyInteractionId,
                    commenterId: senderIgsid,
                    message: dmMessage,
                    automation_id: automation.id
                });
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

                    // Rate Limit Check (Prevent Abuse of Button Clicks)
                    const planLimits = getPlanLimits(user.plan_type || 'free');
                    const limitCheck = await smartRateLimit(user.id, {
                        hourlyLimit: planLimits.dmsPerHour,
                        monthlyLimit: planLimits.dmsPerMonth || 1000,
                        spreadDelay: false,
                        type: 'dm'
                    });

                    if (!limitCheck.allowed) {
                        logger.warn("Rate limit hit during follow-gate click", { userId: user.id });
                        return; // Silently fail or maybe queue? For buttons, silent fail is often better than delayed surprise
                    }

                    const followGateMsg = automation.follow_gate_message ||
                        `To unlock this, please follow us first! 👋`;

                    const cardSent = await sendFollowGateCard(
                        user.instagram_access_token,
                        instagramUserId,
                        null,
                        senderIgsid,
                        automation.id,
                        user.instagram_username || '',
                        undefined, // No thumbnail for follow-gate card
                        followGateMsg,
                        supabase,
                        user.id
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

                        // Log as follow-gate attempt (Internal Log only, doesn't count as new conversation)
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

            // Rate Limit Check (Instant Send - Must Increment)
            const planLimits = getPlanLimits(user.plan_type || 'free');
            const limitCheck = await smartRateLimit(user.id, {
                hourlyLimit: planLimits.dmsPerHour,
                monthlyLimit: planLimits.dmsPerMonth || 1000,
                spreadDelay: false,
                type: 'dm',
                dryRun: false // COMMIT INCREMENT for instant button click
            });

            if (!limitCheck.allowed) {
                logger.warn("Rate limit hit during final link send", { userId: user.id });
                return;
            }

            const dmSent = await sendInstagramDM(
                user.instagram_access_token,
                instagramUserId,
                null,
                senderIgsid,
                getUniqueMessage(automation.final_message || "Here is the link you requested! ✨", messaging.sender?.username),
                automation.id,
                automation.final_button_text || "Open Link",
                automation.link_url,
                automation.media_thumbnail_url,
                supabase,
                user.id
            );

            if (dmSent) {
                // We DO increment click_count though as it's a conversion.
                await incrementAutomationCount(supabase, automation.id, "click_count");

                // Update the log for the interaction that led here
                const { data: latestLog } = await supabase
                    .from("dm_logs")
                    .select("id")
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
            }
            return; // Prevent fall-through to VERIFY_FOLLOW_ handler
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

            // Check if they already succeeded for this specific automation
            const { data: alreadyDone } = await supabase
                .from("dm_logs")
                .select("id")
                .eq("instagram_user_id", senderIgsid)
                .eq("automation_id", automation.id)
                .eq("followed_after_gate", true)
                .maybeSingle();

            if (alreadyDone) {
                logger.info("User already followed for this automation, ignoring click", { senderIgsid });
                return;
            }

            // Check if they are NOW following via REAL-TIME Instagram API
            // This uses is_user_follow_business field (like ManyChat/SuperProfile)
            const isFollowing = await checkIsFollowing(
                user.instagram_access_token,
                senderIgsid
            );

            if (isFollowing) {
                // They are following! Send FINAL message with actual link
                logger.info("User verified as following, sending final link", { senderIgsid });

                // Rate Limit Check
                const planLimits = getPlanLimits(user.plan_type || 'free');
                const limitCheck = await smartRateLimit(user.id, {
                    hourlyLimit: planLimits.dmsPerHour,
                    monthlyLimit: planLimits.dmsPerMonth || 1000,
                    spreadDelay: false,
                    type: 'dm'
                });

                if (!limitCheck.allowed) {
                    logger.warn("Rate limit hit during verification send", { userId: user.id });
                    return;
                }

                const dmSent = await sendInstagramDM(
                    user.instagram_access_token,
                    instagramUserId,
                    null,
                    senderIgsid,
                    getUniqueMessage(automation.final_message || automation.reply_message, messaging.sender?.username),
                    automation.id,
                    automation.final_button_text || "Open Link",
                    automation.link_url, // Send actual link - creates single "Open Link" button
                    automation.media_thumbnail_url,
                    supabase,
                    user.id
                );

                if (dmSent) {
                    // FIXED: Do NOT increment dm_sent_count here (already counted in greeting)
                    // await incrementAutomationCount(supabase, automation.id, "dm_sent_count");

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
                    undefined, // No thumbnail for follow-gate card
                    "Hmm, looks like you haven't followed yet! 🤔\n\nPlease follow us first, then tap 'I'm Following' again!",
                    supabase,
                    user.id
                );
            }
        }
    } catch (error) {
        logger.error("Error in handleMessageEvent", { instagramUserId }, error as Error);
    }
}

// Helper function for keyword matching
function checkKeywordMatch(triggerType: string, triggerKeyword: string | null, commentText: string): boolean {
    // If the trigger type explicitly says 'any', or if there's no keyword, it's a catch-all
    if (triggerType === "any" || !triggerKeyword || triggerKeyword.toLowerCase().trim() === 'any') return true;

    // Normalize comment for matching
    const normalizedComment = commentText.toLowerCase().trim();

    // Support comma-separated keywords (ManyChat style)
    const keywords = triggerKeyword.toLowerCase().split(',').map(k => k.trim()).filter(k => k.length > 0);

    if (keywords.length === 0) return true;

    return keywords.some(k => normalizedComment.includes(k));
}
