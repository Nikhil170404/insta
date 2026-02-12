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
        const days = parseInt(daysParam || "7");

        // ─── Single RPC call replaces ~50+ sequential queries ───
        const { data, error } = await (supabase as any).rpc("get_analytics_dashboard", {
            p_user_id: session.id,
            p_days: days,
        });

        if (error) {
            console.error("Analytics RPC error:", error);
            return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
        }

        // ─── Transform DB result into the frontend's expected shape ───
        const d = data || {};

        const totalCount = Number(d.total_count) || 0;
        const clickCount = Number(d.click_count) || 0;
        const successRate = totalCount > 0 ? Math.round((totalCount / totalCount) * 100) : 0; // reply_sent = true IS the total
        const clickRate = totalCount > 0 ? Math.round((clickCount / totalCount) * 100) : 0;

        const thisMonthDms = Number(d.this_month_dms) || 0;
        const thisMonthClicks = Number(d.this_month_clicks) || 0;
        const thisMonthSuccess = Number(d.this_month_success) || 0;
        const lastMonthDms = Number(d.last_month_dms) || 0;
        const lastMonthClicks = Number(d.last_month_clicks) || 0;
        const lastMonthSuccess = Number(d.last_month_success) || 0;

        const thisMonthCTR = thisMonthDms > 0 ? Math.round((thisMonthClicks / thisMonthDms) * 100) : 0;
        const lastMonthCTR = lastMonthDms > 0 ? Math.round((lastMonthClicks / lastMonthDms) * 100) : 0;
        const monthGrowth = lastMonthDms > 0
            ? Math.round(((thisMonthDms - lastMonthDms) / lastMonthDms) * 100)
            : (thisMonthDms > 0 ? 100 : 0);

        // ─── Build daily stats (fill gaps with zero for missing days) ───
        const dailyMap = new Map<string, number>();
        for (const row of (d.daily || [])) {
            dailyMap.set(row.day, Number(row.count));
        }
        const now = new Date();
        const dailyStats = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setHours(0, 0, 0, 0);
            date.setDate(date.getDate() - i);
            const key = date.toISOString().split("T")[0];
            dailyStats.push({
                date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                fullDate: key,
                count: dailyMap.get(key) || 0,
            });
        }

        // ─── Build hourly stats (fill all 24 slots) ───
        const hourlyMap = new Map<string, number>();
        for (const row of (d.hourly || [])) {
            // row.hour is a timestamp string like "2026-02-12T14:00:00+00:00"
            const hourKey = new Date(row.hour).toISOString().slice(0, 13); // "2026-02-12T14"
            hourlyMap.set(hourKey, Number(row.count));
        }
        const hourlyStats = [];
        for (let i = 23; i >= 0; i--) {
            const hourStart = new Date(now);
            hourStart.setMinutes(0, 0, 0);
            hourStart.setHours(hourStart.getHours() - i);
            const hourKey = hourStart.toISOString().slice(0, 13);
            hourlyStats.push({
                hour: hourStart.getHours(),
                label: `${hourStart.getHours().toString().padStart(2, "0")}:00`,
                timestamp: hourStart.toISOString(),
                count: hourlyMap.get(hourKey) || 0,
            });
        }

        // ─── Build monthly trend (fill all 6 months) ───
        const monthlyMap = new Map<string, { dms: number; clicks: number }>();
        for (const row of (d.monthly_trend || [])) {
            const monthKey = new Date(row.month).toISOString().slice(0, 7); // "2026-02"
            monthlyMap.set(monthKey, { dms: Number(row.dms), clicks: Number(row.clicks) });
        }
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = monthDate.toISOString().slice(0, 7);
            const mData = monthlyMap.get(monthKey) || { dms: 0, clicks: 0 };
            monthlyTrend.push({
                month: monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
                fullMonth: monthDate.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
                dms: mData.dms,
                clicks: mData.clicks,
                ctr: mData.dms > 0 ? Math.round((mData.clicks / mData.dms) * 100) : 0,
            });
        }

        // ─── Top keywords ───
        const topKeywords = (d.top_keywords || []).map((kw: any) => ({
            keyword: kw.keyword,
            count: Number(kw.count),
            automationId: kw.automation_id || null,
        }));

        return NextResponse.json({
            stats: {
                today: Number(d.today_count) || 0,
                period: Number(d.period_count) || 0,
                total: totalCount,
                clicks: clickCount,
                successRate,
                clickRate,
                daily: dailyStats,
                hourly: hourlyStats,
                thisMonth: {
                    dms: thisMonthDms,
                    clicks: thisMonthClicks,
                    success: thisMonthSuccess,
                    ctr: thisMonthCTR,
                },
                lastMonth: {
                    dms: lastMonthDms,
                    clicks: lastMonthClicks,
                    success: lastMonthSuccess,
                    ctr: lastMonthCTR,
                },
                monthGrowth,
                monthlyTrend,
                topKeywords,
            },
            logs: d.logs || [],
        });

    } catch (error) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
