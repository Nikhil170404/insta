import { logger } from "@/lib/logger";
import { redis } from "@/lib/upstash"; // ADDED: Shared across Vercel functions

const GRAPH_API_VERSION = "v21.0";

// ============================================================
// Meta Rate Limit Header Tracking (ManyChat/SuperProfile pattern)
// ============================================================

export interface MetaRateLimitInfo {
    callCount: number;       // % of allowed calls used (0-100)
    totalCpuTime: number;    // % of CPU time used (0-100)
    totalTime: number;       // % of total time used (0-100)
    estimatedTimeToRegain: number;  // minutes until unthrottled
    type?: string;           // e.g. "instagram", "messenger"
}

/**
 * Parse Meta rate limit headers from API response.
 * Reads X-Business-Use-Case-Usage (BUC) or X-App-Usage (Platform).
 */
export async function parseMetaRateLimitHeaders(response: Response, accountId?: string): Promise<MetaRateLimitInfo | null> {
    try {
        // Try BUC header first (Instagram Platform uses this)
        const bucHeader = response.headers.get("x-business-use-case-usage");
        if (bucHeader) {
            const parsed = JSON.parse(bucHeader);
            // BUC header is keyed by business-object-id, get first entry
            const entries = Object.values(parsed) as any[][];
            if (entries.length > 0 && entries[0].length > 0) {
                const usage = entries[0][0];
                const info: MetaRateLimitInfo = {
                    callCount: usage.call_count || 0,
                    totalCpuTime: usage.total_cputime || 0,
                    totalTime: usage.total_time || 0,
                    estimatedTimeToRegain: usage.estimated_time_to_regain_access || 0,
                    type: usage.type,
                };
                const cacheKey = accountId || "default";
                // Background update Upstash Redis (5 min TTL)
                redis.set(`meta_rate_limit:${cacheKey}`, { info, updatedAt: Date.now() }, { ex: 300 }).catch(err =>
                    logger.debug("Failed to set meta_rate_limit cache", { err: err.message })
                );

                // Log warnings at different thresholds
                if (info.callCount >= 95) {
                    logger.error("Meta API rate limit CRITICAL", { ...info, accountId, category: "instagram" });
                } else if (info.callCount >= 80) {
                    logger.warn("Meta API rate limit HIGH", { ...info, accountId, category: "instagram" });
                } else if (info.callCount >= 50) {
                    logger.debug("Meta API rate limit moderate", { ...info, accountId, category: "instagram" });
                }
                return info;
            }
        }

        // Fallback: Platform rate limit header
        const appHeader = response.headers.get("x-app-usage");
        if (appHeader) {
            const usage = JSON.parse(appHeader);
            const info: MetaRateLimitInfo = {
                callCount: usage.call_count || 0,
                totalCpuTime: usage.total_cputime || 0,
                totalTime: usage.total_time || 0,
                estimatedTimeToRegain: 0,
            };
            const cacheKey = accountId || "default";
            // Background update Upstash Redis (5 min TTL)
            redis.set(`meta_rate_limit:${cacheKey}`, { info, updatedAt: Date.now() }, { ex: 300 }).catch(err =>
                logger.debug("Failed to set meta_rate_limit cache", { err: err.message })
            );

            if (info.callCount >= 80) {
                logger.warn("Meta API platform rate limit HIGH", { ...info, accountId, category: "instagram" });
            }
            return info;
        }
    } catch (e) {
        // Header parsing should never break the main flow
        logger.debug("Failed to parse Meta rate limit headers", { category: "instagram" });
    }
    return null;
}

/**
 * Check if we should throttle API calls based on cached rate limit info.
 * Returns delay in ms to wait (0 = no throttle).
 */
