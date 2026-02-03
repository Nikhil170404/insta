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
        const daysParam = searchParams.get("days");
        const isAllTime = daysParam === "all";
        const days = isAllTime ? 3650 : parseInt(daysParam || "7"); // 10 years for all time

        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // Current period start
        const periodStart = new Date(now);
        if (!isAllTime) {
            periodStart.setDate(periodStart.getDate() - days);
        } else {
            periodStart.setFullYear(2020, 0, 1); // Earliest possible date
        }

        // This month start
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Last month range
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

        // Get today's DMs
        const { count: todayCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true)
            .gte("created_at", todayStart.toISOString());

        // Get this period's DMs
        const { count: periodCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true)
            .gte("created_at", periodStart.toISOString());

        // Get this month's DMs
        const { count: thisMonthCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true)
            .gte("created_at", thisMonthStart.toISOString());

        // Get last month's DMs
        const { count: lastMonthCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true)
            .gte("created_at", lastMonthStart.toISOString())
            .lte("created_at", lastMonthEnd.toISOString());

        // Get total DMs
        const { count: totalCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true);

        // Get success count (all time)
        const { count: successCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true);

        // Get total clicks
        const { count: clickCount } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("is_clicked", true);

        // Get this month success count
        const { count: thisMonthSuccess } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true)
            .gte("created_at", thisMonthStart.toISOString());

        // Get this month clicks
        const { count: thisMonthClicks } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("is_clicked", true)
            .gte("created_at", thisMonthStart.toISOString());

        // Get last month success count
        const { count: lastMonthSuccess } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("reply_sent", true)
            .gte("created_at", lastMonthStart.toISOString())
            .lte("created_at", lastMonthEnd.toISOString());

        // Get last month clicks
        const { count: lastMonthClicks } = await (supabase as any)
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("is_clicked", true)
            .gte("created_at", lastMonthStart.toISOString())
            .lte("created_at", lastMonthEnd.toISOString());

        // Get daily stats for the chart
        const dailyStats = [];
        // For "All Time", we potentially condense data or just limit to last 90 days? 
        // User probably expects all data. If it's huge, charts break.
        // Let's assume reasonable usage for now or limit "All" chart to 90 days but totals to "All".

        let loopDays = days;
        if (isAllTime) loopDays = 90; // Limit daily chart to 90 days for UI sanity, or maybe grouping?
        // Actually, let's just stick to periodStart logic. If it's 10 years, loop is huge. 
        // Let's dynamically group if > 60 days? Too complex for this prompt.
        // Simple fix: If isAllTime, show last 30 days trend OR yearly? 
        // Let's keep existing logic but careful with loop.

        // Re-implementing clearer logic:
        const rangeDate = new Date(now);
        rangeDate.setHours(0, 0, 0, 0);

        const chartDays = isAllTime ? 30 : days; // Show last 30 days on chart even for "All Time" to avoid crowding

        for (let i = chartDays - 1; i >= 0; i--) {
            const date = new Date(rangeDate);
            date.setDate(date.getDate() - i);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const { count } = await (supabase as any)
                .from("dm_logs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", session.id)
                .eq("reply_sent", true)
                .gte("created_at", date.toISOString())
                .lt("created_at", nextDate.toISOString());

            dailyStats.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                fullDate: date.toISOString().split('T')[0],
                count: count || 0
            });
        }

        // Get hourly distribution (Last 24 Hours)
        const hourlyStats = [];
        for (let i = 23; i >= 0; i--) {
            const hourStart = new Date(now);
            hourStart.setHours(hourStart.getHours() - i, 0, 0, 0);

            const hourEnd = new Date(hourStart);
            hourEnd.setHours(hourEnd.getHours(), 59, 59, 999);

            const { count } = await (supabase as any)
                .from("dm_logs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", session.id)
                .eq("reply_sent", true)
                .gte("created_at", hourStart.toISOString())
                .lte("created_at", hourEnd.toISOString());

            hourlyStats.push({
                hour: hourStart.getHours(),
                // Label used for display, user can format if needed but we send partial
                label: `${hourStart.getHours().toString().padStart(2, '0')}:00`,
                timestamp: hourStart.toISOString(),
                count: count || 0
            });
        }

        // Get top automations by DM count
        const { data: topAutomations } = await (supabase as any)
            .from("dm_logs")
            .select("keyword_matched, automation_id")
            .eq("user_id", session.id)
            .gte("created_at", thisMonthStart.toISOString());

        // Count by keyword
        const keywordCounts: Record<string, { count: number; automationId: string | null }> = {};
        (topAutomations || []).forEach((log: any) => {
            const key = log.keyword_matched || "ANY";
            if (!keywordCounts[key]) {
                keywordCounts[key] = { count: 0, automationId: log.automation_id };
            }
            keywordCounts[key].count++;
        });

        const topKeywords = Object.entries(keywordCounts)
            .map(([keyword, data]) => ({
                keyword,
                count: data.count,
                automationId: data.automationId
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Get recent logs with more details
        const { data: logs } = await (supabase as any)
            .from("dm_logs")
            .select("*")
            .eq("user_id", session.id)
            .order("created_at", { ascending: false })
            .limit(100);

        // Get monthly trend (last 6 months)
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

            const { count: monthCount } = await (supabase as any)
                .from("dm_logs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", session.id)
                .gte("created_at", monthStart.toISOString())
                .lte("created_at", monthEnd.toISOString());

            const { count: monthClicks } = await (supabase as any)
                .from("dm_logs")
                .select("*", { count: "exact", head: true })
                .eq("user_id", session.id)
                .eq("is_clicked", true)
                .gte("created_at", monthStart.toISOString())
                .lte("created_at", monthEnd.toISOString());

            monthlyTrend.push({
                month: monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
                fullMonth: monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                dms: monthCount || 0,
                clicks: monthClicks || 0,
                ctr: monthCount ? Math.round(((monthClicks || 0) / monthCount) * 100) : 0
            });
        }

        const total = totalCount || 0;
        const totalClicks = clickCount || 0;
        const success = successCount || 0;
        const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
        const clickRate = total > 0 ? Math.round((totalClicks / total) * 100) : 0;

        // Calculate month-over-month growth
        const thisMonth = thisMonthCount || 0;
        const lastMonth = lastMonthCount || 0;
        const monthGrowth = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : (thisMonth > 0 ? 100 : 0);

        const thisMonthCTR = thisMonth > 0 ? Math.round(((thisMonthClicks || 0) / thisMonth) * 100) : 0;
        const lastMonthCTR = lastMonth > 0 ? Math.round(((lastMonthClicks || 0) / lastMonth) * 100) : 0;

        return NextResponse.json({
            stats: {
                today: todayCount || 0,
                period: periodCount || 0,
                total: total,
                clicks: totalClicks,
                successRate: successRate,
                clickRate: clickRate,
                daily: dailyStats,
                hourly: hourlyStats,
                // Monthly comparison
                thisMonth: {
                    dms: thisMonth,
                    clicks: thisMonthClicks || 0,
                    success: thisMonthSuccess || 0,
                    ctr: thisMonthCTR
                },
                lastMonth: {
                    dms: lastMonth,
                    clicks: lastMonthClicks || 0,
                    success: lastMonthSuccess || 0,
                    ctr: lastMonthCTR
                },
                monthGrowth: monthGrowth,
                monthlyTrend: monthlyTrend,
                topKeywords: topKeywords
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
