import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

const WAITLIST_LIMITS = {
    PRO: 10,
    STARTER: 20,
    DISCOUNT: 970,
    TOTAL: 1000,
};

// GET - Public waitlist stats (no auth required)
export async function GET() {
    try {
        const supabase = getSupabaseAdmin();

        // Get total count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: total } = await (supabase as any)
            .from("waitlist")
            .select("*", { count: "exact", head: true });

        // Get tier counts
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: proTaken } = await (supabase as any)
            .from("waitlist")
            .select("*", { count: "exact", head: true })
            .eq("tier", "pro");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: starterTaken } = await (supabase as any)
            .from("waitlist")
            .select("*", { count: "exact", head: true })
            .eq("tier", "starter");

        const totalCount = total || 0;
        const proCount = proTaken || 0;
        const starterCount = starterTaken || 0;
        const discountCount = Math.max(0, totalCount - proCount - starterCount);

        return NextResponse.json({
            total: totalCount,
            spotsLeft: WAITLIST_LIMITS.TOTAL - totalCount,
            tiers: {
                pro: {
                    taken: proCount,
                    max: WAITLIST_LIMITS.PRO,
                    remaining: Math.max(0, WAITLIST_LIMITS.PRO - proCount),
                },
                starter: {
                    taken: starterCount,
                    max: WAITLIST_LIMITS.STARTER,
                    remaining: Math.max(0, WAITLIST_LIMITS.STARTER - starterCount),
                },
                discount: {
                    taken: discountCount,
                    max: WAITLIST_LIMITS.DISCOUNT,
                    remaining: Math.max(0, WAITLIST_LIMITS.DISCOUNT - discountCount),
                },
            },
        });
    } catch (error) {
        console.error("Waitlist stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch waitlist stats" },
            { status: 500 }
        );
    }
}
