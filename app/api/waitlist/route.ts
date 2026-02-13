import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

/**
 * POST /api/waitlist - Join the waitlist
 * Body: { instagram_username: string, whatsapp_number: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { instagram_username, whatsapp_number } = body;

        // Validate inputs
        if (!instagram_username || !whatsapp_number) {
            return NextResponse.json(
                { error: "Instagram username and WhatsApp number are required" },
                { status: 400 }
            );
        }

        // Clean Instagram username (remove @ if present)
        const cleanUsername = instagram_username.trim().replace(/^@/, "").toLowerCase();

        if (cleanUsername.length < 1 || cleanUsername.length > 30) {
            return NextResponse.json(
                { error: "Invalid Instagram username" },
                { status: 400 }
            );
        }

        // Validate WhatsApp number (Indian: 10 digits, or with +91 prefix)
        const cleanNumber = whatsapp_number.trim().replace(/[\s\-\(\)]/g, "");
        const phoneRegex = /^(\+91)?[6-9]\d{9}$/;

        if (!phoneRegex.test(cleanNumber)) {
            return NextResponse.json(
                { error: "Please enter a valid Indian WhatsApp number (10 digits)" },
                { status: 400 }
            );
        }

        // Normalize to +91 format
        const normalizedNumber = cleanNumber.startsWith("+91")
            ? cleanNumber
            : `+91${cleanNumber}`;

        const supabase = getSupabaseAdmin();

        // Insert into waitlist (trigger auto-assigns reward_tier based on position)
        const { data, error } = await (supabase as any)
            .from("waitlist")
            .insert({
                instagram_username: cleanUsername,
                whatsapp_number: normalizedNumber,
            })
            .select("position, reward_tier, created_at")
            .single();

        if (error) {
            // Handle unique constraint violations
            if (error.code === "23505") {
                if (error.message?.includes("instagram_username")) {
                    return NextResponse.json(
                        { error: "This Instagram username is already on the waitlist!" },
                        { status: 409 }
                    );
                }
                if (error.message?.includes("whatsapp")) {
                    return NextResponse.json(
                        { error: "This WhatsApp number is already on the waitlist!" },
                        { status: 409 }
                    );
                }
                return NextResponse.json(
                    { error: "You're already on the waitlist!" },
                    { status: 409 }
                );
            }
            throw error;
        }

        // Get current stats
        const { data: stats } = await (supabase as any).rpc("get_waitlist_stats");

        let rewardMessage = "";
        if (data.reward_tier === "pro") {
            rewardMessage = "You're in the TOP 25! You'll get 1 MONTH PRO FREE when we launch!";
        } else if (data.reward_tier === "starter") {
            rewardMessage = "You're in the TOP 50! You'll get 1 MONTH STARTER FREE when we launch!";
        } else {
            rewardMessage = "You're on the waitlist! We'll notify you when we launch.";
        }

        return NextResponse.json({
            success: true,
            position: data.position,
            reward_tier: data.reward_tier,
            message: rewardMessage,
            stats: stats || null,
        });
    } catch (error) {
        console.error("Waitlist error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}

/**
 * GET /api/waitlist - Get waitlist stats (public)
 */
export async function GET() {
    try {
        const supabase = getSupabaseAdmin();
        const { data: stats } = await (supabase as any).rpc("get_waitlist_stats");

        return NextResponse.json({
            stats: stats || {
                total_signups: 0,
                pro_spots_left: 25,
                starter_spots_left: 25,
                total_reward_spots_left: 50,
            },
        });
    } catch (error) {
        console.error("Waitlist stats error:", error);
        return NextResponse.json({
            stats: {
                total_signups: 0,
                pro_spots_left: 25,
                starter_spots_left: 25,
                total_reward_spots_left: 50,
            },
        });
    }
}
