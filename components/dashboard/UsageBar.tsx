"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageData {
    used: number;
    limit: number;
    percentage: number;
    isUnlimited: boolean;
    planName: string;
    planType: string;
    hourlyLimit?: number;
}

interface UsageBarProps {
    className?: string;
    compact?: boolean;
    resetDateText?: string;
}

export function UsageBar({ className, compact = false, resetDateText }: UsageBarProps) {
    const [usage, setUsage] = useState<UsageData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchUsage() {
            try {
                const res = await fetch("/api/usage");
                if (res.ok) {
                    const data = await res.json();
                    setUsage(data);
                }
            } catch (error) {
                console.error("Failed to fetch usage:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchUsage();
    }, []);

    // Don't show for Pro/unlimited plans
    if (loading) {
        return (
            <div className={cn("animate-pulse", className)}>
                <div className="h-16 bg-slate-100 rounded-2xl" />
            </div>
        );
    }

    if (!usage || usage.isUnlimited) {
        return null;
    }

    const formatNumber = (num: number) => {
        if (num >= 1000) {
            return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + "K";
        }
        return num.toString();
    };

    const getBarColor = () => {
        if (usage.percentage >= 90) return "bg-rose-500";
        if (usage.percentage >= 75) return "bg-amber-500";
        return "bg-primary";
    };

    const getStatusColor = () => {
        if (usage.percentage >= 90) return "text-rose-600 bg-rose-50";
        if (usage.percentage >= 75) return "text-amber-600 bg-amber-50";
        return "text-primary bg-primary/10";
    };

    if (compact) {
        return (
            <div className={cn("px-4", className)}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Monthly DMs</span>
                    <span className={cn("font-bold px-1.5 py-0.5 rounded-md text-[10px]", getStatusColor())}>
                        {usage.percentage}%
                    </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className={cn("h-full rounded-full transition-all duration-500", getBarColor())}
                        style={{ width: `${usage.percentage}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>{formatNumber(usage.used)} used</span>
                    <span>{formatNumber(usage.limit)} limit</span>
                </div>
            </div>
        );
    }

    return (
        <div className={cn("p-4 bg-slate-50/50 rounded-2xl border border-slate-100", className)}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Zap className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-700">Monthly DMs</p>
                        <p className="text-[10px] text-slate-400">{usage.planName}</p>
                    </div>
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-lg", getStatusColor())}>
                    {usage.percentage}%
                </span>
            </div>

            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                    className={cn("h-full rounded-full transition-all duration-500", getBarColor())}
                    style={{ width: `${usage.percentage}%` }}
                />
            </div>

            <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-slate-500">
                    <span className="font-bold text-slate-700">{formatNumber(usage.used)}</span> / {formatNumber(usage.limit)}
                </span>

                {/* Hourly Speed Indicator */}
                <div className="flex items-center gap-2">
                    {resetDateText && (
                        <span className="text-[10px] font-bold text-slate-400">
                            {resetDateText}
                        </span>
                    )}

                </div>
            </div>

            {usage.percentage >= 80 && (
                <div className="mt-2 text-right">
                    <a
                        href="/dashboard/billing"
                        className="text-[10px] font-bold text-primary hover:underline"
                    >
                        Upgrade Plan
                    </a>
                </div>
            )}
        </div>
    );
}
