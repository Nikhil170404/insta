import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getPlanLimits, getUpgradeSuggestion } from "@/lib/pricing";

// GET - List all automations for the user
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: automations, error } = await (supabase as any)
            .from("automations")
            .select("*")
            .eq("user_id", session.id)
            .eq("is_archived", false)
            .order("created_at", { ascending: false });

        // Fetch user token for refreshing media
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user } = await (supabase as any)
            .from("users")
            .select("instagram_access_token")
            .eq("id", session.id)
            .single();

        if (error) {
            console.error("Error fetching automations:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Get plan limits for response
        const limits = getPlanLimits(session.plan_type);
        const activeCount = automations?.filter((a: { is_active: boolean }) => a.is_active).length || 0;

        // Get monthly count for dashboard "One Source of Truth"
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const { count: monthlyCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true)
            .gte("created_at", monthStart.toISOString());

        // Refresh media URLs if token exists
        if (user?.instagram_access_token && automations) {
            // Run without awaiting to not block the response? 
            // Better to await for the first few to show correct images immediately.
            // Let's await it for a better user experience on the "broken" screen.
            await refreshAutomationMedia(supabase, automations, user.instagram_access_token);
        }

        return NextResponse.json({
            automations: automations || [],
            monthlyCount: monthlyCount || 0,
            limits: {
                current: activeCount,
                max: limits.automations,
                canCreate: activeCount < limits.automations,
                planName: limits.planName
            }
        });

    } catch (error) {
        console.error("Error in GET /api/automations:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// Helper to refresh expired media URLs
async function refreshAutomationMedia(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    automations: any[],
    accessToken: string
) {
    if (!automations || automations.length === 0 || !accessToken) return;

    const updates = [];
    const now = Date.now();
    const PROVISION_TIME = 3 * 24 * 60 * 60 * 1000; // 3 days

    for (const automation of automations) {
        // Skip special IDs or if last updated recently (less than 3 days)
        if (
            !automation.media_id ||
            ["ALL_MEDIA", "NEXT_MEDIA", "STORY_AUTOMATION"].includes(automation.media_id)
        ) {
            continue;
        }

        // Check if we need to refresh (simple heuristic: if it has a URL, check if it works? No, let's just refresh if older than X days, or always for now to be safe since user reported issues)
        // For this fix, let's try to verify if the URL is expired or just refresh 
        // Better strategy: Just refresh for active automations to ensure they are always live.

        try {
            const response = await fetch(
                `https://graph.instagram.com/v21.0/${automation.media_id}?fields=media_url,thumbnail_url&access_token=${accessToken}`
            );

            if (response.ok) {
                const data = await response.json();
                if (data.media_url || data.thumbnail_url) {
                    updates.push(
                        supabase
                            .from("automations")
                            .update({
                                media_url: data.media_url || automation.media_url,
                                media_thumbnail_url: data.thumbnail_url || data.media_url || automation.media_thumbnail_url, // Use media_url as thumbnail for images
                                updated_at: new Date().toISOString()
                            })
                            .eq("id", automation.id)
                    );

                    // Update the local object so the UI gets the new URL immediately
                    automation.media_url = data.media_url || automation.media_url;
                    automation.media_thumbnail_url = data.thumbnail_url || data.media_url || automation.media_thumbnail_url;
                }
            } else {
                console.warn(`Failed to refresh media for automation ${automation.id}:`, await response.text());
            }
        } catch (e) {
            console.error(`Error refreshing media ${automation.media_id}:`, e);
        }
    }

    if (updates.length > 0) {
        await Promise.allSettled(updates);
    }
}

// POST - Create a new automation
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            media_id,
            media_type,
            media_url,
            media_thumbnail_url,
            media_caption,
            trigger_keyword,
            trigger_type,
            reply_message,
            comment_reply,
            button_text,
            link_url,
            require_follow,
        } = body;

        // Validation
        if (!media_id) {
            return NextResponse.json(
                { error: "Media ID is required" },
                { status: 400 }
            );
        }

        if (!reply_message || reply_message.length < 1) {
            return NextResponse.json(
                { error: "Reply message is required" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // CHECK PLAN LIMITS - Count active automations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: activeCount } = await (supabase as any)
            .from("automations")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("is_archived", false)
            .eq("is_active", true);

        const limits = getPlanLimits(session.plan_type);

        if ((activeCount || 0) >= limits.automations) {
            const upgrade = getUpgradeSuggestion(session.plan_type);
            return NextResponse.json({
                error: "Automation limit reached",
                upgrade_required: true,
                current_count: activeCount || 0,
                max_allowed: limits.automations,
                current_plan: limits.planName,
                next_plan: upgrade
            }, { status: 403 });
        }

        // Check if automation already exists for this media

        // Check if automation already exists for this media
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
            .from("automations")
            .select("id")
            .eq("user_id", session.id)
            .eq("media_id", media_id)
            .eq("is_archived", false)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: "Automation already exists for this post. Edit it instead." },
                { status: 409 }
            );
        }

        // Create the automation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: automation, error } = await (supabase as any)
            .from("automations")
            .insert({
                user_id: session.id,
                media_id,
                media_type: media_type || "REELS",
                media_url,
                media_thumbnail_url,
                media_caption,
                trigger_keyword: trigger_type === "any" ? null : trigger_keyword,
                trigger_type: trigger_type || "keyword",
                reply_message,
                comment_reply: body.comment_reply || null,
                comment_reply_templates: body.comment_reply_templates || null,
                button_text: body.button_text || null,
                link_url: body.link_url || null,
                require_follow: require_follow || false,
                respond_to_replies: body.respond_to_replies ?? false,
                ignore_self_comments: body.ignore_self_comments ?? true,
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating automation:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ automation }, { status: 201 });

    } catch (error) {
        console.error("Error in POST /api/automations:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
