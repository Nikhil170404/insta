import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getPlanLimits } from "@/lib/pricing";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Get start of current month
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get this month's DM count
        const { count: monthlyCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .gte("created_at", monthStart.toISOString());

        // Get plan limits
        const planLimits = getPlanLimits(session.plan_type);
        const used = monthlyCount || 0;
        const limit = planLimits.dmsPerMonth;
        const isUnlimited = limit >= 1000000; // Pro plan has 1M which is essentially unlimited
        const percentage = isUnlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);

        return NextResponse.json({
            used,
            limit,
            percentage,
            isUnlimited,
            planName: planLimits.planName,
            planType: session.plan_type
        });

    } catch (error) {
        console.error("Error fetching usage:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