export async function shouldThrottle(accountId?: string): Promise<{ throttled: boolean; delayMs: number; info?: MetaRateLimitInfo }> {
    const cacheKey = accountId || "default";

    // Fetch from central Redis instead of broken memory Map
    const cached = await redis.get<{ info: MetaRateLimitInfo; updatedAt: number }>(`meta_rate_limit:${cacheKey}`);

    if (!cached) return { throttled: false, delayMs: 0 };

    // Cache is stale after 5 minutes — ignore (Redis 'ex' also handles this)
    if (Date.now() - cached.updatedAt > 5 * 60 * 1000) {
        await redis.del(`meta_rate_limit:${cacheKey}`);
        return { throttled: false, delayMs: 0 };
    }

    const { info } = cached;
    const maxUsage = Math.max(info.callCount, info.totalCpuTime, info.totalTime);

    if (maxUsage >= 95) {
        // Hard throttle: wait for estimated regain time or 60s
        const delayMs = info.estimatedTimeToRegain > 0 ? info.estimatedTimeToRegain * 60 * 1000 : 60000;
        return { throttled: true, delayMs, info };
    }
    if (maxUsage >= 80) {
        // Soft throttle: slow down with 2-5 second delays
        const delayMs = Math.floor(2000 + (maxUsage - 80) * 200); // 2s at 80%, 5s at 95%
        return { throttled: false, delayMs, info };
    }

    return { throttled: false, delayMs: 0, info };
}

// ============================================================
// 1.5: Centralized Graph API fetch helper
// Sends access_token via Authorization header instead of URL query param.
// Prevents token leakage via server logs and referrer headers.
// NOTE: config.ts OAuth endpoints still use query params per Meta spec.
// ============================================================

interface GraphApiFetchOptions {
    method?: string;
    body?: any;
    contentType?: string;
    accountId?: string; // For rate limit header tracking
}

