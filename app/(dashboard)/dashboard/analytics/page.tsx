"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    MessageCircle,
    TrendingUp,
    TrendingDown,
    Calendar,
    Loader2,
    Zap,
    ChevronRight,
    Activity,
    MousePointer2,
    Percent,
    Clock,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    Award,
    CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DmLog {
    id: string;
    instagram_username: string;
    keyword_matched: string;
    comment_text: string;
    reply_sent: boolean;
    is_clicked: boolean;
    created_at: string;
}

interface DailyStat {
    date: string;
    fullDate: string;
    count: number;
}

interface HourlyStat {
    hour: number;
    label: string;
    count: number;
    timestamp?: string;
}

interface MonthlyTrend {
    month: string;
    fullMonth: string;
    dms: number;
    clicks: number;
    ctr: number;
}

interface TopKeyword {
    keyword: string;
    count: number;
    automationId: string | null;
}

interface MonthData {
    dms: number;
    clicks: number;
    success: number;
    ctr: number;
}

interface Stats {
    today: number;
    period: number;
    total: number;
    clicks: number;
    successRate: number;
    clickRate: number;
    daily: DailyStat[];
    hourly: HourlyStat[];
    thisMonth: MonthData;
    lastMonth: MonthData;
    monthGrowth: number;
    monthlyTrend: MonthlyTrend[];
    topKeywords: TopKeyword[];
}

type TimeRange = "7" | "14" | "30";

