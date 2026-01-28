"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Play,
    MessageCircle,
    Plus,
    Check,
    X,
    Loader2,
    TrendingUp,
    ChevronDown,
    Zap,
    LayoutGrid,
    Search,
    Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import AutomationWizard from "./AutomationWizard";

interface Media {
    id: string;
    caption?: string;
    media_type: string;
    media_url?: string;
    thumbnail_url?: string;
    timestamp: string;
    permalink: string;
}

interface Automation {
    id: string;
    media_id: string;
    media_thumbnail_url?: string;
    media_caption?: string;
    trigger_keyword?: string;
    trigger_type: "keyword" | "any";
    reply_message: string;
    require_follow: boolean;
    is_active: boolean;
    dm_sent_count: number;
}

export default function ReelsGrid() {
    const [media, setMedia] = useState<Media[]>([]);
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData(cursor?: string) {
        try {
            const url = cursor ? `/api/reels?after=${cursor}` : "/api/reels";

            const [mediaRes, autoRes] = await Promise.all([
                fetch(url),
                cursor ? Promise.resolve(null) : fetch("/api/automations"),
            ]);

            if (mediaRes.ok) {
                const mediaData = await mediaRes.json();
                if (cursor) {
                    setMedia(prev => [...prev, ...(mediaData.media || [])]);
                } else {
                    setMedia(mediaData.media || []);
                }
                setNextCursor(mediaData.nextCursor || null);
            }

            if (autoRes && autoRes.ok) {
                const autoData = await autoRes.json();
                setAutomations(autoData.automations || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }

    async function loadMore() {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        await fetchData(nextCursor);
    }

    function getAutomationForMedia(mediaId: string) {
        return automations.find((a) => a.media_id === mediaId);
    }

    async function handleSaveAutomation(data: any) {
        if (!selectedMedia) return;
        setSaving(true);
        try {
            const res = await fetch("/api/automations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    media_id: selectedMedia.id,
                    media_type: selectedMedia.media_type,
                    media_url: selectedMedia.media_url,
                    media_thumbnail_url: selectedMedia.thumbnail_url || selectedMedia.media_url,
                    media_caption: selectedMedia.caption?.substring(0, 200),
                }),
            });

            if (res.ok) {
                const result = await res.json();
                setAutomations([result.automation, ...automations]);
                setShowWizard(false);
            } else {
                const error = await res.json();
                alert(error.error || "Failed to create automation");
            }
        } catch (error) {
            console.error("Error creating automation:", error);
        } finally {
            setSaving(false);
        }
    }

    async function toggleAutomation(id: string, currentState: boolean) {
        try {
            const res = await fetch(`/api/automations/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !currentState }),
            });

            if (res.ok) {
                setAutomations(
                    automations.map((a) =>
                        a.id === id ? { ...a, is_active: !currentState } : a
                    )
                );
            }
        } catch (error) {
            console.error("Error toggling automation:", error);
        }
    }

    async function deleteAutomation(id: string) {
        if (!confirm("Delete this automation?")) return;

        try {
            const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
            if (res.ok) {
                setAutomations(automations.filter((a) => a.id !== id));
            }
        } catch (error) {
            console.error("Error deleting automation:", error);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Fetching your content...</p>
            </div>
        );
    }

    const totalDMs = automations.reduce((sum, a) => sum + a.dm_sent_count, 0);
    const activeAutomationsCount = automations.filter((a) => a.is_active).length;

    return (
        <div className="space-y-10">
            {/* Stats Section */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <Play className="h-6 w-6 text-slate-300 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{media.length}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Posts</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <Zap className="h-6 w-6 text-green-300 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{activeAutomationsCount}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Flows</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-sm relative overflow-hidden group col-span-2 lg:col-span-2">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform" />
                    <TrendingUp className="h-6 w-6 text-primary/40 mb-4" />
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{totalDMs}</p>
                        <span className="text-xs font-black text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase animate-pulse">Live</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total DMs Delivered</p>
                </div>
            </div>

            {/* Reels Grid */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <LayoutGrid className="h-7 w-7 text-primary" />
                        Automate your content
                    </h2>

                    <div className="flex items-center gap-2">
                        <div className="relative group flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search posts..."
                                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-100 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-primary transition-all shadow-sm"
                            />
                        </div>
                        <Button variant="outline" className="h-11 px-4 rounded-2xl bg-white border-slate-100 font-bold text-slate-600 gap-2 shadow-sm">
                            <Filter className="h-4 w-4" />
                            Filters
                        </Button>
                    </div>
                </div>

                {media.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] py-24 text-center">
                        <Play className="h-20 w-20 text-slate-100 mx-auto mb-6" />
                        <p className="text-slate-400 text-lg font-bold">No Instagram posts found</p>
                        <p className="text-slate-300 text-sm mt-1">Make sure you've posted some Reels or Photos</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {media.map((item) => {
                                const automation = getAutomationForMedia(item.id);
                                const hasAutomation = !!automation;

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "relative group rounded-[2.5rem] overflow-hidden bg-white border-2 transition-all duration-300",
                                            hasAutomation ? "border-primary ring-4 ring-primary/5 shadow-xl" : "border-transparent hover:border-primary/40 shadow-sm"
                                        )}
                                    >
                                        <div className="aspect-[3/4] overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-500">
                                            <img
                                                src={item.thumbnail_url || item.media_url || "/placeholder-reel.jpg"}
                                                alt={item.caption || "Reel"}
                                                className="w-full h-full object-cover"
                                            />

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />

                                            {/* Top Badges */}
                                            <div className="absolute top-4 left-4 z-10 flex gap-1.5">
                                                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 font-bold text-[10px] px-2 py-0.5">
                                                    {item.media_type === "REELS" ? "🎬 REEL" : "📸 PHOTO"}
                                                </Badge>
                                                {hasAutomation && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 mt-1 shadow-[0_0_10px_#4ade80] animate-pulse" />
                                                )}
                                            </div>

                                            {/* Hover Actions */}
                                            {!hasAutomation && (
                                                <button
                                                    onClick={() => { setSelectedMedia(item); setShowWizard(true); }}
                                                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 z-20"
                                                >
                                                    <div className="w-14 h-14 bg-primary text-white rounded-full shadow-2xl shadow-primary/40 flex items-center justify-center transform scale-90 group-hover:scale-100 transition-transform duration-300">
                                                        <Plus className="h-7 w-7" />
                                                    </div>
                                                    <span className="text-white text-xs font-black tracking-widest uppercase py-1 px-3 bg-black/30 rounded-full backdrop-blur-sm">Automate</span>
                                                </button>
                                            )}

                                            {/* Footer Content */}
                                            <div className="absolute bottom-4 left-4 right-4 z-10">
                                                <p className="text-[11px] text-white/80 line-clamp-2 font-medium">
                                                    {item.caption || "View on Instagram"}
                                                </p>
                                            </div>
                                        </div>

                                        {hasAutomation && (
                                            <div className="p-5 flex flex-col gap-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <p className="text-[13px] font-black text-slate-900">
                                                            {automation.trigger_type === "any" ? "ANY COMMENT" : `"${automation.trigger_keyword}"`}
                                                        </p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Trigger</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-xl font-black text-primary tracking-tighter">{automation.dm_sent_count}</p>
                                                        <p className="text-[9px] font-black text-slate-400">DMs</p>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => toggleAutomation(automation.id, automation.is_active)}
                                                        className={cn(
                                                            "flex-1 h-10 rounded-2xl flex items-center justify-center gap-2 text-[11px] font-bold transition-all active:scale-95",
                                                            automation.is_active ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-primary text-white shadow-lg shadow-primary/20"
                                                        )}
                                                    >
                                                        {automation.is_active ? (
                                                            <>
                                                                <X className="h-3 w-3" />
                                                                PAUSE FLOW
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="h-3 w-3 fill-current" />
                                                                RESUME
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteAutomation(automation.id)}
                                                        className="w-10 h-10 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-2xl flex items-center justify-center transition-all"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {nextCursor && (
                            <div className="pt-10 flex justify-center">
                                <Button
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                    className="h-14 px-10 rounded-3xl bg-white border border-slate-100 text-slate-900 font-bold hover:bg-slate-50 shadow-sm gap-3 group"
                                >
                                    {loadingMore ? (
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                    ) : (
                                        <>
                                            Explore More Posts
                                            <ChevronDown className="h-5 w-5 text-slate-400 group-hover:translate-y-0.5 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Automation Wizard */}
            {showWizard && (
                <AutomationWizard
                    selectedMedia={selectedMedia}
                    onClose={() => setShowWizard(false)}
                    onSave={handleSaveAutomation}
                    saving={saving}
                />
            )}
        </div>
    );
}