async function graphApiFetch(
    url: string,
    accessToken: string,
    options: GraphApiFetchOptions = {}
): Promise<Response> {
    const { method = "GET", body, contentType = "application/json", accountId } = options;

    const headers: Record<string, string> = {
        "Authorization": `Bearer ${accessToken.trim()}`,
    };

    if (body && method !== "GET") {
        headers["Content-Type"] = contentType;
    }

    const fetchOptions: RequestInit = {
        method,
        headers,
    };

    if (body && method !== "GET") {
        fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    // Parse rate limit headers from every response
    parseMetaRateLimitHeaders(response, accountId);

    return response;
}

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
        const response = await graphApiFetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${userInstagramScopedId}?fields=is_user_follow_business`,
            accessToken
        );

        if (!response.ok) {
            logger.warn("Could not check follow status via API", { userInstagramScopedId, category: "instagram" });
            return false;
        }

        const data = await response.json();
        logger.debug("Follow check result", { userInstagramScopedId, isFollowing: data.is_user_follow_business, category: "instagram" });

        return data.is_user_follow_business === true;
    } catch (error) {
        logger.error("Error checking is_user_follow_business", { category: "instagram" }, error as Error);
        return false;
    }
}

/**
 * Send a direct message via Instagram API
 * 
 * OPTIMIZED: Sends only 1 API call per DM (was 4 before).
 * - Removed mark_seen (not needed for automated DMs)
 * - Removed typing_on + 1.5s delay (wastes API quota & time)
 * - Removed separate HUMAN_AGENT tag (incorrect usage per Meta docs)
 * - Reads rate limit headers from Meta response for auto-throttling
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
    thumbnailUrl?: string,
    supabase?: any,
    userId?: string
): Promise<boolean> {
    try {
        if (!accessToken || accessToken.length < 20) {
            logger.error("Invalid or missing access token", { category: "instagram" });
            return false;
        }

        // Check Meta rate limit before sending
        const throttle = await shouldThrottle(senderId);
        if (throttle.throttled) {
            logger.warn("Meta rate limit reached — skipping DM", {
                senderId,
                recipientId: recipientIdForLog,
                delayMs: throttle.delayMs,
                callCount: throttle.info?.callCount,
                category: "instagram",
            });
            return false;
        }
        // If soft throttle (80-95%), add a small delay
        if (throttle.delayMs > 0) {
            logger.info("Meta rate limit soft throttle — adding delay", {
                delayMs: throttle.delayMs,
                callCount: throttle.info?.callCount,
                category: "instagram",
            });
            await new Promise(resolve => setTimeout(resolve, throttle.delayMs));
        }

        logger.info("Sending Instagram DM", {
            recipientId: recipientIdForLog,
            hasButton: !!buttonText,
            hasLink: !!linkUrl,
            category: "instagram",
        });

        const baseUrl = `https://graph.instagram.com/${GRAPH_API_VERSION}/${senderId}/messages`;
        const recipient = commentId ? { comment_id: commentId } : { id: recipientIdForLog };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let body: any;

        // Validated URL
        const validatedLinkUrl = ensureUrlProtocol(linkUrl);

        // Use Generic Templates (Structured Cards) for a premium feel
        if (validatedLinkUrl && (buttonText || thumbnailUrl)) {
            // Build element - EXPLICITLY creating a SINGLE button array
            const singleButton = {
                type: "web_url",
                url: validatedLinkUrl,
                title: (buttonText || "Open Link").substring(0, 20)
            };

            const element: any = {
                title: message.substring(0, 80) || "You have a message!",
                subtitle: (buttonText || "Tap below to continue ✨").substring(0, 80),
                buttons: [singleButton]
            };

            if (thumbnailUrl) {
                element.image_url = thumbnailUrl;
            }

            body = {
                recipient,
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [element]
                        }
                    }
                }
            };
        } else if (buttonText && automationId && !linkUrl) {
            // Greeting card with postback button (no direct link)
            const postbackButton = {
                type: "postback",
                title: buttonText.substring(0, 20),
                payload: `CLICK_LINK_${automationId}`
            };

            const element: any = {
                title: message.substring(0, 80) || "You have a message!",
                subtitle: "Tap below to continue ✨",
                buttons: [postbackButton]
            };

            if (thumbnailUrl) {
                element.image_url = thumbnailUrl;
            }

            body = {
                recipient,
                message: {
                    attachment: {
                        type: "template",
                        payload: {
                            template_type: "generic",
                            elements: [element]
                        }
                    }
                }
            };
        } else {
            // Plain text message
            body = {
                recipient,
                message: { text: message }
            };
        }

        // === SINGLE API CALL (was 4 before) ===
        const response = await graphApiFetch(baseUrl, accessToken, {
            method: "POST",
            body,
            accountId: senderId,
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorCode = errorData?.error?.code;

            // 3.4: Handle Meta rate limit error codes
            // 80002 = Instagram BUC rate limit, 4 = app rate limit
            if (errorCode === 80002 || errorCode === 4) {
                logger.warn("Meta API rate limit error — marking account throttled", {
                    errorCode,
                    senderId,
                    recipientId: recipientIdForLog,
                    category: "instagram",
                });
                // Force throttle by setting callCount to 100%
                const cacheKey = senderId || "default";
                const estimatedMins = errorData?.error?.estimated_time_to_regain_access || 5;
                await redis.set(`meta_rate_limit:${cacheKey}`, {
                    info: {
                        callCount: 100,
                        totalCpuTime: 0,
                        totalTime: 0,
                        estimatedTimeToRegain: estimatedMins,
                    },
                    updatedAt: Date.now(),
                }, { ex: Math.max(300, estimatedMins * 60) }); // Enforce redis TTL to match regain time or 5min min
            }

            // 3.5: Auto-pause mechanism for Spam/Block errors
            if (errorCode === 368 || errorCode === 10 || errorCode === 32) {
                logger.error("Meta API Critical Block — auto-pausing user automations", {
                    errorCode, senderId, userId, category: "instagram"
                });
                if (supabase && userId) {
                    await supabase.from("automations").update({ is_active: false }).eq("user_id", userId);
                }
            }

            logger.error("Meta API DM Error", {
                errorCode,
                errorMessage: errorData?.error?.message,
                recipientId: recipientIdForLog,
                category: "instagram",
            });
            return false;
        }

        logger.info("DM sent successfully", { recipientId: recipientIdForLog, category: "instagram" });
        return true;
    } catch (error) {
        logger.error("Exception during sendInstagramDM", { category: "instagram" }, error as Error);
        return false;
    }
}

/**
 * Send follow-gate card with two buttons (ManyChat style):
 * 1. "Follow & Get Access" - Links to profile
 * 2. "I'm Following ✓" - Triggers verification check
 * 
 * OPTIMIZED: 1 API call (was 3 — removed typing_on & HUMAN_AGENT)
 */
