"use client";

import Link from "next/link";
import {
    ArrowRight,
    Check,
    Coffee,
    Flame,
    Crown,
    Zap,
    Rocket,
    ShieldCheck,
    Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Navigation } from "@/components/ui/Navigation";
import { PLANS_ARRAY } from "@/lib/pricing";

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-slate-50 selection:bg-primary selection:text-white">
            <Navigation />

            <main className="flex-1 container mx-auto px-4 pt-48 pb-16 relative">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[120px] -mr-[25rem] -mt-[20rem] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] -ml-[20rem] -mb-[10rem] pointer-events-none" />

                <div className="text-center space-y-6 max-w-4xl mx-auto mb-20 relative z-10 px-4">
                    <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-50 rounded-full mb-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)]">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-primary fill-primary" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Honest India Pricing <span className="text-[7px] align-top">IN</span></span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-[900] text-slate-900 tracking-tighter leading-[0.85]">
                        Scale your <br />
                        <span className="text-primary italic">Sales Faster.</span>
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-bold leading-relaxed max-w-2xl mx-auto italic">
                        Sabki pahunch mein automation. Simple plans for every creator.
                    </p>
                </div>

                {/* Pricing Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 px-4">
                    {PLANS_ARRAY.map((plan) => (
                        <div
                            key={plan.name}
                            className={cn(
                                "relative flex flex-col p-8 md:p-10 bg-white rounded-[3.5rem] border transition-all duration-500 group overflow-hidden",
                                plan.popular
                                    ? "border-primary/20 shadow-[0_40px_80px_-20px_rgba(var(--primary-rgb),0.15)] scale-105 z-10"
                                    : "border-slate-100 hover:border-slate-200 hover:shadow-2xl shadow-slate-200/50"
                            )}
                        >
                            {plan.badge && (
                                <div className="absolute top-8 right-10">
                                    <Badge className={cn(
                                        "border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg",
                                        plan.popular ? "bg-primary text-white shadow-primary/20" : "bg-slate-900 text-white shadow-slate-900/10"
                                    )}>
                                        {plan.badge}
                                    </Badge>
                                </div>
                            )}

                            <div className="space-y-8 flex-1">
                                <div className={cn(
                                    "w-16 h-16 rounded-[2rem] flex items-center justify-center mb-6 transition-all group-hover:scale-110 duration-700 group-hover:rotate-6 shadow-sm",
                                    plan.popular ? "bg-primary/10" : "bg-slate-50"
                                )}>
                                    {plan.name === "Starter Pack" && <Coffee className="h-7 w-7 text-orange-400" />}
                                    {plan.name === "Growth Pack" && <Flame className="h-7 w-7 text-primary" />}
                                    {plan.name === "Pro Pack" && <Crown className="h-7 w-7 text-yellow-500" />}
                                </div>

                                <div>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                                    <p className="text-sm font-bold text-slate-400 mt-2 leading-relaxed">{plan.description}</p>
                                    <p className="text-[11px] font-black text-primary/60 uppercase mt-2 tracking-widest italic">{plan.hindiDesc}</p>
                                </div>

                                <div className="py-4">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-5xl font-black text-slate-900 tracking-tighter">₹{plan.upfront}</span>
                                        <span className="text-slate-400 font-bold text-sm tracking-tight">/ {plan.duration}</span>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.15em] flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-primary" />
                                            Then ₹{plan.price}/mo Muscle 💪
                                        </p>
                                        <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100 font-black text-[10px] rounded-lg px-3 py-1 uppercase tracking-tight">
                                            {plan.savings} Discounted 🎉
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-5 pt-8 border-t border-slate-50">
                                    {plan.features.map((feature) => (
                                        <div key={feature} className="flex items-start gap-4 group/feat">
                                            <div className="mt-1 w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover/feat:bg-primary/10 transition-all duration-300">
                                                <Check className="h-3.5 w-3.5 text-slate-400 group-hover/feat:text-primary transition-colors" />
                                            </div>
                                            <p className="text-sm font-bold text-slate-600 tracking-tight leading-snug">{feature}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-12">
                                <Link href="/signin">
                                    <Button
                                        className={cn(
                                            "w-full h-16 rounded-[2rem] font-black text-sm tracking-[0.05em] uppercase transition-all duration-500 gap-4 group/btn shadow-2xl active:scale-95",
                                            plan.popular
                                                ? "bg-primary text-white hover:bg-primary/90 shadow-primary/25"
                                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                                        )}
                                    >
                                        {plan.cta}
                                        <ArrowRight className="h-5 w-5 group-hover/btn:translate-x-2 transition-transform duration-500" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Badges */}
                <div className="mt-32 pt-16 border-t border-slate-200/60 flex flex-wrap justify-center gap-10 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-1000 relative z-10 px-4">
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <ShieldCheck className="h-7 w-7 text-primary" /> Meta Verified
                    </div>
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <Rocket className="h-7 w-7 text-indigo-600" /> Fast Integration
                    </div>
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <Sparkles className="h-7 w-7 text-primary" /> 100% India-Owned
                    </div>
                </div>

                {/* CTA / Trial Info */}
                <div className="mt-20 text-center relative z-10 px-4">
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em] mb-4">
                        Still Skeptical?
                    </p>
                    <Link href="/signin">
                        <Button variant="ghost" className="text-primary font-black text-lg gap-2 hover:bg-primary/5 px-8 h-14 rounded-full">
                            Start a 7-day test drive <Zap className="h-5 w-5 fill-current" />
                        </Button>
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-100 py-16 px-4">
                <div className="container mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md">
                                <img src="/logo.png" alt="ReplyKaro Logo" className="w-full h-full object-cover" />
                            </div>
                            <div className="text-xl font-black text-slate-900 tracking-tighter">ReplyKaro</div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-8">
                            <Link href="/privacy" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Privacy</Link>
                            <Link href="/terms" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Terms</Link>
                            <Link href="/faq" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">FAQ</Link>
                            <Link href="/contact" className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Support</Link>
                        </div>

                        <div className="text-sm font-bold text-slate-300">
                            &copy; {new Date().getFullYear()} ReplyKaro Engine. Built for India.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
