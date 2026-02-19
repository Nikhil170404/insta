import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { ratelimit } from "@/lib/ratelimit";

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
            return `🎯 You're #${position}! You'll get 15,000 DMs FREE for 1 month + 10% off all plans for 3 months!`;
        default:
            return "";
    }
}

// POST - Join waitlist
export async function POST(request: NextRequest) {
    try {
        // === SECURITY LAYER 1: IP Rate Limiting (3 attempts per hour) ===
        const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
            || request.headers.get("x-real-ip")
            || "unknown";

        const { success: rateLimitOk } = await ratelimit.limit(`waitlist:${ip}`);
        if (!rateLimitOk) {
            return NextResponse.json(
                { error: "Too many attempts. Please try again later." },
                { status: 429 }
            );
        }

        // === SECURITY LAYER 2: Cookie-based duplicate check ===
        const alreadyJoined = request.cookies.get("wl_joined")?.value;
        if (alreadyJoined === "1") {
            return NextResponse.json(
                { error: "You have already joined the waitlist from this device!" },
                { status: 409 }
            );
        }

        const body = await request.json();
        let { instagram_username, whatsapp_number } = body;

        // === SECURITY LAYER 3: Honeypot — bots fill hidden fields ===
        if (body.website || body.company || body.email_confirm) {
            // Silent success for bots — don't reveal it's a trap
            return NextResponse.json({
                success: true,
                position: Math.floor(Math.random() * 900) + 50,
                tier: "discount",
                message: "You're on the list!",
                totalSignups: 500,
            });
        }

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

        // === SECURITY LAYER 4: IP-based duplicate check ===
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingByIp } = await (supabase as any)
            .from("waitlist")
            .select("id")
            .eq("signup_ip", ip)
            .single();

        if (existingByIp) {
            return NextResponse.json(
                { error: "A signup has already been made from this device/network!" },
                { status: 409 }
            );
        }

        // Atomic position claim via RPC (prevents race conditions)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: claimResult, error: claimError } = await (supabase as any)
            .rpc("claim_waitlist_position", {
                p_username: instagram_username,
                p_whatsapp: whatsapp_number,
                p_ip: ip,
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

        // Set anti-duplicate cookie (expires in 1 year)
        const response = NextResponse.json({
            success: true,
            position,
            tier,
            message: getTierMessage(tier, position),
            totalSignups: position,
        });

        response.cookies.set("wl_joined", "1", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 365, // 1 year
            path: "/",
        });

        return response;
    } catch (error) {
        console.error("Waitlist POST error:", error);
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}