export async function sendFollowGateCard(
    accessToken: string,
    senderId: string,
    commentId: string | null,
    recipientId: string,
    automationId: string,
    profileUsername: string,
    thumbnailUrl?: string,
    customMessage?: string,
    supabase?: any,
    userId?: string
): Promise<boolean> {
    try {
        // Check Meta rate limit
        const throttle = await shouldThrottle(senderId);
        if (throttle.throttled) {
            logger.warn("Meta rate limit reached — skipping follow-gate", {
                senderId, recipientId, category: "instagram",
            });
            return false;
        }
        if (throttle.delayMs > 0) {
            await new Promise(resolve => setTimeout(resolve, throttle.delayMs));
        }

        const baseUrl = `https://graph.instagram.com/${GRAPH_API_VERSION}/${senderId}/messages`;
        const recipient = commentId ? { comment_id: commentId } : { id: recipientId };

        const message = customMessage || "Hey! 👋 To unlock this, please follow us first!";

        // Validate profile username
        if (!profileUsername || profileUsername.trim() === '') {
            logger.error("Cannot build follow-gate: profileUsername is empty", { category: "instagram" });
            return false;
        }
        // Use /_u/ format to force open in Instagram app on mobile
        const profileUrl = `https://www.instagram.com/_u/${profileUsername.trim()}/`;

        // Build element
        const element: any = {
            title: "Follow & Get Access",
            subtitle: message,
            buttons: [
                {
                    type: "web_url",
                    url: profileUrl,
                    title: "Follow & Get Access"
                },
                {
                    type: "postback",
                    title: "I'm Following ✓",
                    payload: `VERIFY_FOLLOW_${automationId}`
                }
            ]
        };
        if (thumbnailUrl) {
            element.image_url = thumbnailUrl;
        }

        // === SINGLE API CALL (was 3 before) ===
        const body = {
            recipient,
            message: {
                attachment: {
                    type: "template",
                    payload: {
                        template_type: "generic",
                        elements: [element]
                    }
                }
            }
        };

        const response = await graphApiFetch(baseUrl, accessToken, {
            method: "POST",
            body,
            accountId: senderId,
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorCode = errorData?.error?.code;

            // Auto-pause mechanism for Spam/Block errors
            if (errorCode === 368 || errorCode === 10 || errorCode === 32) {
                logger.error("Meta API Critical Block on Follow-Gate — auto-pausing user automations", {
                    errorCode, senderId, userId, category: "instagram"
                });
                if (supabase && userId) {
                    await supabase.from("automations").update({ is_active: false }).eq("user_id", userId);
                }
            }

            logger.error("Follow-gate card error", {
                errorCode,
                errorMessage: errorData?.error?.message,
                recipientId, category: "instagram",
            });
            return false;
        }

        logger.info("Follow-gate card sent", { recipientId, automationId, category: "instagram" });
        return true;
    } catch (error) {
        logger.error("Exception sending follow-gate card", { category: "instagram" }, error as Error);
        return false;
    }
}

/**
 * Reply to a comment publicly via Instagram API
 */
export async function replyToComment(
    accessToken: string,
    commentId: string,
    message: string,
    supabase?: any,
    userId?: string
): Promise<boolean> {
    try {
        if (!message || message.trim().length === 0) {
            logger.error("Cannot send empty public reply", { category: "instagram" });
            return false;
        }

        const response = await graphApiFetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${commentId}/replies`,
            accessToken,
            {
                method: "POST",
                body: { message },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            const errorCode = errorData?.error?.code;

            // Auto-pause mechanism for Spam/Block errors
            if (errorCode === 368 || errorCode === 10 || errorCode === 32) {
                logger.error("Meta API Critical Block on Public Reply — auto-pausing user automations", {
                    errorCode, commentId, userId, category: "instagram"
                });
                if (supabase && userId) {
                    await supabase.from("automations").update({ is_active: false }).eq("user_id", userId);
                }
            }

            logger.error("Meta Public Reply API Error", {
                errorCode,
                commentId,
                category: "instagram",
            });
            return false;
        }

        logger.info("Public reply sent", { commentId, category: "instagram" });
        return true;
    } catch (error) {
        logger.error("Exception sending public reply", { category: "instagram" }, error as Error);
        return false;
    }
}

/**
 * Get metadata for a specific media post (e.g. timestamp)
 */
export async function getMediaDetails(
    accessToken: string,
    mediaId: string
): Promise<{ id: string, timestamp: string, media_type: string } | null> {
    try {
        const response = await graphApiFetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${mediaId}?fields=id,timestamp,media_type`,
            accessToken
        );

        if (!response.ok) {
            return null;
        }

        return response.json();
    } catch (error) {
        logger.error("Error fetching media details", { mediaId, category: "instagram" }, error as Error);
        return null;
    }
}

