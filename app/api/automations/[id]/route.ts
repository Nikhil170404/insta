import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

// PUT - Update an automation
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const body = await request.json();
        const {
            trigger_keyword,
            trigger_type,
            reply_message,
            comment_reply,
            button_text,
            link_url,
            require_follow,
            final_message,
            final_button_text,
            follow_gate_message,
            is_active,
        } = body;

        const supabase = getSupabaseAdmin();

        // Verify ownership
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
            .from("automations")
            .select("id")
            .eq("id", id)
            .eq("user_id", session.id)
            .single();

        if (!existing) {
            return NextResponse.json(
                { error: "Automation not found" },
                { status: 404 }
            );
        }

        // Build update object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};
        if (trigger_type !== undefined) updateData.trigger_type = trigger_type;
        if (trigger_keyword !== undefined) updateData.trigger_keyword = (trigger_type === "any" || trigger_type === "story_reply") ? null : trigger_keyword;
        if (reply_message !== undefined) updateData.reply_message = reply_message;
        if (comment_reply !== undefined) updateData.comment_reply = comment_reply;
        if (body.comment_reply_templates !== undefined) updateData.comment_reply_templates = body.comment_reply_templates;
        if (button_text !== undefined) updateData.button_text = button_text;
        if (link_url !== undefined) updateData.link_url = link_url;
        if (require_follow !== undefined) updateData.require_follow = require_follow;
        if (final_message !== undefined) updateData.final_message = final_message;
        if (final_button_text !== undefined) updateData.final_button_text = final_button_text;
        if (follow_gate_message !== undefined) updateData.follow_gate_message = follow_gate_message;
        if (body.respond_to_replies !== undefined) updateData.respond_to_replies = body.respond_to_replies;
        if (body.ignore_self_comments !== undefined) updateData.ignore_self_comments = body.ignore_self_comments;
        if (is_active !== undefined) updateData.is_active = is_active;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: automation, error } = await (supabase as any)
            .from("automations")
            .update(updateData)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating automation:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ automation });

    } catch (error) {
        console.error("Error in PUT /api/automations/[id]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

// DELETE - Remove an automation
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id } = await params;
        const supabase = getSupabaseAdmin();

        // Soft Delete (Archive)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
            .from("automations")
            .update({ is_archived: true, is_active: false })
            .eq("id", id)
            .eq("user_id", session.id);

        if (error) {
            console.error("Error deleting automation:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Error in DELETE /api/automations/[id]:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
