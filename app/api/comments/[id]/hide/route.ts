import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { hideComment } from "@/lib/instagram/service";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id: commentId } = await params;
        const body = await request.json();
        const { hide } = body;

        if (typeof hide !== "boolean") {
            return NextResponse.json({ error: "hide (boolean) is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user } = await (supabase as any)
            .from("users")
            .select("instagram_access_token")
            .eq("id", session.id)
            .single();

        if (!user?.instagram_access_token) {
            return NextResponse.json({ error: "No access token" }, { status: 404 });
        }

        const success = await hideComment(user.instagram_access_token, commentId, hide);

        if (!success) {
            return NextResponse.json({ error: `Failed to ${hide ? "hide" : "unhide"} comment` }, { status: 500 });
        }

        return NextResponse.json({ success: true, hidden: hide });
    } catch (error) {
        console.error("Error in POST /api/comments/[id]/hide:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
