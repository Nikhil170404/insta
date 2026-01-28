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
    Users,
    TrendingUp,
    ChevronDown,
    Zap,
} from "lucide-react";

const REPLY_TEMPLATES = [
    "Check your DM 📬",
    "Sent you the link! 💌",
    "Check your inbox 📥",
    "Link sent! ✅",
    "Check message requests 📨"
];

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
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [triggerType, setTriggerType] = useState<"keyword" | "any">("any");
    const [keyword, setKeyword] = useState("");
    const [replyMessage, setReplyMessage] = useState("");
    const [commentReply, setCommentReply] = useState("");
    const [requireFollow, setRequireFollow] = useState(false);
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

    function openCreateModal(item: Media) {
        setSelectedMedia(item);
        setTriggerType("any");
        setKeyword("");
        setReplyMessage("");
        setCommentReply("");
        setRequireFollow(false);
        setShowModal(true);
    }

    async function handleCreateAutomation() {
        if (!selectedMedia) return;
        if (!replyMessage.trim()) {
            alert("Please enter a reply message");
            return;
        }

        setSaving(true);
        try {
            const res = await fetch("/api/automations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    media_id: selectedMedia.id,
                    media_type: selectedMedia.media_type,
                    media_url: selectedMedia.media_url,
                    media_thumbnail_url: selectedMedia.thumbnail_url || selectedMedia.media_url,
                    media_caption: selectedMedia.caption?.substring(0, 200),
                    trigger_keyword: triggerType === "keyword" ? keyword : null,
                    trigger_type: triggerType,
                    reply_message: replyMessage,
                    comment_reply: commentReply,
                    require_follow: requireFollow,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setAutomations([data.automation, ...automations]);
                setShowModal(false);
            } else {
                const error = await res.json();
                alert(error.error || "Failed to create automation");
            }
        } catch (error) {
            console.error("Error creating automation:", error);
            alert("Failed to create automation");
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
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const totalDMs = automations.reduce((sum, a) => sum + a.dm_sent_count, 0);
    const activeAutomations = automations.filter((a) => a.is_active).length;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Play className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{media.length}</p>
                                <p className="text-xs text-gray-500">Total Posts</p>
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
                                <p className="text-2xl font-bold">{activeAutomations}</p>
                                <p className="text-xs text-gray-500">Active Automations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-2 md:col-span-1">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalDMs}</p>
                                <p className="text-xs text-gray-500">DMs Sent</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reels Grid */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Your Reels - Click to Set Up Auto-Reply
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {media.length === 0 ? (
                        <div className="text-center py-12">
                            <Play className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg">No reels found</p>
                            <p className="text-gray-400 text-sm">
                                Post some reels on Instagram to set up automations
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {media.map((item) => {
                                    const automation = getAutomationForMedia(item.id);
                                    const hasAutomation = !!automation;

                                    return (
                                        <div
                                            key={item.id}
                                            className="relative group cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-primary transition-all"
                                            onClick={() => !hasAutomation && openCreateModal(item)}
                                        >
                                            <div className="aspect-[9/16] bg-gray-100 relative">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={item.thumbnail_url || item.media_url || "/placeholder-reel.jpg"}
                                                    alt={item.caption || "Reel"}
                                                    className="w-full h-full object-cover"
                                                />

                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    {!hasAutomation && (
                                                        <div className="text-center text-white">
                                                            <Plus className="h-8 w-8 mx-auto mb-2" />
                                                            <p className="text-sm font-medium">Set Up Auto-Reply</p>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="absolute top-2 left-2">
                                                    <Badge variant="secondary" className="text-xs bg-black/50 text-white">
                                                        {item.media_type === "REELS" ? "🎬 Reel" : item.media_type}
                                                    </Badge>
                                                </div>

                                                {hasAutomation && (
                                                    <div className="absolute top-2 right-2">
                                                        <Badge variant={automation?.is_active ? "success" : "secondary"} className="text-xs">
                                                            {automation?.is_active ? "✓ Active" : "Paused"}
                                                        </Badge>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-2 bg-white">
                                                <p className="text-xs text-gray-600 truncate">
                                                    {item.caption?.substring(0, 50) || "No caption"}
                                                </p>

                                                {hasAutomation && (
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <span className="text-xs text-gray-500">
                                                            {automation?.dm_sent_count || 0} DMs sent
                                                        </span>
                                                        <div className="flex gap-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    toggleAutomation(automation!.id, automation!.is_active);
                                                                }}
                                                                className="p-1 hover:bg-gray-100 rounded"
                                                            >
                                                                {automation?.is_active ? (
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                ) : (
                                                                    <Play className="h-4 w-4 text-gray-400" />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    deleteAutomation(automation!.id);
                                                                }}
                                                                className="p-1 hover:bg-red-50 rounded"
                                                            >
                                                                <X className="h-4 w-4 text-red-500" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Show More Button */}
                            {nextCursor && (
                                <div className="mt-6 text-center">
                                    <Button variant="outline" onClick={loadMore} disabled={loadingMore} className="px-8">
                                        {loadingMore ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                                Loading...
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="h-4 w-4 mr-2" />
                                                Show More Posts
                                            </>
                                        )}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Create Automation Modal */}
            {showModal && selectedMedia && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">Set Up Auto-Reply</h2>
                                    <p className="text-sm text-gray-500">Automatically DM users who comment on this reel</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={selectedMedia.thumbnail_url || selectedMedia.media_url || ""} alt="Reel" className="w-20 h-32 object-cover rounded" />
                                <div className="flex-1 min-w-0">
                                    <Badge className="mb-2">{selectedMedia.media_type}</Badge>
                                    <p className="text-sm text-gray-600 line-clamp-3">{selectedMedia.caption || "No caption"}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">When should we send a DM?</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setTriggerType("any")}
                                        className={`p-4 border-2 rounded-lg text-left transition-all ${triggerType === "any" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                                    >
                                        <p className="font-medium">Any Comment</p>
                                        <p className="text-xs text-gray-500">Reply to all comments</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTriggerType("keyword")}
                                        className={`p-4 border-2 rounded-lg text-left transition-all ${triggerType === "keyword" ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"}`}
                                    >
                                        <p className="font-medium">Specific Keyword</p>
                                        <p className="text-xs text-gray-500">Only when keyword matches</p>
                                    </button>
                                </div>
                            </div>

                            {triggerType === "keyword" && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Trigger Keyword</label>
                                    <input
                                        type="text"
                                        value={keyword}
                                        onChange={(e) => setKeyword(e.target.value)}
                                        placeholder="e.g., LINK, INFO, PRICE"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">User must comment this exact word</p>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-2">DM Message to Send</label>
                                <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Hey! Thanks for your interest. Here's the link you requested: https://..."
                                    rows={4}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Public Reply to Comment (Optional)</label>
                                <textarea
                                    value={commentReply}
                                    onChange={(e) => setCommentReply(e.target.value)}
                                    placeholder="Check your DM 📬"
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none mb-3"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {REPLY_TEMPLATES.map((template) => (
                                        <button
                                            key={template}
                                            onClick={() => setCommentReply(template)}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                                        >
                                            {template}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium">Require Follow First</p>
                                        <p className="text-xs text-gray-500">Only send DM if user follows you</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setRequireFollow(!requireFollow)}
                                    className={`w-12 h-6 rounded-full transition-colors ${requireFollow ? "bg-primary" : "bg-gray-300"}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${requireFollow ? "translate-x-6" : "translate-x-0.5"}`} />
                                </button>
                            </div>

                            <div className="flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                                    Cancel
                                </Button>
                                <Button className="flex-1" onClick={handleCreateAutomation} disabled={saving}>
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Create Automation"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
