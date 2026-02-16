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
