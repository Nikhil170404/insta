"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart3,
    MessageCircle,
    TrendingUp,
    Calendar,
    Loader2,
    CheckCircle,
    XCircle,
} from "lucide-react";

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
            <div className="flex items-center justify-center h-64 pt-16 lg:pt-0">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pt-16 lg:pt-0">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
                <p className="text-gray-600">Track your DM automation performance</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.today}</p>
                                <p className="text-xs text-gray-500">Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.week}</p>
                                <p className="text-xs text-gray-500">This Week</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <MessageCircle className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-xs text-gray-500">Total DMs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <BarChart3 className="h-5 w-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.successRate}%</p>
                                <p className="text-xs text-gray-500">Success Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent DM Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="text-center py-12">
                            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No activity yet</p>
                            <p className="text-gray-400 text-sm">
                                DMs will appear here when your automations start working
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg"
                                >
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                                        {log.instagram_username?.charAt(0).toUpperCase() || "?"}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium">@{log.instagram_username}</p>
                                        <p className="text-sm text-gray-500 truncate">
                                            Matched: {log.keyword_matched || "Any"}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {new Date(log.created_at).toLocaleString()}
                                        </p>
                                    </div>

                                    {/* Status */}
                                    {log.reply_sent ? (
                                        <div className="flex items-center gap-1 text-green-600">
                                            <CheckCircle className="h-5 w-5" />
                                            <span className="text-sm">Sent</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-red-500">
                                            <XCircle className="h-5 w-5" />
                                            <span className="text-sm">Failed</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
