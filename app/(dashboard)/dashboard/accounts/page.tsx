"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, Instagram, AlertCircle, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getPlanLimits } from "@/lib/pricing";

interface Account {
    id: string;
    username: string;
    status: "active" | "expired";
    dmsSent: number;
    isPrimary: boolean;
    profilePic?: string;
}

export default function AccountsPage() {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [maxAccounts, setMaxAccounts] = useState(1);
    const [planName, setPlanName] = useState("Free");

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const res = await fetch("/api/auth/session");
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        // Get plan limits
                        const limits = getPlanLimits(data.user.plan_type || "trial");
                        setMaxAccounts(limits.accounts);
                        setPlanName(limits.planName);

                        // Get DM count from automations to match other page
                        let totalDmsSent = 0;
                        try {
                            const automationsRes = await fetch("/api/automations");
                            if (automationsRes.ok) {
                                const data = await automationsRes.json();
                                if (data.automations) {
                                    totalDmsSent = data.automations.reduce((sum: number, a: any) => sum + (a.dm_sent_count || 0), 0);
                                }
                            }
                        } catch {
                            // Ignore fetch error
                        }

                        setAccounts([{
                            id: data.user.id,
                            username: data.user.instagram_username || "Unknown",
                            status: data.user.token_expires_at && new Date(data.user.token_expires_at) > new Date()
                                ? "active"
                                : "active", // Default to active
                            dmsSent: totalDmsSent,
                            isPrimary: true,
                            profilePic: data.user.instagram_profile_pic,
                        }]);
                    }
                }
            } catch (error) {
                console.error("Error fetching accounts:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAccounts();
    }, []);

    const canAddMore = accounts.length < maxAccounts;

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto flex items-center justify-center py-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Manage Accounts</h1>
                    <p className="text-slate-400 font-medium mt-1">Connect multiple Instagram accounts to automate</p>
                </div>
                <Button
                    disabled={!canAddMore}
                    className={cn(
                        "h-14 px-8 rounded-2xl font-bold gap-3 transition-all",
                        canAddMore
                            ? "bg-primary text-white hover:bg-primary/90"
                            : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                >
                    <Plus className="h-5 w-5" />
                    Connect Account
                </Button>
            </div>

            {/* Account Limit Banner */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Crown className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <p className="text-white font-bold">
                            {accounts.length} of {maxAccounts} {maxAccounts === 1 ? "account" : "accounts"} used
                        </p>
                        <p className="text-slate-400 text-sm">{planName} • {maxAccounts < 3 ? "Upgrade for more accounts" : maxAccounts < 10 ? "Upgrade to Pro for 10 accounts" : "Maximum accounts"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {Array.from({ length: maxAccounts }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "w-3 h-3 rounded-full transition-all",
                                i < accounts.length ? "bg-primary" : "bg-slate-700"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Accounts List */}
            <div className="space-y-4">
                {accounts.map((acc) => (
                    <div
                        key={acc.id}
                        className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg transition-all group"
                    >
                        <div className="flex items-center gap-5">
                            <div className="relative">
                                {acc.profilePic ? (
                                    <img
                                        src={acc.profilePic}
                                        alt={acc.username}
                                        className="w-16 h-16 rounded-2xl object-cover shadow-lg"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center text-white font-black text-2xl shadow-lg">
                                        {acc.username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                {acc.status === "active" && (
                                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                        <CheckCircle2 className="h-3 w-3 text-white" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-3">
                                    <p className="text-xl font-bold text-slate-900">@{acc.username}</p>
                                    {acc.isPrimary && (
                                        <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-widest">
                                            Primary
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                    <Badge className={cn(
                                        "border-none text-[10px] font-bold uppercase tracking-widest",
                                        acc.status === "active"
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-amber-100 text-amber-700"
                                    )}>
                                        {acc.status === "active" ? "Connected" : "Reconnect Needed"}
                                    </Badge>
                                    <span className="text-xs text-slate-400 font-bold">
                                        {acc.dmsSent.toLocaleString()} DMs sent
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {acc.status !== "active" && (
                                <Button variant="outline" className="h-12 px-6 rounded-2xl font-bold border-amber-200 text-amber-600 hover:bg-amber-50">
                                    <AlertCircle className="h-4 w-4 mr-2" />
                                    Reconnect
                                </Button>
                            )}
                            <Button
                                variant="outline"
                                className="h-12 px-6 rounded-2xl font-bold text-rose-500 border-rose-200 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State - only show if no accounts */}
            {accounts.length === 0 && (
                <div className="text-center py-20 bg-slate-50 rounded-[3rem]">
                    <Instagram className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No accounts connected</h3>
                    <p className="text-slate-400 mb-6">Connect your Instagram account to start automating</p>
                    <Button className="h-14 px-8 rounded-2xl bg-primary text-white font-bold gap-3">
                        <Plus className="h-5 w-5" />
                        Connect Your First Account
                    </Button>
                </div>
            )}

            {/* Info Section */}
            <div className="bg-slate-50 rounded-[2rem] p-8 space-y-4">
                <h3 className="font-bold text-slate-900">How Multi-Account Works</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                    <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">1</span>
                        </div>
                        <span>Connect multiple Instagram Business/Creator accounts to one dashboard</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">2</span>
                        </div>
                        <span>Switch between accounts instantly using the sidebar</span>
                    </li>
                    <li className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-xs font-bold text-primary">3</span>
                        </div>
                        <span>Each account has its own automations, analytics, and settings</span>
                    </li>
                </ul>
            </div>
        </div>
    );
}
