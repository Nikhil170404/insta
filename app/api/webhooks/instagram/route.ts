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
                const changes = entry.changes || [];

                for (const change of changes) {
                    // Handle comment events
                    if (change.field === "comments") {
                        await handleCommentEvent(instagramUserId, change.value);
                    }
                }
            }

            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        return new NextResponse("Not Found", { status: 404 });
    } catch (error) {
        console.error("Error processing webhook:", error);
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
        console.log("Instagram User ID:", instagramUserId);
        console.log("Event Data:", JSON.stringify(eventData, null, 2));
        console.log("-------------------------------------------");

        const { id: commentId, text: commentText, from, media } = eventData;
        const commenterId = from?.id;
        const commenterUsername = from?.username;
        const mediaId = media?.id;

        console.log("📊 Parsed Event:");
        console.log("- Comment ID:", commentId);
        console.log("- Comment Text:", commentText);
        console.log("- Commenter ID:", commenterId);
        console.log("- Commenter Username:", commenterUsername);
        console.log("- Media ID:", mediaId);

        if (!mediaId || !commenterId) {
            console.error("❌ MISSING REQUIRED DATA");
            console.error("- Missing mediaId:", !mediaId);
            console.error("- Missing commenterId:", !commenterId);
            return;
        }

        const supabase = getSupabaseAdmin();

        // 1. Find the user who owns this Instagram account
        const targetId = String(instagramUserId).trim();
        console.log(`Searching database for user with ID: "${targetId}"`);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user, error: userError } = await (supabase as any)
            .from("users")
            .select("id, instagram_access_token, instagram_user_id")
            .eq("instagram_user_id", targetId)
            .single();

        if (userError) {
            console.log("Database lookup error:", userError.message);
        }

        if (!user) {
            console.error(`❌ ERROR: No user found in 'users' table with instagram_user_id: "${targetId}"`);

            // DIAGNOSTIC: Log what we actually have in the DB
            const { data: allUsers } = await (supabase as any).from("users").select("instagram_user_id, instagram_username");
            console.log("Current Users in DB:", allUsers?.map((u: any) => `${u.instagram_username} (${u.instagram_user_id})`));

            console.log("Suggestion: Ensure the user has logged into the dashboard with this exact account.");
            return;
        }

        console.log("✅ Match found! System User ID:", user.id);

        // 2. Find automation for this media
        console.log("Looking for automation with media_id:", mediaId);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: automation, error: autoError } = await (supabase as any)
            .from("automations")
            .select("*")
            .eq("user_id", user.id)
            .eq("media_id", mediaId)
            .eq("is_active", true)
            .single();

        if (autoError) {
            console.log("Automation query error:", autoError);
        }

        if (!automation) {
            console.log("ERROR: No active automation for media:", mediaId);

            // List all automations for debugging
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: allAutos } = await (supabase as any)
                .from("automations")
                .select("media_id, is_active")
                .eq("user_id", user.id);
            console.log("All user automations:", allAutos);
            return;
        }

        console.log("Found automation:", automation.id);

        // 3. Check keyword match
        const shouldTrigger = checkKeywordMatch(
            automation.trigger_type,
            automation.trigger_keyword,
            commentText
        );

        if (!shouldTrigger) {
            console.log("Comment does not match trigger:", commentText);
            return;
        }

        console.log("Trigger matched! Preparing to send DM...");

        // 4. Check follow status if required
        if (automation.require_follow) {
            const isFollowing = await checkFollowStatus(
                user.instagram_access_token,
                instagramUserId,
                commenterId
            );

            if (!isFollowing) {
                console.log("User is not following, skipping DM");
                // Update analytics
                await incrementAutomationCount(supabase, automation.id, "comment_count");
                return;
            }
        }

        // 5. Send Public Reply (if configured)
        if (automation.comment_reply) {
            console.log("Sending public reply to comment...");
            const replySent = await replyToComment(
                user.instagram_access_token,
                commentId,
                automation.comment_reply
            );
            if (replySent) {
                console.log("Public reply sent successfully!");
            } else {
                console.log("Failed to send public reply");
            }
        }

        // 6. Send DM (Private Reply)
        const dmSent = await sendDirectMessage(
            user.instagram_access_token,
            instagramUserId,          // Sender
            commentId,                // Trigger
            commenterId,              // Recipient for logging
            automation.reply_message  // Message text
        );

        // 6. Log the result and update analytics
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
            console.log("DM sent successfully!");
        } else {
            await incrementAutomationCount(supabase, automation.id, "dm_failed_count");
            console.log("Failed to send DM");
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
    message: string
): Promise<boolean> {
    try {
        if (!accessToken || accessToken.length < 20) {
            console.error("❌ CRITICAL: Invalid or missing access token.");
            return false;
        }

        console.log(`📤 Attempting Private Reply:`);
        console.log(`- Sender ID (IGID): "${senderId}"`);
        console.log(`- Trigger Comment ID: "${commentId}"`);
        console.log(`- Target Recipient: "${recipientIdForLog}"`);

        // 2025 Native Flow: Send private reply via /{ig-user-id}/messages
        // with recipient: { comment_id: "..." }
        const response = await fetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${senderId}/messages?access_token=${accessToken}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    recipient: { comment_id: commentId },
                    message: { text: message }
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Meta Private Reply Error:", JSON.stringify(errorData, null, 2));
            return false;
        }

        const result = await response.json();
        console.log("✅ Private Reply sent successfully! Message ID:", result.message_id);
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
        const response = await fetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${commentId}/replies?access_token=${accessToken}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: message }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error sending public reply:", errorData);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Error sending public reply:", error);
        return false;
    }
}
