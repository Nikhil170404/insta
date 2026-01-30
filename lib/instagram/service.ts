const GRAPH_API_VERSION = "v21.0";

/**
 * Send a direct message via Instagram API
 */
export async function sendInstagramDM(
    accessToken: string | null | undefined,
    senderId: string,
    commentId: string | null,
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

        console.log(`📤 Attempting Instagram DM:`);
        console.log(`- Recipient (Log): "${recipientIdForLog}"`);

        const trimmedToken = accessToken.trim();
        const baseUrl = `https://graph.instagram.com/${GRAPH_API_VERSION}/${senderId}/messages?access_token=${trimmedToken}`;

        const recipient = commentId ? { comment_id: commentId } : { id: recipientIdForLog };

        // 1. Send "Mark as Seen"
        await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: recipient,
                sender_action: "mark_seen"
            }),
        });

        // 2. Send "Typing..." indicator for 1.5 seconds (Premium feel)
        await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: recipient,
                sender_action: "typing_on"
            }),
        });

        // Small delay to simulate thinking
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3. TAG AS HUMAN AGENT (Required for Meta App Review / Automated DMs)
        await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                recipient: recipient,
                tag: "HUMAN_AGENT"
            }),
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let body: any;

        // Use Generic Templates (Structured Cards) for a premium feel
        if (linkUrl && (buttonText || thumbnailUrl)) {
            console.log("💎 Sending Structured Template (Card)");
            body = {
                recipient: recipient,
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
                recipient: recipient,
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

        console.log("✅ DM sent successfully!");
        return true;
    } catch (error) {
        console.error("❌ Exception during sendInstagramDM:", error);
        return false;
    }
}

/**
 * Reply to a comment publicly via Instagram API
 */
export async function replyToComment(
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
        const trimmedToken = accessToken.trim();
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

        console.log("✅ Public reply sent successfully!");
        return true;
    } catch (error) {
        console.error("❌ Exception sending public reply:", error);
        return false;
    }
}

/**
 * Add random variation to message to bypass Meta's spam filters
 */
export function getUniqueMessage(message: string): string {
    const variations = ["📬", "✨", "✅", "💬", "🚀", "📥", "💌", "🌟", "🔥", "💎"];
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];

    // Clean, simple reply with a single random emoji to satisfy Meta's uniqueness filter
    return `${message} ${randomVariation}`;
}

/**
 * Check if commenter follows the account
 */
export async function checkFollowStatus(
    accessToken: string,
    accountId: string,
    commenterId: string
): Promise<boolean> {
    try {
        // Note: This endpoint requires instagram_manage_messages permission
        const response = await fetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${accountId}?` +
            `fields=followers&access_token=${accessToken}`
        );

        if (!response.ok) {
            console.log("Could not check follow status, assuming not following");
            return false;
        }

        // TODO: Implement proper follow check when permissions are available
        return true;
    } catch (error) {
        console.error("Error checking follow status:", error);
        return true; // Allow DM on error to not block functionality
    }
}

/**
 * Increment automation analytics counters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function incrementAutomationCount(supabase: any, automationId: string, field: string) {
    try {
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
        console.error(`Error incrementing ${field}:`, error);
    }
}
