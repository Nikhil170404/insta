"use client";

import { useState } from "react";
import {
    X,
    ChevronRight,
    ChevronLeft,
    Zap,
    MessageSquare,
    Link as LinkIcon,
    Plus,
    Check,
    Smartphone,
    Info,
    Users,
    Trash2,
    Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Media {
    id: string;
    caption?: string;
    media_type: string;
    media_url?: string;
    thumbnail_url?: string;
}

interface AutomationWizardProps {
    selectedMedia: Media | null;
    initialData?: any;
    onClose: () => void;
    onSave: (data: any) => Promise<void>;
    saving: boolean;
    planType?: string;
}

export default function AutomationWizard({ selectedMedia, initialData, onClose, onSave, saving, planType }: AutomationWizardProps) {
    const [step, setStep] = useState(1);

    // State for different steps
    const [triggerType, setTriggerType] = useState<"specific" | "any" | "next" | "story">(
        initialData
            ? (initialData.trigger_type === "story_reply" ? "story" :
                (initialData.trigger_type === "all_posts" || initialData.media_id === "ALL_MEDIA" ? "any" :
                    (initialData.trigger_type === "next_posts" || initialData.media_id === "NEXT_MEDIA" ? "next" : "specific")))
            : (selectedMedia?.id === "STORY_AUTOMATION" ? "story" : "specific")
    );
    const [matchingType, setMatchingType] = useState<"any" | "keyword">(
        initialData
            ? (initialData.trigger_keyword === null ? "any" : "keyword")
            : "keyword"
    );
    const [keywords, setKeywords] = useState(initialData?.trigger_keyword || "");
    const [replyToComments, setReplyToComments] = useState(!!initialData?.comment_reply || !!(initialData?.comment_reply_templates?.length));

    // Comment reply templates
    const defaultTemplates = [
        "Check your DMs! 📬",
        "Just sent you a message! 💌",
        "Sent! Check your inbox 🔥",
        "DM sent! Go check it out ✨",
        "You've got mail! 📩",
    ];
    const [commentReplyTemplates, setCommentReplyTemplates] = useState<string[]>(
        initialData?.comment_reply_templates?.length
            ? initialData.comment_reply_templates
            : initialData?.comment_reply
                ? [initialData.comment_reply]
                : ["Check your DMs! 📬"]
    );
    const [newReplyTemplate, setNewReplyTemplate] = useState("");

    const [openingDM, setOpeningDM] = useState(initialData?.reply_message || "Hey! Thanks for being part of my community 😊\n\nClick below and I'll send you the details in just a sec ✨");
    const [buttonText, setButtonText] = useState(initialData?.button_text || "Show me more");
    const [showOpeningDM, setShowOpeningDM] = useState(true);

    const [finalDM, setFinalDM] = useState(initialData?.final_message || "Here is the link you requested! ✨");
    const [finalButtonText, setFinalButtonText] = useState(initialData?.final_button_text || "Open Link");
    const [linkUrl, setLinkUrl] = useState(initialData?.link_url || "");
    const [requireFollow, setRequireFollow] = useState(initialData?.require_follow || false);
    const [followGateMessage, setFollowGateMessage] = useState(initialData?.follow_gate_message || "Hey! 👋 To unlock this, please follow us first!");
    const [respondToReplies, setRespondToReplies] = useState(initialData?.respond_to_replies || false);
    const [ignoreSelfComments, setIgnoreSelfComments] = useState(initialData?.ignore_self_comments ?? true);

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSave = () => {
        let finalTriggerType = triggerType === "story" ? "story_reply" : (matchingType === "any" ? "any" : "keyword");
        let finalMediaId = triggerType === "story" ? "STORY_AUTOMATION" : (triggerType === "specific" ? (selectedMedia?.id || initialData?.media_id) : null);

        // Distinguish Any vs Next
        if (triggerType === "any") {
            finalTriggerType = "all_posts";
            finalMediaId = "ALL_MEDIA";
        } else if (triggerType === "next") {
            finalTriggerType = "next_posts";
            finalMediaId = "NEXT_MEDIA";
        }

        onSave({
            id: initialData?.id,
            trigger_type: finalTriggerType,
            trigger_keyword: (triggerType === "story" || matchingType === "any") ? null : keywords,
            reply_message: openingDM,
            comment_reply: replyToComments && triggerType !== "story" && commentReplyTemplates.length > 0 ? commentReplyTemplates[0] : null,
            comment_reply_templates: replyToComments && triggerType !== "story" ? commentReplyTemplates : null,
            button_text: buttonText,
            link_url: linkUrl,
            final_message: finalDM,
            final_button_text: finalButtonText,
            require_follow: requireFollow,
            follow_gate_message: requireFollow ? followGateMessage : null,
            respond_to_replies: respondToReplies,
            ignore_self_comments: ignoreSelfComments,
            media_id: finalMediaId,
        });
    };

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto scrollbar-hide bg-slate-900/40 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="flex min-h-full items-center justify-center p-0 md:p-6 lg:p-12">
                {/* Wizard Container */}
                <div className="relative w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-xl bg-white md:rounded-[2.5rem] shadow-[0_20px_100px_-20px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">

                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-6 border-b border-slate-50">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">
                                {initialData ? "Edit Automation" : "Create Automation"}
                            </h2>
                            <p className="text-[10px] text-slate-400 font-black tracking-[0.2em] flex items-center gap-1.5 uppercase mt-1">
                                Step {step} of 4 <span className="w-1.5 h-1.5 rounded-full bg-primary/20" /> {step === 1 ? "Trigger" : step === 2 ? "Matching" : step === 3 ? "Message" : "Logic Settings"}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8 space-y-8">

                        {/* STEP 1: TRIGGER TYPE */}
                        {step === 1 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                <h3 className="text-xl font-bold text-slate-900">Select a trigger</h3>
                                <div className="space-y-3">
                                    {selectedMedia?.id !== "STORY_AUTOMATION" && (
                                        <>
                                            <button
                                                onClick={() => setTriggerType("specific")}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-4",
                                                    triggerType === "specific" ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-100 hover:border-slate-200"
                                                )}
                                            >
                                                <div className={cn("mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all", triggerType === "specific" ? "border-primary" : "border-slate-300")}>
                                                    {triggerType === "specific" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-900">A specific post or reel</p>
                                                    {selectedMedia && triggerType === "specific" && (
                                                        <div className="mt-4 flex gap-3 p-3 bg-white rounded-xl border border-primary/10">
                                                            <img src={selectedMedia.thumbnail_url || selectedMedia.media_url} className="w-12 h-16 object-cover rounded-lg" alt="" />
                                                            <p className="text-xs text-slate-500 line-clamp-3">{selectedMedia.caption || "No caption provided"}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => setTriggerType("any")}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 relative overflow-hidden",
                                                    triggerType === "any" ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200 opacity-60"
                                                )}
                                            >
                                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", triggerType === "any" ? "border-primary" : "border-slate-300")}>
                                                    {triggerType === "any" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-900">Any post or reel</p>
                                                </div>
                                                <Badge className={cn("border-none font-bold text-[10px] py-0.5", planType === "free" ? "bg-green-500 text-white" : "bg-primary text-white")}>
                                                    {planType === "free" ? "FREE" : "PRO"}
                                                </Badge>
                                            </button>

                                            <button
                                                onClick={() => setTriggerType("next")}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 relative overflow-hidden",
                                                    triggerType === "next" ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200 opacity-60"
                                                )}
                                            >
                                                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", triggerType === "next" ? "border-primary" : "border-slate-300")}>
                                                    {triggerType === "next" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-slate-900">Next post or reel</p>
                                                </div>
                                                <Badge className={cn("border-none font-bold text-[10px] py-0.5", planType === "free" ? "bg-green-500 text-white" : "bg-primary text-white")}>
                                                    {planType === "free" ? "FREE" : "PRO"}
                                                </Badge>
                                            </button>
                                        </>
                                    )}

                                    {selectedMedia?.id === "STORY_AUTOMATION" || !selectedMedia ? (
                                        <button
                                            onClick={() => setTriggerType("story")}
                                            className={cn(
                                                "w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 relative overflow-hidden",
                                                triggerType === "story" ? "border-primary bg-primary/5 ring-4 ring-primary/5" : "border-slate-100 hover:border-slate-200"
                                            )}
                                        >
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", triggerType === "story" ? "border-primary" : "border-slate-300")}>
                                                {triggerType === "story" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-slate-900">Fan replies to my story</p>
                                                <p className="text-[11px] text-slate-400 font-medium">Auto-respond to all story engagements</p>
                                            </div>
                                            <Badge className={cn("border-none font-bold text-[10px] py-0.5", planType === "free" ? "bg-green-500 text-white" : "bg-indigo-600 text-white")}>
                                                {planType === "free" ? "FREE" : "ENGAGEMENT-BOOST"}
                                            </Badge>
                                        </button>
                                    ) : null}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: COMMENT MATCHING */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-slate-900">
                                <h3 className="text-xl font-bold">And this comment has...</h3>

                                <div className="space-y-4">
                                    <div className={cn("p-6 rounded-3xl border-2 transition-all space-y-4", matchingType === "keyword" ? "border-primary bg-primary/5" : "border-slate-100")}>
                                        <button onClick={() => setMatchingType("keyword")} className="w-full flex items-center gap-3">
                                            <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", matchingType === "keyword" ? "border-primary" : "border-slate-300")}>
                                                {matchingType === "keyword" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                            </div>
                                            <span className="text-sm font-bold">A specific word or words</span>
                                        </button>

                                        {matchingType === "keyword" && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <input
                                                    type="text"
                                                    value={keywords}
                                                    onChange={(e) => setKeywords(e.target.value)}
                                                    placeholder="Enter a word or multiple..."
                                                    className="w-full h-12 px-6 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary shadow-sm text-sm font-semibold placeholder:text-slate-400"
                                                />
                                                <p className="text-[11px] text-slate-400 font-bold px-1 tracking-wide uppercase">Use commas to separate words</p>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {["Price", "Link", "Shop", "Info"].map(tag => (
                                                        <button
                                                            key={tag}
                                                            onClick={() => setKeywords((prev: string) => prev ? `${prev}, ${tag}` : tag)}
                                                            className="px-4 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-full text-[11px] font-bold text-slate-600 transition-colors shadow-sm"
                                                        >
                                                            + {tag}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => setMatchingType("any")}
                                        className={cn("w-full p-6 text-left rounded-3xl border-2 transition-all flex items-center gap-3", matchingType === "any" ? "border-primary bg-primary/5" : "border-slate-100 hover:border-slate-200")}
                                    >
                                        <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0", matchingType === "any" ? "border-primary" : "border-slate-300")}>
                                            {matchingType === "any" && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                        </div>
                                        <span className="text-sm font-bold">Any word</span>
                                    </button>
                                </div>

                                <div className={cn(
                                    "rounded-[32px] border transition-all overflow-hidden",
                                    replyToComments ? "border-primary/30 bg-primary/5" : "border-slate-100 bg-slate-50/50"
                                )}>
                                    <div className="flex items-center justify-between p-6 group">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-xl shadow-sm flex items-center justify-center transition-colors",
                                                replyToComments ? "bg-primary text-white" : "bg-white text-slate-400 group-hover:text-primary"
                                            )}>
                                                <MessageSquare className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">Public reply to comments</p>
                                                <p className="text-[11px] text-slate-400 font-medium">Randomly picks from your templates</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setReplyToComments(!replyToComments)}
                                            className={cn("w-12 h-6.5 rounded-full transition-all flex items-center px-1", replyToComments ? "bg-primary" : "bg-slate-200")}
                                        >
                                            <div className={cn("w-[18px] h-[18px] bg-white rounded-full shadow transition-all", replyToComments ? "translate-x-[20px]" : "translate-x-0")} />
                                        </button>
                                    </div>

                                    {/* Reply Templates Section */}
                                    {replyToComments && (
                                        <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {/* Templates List */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                                        <Shuffle className="h-3 w-3" />
                                                        Reply Templates ({commentReplyTemplates.length})
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 font-medium">Random pick per reply</span>
                                                </div>

                                                {commentReplyTemplates.map((template, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 group/item">
                                                        <div className="flex-1 px-4 py-2.5 bg-white rounded-xl border border-slate-100 text-sm font-medium text-slate-700 flex items-center gap-2">
                                                            <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-black flex items-center justify-center shrink-0">
                                                                {idx + 1}
                                                            </span>
                                                            {template}
                                                        </div>
                                                        <button
                                                            onClick={() => setCommentReplyTemplates(prev => prev.filter((_, i) => i !== idx))}
                                                            className="w-8 h-8 rounded-lg hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover/item:opacity-100"
                                                            title="Remove"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Add Custom Template */}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newReplyTemplate}
                                                    onChange={(e) => setNewReplyTemplate(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && newReplyTemplate.trim()) {
                                                            setCommentReplyTemplates(prev => [...prev, newReplyTemplate.trim()]);
                                                            setNewReplyTemplate("");
                                                        }
                                                    }}
                                                    placeholder="Type a reply template..."
                                                    className="flex-1 h-10 px-4 bg-white rounded-xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary text-sm font-medium placeholder:text-slate-400"
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (newReplyTemplate.trim()) {
                                                            setCommentReplyTemplates(prev => [...prev, newReplyTemplate.trim()]);
                                                            setNewReplyTemplate("");
                                                        }
                                                    }}
                                                    disabled={!newReplyTemplate.trim()}
                                                    className="h-10 px-4 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-black shadow-sm shadow-primary/20 transition-all disabled:opacity-40 flex items-center gap-1.5"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Add
                                                </button>
                                            </div>

                                            {/* Quick Add Suggestions */}
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quick Add</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {defaultTemplates
                                                        .filter(t => !commentReplyTemplates.includes(t))
                                                        .map(suggestion => (
                                                            <button
                                                                key={suggestion}
                                                                onClick={() => setCommentReplyTemplates(prev => [...prev, suggestion])}
                                                                className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-full text-[11px] font-bold text-slate-600 transition-colors shadow-sm"
                                                            >
                                                                + {suggestion}
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Reply to replies also</p>
                                            <p className="text-[11px] text-slate-400 font-medium">Auto-respond to sub-comments</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setRespondToReplies(!respondToReplies)}
                                        className={cn("w-12 h-6.5 rounded-full transition-all flex items-center px-1", respondToReplies ? "bg-primary" : "bg-slate-200")}
                                    >
                                        <div className={cn("w-[18px] h-[18px] bg-white rounded-full shadow transition-all", respondToReplies ? "translate-x-[20px]" : "translate-x-0")} />
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 group transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                            <Smartphone className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold">Ignore my own comments</p>
                                            <p className="text-[11px] text-slate-400 font-medium">Prevents self-automation loops</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIgnoreSelfComments(!ignoreSelfComments)}
                                        className={cn("w-12 h-6.5 rounded-full transition-all flex items-center px-1", ignoreSelfComments ? "bg-primary" : "bg-slate-200")}
                                    >
                                        <div className={cn("w-[18px] h-[18px] bg-white rounded-full shadow transition-all", ignoreSelfComments ? "translate-x-[20px]" : "translate-x-0")} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: OPENING DM */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-slate-900">
                                <h3 className="text-xl font-bold">They will get...</h3>

                                <div className="bg-slate-50/50 border border-slate-100 rounded-[32px] p-6 space-y-6 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:scale-110 transition-transform" />

                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <Zap className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-bold">Opening DM</span>
                                        </div>
                                        <button
                                            onClick={() => setShowOpeningDM(!showOpeningDM)}
                                            className={cn("w-12 h-6.5 rounded-full transition-all flex items-center px-1", showOpeningDM ? "bg-primary" : "bg-slate-200")}
                                        >
                                            <div className={cn("w-[18px] h-[18px] bg-white rounded-full shadow transition-all", showOpeningDM ? "translate-x-[20px]" : "translate-x-0")} />
                                        </button>
                                    </div>

                                    {showOpeningDM && (
                                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300 relative z-10">
                                            <div className="relative">
                                                <textarea
                                                    value={openingDM}
                                                    onChange={(e) => setOpeningDM(e.target.value)}
                                                    rows={5}
                                                    className="w-full p-6 bg-white rounded-2xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary shadow-sm text-sm font-medium resize-none leading-relaxed"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[11px] text-slate-400 font-bold px-1 uppercase tracking-widest">Button Text</p>
                                                <input
                                                    type="text"
                                                    value={buttonText}
                                                    onChange={(e) => setButtonText(e.target.value)}
                                                    className="w-full h-12 px-6 bg-white rounded-2xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary shadow-sm text-sm font-bold text-center text-primary"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    {/* Follow-Gate Toggle */}
                                    <div className={cn(
                                        "group rounded-[32px] border transition-all overflow-hidden",
                                        requireFollow ? "border-primary/30 bg-primary/5" : "border-slate-100 bg-slate-50/50"
                                    )}>
                                        <div className="flex items-center justify-between p-6">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-xl shadow-sm flex items-center justify-center transition-colors",
                                                    requireFollow ? "bg-primary text-white" : "bg-white text-slate-400 group-hover:text-primary"
                                                )}>
                                                    <Users className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold">Require Follow First</span>
                                                    <p className="text-[11px] text-slate-400">Users must follow to unlock content</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge className={cn("border-none font-bold text-[10px] py-0.5", planType === "free" ? "bg-green-500 text-white" : "bg-primary text-white")}>
                                                    {planType === "free" ? "FREE" : "PRO"}
                                                </Badge>
                                                <button
                                                    onClick={() => setRequireFollow(!requireFollow)}
                                                    className={cn("w-12 h-6.5 rounded-full transition-all flex items-center px-1", requireFollow ? "bg-primary" : "bg-slate-200")}
                                                >
                                                    <div className={cn("w-[18px] h-[18px] bg-white rounded-full shadow transition-all", requireFollow ? "translate-x-[20px]" : "translate-x-0")} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Follow-Gate Preview & Editor */}
                                        {requireFollow && (
                                            <div className="px-6 pb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {/* Preview Card */}
                                                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                                                    <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 px-4 py-2 border-b border-slate-100">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">📱 DM Preview</span>
                                                    </div>
                                                    <div className="p-4 space-y-3">
                                                        {/* Simulated Card */}
                                                        <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
                                                            <div className="flex gap-3">
                                                                <div className="w-16 h-16 rounded-lg bg-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0 overflow-hidden">
                                                                    {selectedMedia?.thumbnail_url || selectedMedia?.media_url ? (
                                                                        <img src={selectedMedia.thumbnail_url || selectedMedia.media_url} className="w-full h-full object-cover" alt="" />
                                                                    ) : (
                                                                        <Zap className="w-6 h-6" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="font-bold text-slate-900 text-sm">🔒 Follow to Unlock</p>
                                                                    <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{followGateMessage}</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-3 flex gap-2">
                                                                <div className="flex-1 bg-primary text-white text-center py-2 rounded-lg text-xs font-bold">
                                                                    Follow & Get Access
                                                                </div>
                                                                <div className="flex-1 bg-white border border-slate-200 text-slate-700 text-center py-2 rounded-lg text-xs font-bold">
                                                                    I'm Following ✓
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Editable Message */}
                                                <div className="space-y-2">
                                                    <p className="text-[11px] text-slate-400 font-bold px-1 uppercase tracking-widest">Follow-Gate Message</p>
                                                    <textarea
                                                        value={followGateMessage}
                                                        onChange={(e) => setFollowGateMessage(e.target.value)}
                                                        rows={2}
                                                        placeholder="Hey! 👋 To unlock this, please follow us first!"
                                                        className="w-full p-4 bg-white rounded-xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary shadow-sm text-sm font-medium resize-none leading-relaxed"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        )}

                        {/* STEP 4: FINAL REWARD */}
                        {step === 4 && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300 text-slate-900">
                                <h3 className="text-xl font-bold">And then, they will get...</h3>

                                <div className="space-y-6">
                                    <div className="bg-slate-50/50 border border-slate-100 rounded-[32px] p-8 space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <LinkIcon className="h-5 w-5 text-primary" />
                                            <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Final Reward (The Link)</span>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[11px] text-slate-400 font-bold px-1 mb-2">FINAL MESSAGE</p>
                                                <textarea
                                                    value={finalDM}
                                                    onChange={(e) => setFinalDM(e.target.value)}
                                                    placeholder="Write a message..."
                                                    rows={3}
                                                    className="w-full p-6 bg-white rounded-2xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary shadow-sm text-sm font-medium resize-none leading-relaxed"
                                                />
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[11px] text-slate-400 font-bold px-1">DESTINATION URL</p>
                                                <div className="relative group">
                                                    <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-hover:text-primary transition-colors" />
                                                    <input
                                                        type="url"
                                                        value={linkUrl}
                                                        onChange={(e) => setLinkUrl(e.target.value)}
                                                        placeholder="https://yourwebsite.com/guide"
                                                        className="w-full h-14 pl-14 pr-6 bg-white rounded-2xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary shadow-sm text-sm font-bold text-slate-600"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-[11px] text-slate-400 font-bold px-1 uppercase tracking-widest">Button Text</p>
                                                <input
                                                    type="text"
                                                    value={finalButtonText}
                                                    onChange={(e) => setFinalButtonText(e.target.value)}
                                                    placeholder="Open Link"
                                                    className="w-full h-12 px-6 bg-white rounded-2xl border-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary shadow-sm text-sm font-bold text-center text-primary"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="group flex items-center justify-between p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 opacity-60">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                                <Info className="h-5 w-5" />
                                            </div>
                                            <span className="text-sm font-bold italic text-slate-400">Follow up DM after 24h</span>
                                        </div>
                                        <Badge className={cn("border-none font-bold text-[10px] py-0.5", planType === "free" ? "bg-green-500 text-white" : "bg-primary text-white")}>
                                            {planType === "free" ? "FREE" : "PRO"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">
                        {step > 1 ? (
                            <Button variant="ghost" className="font-bold text-slate-400 hover:text-slate-600 h-12 px-6 rounded-2xl border border-slate-200 bg-white" onClick={prevStep}>
                                <ChevronLeft className="h-4 w-4 mr-2" /> Back
                            </Button>
                        ) : (
                            <div />
                        )}

                        {step < 4 ? (
                            <Button className="font-black h-12 px-8 rounded-2xl bg-primary text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20" onClick={() => {
                                if (step === 1 && triggerType === "story") {
                                    setStep(3); // Skip Matching for Story
                                } else {
                                    nextStep();
                                }
                            }}>
                                Next <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        ) : (
                            <Button className="font-black h-12 px-10 rounded-2xl bg-primary text-white hover:opacity-90 transition-all shadow-xl shadow-primary/30" onClick={handleSave} disabled={saving}>
                                {saving ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update Automation" : "Launch Automation")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
