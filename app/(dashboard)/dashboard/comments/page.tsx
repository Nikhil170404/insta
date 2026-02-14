import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { MessageSquare, Shield } from "lucide-react";
import CommentManager from "@/components/dashboard/CommentManager";

export default async function CommentsPage() {
    const session = await getSession();
    if (!session) redirect("/signin");

    return (
        <div className="space-y-6 pt-0 lg:pt-0 pb-16">
            {/* Header */}
            <div className="space-y-3 px-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Moderation Center
                    </span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[0.85]">
                    Comment <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-indigo-600">
                        Manager.
                    </span>
                </h1>
                <p className="text-sm text-slate-400 font-semibold max-w-lg">
                    View, reply, hide, and delete comments across all your posts. Keep your community clean and engaged.
                </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 px-1">
                {[
                    { icon: "💬", label: "Add Comment" },
                    { icon: "↩️", label: "Reply" },
                    { icon: "👁️", label: "Hide/Unhide" },
                    { icon: "🗑️", label: "Delete" },
                ].map((feature) => (
                    <div
                        key={feature.label}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-full shadow-sm text-[10px] font-bold text-slate-500"
                    >
                        <span>{feature.icon}</span>
                        {feature.label}
                    </div>
                ))}
            </div>

            {/* Comment Manager Component */}
            <CommentManager instagramUsername={session.instagram_username || ""} />
        </div>
    );
}
