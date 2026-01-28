"use client";

import { useState } from "react";
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
    Smartphone
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface SettingsPageProps {
    searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function SettingsPage(props: SettingsPageProps) {
    const [disconnecting, setDisconnecting] = useState(false);
    const router = useRouter();

    async function handleDisconnect() {
        if (!confirm("Are you sure you want to disconnect your Instagram account? This will log you out.")) {
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

    return (
        <div className="max-w-4xl space-y-10">
            {/* Header */}
            <div className="px-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account Station</h1>
                <p className="text-slate-400 font-medium">Manage your connectivity and platform preferences.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Navigation Menu */}
                <div className="space-y-2">
                    <button className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm transition-all hover:border-primary group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/5 text-primary rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                <User className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold text-slate-900 uppercase tracking-widest text-[10px]">Profile</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-300" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent transition-all hover:bg-white hover:border-slate-100 group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px]">Billing</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-200" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent transition-all hover:bg-white hover:border-slate-100 group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                <Bell className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px]">Notifications</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-200" />
                    </button>
                    <button className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent transition-all hover:bg-white hover:border-slate-100 group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-100 text-slate-400 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                <Shield className="h-5 w-5" />
                            </div>
                            <span className="text-sm font-bold text-slate-400 uppercase tracking-widest text-[10px]">Security</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-slate-200" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="md:col-span-2 space-y-8">
                    {/* Connectivity Card */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden p-8 space-y-8">
                        <div className="flex items-center gap-3 px-1">
                            <Smartphone className="h-5 w-5 text-primary" />
                            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-widest text-sm">Platform Connectivity</h2>
                        </div>

                        <div className="p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between border border-slate-100">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-black shadow-lg">
                                    IG
                                </div>
                                <div>
                                    <p className="font-black text-slate-900 leading-none mb-1">Instagram Business</p>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Connection</span>
                                    </div>
                                </div>
                            </div>
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Linked</Badge>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 px-1">
                            <Button className="h-12 flex-1 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold hover:bg-slate-50 transition-all gap-2" onClick={handleReconnect}>
                                <RefreshCw className="h-4 w-4" />
                                Refresh Token
                            </Button>
                            <Button className="h-12 flex-1 rounded-2xl bg-rose-50 text-rose-500 font-bold hover:bg-rose-100 transition-all gap-2 border-none" onClick={handleDisconnect} disabled={disconnecting}>
                                {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                Terminate Session
                            </Button>
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm overflow-hidden p-8 space-y-8">
                        <div className="flex items-center gap-3 px-1">
                            <Info className="h-5 w-5 text-slate-400" />
                            <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-widest text-sm">System intelligence</h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Architecture</p>
                                <p className="font-black text-slate-900 tracking-tight">v1.2.4-PRO</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Account Node</p>
                                <p className="font-black text-slate-900 tracking-tight">IG_BIZ_L2</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 px-1 pt-2">
                            <a href="#" className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.2em] italic">
                                <HelpCircle className="h-3 w-3" />
                                Support Terminal
                            </a>
                            <a href="#" className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.2em] italic">
                                <Lock className="h-3 w-3" />
                                Governance
                            </a>
                            <a href="#" className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-[0.2em] italic">
                                <ExternalLink className="h-3 w-3" />
                                Public Repo
                            </a>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-rose-50/30 rounded-[2.5rem] border border-rose-100/50 p-8 space-y-6">
                        <div>
                            <h3 className="text-rose-500 font-black text-sm uppercase tracking-[0.25em] mb-1">Erase account data</h3>
                            <p className="text-xs font-medium text-slate-400 leading-relaxed">
                                This action is irreversible. All your flow patterns, analytics, and automation nodes will be permanently wiped from the centralized matrix.
                            </p>
                        </div>
                        <Button variant="destructive" className="h-12 w-full rounded-2xl font-black text-xs uppercase tracking-widest opacity-50 cursor-not-allowed shadow-none" disabled>
                            Initialize Account Wipe (Locked)
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
