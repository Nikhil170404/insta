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
} from "lucide-react";

const REPLY_TEMPLATES = [
    "Check your DM 📬",
    "Sent you the link! 💌",
    "Check your inbox 📥",
    "Link sent! ✅",
    "Check message requests 📨"
];
import Link from "next/link";

interface Automation {
    id: string;
    media_id: string;
    media_type: string;
    media_url?: string;
    media_thumbnail_url?: string;
    media_caption?: string;
    trigger_keyword?: string;
    trigger_type: "keyword" | "any";
    reply_message: string;
    comment_reply?: string;
    require_follow: boolean;
    is_active: boolean;
    comment_count: number;
    dm_sent_count: number;
    dm_failed_count: number;
    created_at: string;
}

export default function AutomationsPage() {
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit modal state
    const [editingAutomation, setEditingAutomation] = useState<Automation | null>(null);
    const [editTriggerType, setEditTriggerType] = useState<"keyword" | "any">("any");
    const [editKeyword, setEditKeyword] = useState("");
    const [editReplyMessage, setEditReplyMessage] = useState("");
    const [editCommentReply, setEditCommentReply] = useState("");
    const [editRequireFollow, setEditRequireFollow] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchAutomations();
    }, []);

    async function fetchAutomations() {
        try {
            const res = await fetch("/api/automations");
            if (res.ok) {
                const data = await res.json();
                setAutomations(data.automations || []);
            }
        } catch (error) {
            console.error("Error fetching automations:", error);
        } finally {
            setLoading(false);
        }
    }

    function openEditModal(automation: Automation) {
        setEditingAutomation(automation);
        setEditTriggerType(automation.trigger_type);
        setEditKeyword(automation.trigger_keyword || "");
        setEditReplyMessage(automation.reply_message);
        setEditCommentReply(automation.comment_reply || "");
        setEditRequireFollow(automation.require_follow);
    }

    async function handleSaveEdit() {
        if (!editingAutomation) return;
        if (!editReplyMessage.trim()) {
            alert("Please enter a reply message");
            return;
        }
        if (editTriggerType === "keyword" && !editKeyword.trim()) {
            alert("Please enter a keyword");
            return;
        }

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
                    require_follow: editRequireFollow,
                }),
            });

            if (res.ok) {
                // Update local state
                setAutomations(
                    automations.map((a) =>
                        a.id === editingAutomation.id
                            ? {
                                ...a,
                                trigger_type: editTriggerType,
                                trigger_keyword: editTriggerType === "keyword" ? editKeyword : undefined,
                                reply_message: editReplyMessage,
                                comment_reply: editCommentReply,
                                require_follow: editRequireFollow,
                            }
                            : a
                    )
                );
                setEditingAutomation(null);
            } else {
                alert("Failed to update automation");
            }
        } catch (error) {
            console.error("Error updating automation:", error);
            alert("Failed to update automation");
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
            <div className="flex items-center justify-center h-64 pt-16 lg:pt-0">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const activeCount = automations.filter((a) => a.is_active).length;
    const totalDMs = automations.reduce((sum, a) => sum + a.dm_sent_count, 0);

    return (
        <div className="space-y-6 pt-16 lg:pt-0">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">My Automations</h1>
                    <p className="text-gray-600">
                        Manage all your comment-to-DM automations
                    </p>
                </div>
                <Link href="/dashboard">
                    <Button>
                        <Zap className="h-4 w-4 mr-2" />
                        Create New
                    </Button>
                </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <Zap className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{automations.length}</p>
                                <p className="text-xs text-gray-500">Total Automations</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Play className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{activeCount}</p>
                                <p className="text-xs text-gray-500">Active</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <MessageCircle className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{totalDMs}</p>
                                <p className="text-xs text-gray-500">DMs Sent</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Automations List */}
            <Card>
                <CardHeader>
                    <CardTitle>All Automations</CardTitle>
                </CardHeader>
                <CardContent>
                    {automations.length === 0 ? (
                        <div className="text-center py-12">
                            <Zap className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 text-lg mb-2">No automations yet</p>
                            <p className="text-gray-400 text-sm mb-4">
                                Click on a reel in Dashboard to create your first automation
                            </p>
                            <Link href="/dashboard">
                                <Button>Go to Dashboard</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {automations.map((automation) => (
                                <div
                                    key={automation.id}
                                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-16 h-24 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                        {automation.media_thumbnail_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={automation.media_thumbnail_url}
                                                alt="Reel"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Play className="h-6 w-6 text-gray-400" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge variant={automation.is_active ? "success" : "secondary"}>
                                                {automation.is_active ? "Active" : "Paused"}
                                            </Badge>
                                            <Badge variant="outline">
                                                {automation.trigger_type === "any"
                                                    ? "Any Comment"
                                                    : `Keyword: ${automation.trigger_keyword}`}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-gray-600 truncate mb-1">
                                            {automation.media_caption || "No caption"}
                                        </p>
                                        <p className="text-xs text-gray-400 truncate">
                                            Reply: {automation.reply_message.substring(0, 50)}...
                                        </p>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-center px-4">
                                        <p className="text-lg font-bold text-blue-600">
                                            {automation.dm_sent_count}
                                        </p>
                                        <p className="text-xs text-gray-500">DMs Sent</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(automation)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                toggleAutomation(automation.id, automation.is_active)
                                            }
                                        >
                                            {automation.is_active ? (
                                                <Pause className="h-4 w-4" />
                                            ) : (
                                                <Play className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => deleteAutomation(automation.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Modal */}
            {editingAutomation && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 space-y-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">Edit Automation</h2>
                                    <p className="text-sm text-gray-500">
                                        Update your automation settings
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditingAutomation(null)}
                                    className="p-2 hover:bg-gray-100 rounded-full"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Preview */}
                            <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                                {editingAutomation.media_thumbnail_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={editingAutomation.media_thumbnail_url}
                                        alt="Reel"
                                        className="w-20 h-32 object-cover rounded"
                                    />
                                ) : (
                                    <div className="w-20 h-32 bg-gray-200 rounded flex items-center justify-center">
                                        <Play className="h-8 w-8 text-gray-400" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <Badge className="mb-2">{editingAutomation.media_type}</Badge>
                                    <p className="text-sm text-gray-600 line-clamp-3">
                                        {editingAutomation.media_caption || "No caption"}
                                    </p>
                                </div>
                            </div>

                            {/* Trigger Type */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    When should we send a DM?
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditTriggerType("any")}
                                        className={`p-4 border-2 rounded-lg text-left transition-all ${editTriggerType === "any"
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <p className="font-medium">Any Comment</p>
                                        <p className="text-xs text-gray-500">Reply to all comments</p>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditTriggerType("keyword")}
                                        className={`p-4 border-2 rounded-lg text-left transition-all ${editTriggerType === "keyword"
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <p className="font-medium">Specific Keyword</p>
                                        <p className="text-xs text-gray-500">Only when keyword matches</p>
                                    </button>
                                </div>
                            </div>

                            {/* Keyword Input */}
                            {editTriggerType === "keyword" && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Trigger Keyword
                                    </label>
                                    <input
                                        type="text"
                                        value={editKeyword}
                                        onChange={(e) => setEditKeyword(e.target.value)}
                                        placeholder="e.g., LINK, INFO, PRICE"
                                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        User must comment this exact word
                                    </p>
                                </div>
                            )}

                            {/* Reply Message */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    DM Message to Send
                                </label>
                                <textarea
                                    value={editReplyMessage}
                                    onChange={(e) => setEditReplyMessage(e.target.value)}
                                    placeholder="Hey! Thanks for your interest..."
                                    rows={4}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                                />
                            </div>

                            {/* Public Reply */}
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Public Reply to Comment (Optional)
                                </label>
                                <textarea
                                    value={editCommentReply}
                                    onChange={(e) => setEditCommentReply(e.target.value)}
                                    placeholder="Check your DM 📬"
                                    rows={2}
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary resize-none mb-3"
                                />
                                <div className="flex flex-wrap gap-2">
                                    {REPLY_TEMPLATES.map((template) => (
                                        <button
                                            key={template}
                                            onClick={() => setEditCommentReply(template)}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
                                        >
                                            {template}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Require Follow */}
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <Users className="h-5 w-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium">Require Follow First</p>
                                        <p className="text-xs text-gray-500">
                                            Only send DM if user follows you
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditRequireFollow(!editRequireFollow)}
                                    className={`w-12 h-6 rounded-full transition-colors ${editRequireFollow ? "bg-primary" : "bg-gray-300"
                                        }`}
                                >
                                    <div
                                        className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${editRequireFollow ? "translate-x-6" : "translate-x-0.5"
                                            }`}
                                    />
                                </button>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => setEditingAutomation(null)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="flex-1"
                                    onClick={handleSaveEdit}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Saving...
                                        </>
                                    ) : (
                                        "Save Changes"
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
