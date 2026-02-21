import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getMediaComments, createComment } from "@/lib/instagram/service";
import { createRateLimitedHandler } from "@/lib/rate-limit-middleware";

export const GET = createRateLimitedHandler("api", () => undefined)(async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const searchParams = request.nextUrl.searchParams;
        const mediaId = searchParams.get("media_id");
        const afterCursor = searchParams.get("after");

        if (!mediaId) {
            return NextResponse.json({ error: "media_id is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user, error: userError } = await (supabase as any)
            .from("users")
            .select("instagram_access_token")
            .eq("id", session.id)
            .single();

        if (userError || !user?.instagram_access_token) {
            return NextResponse.json({ error: "User not found or no access token" }, { status: 404 });
        }

        const result = await getMediaComments(
            user.instagram_access_token,
            mediaId,
            afterCursor || undefined
        );

        return NextResponse.json(result);
    } catch (error) {
        console.error("Error in GET /api/comments:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
});

export const POST = createRateLimitedHandler("api", () => undefined)(async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { media_id, message } = body;

        if (!media_id || !message || message.trim().length === 0) {
            return NextResponse.json({ error: "media_id and message are required" }, { status: 400 });
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

        const result = await createComment(user.instagram_access_token, media_id, message);

        if (!result) {
            return NextResponse.json({ error: "Failed to create comment" }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: result.id });
    } catch (error) {
        console.error("Error in POST /api/comments:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
});
