"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CreditCard,
    Check,
    Zap,
    MessageCircle,
    Crown,
    Sparkles,
    TrendingUp,
    Shield,
    ArrowUpRight,
    Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
    {
        name: "Trial Node",
        price: "₹0",
        period: "/7 days",
        description: "Perfect for initial neural bridge testing.",
        features: [
            "100 automated DMs/day",
            "3 active flow tunnels",
            "Core analytics access",
            "24/7 Email assistance",
        ],
        current: true,
    },
    {
        name: "Pro Architect",
        price: "₹499",
        period: "/month",
        description: "Scale your revenue tunnels without limits.",
        features: [
            "Infinite automated DMs",
            "Infinite flow tunnels",
            "Deep neural analytics",
            "Priority priority response",
            "Full keyword matching",
            "Follower verification",
        ],
        recommended: true,
    },
    {
        name: "Business Matrix",
        price: "₹999",
        period: "/month",
        description: "For agencies managing multiple entities.",
        features: [
            "Everything in Pro plan",
            "5 Managed accounts",
            "Multi-node access",
            "Full API deployment",
            "Dedicated node manager",
            "Custom logic tunnels",
        ],
    },
];

export default function BillingPage() {
    return (
        <div className="max-w-6xl space-y-12 pb-20">
            {/* Header */}
            <div className="px-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                    <CreditCard className="h-3 w-3 fill-current" />
                    Economy Matrix
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Resource Allocation</h1>
                <p className="text-slate-400 font-medium text-lg mt-2">Scale your automation operations and global reach.</p>
            </div>

            {/* Current Plan Status */}
            <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] -mr-48 -mt-48 transition-transform group-hover:scale-110" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                        <div className="w-20 h-20 rounded-[2rem] bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-xl backdrop-blur-md">
                            <Sparkles className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Active Protocol: Trial Node</h2>
                            <p className="text-white/60 font-medium mt-1 italic">Synchronization active until February 15, 2026.</p>
                        </div>
                    </div>
                    <Badge className="bg-primary text-white border-none px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-primary/20">Operational</Badge>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={cn(
                            "relative bg-white rounded-[2.5rem] p-8 space-y-8 border transition-all duration-500 hover:shadow-2xl flex flex-col group",
                            plan.recommended ? "border-primary shadow-xl ring-4 ring-primary/5" : "border-slate-100 hover:border-slate-200"
                        )}
                    >
                        {plan.recommended && (
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-lg">
                                Optimal Selection
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                                <p className="text-xs font-medium text-slate-400 mt-1">{plan.description}</p>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-black text-slate-900 tracking-tighter">{plan.price}</span>
                                <span className="text-sm font-bold text-slate-400">{plan.period}</span>
                            </div>
                        </div>

                        <div className="flex-1 space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Protocol Features</p>
                            <ul className="space-y-4">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/10 group-hover:border-primary/20 transition-colors">
                                            <Check className="h-3 w-3 text-slate-400 group-hover:text-primary" />
                                        </div>
                                        <span className="text-sm font-medium text-slate-600 leading-none">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <Button
                            className={cn(
                                "h-14 w-full rounded-2xl font-black text-xs uppercase tracking-widest transition-all",
                                plan.current
                                    ? "bg-slate-100 text-slate-400 cursor-not-allowed border-none"
                                    : plan.recommended
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95"
                                        : "bg-white border-2 border-slate-100 text-slate-900 hover:bg-slate-50 hover:border-slate-200"
                            )}
                            disabled={plan.current}
                        >
                            {plan.current ? "Currently Running" : "Upgrade Engine"}
                        </Button>
                    </div>
                ))}
            </div>

            {/* Usage Analysis */}
            <div className="bg-white rounded-[3rem] border border-slate-50 shadow-sm overflow-hidden p-8 md:p-12 space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-black text-slate-900 tracking-tight">Consumption Metrics</h2>
                    </div>
                    <button className="text-[10px] font-black text-primary hover:underline uppercase tracking-widest flex items-center gap-1 transition-all">
                        Deep analysis
                        <ArrowUpRight className="h-3 w-3" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <p className="text-sm font-bold text-slate-900 leading-none">Automated Responses</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Global Limit</p>
                            </div>
                            <p className="font-black text-slate-900">0 / 100</p>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
                            <div className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" style={{ width: "2%" }} />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex justify-between items-end px-1">
                            <div>
                                <p className="text-sm font-bold text-slate-900 leading-none">Flow Tunnels</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">Multi-reel Capacity</p>
                            </div>
                            <p className="font-black text-slate-900">0 / 3</p>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 p-0.5 shadow-inner">
                            <div className="h-full bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" style={{ width: "5%" }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Security Notice */}
            <div className="p-8 bg-blue-50/50 rounded-[3rem] border border-blue-100 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                    <Shield className="h-8 w-8" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-blue-900">Enterprise Encrypted Payments</p>
                    <p className="text-xs text-blue-600/80 leading-relaxed mt-1">All financial transactions are routed through high-entropy encryption tunnels using Stripe Enterprise infrastructure. We never store raw payment artifacts on our local shard.</p>
                </div>
                <Button variant="outline" className="h-12 px-8 rounded-2xl border-blue-200 bg-white text-blue-600 font-bold text-xs uppercase tracking-widest hover:bg-blue-50">
                    Terms of Economy
                </Button>
            </div>
        </div>
    );
}
