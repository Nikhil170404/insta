import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { AccountHealthScore } from "@/components/dashboard/AccountHealthScore";
import { QueueStatus } from "@/components/dashboard/QueueStatus";
import { ShieldAlert, ShieldCheck } from "lucide-react";

export default async function HealthPage() {
    const session = await getSession();
    if (!session) redirect("/signin");

    return (
        <div className="space-y-6 pt-0 lg:pt-0 pb-16">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
                <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-100 rounded-full shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Live System Status
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter leading-[0.85]">
                        Health & <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600">Safety Limits.</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3 bg-white/50 backdrop-blur-xl px-5 py-3 rounded-3xl border border-white shadow-xl shadow-slate-200/50 self-start md:self-auto">
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
                        <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Automated Monitor</p>
                        <p className="text-lg font-black text-slate-900 tracking-tight">Anti-Ban Systems</p>
                    </div>
                </div>
            </div>

            {/* Description Text */}
            <div className="px-1 max-w-3xl">
                <p className="text-slate-500 font-medium leading-relaxed">
                    This dashboard monitors your Instagram account's algorithmic risk factors in real-time. We continuously check your Meta API usage and internal queue depths to ensure your automated replies are safe, natural-looking, and stay under the spam thresholds.
                </p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
                {/* Account Safety Score */}
                <div className="xl:col-span-1">
                    <AccountHealthScore />
                </div>

                {/* Live Queue Status */}
                <div className="xl:col-span-1">
                    <QueueStatus />
                </div>
            </div>
        </div>
    );
}
