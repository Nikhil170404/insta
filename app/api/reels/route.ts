import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

const GRAPH_API_VERSION = "v21.0";

export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Get pagination cursor from query
        const searchParams = request.nextUrl.searchParams;
        const afterCursor = searchParams.get("after");

        // Get user's access token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user, error: userError } = await (supabase as any)
            .from("users")
            .select("instagram_user_id, instagram_access_token")
            .eq("id", session.id)
            .single();

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Build API URL with pagination
        let apiUrl = `https://graph.instagram.com/${GRAPH_API_VERSION}/${user.instagram_user_id}/media?` +
            `fields=id,caption,media_type,media_url,thumbnail_url,timestamp,permalink&` +
            `limit=12&access_token=${user.instagram_access_token}`;

        if (afterCursor) {
            apiUrl += `&after=${afterCursor}`;
        }

        const mediaResponse = await fetch(apiUrl);

        if (!mediaResponse.ok) {
            const errorData = await mediaResponse.json();
            console.error("Instagram API error:", errorData);
            return NextResponse.json(
                { error: errorData.error?.message || "Failed to fetch media" },
                { status: 500 }
            );
        }

        const mediaData = await mediaResponse.json();

        // Filter to show reels first, then other media
        const media = mediaData.data || [];
        const sortedMedia = [
            ...media.filter((m: { media_type: string }) => m.media_type === "REELS"),
            ...media.filter((m: { media_type: string }) => m.media_type === "VIDEO"),
            ...media.filter((m: { media_type: string }) => m.media_type === "IMAGE"),
            ...media.filter((m: { media_type: string }) => m.media_type === "CAROUSEL_ALBUM"),
        ];

        // Get next cursor from Instagram paging
        const nextCursor = mediaData.paging?.cursors?.after || null;

        return NextResponse.json({
            media: sortedMedia,
            nextCursor: nextCursor,
        });

    } catch (error) {
        console.error("Error fetching reels:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