export default function AnalyticsPage() {
    const [logs, setLogs] = useState<DmLog[]>([]);
    const [stats, setStats] = useState<Stats>({
        today: 0,
        period: 0,
        total: 0,
        clicks: 0,
        successRate: 0,
        clickRate: 0,
        daily: [],
        hourly: [],
        thisMonth: { dms: 0, clicks: 0, success: 0, ctr: 0 },
        lastMonth: { dms: 0, clicks: 0, success: 0, ctr: 0 },
        monthGrowth: 0,
        monthlyTrend: [],
        topKeywords: []
    });
    const [loading, setLoading] = useState(true);
    const [visibleLogs, setVisibleLogs] = useState(15);
    const [selectedLog, setSelectedLog] = useState<DmLog | null>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>("7");
    const [activeTab, setActiveTab] = useState<"overview" | "trends" | "activity">("overview");

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    async function fetchAnalytics() {
        setLoading(true);
        try {
            const res = await fetch(`/api/analytics?days=${timeRange}`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setStats(data.stats || {
                    today: 0, period: 0, total: 0, clicks: 0, successRate: 0, clickRate: 0,
                    daily: [], hourly: [],
                    thisMonth: { dms: 0, clicks: 0, success: 0, ctr: 0 },
                    lastMonth: { dms: 0, clicks: 0, success: 0, ctr: 0 },
                    monthGrowth: 0, monthlyTrend: [], topKeywords: []
                });
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    }

    const maxDailyCount = Math.max(...(stats.daily?.map(d => d.count) || [1]), 1);
    const maxHourlyCount = Math.max(...(stats.hourly?.map(h => h.count) || [1]), 1);
    const maxMonthlyCount = Math.max(...(stats.monthlyTrend?.map(m => m.dms) || [1]), 1);
    const maxKeywordCount = Math.max(...(stats.topKeywords?.map(k => k.count) || [1]), 1);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Crunching data...</p>
            </div>
        );
    }

    const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long' });
    const lastMonthName = new Date(new Date().setMonth(new Date().getMonth() - 1)).toLocaleDateString('en-US', { month: 'long' });

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Insights</h1>
                    <p className="text-sm sm:text-base text-slate-400 font-medium">See how your auto-replies are performing.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
                        {(["7", "14", "30"] as TimeRange[]).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={cn(
                                    "px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                                    timeRange === range
                                        ? "bg-primary text-white shadow-md"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {range}D
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-1.5 sm:gap-2 border-b border-slate-100 pb-4 overflow-x-auto no-scrollbar">
                {[
                    { id: "overview", label: "Overview", icon: BarChart3 },
                    { id: "trends", label: "Trends", icon: TrendingUp },
                    { id: "activity", label: "Activity", icon: Activity }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap flex-shrink-0",
                            activeTab === tab.id
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "text-slate-500 hover:bg-slate-50"
                        )}
                    >
                        <tab.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === "overview" && (
                <>
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                        <StatCard
                            icon={<Activity className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />}
                            value={stats.today}
                            label="Today's Messages"
                            color="blue"
                        />
                        <StatCard
                            icon={<MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />}
                            value={stats.thisMonth.dms}
                            label={`${currentMonthName} Messages`}
                            color="indigo"
                            change={stats.monthGrowth}
                        />
                        <StatCard
                            icon={<MousePointer2 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />}
                            value={stats.thisMonth.clicks}
                            label={`${currentMonthName} Clicks`}
                            color="purple"
                        />
                        <StatCard
                            icon={<Percent className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />}
                            value={`${stats.thisMonth.ctr}%`}
                            label="This Month CTR"
                            color="green"
                        />
                    </div>

                    {/* Month Comparison */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <MonthCard
                            title={currentMonthName}
                            subtitle="Current Month"
                            data={stats.thisMonth}
                            isCurrent
                        />
                        <MonthCard
                            title={lastMonthName}
                            subtitle="Previous Month"
                            data={stats.lastMonth}
                        />
                    </div>

                    {/* Daily Chart */}
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-50 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm sm:text-lg font-black text-slate-900 italic uppercase tracking-tighter">Daily Activity</h3>
                                <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest">Last {timeRange} days</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xl sm:text-2xl font-black text-slate-900">{stats.period}</p>
                                <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase">Total</p>
                            </div>
                        </div>

                        <div className="relative h-32 sm:h-48 flex items-end justify-between gap-[2px] sm:gap-1 md:gap-2 px-0 sm:px-2">
                            {stats.daily.map((day, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 sm:gap-3 group">
                                    <div className="relative w-full flex items-end justify-center">
                                        <div
                                            className="w-full max-w-[20px] sm:max-w-[32px] bg-slate-50 rounded-t-lg group-hover:bg-primary/10 transition-all duration-500 relative"
                                            style={{ height: `${Math.max((day.count / maxDailyCount) * 120, 4)}px` }}
                                        >
                                            {day.count > 0 && (
                                                <div
                                                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary to-primary/60 rounded-t-lg shadow-lg shadow-primary/20"
                                                    style={{ height: '100%' }}
                                                />
                                            )}
                                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                                {day.count}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-[6px] sm:text-[8px] font-black text-slate-400 uppercase tracking-tighter text-center">
                                        {day.date.split(' ')[1]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Top Automations & Hourly */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {/* Top Automations */}
                        <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-50 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-lg font-black text-slate-900 italic uppercase tracking-tighter">Top Keywords</h3>
                                    <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest">Best performers</p>
                                </div>
                            </div>

                            {stats.topKeywords.length === 0 ? (
                                <div className="text-center py-8 text-slate-400">
                                    <Target className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                                    <p className="font-bold">No data yet</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {stats.topKeywords.map((kw, idx) => (
                                        <div key={kw.keyword} className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                                                idx === 0 ? "bg-amber-100 text-amber-700" :
                                                    idx === 1 ? "bg-slate-200 text-slate-600" :
                                                        idx === 2 ? "bg-orange-100 text-orange-700" :
                                                            "bg-slate-100 text-slate-500"
                                            )}>
                                                #{idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-bold text-slate-700 uppercase">{kw.keyword}</span>
                                                    <span className="text-sm font-black text-slate-900">{kw.count}</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all",
                                                            idx === 0 ? "bg-amber-500" :
                                                                idx === 1 ? "bg-slate-400" :
                                                                    idx === 2 ? "bg-orange-500" :
                                                                        "bg-slate-300"
                                                        )}
                                                        style={{ width: `${(kw.count / maxKeywordCount) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Hourly Distribution */}
                        <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-50 shadow-sm p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                    <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-lg font-black text-slate-900 italic uppercase tracking-tighter">Hourly Activity</h3>
                                    <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest">Last 24 Hours</p>
                                </div>
                            </div>

                            <div className="flex items-end justify-between gap-[1px] sm:gap-0.5 h-24 sm:h-32">
                                {stats.hourly.map((hour, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center group relative">
                                        <div
                                            className={cn(
                                                "w-full max-w-[8px] sm:max-w-[12px] rounded-t transition-all",
                                                hour.count > 0 ? "bg-blue-500" : "bg-slate-100"
                                            )}
                                            style={{ height: `${Math.max((hour.count / maxHourlyCount) * 100, 2)}%` }}
                                        />
                                        {idx % 6 === 0 && (
                                            <span className="text-[6px] sm:text-[8px] text-slate-400 font-bold mt-1">
                                                {hour.timestamp
                                                    ? new Date(hour.timestamp).getHours() + ":00"
                                                    : hour.label}
                                            </span>
                                        )}
                                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                            {hour.count}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* All Time Stats */}
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-6 md:p-8 text-white">
                        <div className="flex items-center gap-3 mb-4 sm:mb-6">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm sm:text-lg font-black italic uppercase tracking-tighter">Lifetime Stats</h3>
                                <p className="text-[9px] sm:text-[11px] text-white/50 font-bold uppercase tracking-widest">Since you started</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                            <div>
                                <p className="text-2xl sm:text-4xl font-black">{stats.total.toLocaleString()}</p>
                                <p className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Messages Sent</p>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-4xl font-black">{stats.clicks.toLocaleString()}</p>
                                <p className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Clicks</p>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-4xl font-black">{stats.successRate}%</p>
                                <p className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Delivery Rate</p>
                            </div>
                            <div>
                                <p className="text-2xl sm:text-4xl font-black">{stats.clickRate}%</p>
                                <p className="text-[8px] sm:text-[10px] text-white/50 font-bold uppercase tracking-widest mt-1">Overall CTR</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === "trends" && (
                <>
                    {/* 6-Month Trend */}
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-50 shadow-sm p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                    <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="text-sm sm:text-lg font-black text-slate-900 italic uppercase tracking-tighter">6-Month Overview</h3>
                                    <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest">Messages per month</p>
                                </div>
                            </div>
                        </div>

                        <div className="relative h-40 sm:h-64 flex items-end justify-between gap-1.5 sm:gap-4 px-1 sm:px-4">
                            {stats.monthlyTrend.map((month, idx) => (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-2 sm:gap-4 group">
                                    <div className="relative w-full flex items-end justify-center">
                                        <div
                                            className="w-full max-w-[36px] sm:max-w-[60px] bg-slate-50 rounded-t-xl sm:rounded-t-2xl group-hover:bg-indigo-100 transition-all duration-500 relative"
                                            style={{ height: `${Math.max((month.dms / maxMonthlyCount) * 140, 8)}px` }}
                                        >
                                            {month.dms > 0 && (
                                                <div
                                                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-xl sm:rounded-t-2xl shadow-lg shadow-indigo-500/20"
                                                    style={{ height: '100%' }}
                                                />
                                            )}
                                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] sm:text-xs font-bold py-1.5 px-2 sm:px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                                {month.dms.toLocaleString()} • {month.ctr}%
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <span className="text-[9px] sm:text-xs font-black text-slate-700 uppercase">{month.month}</span>
                                        <p className="text-xs sm:text-lg font-black text-slate-900">{month.dms.toLocaleString()}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Monthly Details Table */}
                    <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden">
                        <div className="p-4 sm:p-6 md:p-8 border-b border-slate-100">
                            <h3 className="text-sm sm:text-lg font-black text-slate-900 italic uppercase tracking-tighter">Monthly Breakdown</h3>
                            <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest">Detailed stats by month</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[400px]">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-left text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Month</th>
                                        <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Msgs</th>
                                        <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">Clicks</th>
                                        <th className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 text-right text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest">CTR</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.monthlyTrend.slice().reverse().map((month, idx) => (
                                        <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5">
                                                <span className="font-bold text-sm sm:text-base text-slate-900">{month.fullMonth}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 text-right">
                                                <span className="text-sm sm:text-lg font-black text-slate-900">{month.dms.toLocaleString()}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 text-right">
                                                <span className="text-sm sm:text-lg font-black text-purple-600">{month.clicks.toLocaleString()}</span>
                                            </td>
                                            <td className="px-3 sm:px-6 md:px-8 py-3 sm:py-5 text-right">
                                                <span className={cn(
                                                    "inline-flex items-center px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-black",
                                                    month.ctr >= 10 ? "bg-green-100 text-green-700" :
                                                        month.ctr >= 5 ? "bg-amber-100 text-amber-700" :
                                                            "bg-slate-100 text-slate-600"
                                                )}>
                                                    {month.ctr}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === "activity" && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 italic uppercase">
                            <Activity className="h-5 w-5 text-primary" />
                            Recent Activity
                        </h2>
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-2" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pr-2">Live</span>
                        </div>
                    </div>

                    {logs.length === 0 ? (
                        <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] py-32 text-center">
                            <BarChart3 className="h-20 w-20 text-slate-100 mx-auto mb-6" />
                            <p className="text-slate-400 text-lg font-bold">No activity recorded</p>
                            <p className="text-slate-300 text-sm mt-1">Logs will appear here once your triggers start firing.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {logs.slice(0, visibleLogs).map((log) => (
                                <ActivityRow key={log.id} log={log} onClick={() => setSelectedLog(log)} />
                            ))}

                            {visibleLogs < logs.length && (
                                <button
                                    onClick={() => setVisibleLogs(prev => prev + 15)}
                                    className="w-full py-8 text-[11px] font-black text-slate-400 hover:text-primary uppercase tracking-[0.25em] transition-all bg-white border border-slate-50 rounded-[2.5rem] mt-4 hover:shadow-md"
                                >
                                    ↓ Load more ({logs.length - visibleLogs} remaining)
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setSelectedLog(null)}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all font-black"
                        >
                            ✕
                        </button>

                        <div className="space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-100 flex items-center justify-center text-slate-900 font-black text-2xl">
                                    {selectedLog.instagram_username?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">@{selectedLog.instagram_username}</h2>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">{new Date(selectedLog.created_at).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Inbound Comment</p>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 italic text-slate-600 font-medium">
                                        "{selectedLog.comment_text}"
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trigger Match</p>
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg">
                                            {selectedLog.keyword_matched || "ANY"}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Delivery Status</p>
                                    <div className={cn(
                                        "flex items-center gap-3 p-4 rounded-2xl border",
                                        selectedLog.reply_sent ? "bg-green-50 border-green-100 text-green-700" : "bg-red-50 border-red-100 text-red-700"
                                    )}>
                                        <div className={cn("w-2 h-2 rounded-full", selectedLog.reply_sent ? "bg-green-500" : "bg-red-500")} />
                                        <span className="font-black text-xs uppercase tracking-widest">
                                            {selectedLog.reply_sent ? "DM Successfully Delivered" : "Delivery Failed"}
                                        </span>
                                    </div>
                                </div>

                                {selectedLog.is_clicked && (
                                    <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-100 text-purple-700 rounded-2xl">
                                        <Zap className="h-4 w-4 fill-current" />
                                        <span className="font-black text-xs uppercase tracking-widest italic">User clicked the DM button!</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setSelectedLog(null)}
                                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-slate-200 hover:bg-slate-800 transition-all active:scale-95"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ icon, value, label, color, change }: { icon: React.ReactNode, value: string | number, label: string, color: string, change?: number }) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-500/5 text-blue-500",
        purple: "bg-purple-500/5 text-purple-500",
        green: "bg-green-500/5 text-green-500",
        orange: "bg-orange-500/5 text-orange-500",
        indigo: "bg-indigo-500/5 text-indigo-500",
    };

    return (
        <div className="bg-white p-3 sm:p-4 md:p-6 rounded-[1.5rem] sm:rounded-[2rem] md:rounded-[2.5rem] border border-slate-50 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
            <div className={cn("absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8 blur-2xl opacity-50 group-hover:scale-125 transition-transform", colorMap[color].split(' ')[0])} />
            <div className={cn("w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center mb-2 sm:mb-4", colorMap[color])}>
                {icon}
            </div>
            <div className="flex items-end gap-1 sm:gap-2">
                <p className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
                {change !== undefined && change !== 0 && (
                    <div className={cn(
                        "flex items-center gap-0.5 text-[10px] sm:text-xs font-bold mb-0.5 sm:mb-1",
                        change > 0 ? "text-green-600" : "text-red-500"
                    )}>
                        {change > 0 ? <ArrowUpRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <ArrowDownRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
                        {Math.abs(change)}%
                    </div>
                )}
            </div>
            <p className="text-[8px] sm:text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
}

function MonthCard({ title, subtitle, data, isCurrent }: { title: string, subtitle: string, data: MonthData, isCurrent?: boolean }) {
    return (
        <div className={cn(
            "rounded-[1.5rem] sm:rounded-[2.5rem] p-4 sm:p-6 md:p-8 border",
            isCurrent
                ? "bg-gradient-to-br from-primary/5 to-indigo-50 border-primary/20"
                : "bg-white border-slate-100"
        )}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div>
                    <h3 className="text-base sm:text-xl font-black text-slate-900">{title}</h3>
                    <p className="text-[9px] sm:text-[11px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>
                </div>
                {isCurrent && (
                    <span className="px-2 sm:px-3 py-1 bg-primary text-white text-[9px] sm:text-[10px] font-black rounded-lg uppercase">Current</span>
                )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <div>
                    <p className="text-xl sm:text-3xl font-black text-slate-900">{data.dms.toLocaleString()}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">DMs Sent</p>
                </div>
                <div>
                    <p className="text-xl sm:text-3xl font-black text-purple-600">{data.clicks.toLocaleString()}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Clicks</p>
                </div>
                <div>
                    <p className="text-xl sm:text-3xl font-black text-green-600">{data.success.toLocaleString()}</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Delivered</p>
                </div>
                <div>
                    <p className="text-xl sm:text-3xl font-black text-amber-600">{data.ctr}%</p>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">CTR</p>
                </div>
            </div>
        </div>
    );
}

function ActivityRow({ log, onClick }: { log: DmLog, onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className="flex items-center gap-3 sm:gap-5 p-3 sm:p-5 bg-white rounded-[1.5rem] sm:rounded-[2rem] border border-slate-50 transition-all duration-300 hover:shadow-lg group cursor-pointer active:scale-[0.99] hover:border-primary/20"
        >
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-sm sm:text-lg shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform relative">
                {log.instagram_username?.charAt(0).toUpperCase() || "?"}
                {log.is_clicked && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                        <MousePointer2 className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-white" />
                    </div>
                )}
            </div>

            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 min-w-0">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                        <p className="font-bold text-sm sm:text-base text-slate-900 truncate tracking-tight">@{log.instagram_username}</p>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-300 shrink-0">• {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <span className="text-[8px] sm:text-[9px] font-black text-primary bg-primary/5 px-1 sm:px-1.5 py-0.5 rounded-md uppercase tracking-[0.15em] shrink-0 border border-primary/10">
                            {log.keyword_matched || "ANY"}
                        </span>
                        <p className="text-[10px] sm:text-[11px] text-slate-400 truncate italic font-medium">
                            "{log.comment_text}"
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                    {log.is_clicked && (
                        <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                            <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
                            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tighter">Clicked</span>
                        </div>
                    )}

                    <div className={cn(
                        "flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border transition-all",
                        log.reply_sent ? "bg-green-50/50 border-green-100/50" : "bg-red-50/50 border-red-100/50"
                    )}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            log.reply_sent ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                        )} />
                        <span className={cn(
                            "text-[8px] sm:text-[9px] font-black uppercase tracking-[0.1em]",
                            log.reply_sent ? "text-green-600" : "text-red-600"
                        )}>
                            {log.reply_sent ? "Delivered" : "Failed"}
                        </span>
                    </div>

                    <div className="p-2 text-slate-200 group-hover:text-primary transition-colors hidden md:block">
                        <ChevronRight className="h-5 w-5 translate-x-0 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", className)}>
            {children}
        </span>
    );
}
