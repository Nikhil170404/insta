import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - 7);

        // Get today's DMs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: todayCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .gte("created_at", todayStart.toISOString());

        // Get this week's DMs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: weekCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .gte("created_at", weekStart.toISOString());

        // Get total DMs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: totalCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id);

        // Get success count
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: successCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true);

        // Get recent logs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: logs } = await (supabase as any)
            .from("dm_logs")
            .select("*")
            .eq("user_id", session.id)
            .order("created_at", { ascending: false })
            .limit(20);

        const total = totalCount || 0;
        const success = successCount || 0;
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;

        return NextResponse.json({
            stats: {
                today: todayCount || 0,
                week: weekCount || 0,
                total: total,
                successRate: successRate,
            },
            logs: logs || [],
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
