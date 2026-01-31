import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET(request: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const searchParams = new URL(request.url).searchParams;
        const days = parseInt(searchParams.get("days") || "7");

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - days);

        // Get today's DMs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: todayCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .gte("created_at", todayStart.toISOString());

        // Get this period's DMs (historical data work)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count: periodCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .gte("created_at", periodStart.toISOString());

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

        // Get daily stats for the chart
        const dailyStats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const { count } = await (supabase as any)
                .from("dm_logs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", session.id)
                .gte("created_at", date.toISOString())
                .lt("created_at", nextDate.toISOString());

            dailyStats.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                count: count || 0
            });
        }

        // Get recent logs
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: logs } = await (supabase as any)
            .from("dm_logs")
            .select("*")
            .eq("user_id", session.id)
            .order("created_at", { ascending: false })
            .limit(50); // Increased limit for better initial view

        // Get total clicks
        const { count: clickCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("is_clicked", true);

        const total = totalCount || 0;
        const totalClicks = clickCount || 0;
        const success = successCount || 0;
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
        const clickRate = total > 0 ? Math.round((totalClicks / total) * 100) : 0;

        return NextResponse.json({
            stats: {
                today: todayCount || 0,
                period: periodCount || 0,
                total: total,
                clicks: totalClicks,
                successRate: successRate,
                clickRate: clickRate,
                daily: dailyStats
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
