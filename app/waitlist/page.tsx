"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    Crown,
    Coffee,
    Sparkles,
    Rocket,
    Gift,
    Instagram,
    Phone,
    Check,
    Flame,
    Users,
    Clock,
    ShieldCheck,
    Zap,
    PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WaitlistStats {
    total_signups: number;
    pro_spots_left: number;
    starter_spots_left: number;
    total_reward_spots_left: number;
}

interface SubmitResult {
    position: number;
    reward_tier: "pro" | "starter" | null;
    message: string;
}

export default function WaitlistPage() {
    const [instagramUsername, setInstagramUsername] = useState("");
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState<SubmitResult | null>(null);
    const [stats, setStats] = useState<WaitlistStats | null>(null);

    // Fetch waitlist stats on load
    useEffect(() => {
        fetch("/api/waitlist")
            .then((res) => res.json())
            .then((data) => setStats(data.stats))
            .catch(() => {});
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const res = await fetch("/api/waitlist", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    instagram_username: instagramUsername,
                    whatsapp_number: whatsappNumber,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Something went wrong");
                return;
            }

            setResult({
                position: data.position,
                reward_tier: data.reward_tier,
                message: data.message,
            });

            if (data.stats) setStats(data.stats);
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalRewardSpots = 50;
    const claimedSpots = stats
        ? totalRewardSpots - stats.total_reward_spots_left
        : 0;
    const progressPercent = (claimedSpots / totalRewardSpots) * 100;

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-primary selection:text-white overflow-x-hidden">
            {/* Background */}
            <div className="fixed top-0 right-0 w-[60rem] h-[60rem] bg-primary/5 rounded-full blur-[120px] -mr-[30rem] -mt-[20rem] pointer-events-none" />
            <div className="fixed bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] -ml-[20rem] -mb-[20rem] pointer-events-none" />

            <main className="relative z-10 container mx-auto px-4 pt-12 pb-20">
                {/* Back */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-slate-400 hover:text-primary transition-colors mb-8 group"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    <span className="text-sm font-black uppercase tracking-widest">
                        Home
                    </span>
                </Link>

                {/* Hero */}
                <div className="text-center max-w-3xl mx-auto mb-12">
                    <Badge className="bg-primary text-white border-none px-5 py-2 rounded-full mb-6 uppercase tracking-[0.2em] text-[10px] font-black shadow-lg shadow-primary/20">
                        <Flame className="h-3 w-3 mr-1.5" />
                        Early Access Waitlist
                    </Badge>
                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-[900] text-slate-900 tracking-tighter leading-[0.9] mb-6">
                        Pehle aao, <br />
                        <span className="text-primary italic">pehle paao!</span>
                    </h1>
                    <p className="text-slate-400 text-sm md:text-lg font-bold leading-relaxed max-w-xl mx-auto">
                        Join the waitlist. First 50 creators get{" "}
                        <span className="text-slate-900">FREE premium access</span>{" "}
                        when we launch.
                    </p>
                </div>

                {/* Reward Tiers Visual */}
                <div className="max-w-2xl mx-auto mb-10">
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-6 md:p-8">
                        {/* Progress Bar */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Spots Claimed
                                </span>
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                                    {claimedSpots} / {totalRewardSpots}
                                </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Two Tiers */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Pro Tier */}
                            <div
                                className={cn(
                                    "relative p-5 rounded-2xl border-2 transition-all",
                                    stats && stats.pro_spots_left > 0
                                        ? "border-yellow-300 bg-yellow-50/50"
                                        : "border-slate-200 bg-slate-50 opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                                        <Crown className="h-5 w-5 text-yellow-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">
                                            Pro Pack Free
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400">
                                            1 month (worth ₹299)
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-500 mb-3">
                                    Unlimited DMs, Priority Queue, Analytics, Email Capture
                                </p>
                                <Badge
                                    className={cn(
                                        "border-none text-[9px] font-black uppercase tracking-wider px-2 py-0.5",
                                        stats && stats.pro_spots_left > 0
                                            ? "bg-yellow-200 text-yellow-800"
                                            : "bg-slate-200 text-slate-500"
                                    )}
                                >
                                    {stats
                                        ? stats.pro_spots_left > 0
                                            ? `${stats.pro_spots_left} spots left`
                                            : "All claimed!"
                                        : "25 spots"}
                                </Badge>
                                <div className="absolute -top-2 -right-2">
                                    <Badge className="bg-slate-900 text-white border-none text-[8px] font-black px-2 py-0.5 rounded-lg">
                                        #1-25
                                    </Badge>
                                </div>
                            </div>

                            {/* Starter Tier */}
                            <div
                                className={cn(
                                    "relative p-5 rounded-2xl border-2 transition-all",
                                    stats && stats.starter_spots_left > 0
                                        ? "border-orange-200 bg-orange-50/50"
                                        : "border-slate-200 bg-slate-50 opacity-60"
                                )}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                        <Coffee className="h-5 w-5 text-orange-500" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">
                                            Starter Pack Free
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-400">
                                            1 month (worth ₹99)
                                        </p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-500 mb-3">
                                    50,000 DMs, 10 Automations, Story Automation, Viral Handling
                                </p>
                                <Badge
                                    className={cn(
                                        "border-none text-[9px] font-black uppercase tracking-wider px-2 py-0.5",
                                        stats && stats.starter_spots_left > 0
                                            ? "bg-orange-200 text-orange-800"
                                            : "bg-slate-200 text-slate-500"
                                    )}
                                >
                                    {stats
                                        ? stats.starter_spots_left > 0
                                            ? `${stats.starter_spots_left} spots left`
                                            : "All claimed!"
                                        : "25 spots"}
                                </Badge>
                                <div className="absolute -top-2 -right-2">
                                    <Badge className="bg-slate-900 text-white border-none text-[8px] font-black px-2 py-0.5 rounded-lg">
                                        #26-50
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Form or Success */}
                <div className="max-w-lg mx-auto">
                    {result ? (
                        /* Success State */
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-8 md:p-12 text-center">
                            <div
                                className={cn(
                                    "w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6",
                                    result.reward_tier === "pro"
                                        ? "bg-yellow-100"
                                        : result.reward_tier === "starter"
                                        ? "bg-orange-100"
                                        : "bg-emerald-100"
                                )}
                            >
                                {result.reward_tier ? (
                                    <PartyPopper
                                        className={cn(
                                            "h-10 w-10",
                                            result.reward_tier === "pro"
                                                ? "text-yellow-600"
                                                : "text-orange-500"
                                        )}
                                    />
                                ) : (
                                    <Check className="h-10 w-10 text-emerald-600" />
                                )}
                            </div>

                            <Badge
                                className={cn(
                                    "border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4",
                                    result.reward_tier === "pro"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : result.reward_tier === "starter"
                                        ? "bg-orange-100 text-orange-800"
                                        : "bg-emerald-100 text-emerald-800"
                                )}
                            >
                                Position #{result.position}
                            </Badge>

                            <h2 className="text-3xl md:text-4xl font-[900] text-slate-900 tracking-tighter mb-4">
                                {result.reward_tier === "pro"
                                    ? "Jackpot!"
                                    : result.reward_tier === "starter"
                                    ? "You made it!"
                                    : "You're in!"}
                            </h2>

                            <p className="text-slate-500 font-bold text-sm mb-6 leading-relaxed">
                                {result.message}
                            </p>

                            {result.reward_tier && (
                                <div className="bg-slate-50 rounded-2xl p-5 mb-6 text-left space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        How to claim your reward
                                    </p>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-[10px] font-black text-primary">
                                                1
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-600">
                                            Wait for our launch notification on WhatsApp
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-[10px] font-black text-primary">
                                                2
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-600">
                                            Sign in with the SAME Instagram account:{" "}
                                            <span className="text-primary">
                                                @{instagramUsername.replace(/^@/, "")}
                                            </span>
                                        </p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-[10px] font-black text-primary">
                                                3
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-600">
                                            Your{" "}
                                            <span className="text-slate-900 font-black">
                                                {result.reward_tier === "pro"
                                                    ? "Pro Pack"
                                                    : "Starter Pack"}
                                            </span>{" "}
                                            activates automatically for 1 month from login day!
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-3">
                                <Link href="/" className="flex-1">
                                    <Button
                                        variant="outline"
                                        className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest"
                                    >
                                        Back to Home
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        /* Form */
                        <form
                            onSubmit={handleSubmit}
                            className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 p-8 md:p-12"
                        >
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 flex items-center justify-center mx-auto mb-4 shadow-inner ring-1 ring-slate-100">
                                    <Rocket className="h-8 w-8 text-primary" />
                                </div>
                                <h2 className="text-2xl md:text-3xl font-[900] text-slate-900 tracking-tighter">
                                    Reserve Your Spot
                                </h2>
                                <p className="text-slate-400 text-xs font-bold mt-2">
                                    2 fields. 10 seconds. Free premium access.
                                </p>
                            </div>

                            <div className="space-y-4 mb-6">
                                {/* Instagram Username */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        Instagram Username
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                            <Instagram className="h-5 w-5 text-slate-300" />
                                        </div>
                                        <input
                                            type="text"
                                            value={instagramUsername}
                                            onChange={(e) =>
                                                setInstagramUsername(e.target.value)
                                            }
                                            placeholder="your_username"
                                            required
                                            className="w-full h-14 pl-12 pr-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-300 mt-1.5 ml-1">
                                        Same account you'll use to sign in later
                                    </p>
                                </div>

                                {/* WhatsApp Number */}
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                                        WhatsApp Number
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                            <Phone className="h-5 w-5 text-slate-300" />
                                            <span className="text-xs font-bold text-slate-400">
                                                +91
                                            </span>
                                        </div>
                                        <input
                                            type="tel"
                                            value={whatsappNumber}
                                            onChange={(e) =>
                                                setWhatsappNumber(e.target.value)
                                            }
                                            placeholder="9876543210"
                                            required
                                            maxLength={10}
                                            className="w-full h-14 pl-[5.5rem] pr-4 rounded-2xl border border-slate-200 bg-slate-50/50 text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-300 mt-1.5 ml-1">
                                        We'll notify you on WhatsApp when we launch
                                    </p>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                                    <p className="text-xs font-bold text-red-600">
                                        {error}
                                    </p>
                                </div>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full h-14 rounded-[1.5rem] bg-slate-900 text-white hover:bg-slate-800 font-black text-xs uppercase tracking-[0.1em] shadow-xl shadow-slate-200 active:scale-95 transition-all gap-2"
                            >
                                {isSubmitting ? (
                                    "Joining..."
                                ) : (
                                    <>
                                        <Gift className="h-4 w-4" />
                                        Join Waitlist & Claim Reward
                                    </>
                                )}
                            </Button>

                            {/* Trust signals */}
                            <div className="mt-6 flex items-center justify-center gap-4 opacity-40">
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <ShieldCheck className="h-3.5 w-3.5" /> No spam
                                </div>
                                <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                    <Zap className="h-3.5 w-3.5" /> Instant confirm
                                </div>
                            </div>
                        </form>
                    )}
                </div>

                {/* Social Proof / Stats */}
                {stats && stats.total_signups > 0 && (
                    <div className="max-w-lg mx-auto mt-8 text-center">
                        <div className="inline-flex items-center gap-3 px-5 py-3 bg-white border border-slate-100 rounded-full shadow-sm">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-xs font-black text-slate-600">
                                {stats.total_signups} creators already joined
                            </span>
                            <Clock className="h-4 w-4 text-slate-300" />
                            <span className="text-xs font-bold text-slate-400">
                                {stats.total_reward_spots_left > 0
                                    ? `${stats.total_reward_spots_left} reward spots left`
                                    : "Reward spots full!"}
                            </span>
                        </div>
                    </div>
                )}

                {/* What You Get */}
                <div className="max-w-3xl mx-auto mt-16">
                    <h3 className="text-center text-xl font-black text-slate-900 tracking-tight mb-8">
                        Waitlist members get early access to
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            {
                                icon: <Zap className="h-5 w-5" />,
                                label: "Comment-to-DM",
                                color: "text-primary bg-primary/10",
                            },
                            {
                                icon: <Sparkles className="h-5 w-5" />,
                                label: "Story Automation",
                                color: "text-indigo-600 bg-indigo-50",
                            },
                            {
                                icon: <ShieldCheck className="h-5 w-5" />,
                                label: "Follow-Gate",
                                color: "text-emerald-600 bg-emerald-50",
                            },
                            {
                                icon: <Rocket className="h-5 w-5" />,
                                label: "Smart Queue",
                                color: "text-orange-600 bg-orange-50",
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="bg-white rounded-2xl border border-slate-100 p-4 text-center hover:shadow-lg transition-all"
                            >
                                <div
                                    className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3",
                                        item.color
                                    )}
                                >
                                    {item.icon}
                                </div>
                                <p className="text-xs font-black text-slate-700">
                                    {item.label}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-10 px-4 relative z-10">
                <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md">
                            <img
                                src="/logo.png"
                                alt="ReplyKaro Logo"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div className="text-xl font-black text-slate-900 tracking-tighter">
                            ReplyKaro
                        </div>
                    </div>
                    <div className="flex flex-wrap justify-center gap-8">
                        <Link
                            href="/privacy"
                            className="text-sm font-bold text-slate-400 hover:text-primary transition-colors"
                        >
                            Privacy
                        </Link>
                        <Link
                            href="/terms"
                            className="text-sm font-bold text-slate-400 hover:text-primary transition-colors"
                        >
                            Terms
                        </Link>
                    </div>
                    <div className="text-sm font-bold text-slate-300">
                        &copy; {new Date().getFullYear()} ReplyKaro Engine
                    </div>
                </div>
            </footer>
        </div>
    );
}
