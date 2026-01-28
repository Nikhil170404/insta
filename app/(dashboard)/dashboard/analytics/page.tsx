"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart3,
    MessageCircle,
    TrendingUp,
    Calendar,
    Loader2,
    CheckCircle2,
    XCircle,
    Users,
    Zap,
    ChevronRight,
    Search,
    Filter,
    Activity
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DmLog {
    id: string;
    instagram_username: string;
    keyword_matched: string;
    comment_text: string;
    reply_sent: boolean;
    created_at: string;
}

interface Stats {
    today: number;
    week: number;
    total: number;
    successRate: number;
}

export default function AnalyticsPage() {
    const [logs, setLogs] = useState<DmLog[]>([]);
    const [stats, setStats] = useState<Stats>({
        today: 0,
        week: 0,
        total: 0,
        successRate: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    async function fetchAnalytics() {
        try {
            const res = await fetch("/api/analytics");
            if (res.ok) {
                const data = await res.json();
                setLogs(data.logs || []);
                setStats(data.stats || { today: 0, week: 0, total: 0, successRate: 0 });
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Crunching data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Performance Insight</h1>
                    <p className="text-slate-400 font-medium">Real-time data from your automation tunnels.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="h-12 px-5 rounded-2xl bg-white border border-slate-100 font-bold text-slate-600 text-sm shadow-sm flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Last 7 Days
                    </button>
                </div>
            </div>

            {/* Premium Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <Calendar className="h-6 w-6 text-blue-300 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.today}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Today's DMs</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <TrendingUp className="h-6 w-6 text-purple-300 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.week}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Weekly Reach</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <MessageCircle className="h-6 w-6 text-primary/40 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.total}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Lifetime</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <Zap className="h-6 w-6 text-green-300 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.successRate}%</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Success Rate</p>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Live Activity Feed
                    </h2>
                    <div className="flex items-center gap-2">
                        <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <Filter className="h-5 w-5" />
                        </button>
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
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="flex items-center gap-5 p-5 bg-white rounded-[2rem] border border-slate-50 transition-all duration-300 hover:shadow-lg group"
                            >
                                {/* User Profile Simulation */}
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-black text-lg shadow-inner flex-shrink-0 group-hover:scale-105 transition-transform">
                                    {log.instagram_username?.charAt(0).toUpperCase() || "?"}
                                </div>

                                {/* Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-bold text-slate-900">@{log.instagram_username}</p>
                                        <span className="text-[10px] font-bold text-slate-300">• {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-black text-primary bg-primary/5 px-2 py-0.5 rounded-lg uppercase tracking-widest">
                                            {log.keyword_matched || "General"}
                                        </span>
                                        <p className="text-xs text-slate-400 truncate italic">
                                            "{log.comment_text}"
                                        </p>
                                    </div>
                                </div>

                                {/* Status Badge */}
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl">
                                    {log.reply_sent ? (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Delivered</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Failed</span>
                                        </>
                                    )}
                                </div>

                                <button className="p-2 text-slate-200 group-hover:text-slate-400 transition-colors">
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </div>
                        ))}

                        <button className="w-full py-6 text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] hover:text-primary transition-colors">
                            Load historical data
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
