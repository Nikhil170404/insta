"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Zap,
    Play,
    Pause,
    Trash2,
    MessageCircle,
    Edit2,
    Loader2,
    X,
    Users,
    TrendingUp,
    MoreVertical,
    CheckCircle2,
    AlertCircle,
    Plus,
    LayoutGrid,
    Search,
    ChevronRight,
    ArrowRight,
    Crown
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import UpgradeModal from "@/components/UpgradeModal";

interface Automation {
    id: string;
    media_id: string;
    media_type: string;
    media_url?: string;
    media_thumbnail_url?: string;
    media_caption?: string;
    trigger_keyword?: string;
    trigger_type: "keyword" | "any" | "story_reply";
    reply_message: string;
    comment_reply?: string;
    button_text?: string;
    link_url?: string;
    require_follow: boolean;
    is_active: boolean;
    comment_count: number;
    dm_sent_count: number;
    dm_failed_count: number;
    created_at: string;
}

interface PlanLimits {
    current: number;
    max: number;
    canCreate: boolean;
    planName: string;
}

export default function AutomationsPage() {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);
    const [limits, setLimits] = useState<PlanLimits | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [totalDMsFromAnalytics, setTotalDMsFromAnalytics] = useState<number | null>(null);

    // Edit state
    const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
    const [editTriggerType, setEditTriggerType] = useState<"keyword" | "any" | "story_reply">("any");
    const [editKeyword, setEditKeyword] = useState("");
    const [editReplyMessage, setEditReplyMessage] = useState("");
    const [editCommentReply, setEditCommentReply] = useState("");
    const [editButtonText, setEditButtonText] = useState("");
    const [editLinkUrl, setEditLinkUrl] = useState("");
    const [editRequireFollow, setEditRequireFollow] = useState(false);
    const [editRespondToReplies, setEditRespondToReplies] = useState(false);
    const [editIgnoreSelfComments, setEditIgnoreSelfComments] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAutomations();
        fetchAnalytics();
    }, []);

    async function fetchAutomations() {
        try {
            const res = await fetch("/api/automations");
            if (res.ok) {
                const data = await res.json();
                setAutomations(data.automations || []);
                if (data.limits) {
                    setLimits(data.limits);
                }
            }
        } catch (error) {
            console.error("Error fetching automations:", error);
        } finally {
            setLoading(false);
        }
    }

    async function fetchAnalytics() {
        try {
            const res = await fetch("/api/analytics");
            if (res.ok) {
                const data = await res.json();
                setTotalDMsFromAnalytics(data.stats?.total || 0);
            }
        } catch (error) {
            console.error("Error fetching analytics:", error);
        }
    }

    function openEditModal(automation: Automation) {
        setEditingAutomation(automation);
        setEditTriggerType(automation.trigger_type);
        setEditKeyword(automation.trigger_keyword || "");
        setEditReplyMessage(automation.reply_message);
        setEditCommentReply(automation.comment_reply || "");
        setEditButtonText(automation.button_text || "");
        setEditLinkUrl(automation.link_url || "");
        setEditRequireFollow(automation.require_follow);
        setEditRespondToReplies((automation as any).respond_to_replies ?? false);
        setEditIgnoreSelfComments((automation as any).ignore_self_comments ?? true);
    }

    async function handleSaveEdit() {
        if (!editingAutomation) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/automations/${editingAutomation.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    trigger_type: editTriggerType,
                    trigger_keyword: editTriggerType === "keyword" ? editKeyword : null,
                    reply_message: editReplyMessage,
                    comment_reply: editCommentReply,
                    button_text: editButtonText,
                    link_url: editLinkUrl,
                    require_follow: editRequireFollow,
                    respond_to_replies: editRespondToReplies,
                    ignore_self_comments: editIgnoreSelfComments,
                }),
            });

            if (res.ok) {
                setAutomations(
                    automations.map((a) =>
                        a.id === editingAutomation.id
                            ? {
                                ...a,
                                trigger_type: editTriggerType,
                                trigger_keyword: editTriggerType === "keyword" ? editKeyword : undefined,
                                reply_message: editReplyMessage,
                                comment_reply: editCommentReply,
                                button_text: editButtonText,
                                link_url: editLinkUrl,
                                require_follow: editRequireFollow,
                                respond_to_replies: editRespondToReplies,
                                ignore_self_comments: editIgnoreSelfComments,
                            }
                            : a
                    )
                );
                setEditingAutomation(null);
            }
        } catch (error) {
            console.error("Error updating automation:", error);
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
                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase tracking-widest">Loading replies...</p>
            </div>
        );
    }

    const activeCount = automations.filter((a) => a.is_active).length;
    // Use sum of automation counts to ensure UI consistency with cards
    const totalDMs = automations.reduce((sum, a) => sum + a.dm_sent_count, 0);

    return (
        <div className="space-y-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Active Replies</h1>
                    <p className="text-slate-400 font-medium">Manage your auto-replies and comments.</p>
                </div>
                <Link href="/dashboard" className="w-full md:w-auto">
                    <Button className="w-full md:w-auto h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20 gap-3 group">
                        <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                        New Reply
                    </Button>
                </Link>
            </div>

            {/* Premium Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <Zap className="h-6 w-6 text-slate-300 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{automations.length}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Replies</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:scale-110 transition-transform" />
                    <CheckCircle2 className="h-6 w-6 text-green-300 mb-4" />
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{activeCount}</p>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-slate-50 shadow-[0_4px_20px_rgba(0,0,0,0.02)] relative overflow-hidden group col-span-2">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform" />
                    <TrendingUp className="h-6 w-6 text-primary/40 mb-4" />
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black text-slate-900 tracking-tighter">{totalDMs}</p>
                        <span className="text-xs font-black text-primary bg-primary/10 rounded-lg px-2 py-1 uppercase tracking-widest">Total Sent</span>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Responses Sent</p>
                </div>
            </div>

            {/* Plan Limits Banner */}
            {limits && (
                <div className={cn(
                    "rounded-[2rem] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4",
                    limits.canCreate
                        ? "bg-gradient-to-r from-slate-900 to-slate-800"
                        : "bg-gradient-to-r from-amber-500 to-orange-500"
                )}>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center",
                            limits.canCreate ? "bg-primary/20" : "bg-white/20"
                        )}>
                            <Crown className={cn("h-6 w-6", limits.canCreate ? "text-primary" : "text-white")} />
                        </div>
                        <div>
                            <p className="text-white font-bold">
                                {limits.current} of {limits.max} automations used
                            </p>
                            <p className={cn("text-sm", limits.canCreate ? "text-slate-400" : "text-white/70")}>
                                {limits.canCreate
                                    ? `${limits.planName} • ${limits.max - limits.current} remaining`
                                    : "Upgrade to create more automations!"
                                }
                            </p>
                        </div>
                    </div>
                    {!limits.canCreate && (
                        <Button
                            onClick={() => setShowUpgradeModal(true)}
                            className="bg-white text-amber-600 hover:bg-white/90 font-bold rounded-xl h-12 px-6"
                        >
                            <Crown className="h-4 w-4 mr-2" />
                            Upgrade Plan
                        </Button>
                    )}
                    {limits.canCreate && limits.current >= limits.max - 1 && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-none font-bold">
                            Almost at limit
                        </Badge>
                    )}
                </div>
            )}

            {/* Flows List */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5 text-primary" />
                        Your Replies
                    </h2>
                    <div className="flex items-center gap-2">
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input type="text" placeholder="Search..." className="h-10 pl-11 pr-4 bg-slate-100/50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary w-48" />
                        </div>
                    </div>
                </div>

                {automations.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-slate-100 rounded-[3rem] py-32 text-center group">
                        <Zap className="h-20 w-20 text-slate-100 mx-auto mb-6 group-hover:scale-110 transition-transform duration-500" />
                        <p className="text-slate-400 text-lg font-bold">No replies yet</p>
                        <p className="text-slate-300 text-sm mt-1 max-w-sm mx-auto">Create a reply to start engaging with your audience.</p>
                        <Link href="/dashboard" className="mt-8 inline-block">
                            <Button className="h-12 px-8 rounded-2xl bg-slate-900 text-white font-bold text-sm">Create Reply</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {automations.map((automation) => (
                            <div
                                key={automation.id}
                                className={cn(
                                    "flex flex-col md:flex-row md:items-center gap-6 p-6 md:p-8 bg-white rounded-[2.5rem] border transition-all duration-300 hover:shadow-xl group relative overflow-hidden",
                                    automation.is_active ? "border-slate-50" : "border-slate-100 opacity-60"
                                )}
                            >
                                {/* Media Thumbnail */}
                                <div className="w-20 h-28 bg-slate-100 rounded-3xl overflow-hidden shadow-sm flex-shrink-0 relative group/thumb transition-transform group-hover:scale-105">
                                    {automation.media_thumbnail_url ? (
                                        <img src={automation.media_thumbnail_url} alt="Reel" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center"><Play className="h-6 w-6 text-slate-300" /></div>
                                    )}
                                    <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                        <ArrowRight className="h-6 w-6 text-white" />
                                    </div>
                                </div>

                                {/* Flow Details */}
                                <div className="flex-1 min-w-0 space-y-3">
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Badge className={cn("px-3 py-1 rounded-full font-bold text-[10px] uppercase border-none tracking-widest", automation.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                                            {automation.is_active ? "✓ Active" : "⏸ Paused"}
                                        </Badge>
                                        <Badge variant="outline" className="px-3 py-1 rounded-full font-bold text-[10px] border-slate-100 text-slate-400 tracking-widest uppercase">
                                            {automation.trigger_type === "any" ? "Any Comment" : automation.trigger_type === "story_reply" ? "Story Reply" : `Keyword: ${automation.trigger_keyword}`}
                                        </Badge>
                                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tighter">Created {new Date(automation.created_at).toLocaleDateString()}</span>
                                    </div>

                                    <div className="space-y-1">
                                        <h3 className="text-sm font-bold text-slate-900 truncate pr-10">
                                            {automation.media_caption || "Untitled Reply"}
                                        </h3>
                                        <p className="text-xs font-medium text-slate-400 line-clamp-1 italic">
                                            "{automation.reply_message}"
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-6 pt-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">{automation.dm_sent_count} Delivered</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                            <span className="text-[11px] font-black text-slate-300 uppercase tracking-wider">0 Errors</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-3 self-end md:self-center z-10">
                                    <button
                                        onClick={() => openEditModal(automation)}
                                        className="h-12 w-12 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-primary rounded-2xl flex items-center justify-center transition-all active:scale-95"
                                        title="Edit Reply"
                                    >
                                        <Edit2 className="h-5 w-5" />
                                    </button>
                                    <button
                                        onClick={() => toggleAutomation(automation.id, automation.is_active)}
                                        className={cn(
                                            "h-12 px-6 rounded-2xl font-bold text-xs uppercase transition-all active:scale-95 flex items-center gap-2",
                                            automation.is_active ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-primary text-white shadow-lg shadow-primary/20"
                                        )}
                                    >
                                        {automation.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current" />}
                                        {automation.is_active ? "Pause" : "Resume"}
                                    </button>
                                    <button
                                        onClick={() => deleteAutomation(automation.id)}
                                        className="h-12 w-12 bg-rose-50 hover:bg-rose-100 text-rose-400 hover:text-rose-500 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                                        title="Remove Reply"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Modal (Configuration Panel) */}
            {editingAutomation && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 lg:p-10">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setEditingAutomation(null)} />
                    <div className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-xl bg-white md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Edit Reply</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5 italic">
                                    Update your automation settings
                                </p>
                            </div>
                            <button onClick={() => setEditingAutomation(null)} className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:text-slate-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            {/* Mini Preview */}
                            <div className="bg-slate-50/50 p-4 rounded-3xl flex gap-4 border border-slate-100">
                                <img src={editingAutomation.media_thumbnail_url} className="w-16 h-24 object-cover rounded-xl shadow-sm" alt="" />
                                <div className="flex-1 py-1">
                                    <Badge className="bg-primary/10 text-primary border-none text-[9px] font-black uppercase mb-1.5 tracking-wider">{editingAutomation.media_type}</Badge>
                                    <p className="text-xs font-bold text-slate-600 line-clamp-3 leading-relaxed tracking-tight underline italic opacity-60">
                                        {editingAutomation.media_caption || "No caption provided"}
                                    </p>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-3 block px-1">Trigger</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => setEditTriggerType("any")}
                                            className={cn("p-4 rounded-2xl border-2 text-left transition-all", editTriggerType === "any" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 opacity-60")}
                                        >
                                            <p className="font-bold text-[10px] uppercase">Comment</p>
                                            <p className="text-[9px] font-medium text-slate-400">All users</p>
                                        </button>
                                        <button
                                            onClick={() => setEditTriggerType("keyword")}
                                            className={cn("p-4 rounded-2xl border-2 text-left transition-all", editTriggerType === "keyword" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 opacity-60")}
                                        >
                                            <p className="font-bold text-[10px] uppercase">Keyword</p>
                                            <p className="text-[9px] font-medium text-slate-400">Word match</p>
                                        </button>
                                        <button
                                            onClick={() => setEditTriggerType("story_reply")}
                                            className={cn("p-4 rounded-2xl border-2 text-left transition-all", editTriggerType === "story_reply" ? "border-primary bg-primary/5 shadow-sm" : "border-slate-100 opacity-60")}
                                        >
                                            <p className="font-bold text-[10px] uppercase text-indigo-600">Story</p>
                                            <p className="text-[9px] font-medium text-slate-400">Story reply</p>
                                        </button>
                                    </div>
                                </div>

                                {editTriggerType === "keyword" && (
                                    <div className="animate-in slide-in-from-top-2 duration-300">
                                        <input
                                            type="text"
                                            value={editKeyword}
                                            onChange={(e) => setEditKeyword(e.target.value)}
                                            placeholder="KEYWORDS (COMMA SEPARATED)"
                                            className="w-full h-14 px-6 rounded-2xl bg-slate-50 border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary text-sm font-bold uppercase tracking-widest placeholder:text-slate-300"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="text-[11px] font-black text-slate-400 tracking-[0.2em] uppercase mb-3 block px-1">Reply Message</label>
                                    <textarea
                                        value={editReplyMessage}
                                        onChange={(e) => setEditReplyMessage(e.target.value)}
                                        rows={4}
                                        className="w-full p-6 bg-slate-50 rounded-3xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary text-sm font-medium leading-relaxed resize-none"
                                    />
                                </div>

                                <div className="p-6 bg-slate-900 rounded-[2rem] space-y-5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl -mr-12 -mt-12" />
                                    <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.25em]">
                                        <Zap className="h-3 w-3 fill-current" />
                                        Action
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1.5 px-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Button CTA</p>
                                            <input
                                                type="text"
                                                value={editButtonText}
                                                onChange={(e) => setEditButtonText(e.target.value)}
                                                className="w-full h-12 px-5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center"
                                            />
                                        </div>
                                        <div className="space-y-1.5 px-1">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Reward Link</p>
                                            <input
                                                type="url"
                                                value={editLinkUrl}
                                                onChange={(e) => setEditLinkUrl(e.target.value)}
                                                className="w-full h-12 px-5 bg-white/5 border border-white/10 rounded-xl text-white text-sm font-bold focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                <MessageCircle className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold">Reply to replies</p>
                                                <p className="text-[10px] text-slate-400 font-medium italic">Auto-respond to sub-comments</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEditRespondToReplies(!editRespondToReplies)}
                                            className={cn("w-10 h-5.5 rounded-full transition-all flex items-center px-1", editRespondToReplies ? "bg-primary" : "bg-slate-200")}
                                        >
                                            <div className={cn("w-[14px] h-[14px] bg-white rounded-full shadow transition-all", editRespondToReplies ? "translate-x-[18px]" : "translate-x-0")} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                <Users className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold">Ignore self comments</p>
                                                <p className="text-[10px] text-slate-400 font-medium italic">Prevents own trigger cycles</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEditIgnoreSelfComments(!editIgnoreSelfComments)}
                                            className={cn("w-10 h-5.5 rounded-full transition-all flex items-center px-1", editIgnoreSelfComments ? "bg-primary" : "bg-slate-200")}
                                        >
                                            <div className={cn("w-[14px] h-[14px] bg-white rounded-full shadow transition-all", editIgnoreSelfComments ? "translate-x-[18px]" : "translate-x-0")} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-50 bg-slate-50/20 flex gap-4">
                            <Button variant="outline" className="flex-1 h-14 rounded-2xl border-slate-100 font-bold" onClick={() => setEditingAutomation(null)}>Cancel</Button>
                            <Button className="flex-1 h-14 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20" onClick={handleSaveEdit} disabled={saving}>
                                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {limits && (
                <UpgradeModal
                    isOpen={showUpgradeModal}
                    onClose={() => setShowUpgradeModal(false)}
                    currentPlan={limits.planName}
                    limitType="automations"
                    currentUsage={limits.current}
                    maxAllowed={limits.max}
                    nextPlan={{
                        name: "Starter Pack",
                        price: "₹99/month",
                        benefits: ["10 Automations", "50,000 DMs/month", "Story Automation", "Handle Viral Posts"]
                    }}
                />
            )}
        </div>
    );
}
