const GRAPH_API_VERSION = "v21.0";

/**
 * Check if user is following the business account
 * Uses Instagram's official is_user_follow_business API field
 * This is how ManyChat/SuperProfile do it!
 */
export async function checkIsFollowing(
    accessToken: string,
    userInstagramScopedId: string
): Promise<boolean> {
    try {
        const response = await fetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${userInstagramScopedId}?fields=is_user_follow_business&access_token=${accessToken}`
        );

        if (!response.ok) {
            console.log("❌ Could not check follow status via API");
            return false;
        }

        const data = await response.json();
        console.log(`📋 Follow check for ${userInstagramScopedId}:`, data);

        return data.is_user_follow_business === true;
    } catch (error) {
        console.error("Error checking is_user_follow_business:", error);
        return false;
    }
}

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
        } else if (buttonText && automationId && !linkUrl) {
            // Greeting card with postback button (no direct link)
            // User clicks button → triggers CLICK_LINK_ handler → sends actual link
            console.log("💬 Sending Greeting Card with Postback Button");
            body = {
                recipient: recipient,
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [
                                {
                                    title: message.substring(0, 80) || "You have a message!",
                                    subtitle: "Tap below to continue ✨",
                                    image_url: thumbnailUrl || "",
                                    buttons: [
                                        {
                                            type: "postback",
                                            title: buttonText.substring(0, 20),
                                            payload: `CLICK_LINK_${automationId}`
                                        }
                                    ]
                                }
                            ]
                        }
                    }
                }
            };
        } else {
            // Fallback to plain text if no button needed
            console.log("📝 Sending Plain Text Message");
            body = {
                recipient: recipient,
                message: { text: message }
            };
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
 * Send follow-gate card with two buttons (ManyChat style):
 * 1. "Follow & Get Access" - Links to profile
 * 2. "I'm Following ✓" - Triggers verification check
 */
export async function sendFollowGateCard(
    accessToken: string,
    senderId: string,
    commentId: string | null,
    recipientId: string,
    automationId: string,
    profileUsername: string,
    thumbnailUrl?: string,
    customMessage?: string
): Promise<boolean> {
    try {
        const trimmedToken = accessToken.trim();
        const baseUrl = `https://graph.instagram.com/${GRAPH_API_VERSION}/${senderId}/messages?access_token=${trimmedToken}`;
        const recipient = commentId ? { comment_id: commentId } : { id: recipientId };

        // Typing indicator
        await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipient, sender_action: "typing_on" }),
        });
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Tag as human agent
        await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ recipient, tag: "HUMAN_AGENT" }),
        });

        const message = customMessage || "Hey! 👋 To unlock this, please follow us first!";

        // Send the follow-gate card with TWO buttons
        const body = {
            recipient: recipient,
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [
                            {
                                title: "Follow & Get Access",
                                subtitle: message,
                                image_url: thumbnailUrl || "",
                                buttons: [
                                    {
                                        type: "web_url",
                                        url: `https://instagram.com/${profileUsername}`,
                                        title: "Follow & Get Access"
                                    },
                                    {
                                        type: "postback",
                                        title: "I'm Following ✓",
                                        payload: `VERIFY_FOLLOW_${automationId}`
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        };

        const response = await fetch(baseUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("❌ Follow-gate card error:", JSON.stringify(errorData, null, 2));
            return false;
        }

        console.log("✅ Follow-gate card sent with verification button!");
        return true;
    } catch (error) {
        console.error("❌ Exception sending follow-gate card:", error);
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
    return `${message} ${randomVariation}`;
}

/**
 * Check if user is a known follower (from our tracking table) - Fallback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkFollowStatus(
    supabase: any,
    userId: string,
    followerInstagramId: string
): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from("follow_tracking")
            .select("is_following")
            .eq("user_id", userId)
            .eq("follower_instagram_id", followerInstagramId)
            .single();

        if (error || !data) {
            return false;
        }

        return data.is_following === true;
    } catch (error) {
        console.error("Error checking follow status from DB:", error);
        return false;
    }
}

/**
 * Check if user has ALREADY received follow-gate for this automation
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hasReceivedFollowGate(
    supabase: any,
    userId: string,
    automationId: string,
    commenterInstagramId: string
): Promise<boolean> {
    try {
        const { data } = await supabase
            .from("dm_logs")
            .select("id")
            .eq("user_id", userId)
            .eq("automation_id", automationId)
            .eq("instagram_user_id", commenterInstagramId)
            .eq("is_follow_gate", true)
            .single();

        return !!data;
    } catch {
        return false;
    }
}

/**
 * Record a follow event (called from webhook handler)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function recordFollowEvent(
    supabase: any,
    userId: string,
    followerInstagramId: string,
    followerUsername: string | null,
    isFollowing: boolean
): Promise<void> {
    try {
        const { error } = await supabase
            .from("follow_tracking")
            .upsert({
                user_id: userId,
                follower_instagram_id: followerInstagramId,
                follower_username: followerUsername,
                is_following: isFollowing,
                followed_at: isFollowing ? new Date().toISOString() : undefined,
                unfollowed_at: !isFollowing ? new Date().toISOString() : undefined,
            }, {
                onConflict: 'user_id,follower_instagram_id',
            });

        if (error) {
            console.error("Error recording follow event:", error);
        } else {
            console.log(`✅ Recorded ${isFollowing ? 'follow' : 'unfollow'} for ${followerUsername || followerInstagramId}`);
        }
    } catch (error) {
        console.error("Exception recording follow event:", error);
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
