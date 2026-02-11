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
    Filter,
    Edit3,
    Trash2
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

interface ReelsGridProps {
    planType?: string;
}

export default function ReelsGrid({ planType }: ReelsGridProps) {
    const [media, setMedia] = useState<Media[]>([]);
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [editingAutomation, setEditingAutomation] = useState<any | null>(null);
    const [monthlyCount, setMonthlyCount] = useState<number | null>(null);
    const [showWizard, setShowWizard] = useState(false);
    const [saving, setSaving] = useState(false);

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [filterType, setFilterType] = useState<"all" | "active" | "inactive" | "reels" | "photos">("all");

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
                if (autoData.monthlyCount !== undefined) {
                    setMonthlyCount(autoData.monthlyCount);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }



    function getAutomationForMedia(mediaId: string) {
        return automations.find((a) => a.media_id === mediaId);
    }

    // Filter Logic
    const filteredMedia = media.filter(item => {
        const matchesSearch = (item.caption || "").toLowerCase().includes(searchQuery.toLowerCase());
        const automation = getAutomationForMedia(item.id);
        const hasAutomation = !!automation;
        const isActive = automation?.is_active;

        if (filterType === "active") return matchesSearch && isActive;
        if (filterType === "inactive") return matchesSearch && hasAutomation && !isActive;
        if (filterType === "reels") return matchesSearch && item.media_type === "REELS";
        if (filterType === "photos") return matchesSearch && item.media_type === "IMAGE";
        return matchesSearch;
    });

    async function handleSaveAutomation(data: any) {
        if (!selectedMedia) return;
        setSaving(true);
        try {
            const isUpdate = !!data.id;
            const url = isUpdate ? `/api/automations/${data.id}` : "/api/automations";
            const method = isUpdate ? "PUT" : "POST";

            const res = await fetch(url, {
                method: method,
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
                if (isUpdate) {
                    setAutomations(automations.map(a => a.id === result.automation.id ? result.automation : a));
                } else {
                    setAutomations([result.automation, ...automations]);
                }
                setShowWizard(false);
                setEditingAutomation(null);
                setSelectedMedia(null);
            } else {
                const error = await res.json();
                alert(error.error || "Failed to save automation");
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

    async function fetchAll() {
        if (!nextCursor || loadingMore) return;
        setLoadingMore(true);
        let currentCursor = nextCursor;

        try {
            while (currentCursor) {
                const url = `/api/reels?after=${currentCursor}`;
                const res = await fetch(url);
                if (!res.ok) break;

                const data = await res.json();
                if (data.media && data.media.length > 0) {
                    setMedia(prev => [...prev, ...data.media]);
                }

                currentCursor = data.nextCursor;
            }
            setNextCursor(null);
        } catch (error) {
            console.error("Error fetching all media:", error);
        } finally {
            setLoadingMore(false);
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
                <div className="bg-white p-3.5 md:p-4 rounded-2xl md:rounded-3xl border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-6 -mt-6 blur-xl group-hover:scale-110 transition-transform" />
                    <Play className="h-3.5 w-3.5 text-slate-300 mb-1.5 md:mb-2" />
                    <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{media.length}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total Posts</p>
                </div>

                <div className="bg-white p-3.5 md:p-4 rounded-2xl md:rounded-3xl border border-slate-50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-green-500/5 rounded-full -mr-6 -mt-6 blur-xl group-hover:scale-110 transition-transform" />
                    <Zap className="h-3.5 w-3.5 text-green-300 mb-1.5 md:mb-2" />
                    <p className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">{activeAutomationsCount}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Active Replies</p>
                </div>

                <div className="bg-white p-3.5 md:p-4 rounded-2xl md:rounded-3xl border border-slate-50 shadow-sm relative overflow-hidden group col-span-2 lg:col-span-2">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-12 -mt-12 blur-xl group-hover:scale-110 transition-transform" />
                    <TrendingUp className="h-3.5 w-3.5 text-primary/40 mb-1.5 md:mb-2" />
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl md:text-3xl font-black text-slate-900 tracking-tighter">{monthlyCount ?? totalDMs}</p>
                        <Badge className="bg-primary/10 text-primary border-none text-[7px] md:text-[8px] px-1.5 py-0 rounded-md animate-pulse uppercase font-black">LIVE</Badge>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Monthly DMs</p>
                </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                    <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                        Automate Content
                    </h2>

                    <div className="flex items-center gap-2">
                        <div className="relative group flex-1 md:w-56">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 group-hover:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Search posts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-8 md:h-9 pl-8 md:pl-9 pr-3 bg-white border border-slate-100 rounded-xl text-[10px] md:text-xs font-semibold focus:ring-2 focus:ring-primary transition-all shadow-sm"
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                            <button
                                onClick={() => setFilterType("all")}
                                className={cn("px-2.5 md:px-3 py-1 text-[9px] md:text-[10px] font-black rounded-lg transition-all", filterType === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                                ALL
                            </button>
                            <button
                                onClick={() => setFilterType("active")}
                                className={cn("px-2.5 md:px-3 py-1 text-[9px] md:text-[10px] font-black rounded-lg transition-all", filterType === "active" ? "bg-white text-green-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}
                            >
                                ACTIVE
                            </button>
                        </div>
                    </div>
                </div>

                {media.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] py-24 text-center">
                        <Play className="h-20 w-20 text-slate-100 mx-auto mb-6" />
                        <p className="text-slate-400 text-lg font-bold">No Instagram posts found</p>
                        <p className="text-slate-300 text-sm mt-1">Make sure you've posted some Reels or Photos</p>
                    </div>
                ) : filteredMedia.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] py-24 text-center">
                        <Search className="h-20 w-20 text-slate-100 mx-auto mb-6" />
                        <p className="text-slate-400 text-lg font-bold">No posts match your search</p>
                        {nextCursor && (
                            <p className="text-slate-300 text-sm mt-1">Try fetching more posts to search deeper.</p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filteredMedia.map((item) => {
                                const automation = getAutomationForMedia(item.id);
                                const hasAutomation = !!automation;

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "relative group rounded-[1.5rem] overflow-hidden bg-white border-2 transition-all duration-300",
                                            hasAutomation ? "border-primary ring-4 ring-primary/5 shadow-lg" : "border-transparent hover:border-primary/40 shadow-sm"
                                        )}
                                    >
                                        <div className="aspect-[3/4] overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-500">
                                            <img
                                                src={item.thumbnail_url || item.media_url || "/placeholder-reel.jpg"}
                                                alt={item.caption || "Reel"}
                                                className="w-full h-full object-cover"
                                            />

                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                                            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                                                <Badge className="bg-white/10 backdrop-blur-md text-white border-white/20 font-black text-[6px] md:text-[7px] px-1.5 py-0 uppercase tracking-widest leading-relaxed">
                                                    {item.media_type === "REELS" ? "🎬 REEL" : "📸 PHOTO"}
                                                </Badge>
                                                {hasAutomation && (
                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-green-500/10 backdrop-blur-md rounded-md border border-green-500/20">
                                                        <div className={cn(
                                                            "w-0.5 h-0.5 md:w-1 md:h-1 rounded-full bg-green-400 shadow-[0_0_8px_#4ade80]",
                                                            automation.is_active && "animate-pulse"
                                                        )} />
                                                        <span className="text-[6px] md:text-[7px] font-black text-green-400 uppercase tracking-widest">Live</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Unified Hover Panel */}
                                            <div className="absolute inset-0 z-20 opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-2.5 md:p-4 text-center">
                                                <div className="bg-white/10 backdrop-blur-2xl rounded-xl md:rounded-2xl border border-white/20 p-3 md:p-4 shadow-2xl translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                                    {!hasAutomation ? (
                                                        <button
                                                            onClick={() => { setSelectedMedia(item); setShowWizard(true); }}
                                                            className="w-full flex flex-col items-center justify-center gap-2 md:gap-3 py-3 md:py-4 group/btn"
                                                        >
                                                            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary text-white rounded-xl md:rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-center transform group-hover/btn:scale-110 transition-transform duration-500 group-hover/btn:rotate-90">
                                                                <Plus className="h-5 w-5 md:h-6 md:w-6" />
                                                            </div>
                                                            <span className="text-white text-[9px] md:text-[10px] font-black tracking-[0.2em] uppercase">Create Reply</span>
                                                        </button>
                                                    ) : (
                                                        <div className="space-y-3 md:space-y-4">
                                                            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 md:pb-3 text-left">
                                                                <div className="flex flex-col">
                                                                    <p className="text-[7px] md:text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Frequency Trigger</p>
                                                                    <p className="text-[10px] md:text-[11px] font-black text-white leading-tight truncate max-w-[80px] md:max-w-[110px]">
                                                                        {automation.trigger_type === "any" ? "ANY_SIGNAL" : `"${automation.trigger_keyword}"`}
                                                                    </p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[7px] md:text-[8px] font-black text-white/50 uppercase tracking-widest mb-0.5">Relayed</p>
                                                                    <p className="text-sm md:text-base font-black text-primary leading-tight">{automation.dm_sent_count}</p>
                                                                </div>
                                                            </div>

                                                            <div className="grid grid-cols-4 gap-1.5 md:gap-2">
                                                                <button
                                                                    onClick={() => { setEditingAutomation(automation); setSelectedMedia(item); setShowWizard(true); }}
                                                                    className="h-8 md:h-10 rounded-lg md:rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all group/edit"
                                                                    title="Edit Logic"
                                                                >
                                                                    <Edit3 className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform group-hover/edit:scale-110" />
                                                                </button>

                                                                <button
                                                                    onClick={() => toggleAutomation(automation.id, automation.is_active)}
                                                                    className={cn(
                                                                        "col-span-2 h-8 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center gap-1.5 md:gap-2 text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10 shadow-lg shadow-black/20",
                                                                        automation.is_active
                                                                            ? "bg-white/10 text-white hover:bg-white/20"
                                                                            : "bg-primary text-white shadow-primary/20 hover:shadow-primary/40"
                                                                    )}
                                                                >
                                                                    {automation.is_active ? (
                                                                        <><X className="h-3 w-3 md:h-3.5 md:w-3.5" /> Stop</>
                                                                    ) : (
                                                                        <><Zap className="h-3 w-3 md:h-3.5 md:w-3.5 fill-current" /> Ignite</>
                                                                    )}
                                                                </button>

                                                                <button
                                                                    onClick={() => deleteAutomation(automation.id)}
                                                                    className="h-8 md:h-10 rounded-lg md:rounded-xl bg-rose-500/20 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white flex items-center justify-center transition-all group/del"
                                                                    title="Erase Node"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform group-hover/del:rotate-12" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="absolute bottom-4 left-4 right-4 z-10 transition-transform duration-500 group-hover:-translate-y-1">
                                                <p className="text-[11px] text-white/90 font-bold leading-relaxed line-clamp-1 italic">
                                                    {item.caption || "Untitled Content Node"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {nextCursor && (
                            <div className="pt-10 flex flex-col items-center gap-4">
                                <div className="flex items-center gap-4">


                                    <Button
                                        onClick={fetchAll}
                                        disabled={loadingMore}
                                        className="h-14 px-8 rounded-3xl bg-slate-900 text-white font-bold hover:bg-slate-800 shadow-xl gap-3 group"
                                    >
                                        {loadingMore ? (
                                            <Loader2 className="h-5 w-5 animate-spin text-white" />
                                        ) : (
                                            <>
                                                Fetch All Posts
                                                <Zap className="h-4 w-4 fill-primary text-primary" />
                                            </>
                                        )}
                                    </Button>
                                </div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic animate-pulse">
                                    Click "Fetch All" to search through your entire Instagram library
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {
                showWizard && (
                    <AutomationWizard
                        selectedMedia={selectedMedia}
                        initialData={editingAutomation}
                        onClose={() => { setShowWizard(false); setEditingAutomation(null); }}
                        onSave={handleSaveAutomation}
                        saving={saving}
                        planType={planType}
                    />
                )
            }
        </div >
    );
}
