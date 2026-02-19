import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AlertCircle, Zap, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import ReelsGrid from "@/components/dashboard/reels-grid";
import { Badge } from "@/components/ui/badge";
import { QueueStatus } from "@/components/dashboard/QueueStatus";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  return (
    <div className="space-y-6 pt-0 lg:pt-0 pb-16">
      {/* Premium Compact Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Active Account: @{session.instagram_username}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[0.85]">
            Instagram <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-indigo-600">Auto-Reply System.</span>
          </h1>
        </div>

        <div className="flex items-center gap-3 bg-white/50 backdrop-blur-xl px-5 py-3 rounded-3xl border border-white shadow-xl shadow-slate-200/50 self-start md:self-auto">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Engagement Rate</p>
            <p className="text-lg font-black text-slate-900 tracking-tight">Active Chats</p>
          </div>
        </div>
      </div>

      {/* Plan Status - Premium Slim Banner */}
      {/* Plan Status - Premium Slim Banner */}
      {session.plan_type === "free" && (
        <div className="relative overflow-hidden bg-slate-900 rounded-[2.5rem] p-8 group transition-all duration-700 hover:shadow-2xl hover:shadow-primary/20 border border-white/5">
          {/* Animated Background Blobs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:scale-125 transition-transform duration-1000" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -ml-32 -mb-32 group-hover:translate-x-10 transition-transform duration-1000" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-2xl rounded-2xl flex items-center justify-center border border-white/20 shrink-0 shadow-2xl">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1 text-center lg:text-left">
                <h3 className="text-xl font-black text-white tracking-tight">
                  Upgrade to Pro
                </h3>
                <p className="text-slate-400 font-medium text-sm leading-relaxed max-w-md">
                  Get <span className="text-white font-bold italic">Starter Plan</span> to unlock <span className="text-primary font-bold">Story Automation</span> & remove limits.
                </p>
              </div>
            </div>

            <Link href="/dashboard/billing" className="w-full lg:w-auto">
              <Button className="w-full lg:h-14 h-12 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black text-[13px] uppercase tracking-widest shadow-xl shadow-primary/30 gap-3 group/btn transition-all active:scale-95">
                Upgrade Plan
                <Zap className="h-4 w-4 fill-white transition-transform group-hover/btn:scale-125" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Live Queue Status */}
      <QueueStatus />

      {/* Reels Grid with Automation */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
              <Zap className="h-5 w-5 fill-current" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Active Automations
            </h2>
          </div>
        </div>
        <ReelsGrid planType={session.plan_type} />
      </div>
    </div>
  );
}
