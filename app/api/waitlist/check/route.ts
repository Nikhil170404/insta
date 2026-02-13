import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

/**
 * GET /api/waitlist/check?username=xxx - Check waitlist position by Instagram username
 */
export async function GET(request: NextRequest) {
    const username = request.nextUrl.searchParams.get("username");

    if (!username) {
        return NextResponse.json(
            { error: "Username is required" },
            { status: 400 }
        );
    }

    const cleanUsername = username.trim().replace(/^@/, "").toLowerCase();
    const supabase = getSupabaseAdmin();

    const { data, error } = await (supabase as any)
        .from("waitlist")
        .select("position, reward_tier, is_claimed, claimed_at, created_at")
        .ilike("instagram_username", cleanUsername)
        .single();

    if (error || !data) {
        return NextResponse.json(
            { found: false, message: "This username is not on the waitlist" },
            { status: 404 }
        );
    }

    return NextResponse.json({
        found: true,
        position: data.position,
        reward_tier: data.reward_tier,
        is_claimed: data.is_claimed,
        claimed_at: data.claimed_at,
        joined_at: data.created_at,
    });
}
