"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    Rocket,
    Crown,
    Coffee,
    Zap,
    Gift,
    Check,
    ArrowRight,
    Sparkles,
    ShieldCheck,
    Instagram,
    Phone,
    Users,
    Star,
    Timer,
    Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLANS_ARRAY } from "@/lib/pricing";

interface WaitlistStats {
    total: number;
    spotsLeft: number;
    tiers: {
        pro: { taken: number; max: number; remaining: number };
        starter: { taken: number; max: number; remaining: number };
        discount: { taken: number; max: number; remaining: number };
    };
}

export default function WaitlistPage() {
    const [stats, setStats] = useState<WaitlistStats | null>(null);
    const [username, setUsername] = useState("");
    const [whatsapp, setWhatsapp] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState<{
        position: number;
        tier: string;
        message: string;
    } | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch("/api/waitlist/stats");
            const data = await res.json();
            setStats(data);
        } catch {
            console.error("Failed to fetch stats");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instagram_username: username,
                    whatsapp_number: whatsapp,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            setSuccess({
                position: data.position,
                tier: data.tier,
                message: data.message,
            });
            fetchStats(); // Refresh counts
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getTierIcon = (tier: string) => {
        switch (tier) {
            case "pro": return <Crown className="h-6 w-6 text-yellow-500" />;
            case "starter": return <Coffee className="h-6 w-6 text-orange-400" />;
            default: return <Gift className="h-6 w-6 text-emerald-500" />;
        }
    };

    const getTierColor = (tier: string) => {
        switch (tier) {
            case "pro": return "from-yellow-500 to-orange-500";
            case "starter": return "from-orange-400 to-rose-500";
            default: return "from-emerald-500 to-teal-500";
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-primary selection:text-white overflow-x-hidden">

            <main className="flex-1 container mx-auto px-4 pt-8 md:pt-16 pb-16 relative">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[120px] -mr-[25rem] -mt-[20rem] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] -ml-[20rem] -mb-[10rem] pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 w-[30rem] h-[30rem] bg-primary/3 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

                {/* Hero Section */}
                <div className="text-center space-y-4 max-w-4xl mx-auto mb-10 relative z-10">
                    <div className="inline-flex items-center gap-2 md:gap-4 px-4 md:px-6 py-2 md:py-3 bg-white border border-slate-50 rounded-full mb-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)] animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                            <Timer className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                        </div>
                        <span className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] md:tracking-[0.25em]">
                            Limited to 1,000 Early Birds 🐦
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-[900] text-slate-900 tracking-tighter leading-[0.9] animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                        Join the <br className="md:hidden" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-indigo-600">Waitlist.</span>
                    </h1>

                    <p className="text-slate-400 text-sm md:text-lg lg:text-xl font-bold leading-relaxed max-w-2xl mx-auto italic animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                        Instagram ka sabse affordable automation tool. First 10 ko <span className="text-primary font-extrabold">Pro FREE</span>, next 20 ko <span className="text-orange-500 font-extrabold">Starter FREE</span>, sabko <span className="text-emerald-500 font-extrabold">10% off</span>!
                    </p>
                </div>

                {/* Tier Rewards Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8 relative z-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
                    {/* Pro Tier */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-200/50 rounded-[2rem] p-6 group hover:shadow-xl hover:shadow-yellow-500/10 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-yellow-500/20">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-yellow-700 uppercase tracking-widest">🏆 Pro Tier</p>
                                <p className="text-[10px] font-bold text-slate-400">Positions 1-10</p>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-2">1 Month <span className="text-yellow-600 font-black">FREE Pro Pack</span></p>
                        <p className="text-[11px] text-slate-400 font-medium">+ 10% off for 3 months</p>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${stats ? (stats.tiers.pro.taken / stats.tiers.pro.max) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-black text-yellow-600">
                                {stats ? stats.tiers.pro.remaining : 10}/{stats?.tiers.pro.max || 10}
                            </span>
                        </div>
                    </div>

                    {/* Starter Tier */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-rose-500/10 border border-orange-200/50 rounded-[2rem] p-6 group hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                <Zap className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-orange-700 uppercase tracking-widest">⚡ Starter Tier</p>
                                <p className="text-[10px] font-bold text-slate-400">Positions 11-30</p>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-2">1 Month <span className="text-orange-500 font-black">FREE Starter Pack</span></p>
                        <p className="text-[11px] text-slate-400 font-medium">+ 10% off for 3 months</p>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-400 to-rose-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${stats ? (stats.tiers.starter.taken / stats.tiers.starter.max) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-black text-orange-600">
                                {stats ? stats.tiers.starter.remaining : 20}/{stats?.tiers.starter.max || 20}
                            </span>
                        </div>
                    </div>

                    {/* Discount Tier */}
                    <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 rounded-[2rem] p-6 group hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-8 -mt-8" />
                        <div className="flex items-center gap-3 mb-3 relative z-10">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                <Gift className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">🎯 Discount Tier</p>
                                <p className="text-[10px] font-bold text-slate-400">Positions 31-1000</p>
                            </div>
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-2"><span className="text-emerald-600 font-black">10% OFF</span> all plans</p>
                        <p className="text-[11px] text-slate-400 font-medium">For 3 months after launch</p>
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-1000"
                                    style={{ width: `${stats ? (stats.tiers.discount.taken / stats.tiers.discount.max) * 100 : 0}%` }}
                                />
                            </div>
                            <span className="text-[10px] font-black text-emerald-600">
                                {stats ? stats.tiers.discount.remaining : 970}/{stats?.tiers.discount.max || 970}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Live Counter */}
                <div className="max-w-md mx-auto mb-8 relative z-10 animate-in fade-in zoom-in-95 duration-500 delay-400">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 text-center">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Users className="h-5 w-5 text-primary" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Signups</span>
                        </div>
                        <p className="text-5xl font-[900] tracking-tighter text-slate-900">
                            {stats?.total ?? "..."}
                            <span className="text-lg text-slate-300 font-bold"> / 1,000</span>
                        </p>
                        <div className="mt-3 h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary via-indigo-500 to-purple-500 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${stats ? (stats.total / 1000) * 100 : 0}%` }}
                            />
                        </div>
                        <p className="mt-2 text-xs font-bold text-slate-400">
                            {stats ? stats.spotsLeft : "..."} spots remaining
                        </p>
                    </div>
                </div>

                {/* Form or Success */}
                <div className="max-w-lg mx-auto mb-12 relative z-10">
                    {success ? (
                        /* Success State */
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-8 md:p-10 text-center animate-in fade-in zoom-in-95 duration-500">
                            <div className={cn(
                                "w-20 h-20 rounded-[1.5rem] mx-auto mb-6 flex items-center justify-center bg-gradient-to-br shadow-xl",
                                getTierColor(success.tier),
                                success.tier === "pro" ? "shadow-yellow-500/20" : success.tier === "starter" ? "shadow-orange-500/20" : "shadow-emerald-500/20"
                            )}>
                                {getTierIcon(success.tier)}
                            </div>

                            <h2 className="text-2xl md:text-3xl font-[900] text-slate-900 tracking-tight mb-2">
                                You&apos;re In! 🎉
                            </h2>

                            <p className="text-lg font-bold text-slate-600 mb-4">
                                {success.message}
                            </p>

                            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Your Position</p>
                                <p className="text-4xl font-[900] text-primary tracking-tighter">#{success.position}</p>
                            </div>

                            <div className="space-y-3 text-left">
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Check className="h-3 w-3 text-emerald-600" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">Sign in with the same Instagram username to claim your reward</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <Check className="h-3 w-3 text-emerald-600" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-600">We&apos;ll notify you on WhatsApp when we launch!</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Form */
                        <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-8 md:p-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-500">
                            <div className="text-center mb-8">
                                <h2 className="text-2xl md:text-3xl font-[900] text-slate-900 tracking-tight mb-2">
                                    Claim Your Spot
                                </h2>
                                <p className="text-sm font-medium text-slate-400">
                                    Enter your Instagram username & WhatsApp to join
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Instagram className="h-3 w-3" /> Instagram Username
                                    </label>
                                    <div className="relative group">
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm group-focus-within:text-primary transition-colors">@</span>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="your_username"
                                            required
                                            className="w-full h-14 pl-10 pr-6 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary focus:bg-white shadow-sm text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-300 font-medium px-1">Same username you&apos;ll use to sign in later</p>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <Phone className="h-3 w-3" /> WhatsApp Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={whatsapp}
                                        onChange={(e) => setWhatsapp(e.target.value)}
                                        placeholder="+91 98765 43210"
                                        required
                                        className="w-full h-14 px-6 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary focus:bg-white shadow-sm text-sm font-bold text-slate-700 placeholder:text-slate-300 transition-all"
                                    />
                                    <p className="text-[10px] text-slate-300 font-medium px-1">We&apos;ll send launch updates here</p>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm font-bold text-rose-600 text-center animate-in fade-in zoom-in-95 duration-300">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading || !username || !whatsapp}
                                className="w-full h-14 mt-6 rounded-2xl bg-gradient-to-r from-primary to-indigo-600 hover:opacity-90 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/25 transition-all disabled:opacity-40 gap-3 active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Joining...
                                    </>
                                ) : (
                                    <>
                                        Join Waitlist <Rocket className="h-4 w-4" />
                                    </>
                                )}
                            </Button>

                            <p className="mt-4 text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest">
                                🔒 100% Secure • No spam
                            </p>
                        </form>
                    )}
                </div>

                {/* Pricing Preview */}
                <div className="max-w-5xl mx-auto relative z-10 mb-20">
                    <div className="text-center mb-10">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest mb-4">
                            Early Bird Pricing
                        </Badge>
                        <h2 className="text-3xl md:text-5xl font-[900] text-slate-900 tracking-tighter">
                            Our Plans <span className="text-primary italic">(with your discount)</span>
                        </h2>
                        <p className="text-slate-400 text-sm md:text-base font-bold mt-2 italic">
                            Simple, honest pricing. Sabse affordable. Sabse best.
                        </p>
                    </div>



                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {PLANS_ARRAY.map((plan) => (
                            <div
                                key={plan.name}
                                className={cn(
                                    "relative flex flex-col p-6 md:p-8 bg-white rounded-[2.5rem] border transition-all duration-500 group overflow-hidden",
                                    plan.popular
                                        ? "border-primary/20 shadow-[0_40px_80px_-20px_rgba(var(--primary-rgb),0.15)] scale-105 z-10"
                                        : plan.name === "Free Starter"
                                            ? "border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white"
                                            : "border-slate-100 hover:border-slate-200 hover:shadow-2xl shadow-slate-200/50"
                                )}
                            >
                                {plan.badge && (
                                    <div className="absolute top-6 right-6">
                                        <Badge className={cn(
                                            "border-none font-black text-[9px] px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg",
                                            plan.popular ? "bg-primary text-white shadow-primary/20"
                                                : plan.name === "Free Starter" ? "bg-emerald-500 text-white"
                                                    : "bg-slate-900 text-white shadow-slate-900/10"
                                        )}>
                                            {plan.badge}
                                        </Badge>
                                    </div>
                                )}

                                <div className="space-y-6 flex-1">
                                    <div className={cn(
                                        "w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-4 transition-all group-hover:scale-110 duration-700 group-hover:rotate-6 shadow-sm",
                                        plan.popular ? "bg-primary/10" : plan.name === "Free Starter" ? "bg-emerald-100" : "bg-slate-50"
                                    )}>
                                        {plan.name === "Free Starter" && <Gift className="h-7 w-7 text-emerald-500" />}
                                        {plan.name === "Starter Pack" && <Coffee className="h-7 w-7 text-orange-400" />}
                                        {plan.name === "Pro Pack" && <Crown className="h-7 w-7 text-yellow-500" />}
                                    </div>

                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                                        <p className="text-xs font-bold text-slate-400 mt-1">{plan.description}</p>
                                    </div>

                                    <div className="py-2">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                                {plan.price === "0" ? "FREE" : `₹${plan.price}`}
                                            </span>
                                            {plan.price !== "0" && (
                                                <span className="text-slate-400 font-bold text-sm">/ mo</span>
                                            )}
                                        </div>
                                        {plan.price !== "0" && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] px-2 py-0.5 rounded-lg">
                                                    WAITLIST: 10% OFF →  ₹{Math.round(parseInt(plan.price) * 0.9)}/mo
                                                </Badge>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 pt-4 border-t border-slate-50">
                                        {plan.features.slice(0, 6).map((feature) => (
                                            <div key={feature} className="flex items-start gap-3 group/feat">
                                                <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover/feat:bg-primary/10 transition-all duration-300">
                                                    <Check className="h-3 w-3 text-slate-400 group-hover/feat:text-primary transition-colors" />
                                                </div>
                                                <p className="text-xs font-bold text-slate-600 tracking-tight leading-snug">{feature}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="flex flex-wrap justify-center gap-10 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-1000 relative z-10 px-4">
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <ShieldCheck className="h-7 w-7 text-primary" /> Meta Verified
                    </div>
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <Rocket className="h-7 w-7 text-indigo-600" /> Made for India
                    </div>
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <Sparkles className="h-7 w-7 text-primary" /> Launched Feb 2026
                    </div>
                </div>
            </main>


        </div>
    );
}
