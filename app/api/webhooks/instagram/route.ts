import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const GRAPH_API_VERSION = "v21.0";

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

        // 11. Send DM (Private Reply)
        const dmSent = await sendDirectMessage(
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
 * Check if commenter follows the account
 */
async function checkFollowStatus(
    accessToken: string,
    accountId: string,
    commenterId: string
): Promise<boolean> {
    try {
        // Note: This endpoint requires instagram_manage_messages permission
        // and may not be available for all account types
        const response = await fetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${accountId}?` +
            `fields=followers&access_token=${accessToken}`
        );

        if (!response.ok) {
            console.log("Could not check follow status, assuming not following");
            return false;
        }

        // For now, we'll allow DMs regardless of follow status
        // since checking follow status requires additional permissions
        // TODO: Implement proper follow check when permissions are available
        return true;
    } catch (error) {
        console.error("Error checking follow status:", error);
        return true; // Allow DM on error to not block functionality
    }
}

/**
 * Send a direct message via Instagram API
 */
async function sendDirectMessage(
    accessToken: string | null | undefined,
    senderId: string,
    commentId: string,
    recipientIdForLog: string,
    message: string,
    automationId?: string,
    buttonText?: string,
    linkUrl?: string,
    thumbnailUrl?: string
): Promise<boolean> {
    try {
        if (!accessToken || accessToken.length < 20) {
            console.error("❌ CRITICAL: Invalid or missing access token.");
            return false;
        }

        console.log(`📤 Attempting ManyChat-style Premium Reply:`);
        console.log(`- Recipient (Log): "${recipientIdForLog}"`);

        const trimmedToken = accessToken.trim();
        const baseUrl = `https://graph.instagram.com/${GRAPH_API_VERSION}/${senderId}/messages?access_token=${trimmedToken}`;

        // 1. Send "Mark as Seen"
        await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: { comment_id: commentId },
                sender_action: "mark_seen"
            }),
        });

        // 2. Send "Typing..." indicator for 1 second (ManyChat feel)
        await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: { comment_id: commentId },
                sender_action: "typing_on"
            }),
        });

        // Small delay to simulate thinking
        await new Promise(resolve => setTimeout(resolve, 1500));

        let body: any;

        // ManyChat uses Generic Templates (Structured Cards) for a premium feel
        // If we have a link and a thumbnail, we send a Card.
        if (linkUrl && (buttonText || thumbnailUrl)) {
            console.log("💎 Sending Structured Template (Card)");
            body = {
                recipient: { comment_id: commentId },
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [
                                {
                                    title: buttonText || "Click to View",
                                    subtitle: message.substring(0, 80),
                                    image_url: thumbnailUrl || "",
                                    default_action: {
                                        type: "web_url",
                                        url: linkUrl
                                    },
                                    buttons: [
                                        {
                                            type: "web_url",
                                            url: linkUrl,
                                            title: (buttonText || "Open Link").substring(0, 20)
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };
        } else {
            // Fallback to text if No link or thumbnail
            console.log("📝 Sending Plain Text Message");
            body = {
                recipient: { comment_id: commentId },
                message: { text: message }
            };

            // If they just wanted a button click flow (no card)
            if (buttonText && automationId && !linkUrl) {
                body.message.quick_replies = [
                    {
                        content_type: "text",
                        title: buttonText.substring(0, 20),
                        payload: `CLICK_LINK_${automationId}`
                    }
                ];
            }
        }

        const response = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Meta API Error:", JSON.stringify(errorData, null, 2));
            return false;
        }

        console.log("✅ Premium DM sent successfully!");
        return true;
    } catch (error) {
        console.error("❌ Exception during sendDirectMessage:", error);
        return false;
    }
}

/**
 * Increment automation analytics counters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function incrementAutomationCount(supabase: any, automationId: string, field: string) {
    try {
        // Get current count
        const { data } = await supabase
            .from("automations")
            .select(field)
            .eq("id", automationId)
            .single();

        if (data) {
            const newCount = (data[field] || 0) + 1;
            await supabase
                .from("automations")
                .update({ [field]: newCount })
                .eq("id", automationId);
        }
    } catch (error) {
        console.error("Error incrementing count:", error);
    }
}

/**
 * Reply to a comment publicly via Instagram API
 */
async function replyToComment(
    accessToken: string,
    commentId: string,
    message: string
): Promise<boolean> {
    try {
        if (!message || message.trim().length === 0) {
            console.error("❌ Cannot send empty public reply.");
            return false;
        }

        console.log(`💬 Attempting Public Reply to Comment: ${commentId}`);
        console.log(`- Content: "${message}"`);

        const trimmedToken = accessToken.trim();
        // Use graph.instagram.com for public replies when using Instagram Login (Standard)
        const response = await fetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${commentId}/replies?access_token=${trimmedToken}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: message }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Meta Public Reply API Error:", JSON.stringify(errorData, null, 2));
            return false;
        }

        console.log("✅ Public reply sent successfully via graph.facebook.com!");
        return true;
    } catch (error) {
        console.error("❌ Exception sending public reply:", error);
        return false;
    }
}

/**
 * Handle messaging events (Quick Reply clicks)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleMessagingEvent(instagramUserId: string, messaging: any) {
    try {
        const senderIgsid = messaging.sender?.id;
        const quickReply = messaging.message?.quick_reply;

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

            const response = await fetch(
                `https://graph.instagram.com/${GRAPH_API_VERSION}/${instagramUserId}/messages?access_token=${trimmedToken}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        recipient: { id: senderIgsid },
                        message: { text: `Here is your link: ${automation.link_url}` }
                    }),
                }
            );

            if (response.ok) {
                console.log("✅ Final link delivered successfully!");
                await incrementAutomationCount(supabase, automation.id, "dm_sent_count");
            } else {
                const error = await response.json();
                console.error("❌ Failed to deliver link:", JSON.stringify(error, null, 2));
            }
        }
    } catch (error) {
        console.error("❌ Error in handleMessagingEvent:", error);
    }
}

/**
 * Add random variation to message to bypass Meta's spam filters (Error 1349210)
 */
function getUniqueMessage(message: string): string {
    const variations = ["📬", "✨", "✅", "💬", "🚀", "📥", "💌", "🌟", "🔥", "💎"];
    const greetings = ["Done!", "Sent!", "Check it out!", "Ready!", "There you go!"];
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const randomCode = Math.random().toString(36).substring(7).toUpperCase();

    // In Dev mode, Meta often blocks identical replies. 
    // Adding a small unique suffix and random greeting helps reliability.
    return `${randomGreeting} ${message} ${randomVariation} [${randomCode}]`;
}
