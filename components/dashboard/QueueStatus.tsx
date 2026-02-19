"use client";

import { useEffect, useState } from "react";
import { Clock, AlertTriangle, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueueData {
    pending: number;
    failed: number;
    nextSendAt: string | null;
    estimatedMinutes: number | null;
}

export function QueueStatus({ className }: { className?: string }) {
    const [queue, setQueue] = useState<QueueData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchQueue() {
            try {
                const res = await fetch("/api/queue-status");
                if (res.ok) {
                    const data = await res.json();
                    setQueue(data);
                }
            } catch (error) {
                console.error("Failed to fetch queue status:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchQueue();
        const interval = setInterval(fetchQueue, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, []);

    // Don't render anything if loading or queue is empty
    if (loading || !queue || (queue.pending === 0 && queue.failed === 0)) {
        return null;
    }

    return (
        <div className={cn("space-y-3", className)}>
            {/* Pending Queue Card */}
            {queue.pending > 0 && (
                <div className="relative overflow-hidden bg-gradient-to-r from-indigo-500/5 via-primary/5 to-indigo-500/5 rounded-2xl border border-indigo-200/50 p-5">
                    {/* Animated shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_3s_ease-in-out_infinite] -translate-x-full" />

                    <div className="relative z-10 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                <Send className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-black text-slate-900 tracking-tight">
                                        {queue.pending} message{queue.pending !== 1 ? "s" : ""} queued
                                    </p>
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                </div>
                                <p className="text-xs font-bold text-slate-400 mt-0.5">
                                    {queue.estimatedMinutes !== null && queue.estimatedMinutes > 0
                                        ? `Sending in ~${queue.estimatedMinutes} min`
                                        : "Processing now..."}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-100">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Auto-Send
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Failed Queue Card */}
            {queue.failed > 0 && (
                <div className="bg-rose-50/80 rounded-2xl border border-rose-200/50 p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center shrink-0">
                            <AlertTriangle className="h-4 w-4 text-rose-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-rose-700">
                                {queue.failed} message{queue.failed !== 1 ? "s" : ""} failed
                            </p>
                            <p className="text-xs text-rose-400 font-medium">
                                Will auto-retry on next cycle
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