/**
 * Get all comments on a media post
 */
export async function getMediaComments(
    accessToken: string,
    mediaId: string,
    afterCursor?: string
): Promise<{ comments: any[]; nextCursor: string | null }> {
    try {
        let url = `https://graph.instagram.com/${GRAPH_API_VERSION}/${mediaId}/comments?fields=id,text,timestamp,username,like_count,hidden,parent_id,from{id,username}&limit=50`;

        if (afterCursor) {
            url += `&after=${afterCursor}`;
        }

        const response = await graphApiFetch(url, accessToken);

        if (!response.ok) {
            const errorData = await response.json();
            logger.error("Error fetching comments", { mediaId, errorData, category: "instagram" });
            return { comments: [], nextCursor: null };
        }

        const data = await response.json();
        // Normalize: ensure every comment has a username (from top-level or from.username)
        const comments = (data.data || []).map((c: any) => ({
            ...c,
            username: c.username || c.from?.username || "user",
        }));
        return {
            comments,
            nextCursor: data.paging?.cursors?.after || null,
        };
    } catch (error) {
        logger.error("Exception fetching comments", { mediaId, category: "instagram" }, error as Error);
        return { comments: [], nextCursor: null };
    }
}
/**
 * Create a new top-level comment on a media post
 */
export async function createComment(
    accessToken: string,
    mediaId: string,
    message: string
): Promise<{ id: string } | null> {
    try {
        if (!message || message.trim().length === 0) {
            logger.error("Cannot create comment with empty text", { category: "instagram" });
            return null;
        }

        logger.info("Creating comment on media", { mediaId, category: "instagram" });
        const encodedMessage = encodeURIComponent(message);
        const response = await graphApiFetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${mediaId}/comments?message=${encodedMessage}`,
            accessToken,
            { method: "POST" }
        );

        if (!response.ok) {
            const errorData = await response.json();
            logger.error("Create comment error", { mediaId, errorData, category: "instagram" });
            return null;
        }

        const data = await response.json();
        logger.info("Comment created successfully", { commentId: data.id, category: "instagram" });
        return { id: data.id };
    } catch (error) {
        logger.error("Exception creating comment", { mediaId, category: "instagram" }, error as Error);
        return null;
    }
}

/**
 * Delete a comment permanently
 */
export async function deleteComment(
    accessToken: string,
    commentId: string
): Promise<boolean> {
    try {
        logger.info("Deleting comment", { commentId, category: "instagram" });
        const response = await graphApiFetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${commentId}`,
            accessToken,
            { method: "DELETE" }
        );

        if (!response.ok) {
            const errorData = await response.json();
            logger.error("Delete comment error", { commentId, errorData, category: "instagram" });
            return false;
        }

        logger.info("Comment deleted successfully", { commentId, category: "instagram" });
        return true;
    } catch (error) {
        logger.error("Exception deleting comment", { commentId, category: "instagram" }, error as Error);
        return false;
    }
}

/**
 * Hide or unhide a comment
 */
