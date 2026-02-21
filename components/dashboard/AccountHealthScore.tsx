"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, ShieldAlert, ShieldCheck, Shield } from "lucide-react";


type HealthData = {
    score: number;
    label: string;
    color: "green" | "teal" | "amber" | "orange" | "red";
    breakdown: {
        [key: string]: {
            score: number;
            maxPoints: number;
            value: string;
            label: string;
        };
    };
};

const colorConfig = {
    green: { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500", icon: ShieldCheck, border: "border-green-200" },
    teal: { bg: "bg-teal-50", text: "text-teal-600", dot: "bg-teal-500", icon: ShieldCheck, border: "border-teal-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500", icon: Shield, border: "border-amber-200" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", dot: "bg-orange-500", icon: ShieldAlert, border: "border-orange-200" },
    red: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500", icon: ShieldAlert, border: "border-red-200" },
};

export function AccountHealthScore() {
    const [data, setData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchHealth = async () => {
        try {
            const res = await fetch("/api/account-health");
            if (res.ok) {
                setData(await res.json());
            }
        } catch (err) {
            console.error("Failed to fetch account health", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 60000); // 1 min auto-refresh
        return () => clearInterval(interval);
    }, []);

    if (loading || !data) {
        return (
            <Card>
                <CardHeader className="pb-2">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent className="flex flex-col md:flex-row gap-6 items-center">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2 flex-grow w-full">
                        {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-4 w-full" />)}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const styles = colorConfig[data.color];
    const Icon = styles.icon;

    return (
        <Card className={`border ${styles.border} overflow-hidden`}>
            <CardHeader className={`${styles.bg} pb-4`}>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className={`flex items-center gap-2 ${styles.text}`}>
                            <Icon className="h-5 w-5" />
                            Account Safety Score
                        </CardTitle>
                        <CardDescription className="text-gray-600 mt-1">
                            Real-time analysis of your automation risk levels based on Meta's algorithmic rules.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 flex flex-col md:flex-row gap-8 items-center">
                {/* Left Side: Score Circle */}
                <div className="flex flex-col items-center justify-center min-w-[140px]">
                    <div className={`relative flex flex-col items-center justify-center w-32 h-32 rounded-full border-8 ${styles.border} ${styles.bg}`}>
                        <span className={`text-4xl font-bold tracking-tighter ${styles.text}`}>
                            {data.score}
                        </span>
                        <span className="text-sm text-muted-foreground font-medium">/ 100</span>
                    </div>
                    <div className={`mt-3 px-3 py-1 rounded-full text-sm font-semibold ${styles.bg} ${styles.text}`}>
                        {data.label}
                    </div>
                </div>

                {/* Right Side: Breakdown Table */}
                <div className="flex-grow w-full space-y-3">
                    <div className="text-sm font-medium text-gray-500 mb-2 px-1">Risk Factor Breakdown</div>
                    {Object.entries(data.breakdown).map(([key, factor]) => {
                        // Determine dot color based on how many points earned
                        const pct = factor.score / factor.maxPoints;
                        const dotColor = pct >= 0.8 ? "bg-green-500" : pct >= 0.5 ? "bg-amber-500" : "bg-red-500";

                        return (
                            <div key={key} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                                    <span className="font-medium text-gray-700">{factor.label}</span>
                                </div>

                                <div className="flex items-center gap-4 text-right">
                                    <span className="text-gray-500 hidden sm:inline-block min-w-[120px]">
                                        {factor.value}
                                    </span>
                                    <span className="font-mono text-gray-900 min-w-[50px]">
                                        {factor.score}<span className="text-gray-400">/{factor.maxPoints}</span>
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
