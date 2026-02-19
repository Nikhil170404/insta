import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

const WAITLIST_LIMITS = {
    PRO: 10,       // positions 1-10
    STARTER: 20,   // positions 11-30
    DISCOUNT: 970, // positions 31-1000
    TOTAL: 1000,
};

function getTier(position: number): string | null {
    if (position <= WAITLIST_LIMITS.PRO) return "pro";
    if (position <= WAITLIST_LIMITS.PRO + WAITLIST_LIMITS.STARTER) return "starter";
    if (position <= WAITLIST_LIMITS.TOTAL) return "discount";
    return null; // waitlist full
}

function getTierMessage(tier: string, position: number): string {
    switch (tier) {
        case "pro":
            return `🏆 You're #${position}! You'll get 1 month FREE Pro Pack + 10% off for 3 months!`;
        case "starter":
            return `⚡ You're #${position}! You'll get 1 month FREE Starter Pack + 10% off for 3 months!`;
        case "discount":
            return `🎯 You're #${position}! You'll get 15,000 FREE DMs for 1 month + 10% off all plans for 3 months!`;
        default:
            return "";
    }
}

// POST - Join waitlist
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        let { instagram_username, whatsapp_number } = body;

        // Validate instagram username
        if (!instagram_username || typeof instagram_username !== "string") {
            return NextResponse.json(
                { error: "Instagram username is required" },
                { status: 400 }
            );
        }

        // Clean IG username — remove @ if present and lowercase
        instagram_username = instagram_username.replace(/^@/, "").toLowerCase().trim();

        // Validate IG username format (alphanumeric + dots + underscores, 1-30 chars)
        if (!/^[a-z0-9._]{1,30}$/.test(instagram_username)) {
            return NextResponse.json(
                { error: "Invalid Instagram username format" },
                { status: 400 }
            );
        }

        // Validate WhatsApp number
        if (!whatsapp_number || typeof whatsapp_number !== "string") {
            return NextResponse.json(
                { error: "WhatsApp number is required" },
                { status: 400 }
            );
        }

        // Clean WhatsApp number — keep only digits and +
        whatsapp_number = whatsapp_number.replace(/[^\d+]/g, "").trim();

        // Validate phone format (10-15 digits, optional + prefix)
        if (!/^\+?\d{10,15}$/.test(whatsapp_number)) {
            return NextResponse.json(
                { error: "Invalid WhatsApp number. Please include country code (e.g., +919876543210)" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Check for existing entry by username
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingByUsername } = await (supabase as any)
            .from("waitlist")
            .select("id, position, tier")
            .eq("instagram_username", instagram_username)
            .single();

        if (existingByUsername) {
            return NextResponse.json(
                {
                    error: "This Instagram username is already on the waitlist!",
                    position: existingByUsername.position,
                    tier: existingByUsername.tier,
                },
                { status: 409 }
            );
        }

        // Check for existing entry by WhatsApp
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingByWhatsapp } = await (supabase as any)
            .from("waitlist")
            .select("id")
            .eq("whatsapp_number", whatsapp_number)
            .single();

        if (existingByWhatsapp) {
            return NextResponse.json(
                { error: "This WhatsApp number is already on the waitlist!" },
                { status: 409 }
            );
        }

        // Atomic position claim via RPC (prevents race conditions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: claimResult, error: claimError } = await (supabase as any)
            .rpc("claim_waitlist_position", {
                p_username: instagram_username,
                p_whatsapp: whatsapp_number,
            })
            .single();

        if (claimError) {
            // Handle waitlist full
            if (claimError.message?.includes("WAITLIST_FULL")) {
                return NextResponse.json(
                    { error: "Sorry, the waitlist is full! All 1,000 spots have been claimed." },
                    { status: 410 }
                );
            }
            // Handle race condition duplicate (unique constraint violation)
            if (claimError.code === "23505") {
                return NextResponse.json(
                    { error: "This username or number is already on the waitlist!" },
                    { status: 409 }
                );
            }
            console.error("Waitlist claim error:", claimError);
            throw claimError;
        }

        const position = claimResult.out_position;
        const tier = claimResult.out_tier;

        return NextResponse.json({
            success: true,
            position,
            tier,
            message: getTierMessage(tier, position),
            totalSignups: position,
        });
    } catch (error) {
        console.error("Waitlist POST error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