export async function hideComment(
    accessToken: string,
    commentId: string,
    hide: boolean
): Promise<boolean> {
    try {
        logger.info(hide ? "Hiding comment" : "Unhiding comment", { commentId, category: "instagram" });
        const response = await graphApiFetch(
            `https://graph.instagram.com/${GRAPH_API_VERSION}/${commentId}`,
            accessToken,
            {
                method: "POST",
                body: { hide: hide },
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            logger.error("Hide comment error", { commentId, hide, errorData, category: "instagram" });
            return false;
        }

        logger.info(`Comment ${hide ? "hidden" : "unhidden"} successfully`, { commentId, category: "instagram" });
        return true;
    } catch (error) {
        logger.error(`Exception ${hide ? "hiding" : "unhiding"} comment`, { commentId, category: "instagram" }, error as Error);
        return false;
    }
}

/**
 * Add random variation to message to bypass Meta's spam filters
 * Supports {Option A|Option B} spintax and {username} variables
 */
export function getUniqueMessage(message: string, username?: string | null): string {
    if (!message) return "";

    // 1. Parse Spintax: {Hi|Hello|Hey}
    let parsedMessage = message.replace(/\{([^{}]*)\}/g, (match, contents) => {
        // Ignore known variables instead of treating them as spintax
        const lowerContents = contents.toLowerCase();
        if (lowerContents === 'username' || lowerContents === 'first_name') return match;

        const options = contents.split('|');
        if (options.length === 1) return match; // Not actual spintax
        return options[Math.floor(Math.random() * options.length)];
    });

    // 2. Personalize Variables (fallback to "there" if no username)
    if (username) {
        parsedMessage = parsedMessage.replace(/\{username\}|\{first_name\}/gi, `@${username}`);
    } else {
        parsedMessage = parsedMessage.replace(/\{username\}|\{first_name\}/gi, `there`);
    }

    // 3. Add random invisible/zero-width space characters to guarantee 100% unique hash
    // \u200B is Zero-Width Space, \u200C is Zero-Width Non-Joiner, \u200D is Zero-Width Joiner
    const invisibleChars = ['\u200B', '\u200C', '\u200D'];
    let invisiblePadding = '';
    // Generate between 1 and 10 invisible characters randomly
    const numInvisible = Math.floor(Math.random() * 10) + 1;
    for (let i = 0; i < numInvisible; i++) {
        invisiblePadding += invisibleChars[Math.floor(Math.random() * invisibleChars.length)];
    }

    // 4. Expanded emoji variations (over 30 standard friendly emojis)
    const variations = [
        "📬", "✨", "✅", "💬", "🚀", "📥", "💌", "🌟", "🔥", "💎",
        "⭐", "💡", "⚡", "🎉", "🎊", "🎈", "👋", "🙌", "👏", "👍",
        "💯", "🎯", "🏆", "🎁", "📝", "📌", "📍", "🔔", "📣", "🥳", ""
    ];
    const randomVariation = variations[Math.floor(Math.random() * variations.length)];

    // The invisible padding ensures that even if the text and emoji are identical 
    // to a previous message, the underlying string bytes sent to Meta are completely unique.
    return randomVariation
        ? `${parsedMessage} ${randomVariation}${invisiblePadding}`
        : `${parsedMessage}${invisiblePadding}`;
}

/**
 * Ensure URL has a protocol (https://) AND extract from text if needed
 * Fixes issue where users copy "Title https://link" into the URL field
 */
function ensureUrlProtocol(url: string | undefined): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (trimmed.length === 0) return undefined;

    // 1. Scan for a valid http/https URL inside the string
    // This handles: "Site Title https://example.com" -> extracts "https://example.com"
    const urlMatch = trimmed.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
        return urlMatch[0];
    }

    // 2. If no protocol found, assume it is a domain (e.g. "google.com")
    if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
    }

    return trimmed;
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
        logger.error("Error checking follow status from DB", { userId, category: "instagram" }, error as Error);
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
            logger.error("Error recording follow event", { followerUsername, category: "instagram" }, error as Error);
        } else {
            logger.info(`Recorded ${isFollowing ? 'follow' : 'unfollow'}`, { followerUsername: followerUsername || followerInstagramId, category: "instagram" });
        }
    } catch (error) {
        logger.error("Exception recording follow event", { category: "instagram" }, error as Error);
    }
}

/**
 * Increment automation analytics counters
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function incrementAutomationCount(supabase: any, automationId: string, field: string) {
    try {
        const { error } = await supabase.rpc('increment_automation_stats', {
            p_automation_id: automationId,
            p_increment_sent: field === 'dm_sent_count' ? 1 : 0,
            p_increment_failed: field === 'dm_failed_count' ? 1 : 0,
            p_increment_comment: field === 'comment_count' ? 1 : 0
        });

        if (error) {
            logger.error(`Error incrementing ${field} via RPC`, { automationId, category: "instagram" }, error as Error);
        }
    } catch (error) {
        logger.error(`Exception incrementing ${field}`, { automationId, category: "instagram" }, error as Error);
    }
}
