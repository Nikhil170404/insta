"use client";

import { useState, useEffect } from "react";
import {
    BarChart3,
    MessageCircle,
    TrendingUp,
    Calendar,
    Loader2,
    Zap,
    ChevronRight,
    Activity,
    MousePointer2,
    Percent,
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
    count: number;
}

interface Stats {
    today: number;
    period: number;
    total: number;
    clicks: number;
    successRate: number;
    clickRate: number;
    daily: DailyStat[];
}

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
    });
    const [loading, setLoading] = useState(true);
    const [visibleLogs, setVisibleLogs] = useState(15);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    async function fetchAnalytics() {
        try {
            const res = await fetch("/api/analytics");
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setStats(data.stats || { today: 0, period: 0, total: 0, clicks: 0, successRate: 0, clickRate: 0, daily: [] });
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    }

    const maxDailyCount = Math.max(...(stats.daily?.map(d => d.count) || [1]), 1);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Crunching data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance Insight</h1>
                    <p className="text-slate-400 font-medium">Real-time data from your automation tunnels.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="h-12 px-5 rounded-2xl bg-white border border-slate-100 font-bold text-slate-600 text-sm shadow-sm flex items-center gap-2 transition-all hover:border-primary/20 hover:shadow-md">
                        <Calendar className="h-4 w-4" />
                        Last 7 Days
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard
                    icon={<Activity className="h-5 w-5 text-blue-500" />}
                    value={stats.today}
                    label="Today's DMs"
                    color="blue"
                />
                <StatCard
                    icon={<MousePointer2 className="h-5 w-5 text-purple-500" />}
                    value={stats.clicks}
                    label="Total Clicks"
                    color="purple"
                />
                <StatCard
                    icon={<TrendingUp className="h-5 w-5 text-green-500" />}
                    value={`${stats.successRate}%`}
                    label="Success Rate"
                    color="green"
                />
                <StatCard
                    icon={<Percent className="h-5 w-5 text-orange-500" />}
                    value={`${stats.clickRate}%`}
                    label="Click Rate (CTR)"
                    color="orange"
                />
            </div>

            {/* Chart Section */}
            <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm p-8 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter">Engagement Velocity</h3>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">DMs Sent over last 7 days</p>
                    </div>
                </div>

                <div className="relative h-48 flex items-end justify-between gap-2 md:gap-4 px-2">
                    {stats.daily.map((day, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-3 group">
                            <div className="relative w-full flex items-end justify-center">
                                {/* Bar */}
                                <div
                                    className="w-full max-w-[40px] bg-slate-50 rounded-t-xl group-hover:bg-primary/10 transition-all duration-500 relative"
                                    style={{ height: `${(day.count / maxDailyCount) * 160}px` }}
                                >
                                    {day.count > 0 && (
                                        <div
                                            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary to-primary/60 rounded-t-xl shadow-lg shadow-primary/20 animate-in slide-in-from-bottom duration-1000"
                                            style={{ height: '100%' }}
                                        />
                                    )}
                                    {/* Tooltip on hover */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {day.count} DMs
                                    </div>
                                </div>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter text-center">
                                {day.date}
                            </span>
                        </div>
                    ))}
                    {/* Zero Line */}
                    <div className="absolute bottom-6 inset-x-0 h-px bg-slate-100 -z-10" />
                </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 italic uppercase">
                        <Activity className="h-5 w-5 text-primary" />
                        Live Delivery Feed
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
                            <ActivityRow key={log.id} log={log} />
                        ))}

                        {visibleLogs < logs.length && (
                            <button
                                onClick={() => setVisibleLogs(prev => prev + 15)}
                                className="w-full py-8 text-[11px] font-black text-slate-400 hover:text-primary uppercase tracking-[0.25em] transition-all bg-white border border-slate-50 rounded-[2.5rem] mt-4 hover:shadow-md"
                            >
                                ↓ Load historical data
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, value, label, color }: { icon: React.ReactNode, value: string | number, label: string, color: string }) {
    const colorMap: Record<string, string> = {
        blue: "bg-blue-500/5 text-blue-500",
        purple: "bg-purple-500/5 text-purple-500",
        green: "bg-green-500/5 text-green-500",
        orange: "bg-orange-500/5 text-orange-500",
    };

    return (
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm relative overflow-hidden group transition-all hover:shadow-md">
            <div className={cn("absolute top-0 right-0 w-20 h-20 rounded-full -mr-8 -mt-8 blur-2xl opacity-50 group-hover:scale-125 transition-transform", colorMap[color].split(' ')[0])} />
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", colorMap[color])}>
                {icon}
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</p>
        </div>
    );
}

function ActivityRow({ log }: { log: DmLog }) {
    return (
        <div className="flex items-center gap-5 p-5 bg-white rounded-[2rem] border border-slate-50 transition-all duration-300 hover:shadow-lg group">
            {/* User Profile Simulation */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-lg shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform relative">
                {log.instagram_username?.charAt(0).toUpperCase() || "?"}
                {log.is_clicked && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 rounded-full border-2 border-white flex items-center justify-center">
                        <MousePointer2 className="h-2.5 w-2.5 text-white" />
                    </div>
                )}
            </div>

            {/* Details & Status Container */}
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 min-w-0">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-slate-900 truncate tracking-tight">@{log.instagram_username}</p>
                        <span className="text-[10px] font-bold text-slate-300 shrink-0">• {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-black text-primary bg-primary/5 px-1.5 py-0.5 rounded-md uppercase tracking-[0.15em] shrink-0 border border-primary/10">
                            {log.keyword_matched || "ANY"}
                        </span>
                        <p className="text-[11px] text-slate-400 truncate italic font-medium">
                            "{log.comment_text}"
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                    {/* Click Indicator */}
                    {log.is_clicked && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-600 rounded-lg border border-purple-100">
                            <Zap className="h-3 w-3 fill-current" />
                            <span className="text-[9px] font-black uppercase tracking-tighter">Clicked</span>
                        </div>
                    )}

                    {/* Status Badge */}
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all",
                        log.reply_sent ? "bg-green-50/50 border-green-100/50" : "bg-red-50/50 border-red-100/50"
                    )}>
                        <div className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            log.reply_sent ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-red-500 shadow-[0_0_8px_#ef4444]"
                        )} />
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.1em]",
                            log.reply_sent ? "text-green-600" : "text-red-600"
                        )}>
                            {log.reply_sent ? "Delivered" : "Failed"}
                        </span>
                    </div>

                    <button className="p-2 text-slate-200 group-hover:text-slate-400 transition-colors hidden md:block">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
