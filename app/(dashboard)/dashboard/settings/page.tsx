"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Settings as SettingsIcon,
    User,
    LogOut,
    ExternalLink,
    RefreshCw,
    Loader2,
    Shield,
    Bell,
    CreditCard,
    ChevronRight,
    Lock,
    HelpCircle,
    Info,
    Smartphone,
    CheckCircle2,
    Database,
    Globe
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<"profile" | "billing" | "notifications" | "security">("profile");
    const [disconnecting, setDisconnecting] = useState(false);
    const [saving, setSaving] = useState(false);
    const router = useRouter();

    async function handleDisconnect() {
        if (!confirm("Are you sure you want to terminate your session? This will log you out of the ReplyKaro matrix.")) {
            return;
        }

        setDisconnecting(true);
        try {
            window.location.href = "/api/auth/logout";
        } catch (error) {
            console.error("Error disconnecting:", error);
            setDisconnecting(false);
        }
    }

    async function handleReconnect() {
        window.location.href = "/api/auth/instagram";
    }

    const tabs = [
        { id: "profile", name: "Profile", icon: User },
        { id: "billing", name: "Billing", icon: CreditCard },
        { id: "notifications", name: "Notifications", icon: Bell },
        { id: "security", name: "Security", icon: Shield },
    ];

    return (
        <div className="max-w-5xl space-y-10">
            {/* Header */}
            <div className="px-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
                <p className="text-slate-400 font-medium">Manage your account preferences and connected assets.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
                {/* Navigation Sidebar */}
                <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (tab.id === "billing") {
                                    router.push("/dashboard/billing");
                                } else {
                                    setActiveTab(tab.id as any);
                                }
                            }}
                            className={cn(
                                "flex-shrink-0 flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                                activeTab === tab.id
                                    ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105"
                                    : "bg-white border border-slate-100 text-slate-400 hover:text-slate-900 hover:border-slate-300 shadow-sm"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span className="whitespace-nowrap">{tab.name}</span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === "profile" && (
                        <div className="space-y-8">
                            {/* Connection Control */}
                            <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden p-8 md:p-10">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center text-white text-3xl font-black shadow-xl ring-8 ring-purple-50">
                                            IG
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-900 leading-none mb-2">Instagram Business</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_12px_#22c55e] animate-pulse" />
                                                <span className="text-xs font-bold text-green-600 uppercase tracking-widest">Connected</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Badge className="bg-green-50 text-green-600 border-green-100 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-[0.2em] self-start md:self-center">Verified</Badge>
                                </div>

                                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button onClick={handleReconnect} className="h-14 flex items-center justify-center gap-3 bg-white border-2 border-slate-50 hover:border-primary/20 hover:bg-slate-50 rounded-2xl text-slate-900 font-bold transition-all group">
                                        <RefreshCw className="h-4 w-4 text-primary group-hover:rotate-180 transition-transform duration-500" />
                                        Refresh Connection
                                    </button>
                                    <button onClick={handleDisconnect} disabled={disconnecting} className="h-14 flex items-center justify-center gap-3 bg-rose-50 hover:bg-rose-100 rounded-2xl text-rose-500 font-bold transition-all border-2 border-transparent">
                                        {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "notifications" && (
                        <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm p-8 md:p-10 space-y-8">
                            <div className="flex items-center gap-3">
                                <Bell className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm">Notification Preferences</h2>
                            </div>

                            <div className="space-y-4">
                                {[
                                    { id: "dm", name: "DM Sent", desc: "Push notification when a bot replies to a comment." },
                                    { id: "billing", name: "Billing Updates", desc: "Critical updates regarding your plan status." },
                                    { id: "security", name: "Security Alerts", desc: "Notify me of any remote login attempts." },
                                ].map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                                        <div className="pr-4">
                                            <p className="font-black text-slate-900 tracking-tight">{item.name}</p>
                                            <p className="text-xs text-slate-400 font-medium">{item.desc}</p>
                                        </div>
                                        <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer shadow-inner shadow-black/10">
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === "security" && (
                        <div className="space-y-8">
                            <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm p-8 md:p-10 space-y-8">
                                <div className="flex items-center gap-3">
                                    <Lock className="h-5 w-5 text-primary" />
                                    <h2 className="text-xl font-black text-slate-900 uppercase tracking-widest text-sm">Security</h2>
                                </div>

                                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-125 transition-transform" />
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <p className="text-primary font-black text-[10px] uppercase tracking-[0.25em] mb-1 italic">API Key</p>
                                            <p className="text-white font-bold tracking-tighter text-lg">REPL_••••••••••••••••</p>
                                        </div>
                                        <Button className="bg-white/10 hover:bg-white/20 text-white rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-10 border border-white/10">
                                            Reset Key
                                        </Button>
                                    </div>
                                </div>

                                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4">
                                    <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl h-fit">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-amber-900 font-black text-sm mb-1 uppercase tracking-tight">Account Protected</p>
                                        <p className="text-xs text-amber-700 font-medium leading-relaxed">
                                            Your account is currently protected. No unauthorized login attempts detected in the last 72 hours.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="bg-rose-50/20 rounded-[2.5rem] border border-rose-100/30 p-8 space-y-6">
                                <div className="flex items-center gap-3 px-1">
                                    <Info className="h-5 w-5 text-rose-300" />
                                    <h3 className="text-rose-500 font-black text-sm uppercase tracking-[0.25em]">Critical Action: Delete Account</h3>
                                </div>
                                <p className="text-[11px] font-medium text-slate-400 leading-relaxed px-1">
                                    This action is irreversible. All your automation patterns, analytics data, and automation nodes will be permanently wiped.
                                </p>
                                <Button className="h-14 w-full rounded-2xl bg-white border-2 border-rose-100 text-rose-300 font-black text-[10px] uppercase tracking-[0.25em] opacity-50 cursor-not-allowed shadow-none" disabled>
                                    Delete Account (Locked)
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
