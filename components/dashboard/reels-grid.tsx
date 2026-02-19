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
import { SafeImage } from "@/components/ui/safe-image";

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
    trigger_type: "keyword" | "any" | "story_reply";
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
                let fetchedMedia = mediaData.media || [];

                // Inject Story Automation Placeholder (only on first load, no cursor)
                if (!cursor) {
                    const storyPlaceholder = {
                        id: "STORY_AUTOMATION",
                        media_type: "STORY",
                        media_url: "",
                        thumbnail_url: "",
                        caption: "Story Automation",
                        timestamp: new Date().toISOString(),
                        permalink: ""
                    };
                    fetchedMedia = [storyPlaceholder, ...fetchedMedia];
                }

                if (cursor) {
                    setMedia(prev => [...prev, ...fetchedMedia]);
                } else {
                    setMedia(fetchedMedia);
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
        if (mediaId === "STORY_AUTOMATION") {
            return automations.find((a) => a.media_id === mediaId || a.trigger_type === "story_reply");
        }
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
                    media_id: data.media_id || selectedMedia.id,
                    media_type: data.media_id ? (data.media_id === "STORY_AUTOMATION" ? "STORY" : "REELS") : selectedMedia.media_type,
                    media_url: data.media_id ? "" : selectedMedia.media_url,
                    media_thumbnail_url: data.media_id ? "" : (selectedMedia.thumbnail_url || selectedMedia.media_url),
                    media_caption: data.media_id ? (data.media_id === "ALL_MEDIA" ? "Any Post" : (data.media_id === "NEXT_MEDIA" ? "Next Post" : (data.media_id === "STORY_AUTOMATION" ? "Story Automation" : selectedMedia.caption?.substring(0, 200) || "Untitled Post"))) : selectedMedia.caption?.substring(0, 200),
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
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                            activeAutomationsCount > 0
                                ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30 animate-pulse"
                                : "bg-slate-100 text-slate-400"
                        )}>
                            <Zap className={cn("h-5 w-5 fill-current", activeAutomationsCount > 0 && "text-white")} />
                        </div>
                        <h2 className={cn(
                            "text-xl font-black tracking-tight transition-colors duration-500",
                            activeAutomationsCount > 0 ? "text-blue-600 drop-shadow-sm" : "text-slate-900"
                        )}>
                            Active Automations
                        </h2>
                    </div>
                </div>

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

                                // Custom Rendering for Story Automation Card
                                if (item.id === "STORY_AUTOMATION") {
                                    return (
                                        <div
                                            key={item.id}
                                            className={cn(
                                                "relative group rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-2 transition-all duration-500 shadow-sm hover:shadow-2xl flex flex-col h-full",
                                                hasAutomation ? "border-indigo-500 ring-4 ring-indigo-500/10" : "border-transparent"
                                            )}
                                        >
                                            <div className="flex-1 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-3 md:p-5 flex flex-col justify-between text-center text-white relative group-hover:scale-[1.02] transition-transform duration-700 min-h-[300px]">
                                                {/* Top Space (Vertical Centering) */}
                                                <div />

                                                {!hasAutomation && (
                                                    <div className="flex flex-col items-center justify-center flex-1">
                                                        <button
                                                            onClick={() => { setSelectedMedia(item); setShowWizard(true); }}
                                                            className="flex flex-col items-center gap-3 group/create"
                                                        >
                                                            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center transform group-hover/create:scale-110 group-hover/create:rotate-90 transition-all duration-500 ring-4 ring-white/10">
                                                                <Plus className="h-6 w-6 md:h-7 md:w-7" />
                                                            </div>
                                                            <span className="text-white text-[10px] md:text-xs font-black tracking-[0.2em] uppercase drop-shadow-lg">Create Reply</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Bottom Info Bar (Unified with posts) */}
                                                <div className="space-y-3">
                                                    <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-2 rounded-xl flex items-center justify-center gap-2">
                                                        <Zap className="h-3 w-3 text-white/60 fill-white/60" />
                                                        <p className="text-[10px] md:text-xs text-white/90 font-bold leading-relaxed uppercase tracking-widest italic">
                                                            Story Reply
                                                        </p>
                                                    </div>
                                                </div>

                                                {hasAutomation && (
                                                    <div className="absolute top-4 right-4 animate-in fade-in zoom-in duration-500">
                                                        <Badge className={cn("border-none font-black text-[8px] md:text-[10px] uppercase tracking-widest bg-white shadow-xl px-2.5 py-1", automation.is_active ? "text-green-600" : "text-slate-400")}>
                                                            {automation.is_active ? "● ACTIVE" : "PAUSED"}
                                                        </Badge>
                                                    </div>
                                                )}

                                                {/* Actions Overlay */}
                                                {hasAutomation && (
                                                    <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 md:p-4">
                                                        <div className={cn(
                                                            "bg-slate-900/40 backdrop-blur-3xl rounded-2xl border border-white/10 p-3 md:p-4 shadow-2xl transition-all duration-500",
                                                            "translate-y-0 opacity-100",
                                                            "md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0"
                                                        )}>
                                                            <div className="flex flex-col gap-2 md:grid md:grid-cols-4 md:gap-2">
                                                                <button
                                                                    onClick={() => { setEditingAutomation(automation); setSelectedMedia(item); setShowWizard(true); }}
                                                                    className="w-full h-10 md:h-12 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all group/edit"
                                                                    title="Edit Reply"
                                                                >
                                                                    <Edit3 className="h-4 w-4 transition-transform group-hover/edit:scale-110" />
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleAutomation(automation.id, automation.is_active)}
                                                                    className={cn(
                                                                        "w-full col-span-2 h-10 md:h-12 rounded-xl flex items-center justify-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10 shadow-lg shadow-black/20",
                                                                        automation.is_active
                                                                            ? "bg-white/10 text-white hover:bg-white/20"
                                                                            : "bg-white text-indigo-600 shadow-white/20"
                                                                    )}
                                                                >
                                                                    {automation.is_active ? (
                                                                        <><X className="h-3.5 w-3.5" /> Stop</>
                                                                    ) : (
                                                                        <><Zap className="h-3.5 w-3.5 fill-current" /> Start</>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteAutomation(automation.id)}
                                                                    className="w-full h-10 md:h-12 rounded-xl bg-rose-500/20 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white flex items-center justify-center transition-all group/del"
                                                                    title="Delete Reply"
                                                                >
                                                                    <Trash2 className="h-4 w-4 transition-transform group-hover/del:rotate-12" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "relative group rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-slate-900 border-2 transition-all duration-500 flex flex-col h-full",
                                            hasAutomation ? "border-primary ring-4 ring-primary/5 shadow-xl" : "border-transparent hover:border-primary/40 shadow-sm"
                                        )}
                                    >
                                        <div className="flex-1 overflow-hidden relative group-hover:scale-[1.02] transition-transform duration-700 min-h-[300px]">
                                            <SafeImage
                                                src={item.thumbnail_url || item.media_url}
                                                alt={item.caption || "Reel"}
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Gradients & Badges */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
                                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                                                <Badge className="bg-slate-900/60 backdrop-blur-xl text-white border-white/10 font-black text-[7px] md:text-[8px] px-2 py-0.5 uppercase tracking-widest">
                                                    {item.media_type === "REELS" ? "🎬 REEL" : "📸 PHOTO"}
                                                </Badge>
                                                {hasAutomation && (
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 px-2 py-0.5 backdrop-blur-xl rounded-full border",
                                                        automation.is_active
                                                            ? "bg-green-500/20 border-green-500/30"
                                                            : "bg-amber-500/20 border-amber-500/30"
                                                    )}>
                                                        <div className={cn(
                                                            "w-1 h-1 rounded-full",
                                                            automation.is_active
                                                                ? "bg-green-400 shadow-[0_0_8px_#4ade80] animate-pulse"
                                                                : "bg-amber-400"
                                                        )} />
                                                        <span className={cn(
                                                            "text-[7px] md:text-[8px] font-black uppercase tracking-widest",
                                                            automation.is_active ? "text-green-400" : "text-amber-400"
                                                        )}>
                                                            {automation.is_active ? "Active" : "Paused"}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Overlay Content */}
                                            <div className="absolute inset-0 z-20 flex flex-col justify-between p-3 md:p-5">
                                                {/* Top Space (Centered Action below) */}
                                                <div />

                                                {/* Central Action (When No Automation) */}
                                                {!hasAutomation && (
                                                    <div className="flex flex-col items-center justify-center flex-1">
                                                        <button
                                                            onClick={() => { setSelectedMedia(item); setShowWizard(true); }}
                                                            className="flex flex-col items-center gap-3 group/create"
                                                        >
                                                            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary text-white rounded-2xl shadow-2xl shadow-primary/40 flex items-center justify-center transform group-hover/create:scale-110 group-hover/create:rotate-90 transition-all duration-500 ring-4 ring-white/10">
                                                                <Plus className="h-6 w-6 md:h-7 md:w-7" />
                                                            </div>
                                                            <span className="text-white text-[10px] md:text-xs font-black tracking-[0.2em] uppercase drop-shadow-lg">Create Reply</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Bottom Info & Management Bar */}
                                                <div className="space-y-3">
                                                    {/* Caption inside overlay */}
                                                    <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 p-2 rounded-xl">
                                                        <p className="text-[10px] md:text-xs text-white/90 font-bold leading-relaxed line-clamp-1 italic text-center">
                                                            {item.caption || "Untitled Post"}
                                                        </p>
                                                    </div>

                                                    {/* Automation Management (Always visible mobile, hover desktop) */}
                                                    {hasAutomation && (
                                                        <div className={cn(
                                                            "bg-white/10 backdrop-blur-3xl rounded-2xl border border-white/20 p-2.5 md:p-3.5 shadow-2xl transition-all duration-500",
                                                            "translate-y-0 opacity-100",
                                                            "md:opacity-0 md:group-hover:opacity-100 md:translate-y-2 md:group-hover:translate-y-0"
                                                        )}>
                                                            <div className="flex flex-col gap-2 md:grid md:grid-cols-4 md:gap-2">
                                                                <button
                                                                    onClick={() => { setEditingAutomation(automation); setSelectedMedia(item); setShowWizard(true); }}
                                                                    className="w-full h-10 md:h-11 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white flex items-center justify-center transition-all group/edit"
                                                                    title="Edit"
                                                                >
                                                                    <Edit3 className="h-4 w-4 transition-transform group-hover/edit:scale-110" />
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleAutomation(automation.id, automation.is_active)}
                                                                    className={cn(
                                                                        "w-full col-span-2 h-10 md:h-11 rounded-xl flex items-center justify-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10 shadow-lg shadow-black/20",
                                                                        automation.is_active
                                                                            ? "bg-white/10 text-white hover:bg-white/20"
                                                                            : "bg-primary text-white shadow-primary/20 hover:shadow-primary/40"
                                                                    )}
                                                                >
                                                                    {automation.is_active ? (
                                                                        <><X className="h-3.5 w-3.5" /> Stop</>
                                                                    ) : (
                                                                        <><Zap className="h-3.5 w-3.5 fill-current" /> Start</>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => deleteAutomation(automation.id)}
                                                                    className="w-full h-10 md:h-11 rounded-xl bg-rose-500/20 hover:bg-rose-500 border border-rose-500/20 text-rose-400 hover:text-white flex items-center justify-center transition-all group/del"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="h-4 w-4 transition-transform group-hover/del:rotate-12" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {
                            nextCursor && (
                                <div className="pt-10 flex flex-col items-center gap-4">
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
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest italic animate-pulse">
                                        Click "Fetch All" to search through your entire Instagram library
                                    </p>
                                </div>
                            )
                        }
                    </>
                )
                }
            </div >

            {showWizard && (
                <AutomationWizard
                    selectedMedia={selectedMedia}
                    initialData={editingAutomation}
                    onClose={() => { setShowWizard(false); setEditingAutomation(null); }}
                    onSave={handleSaveAutomation}
                    saving={saving}
                    planType={planType}
                />
            )}
        </div >
    );
}
