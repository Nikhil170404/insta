"use client";

import { useState } from "react";
import {
    Zap,
    Check,
    ArrowRight,
    Sparkles,
    Rocket,
    ShieldCheck,
    Coffee,
    Flame,
    Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
    {
        name: "Starter",
        price: "149",
        upfront: "399",
        duration: "3 Months",
        description: "Perfect for budding creators",
        icon: <Coffee className="h-6 w-6 text-orange-400" />,
        features: [
            "1 Instagram Account",
            "5 Active Automations",
            "300 automated DMs / day",
            "Public Comment Replies",
            "Email Support (72h)",
        ],
        cta: "Start 3-Month Trial",
        popular: false
    },
    {
        name: "Growth",
        price: "249",
        upfront: "799",
        duration: "6 Months",
        description: "Most popular for scaling fast",
        icon: <Flame className="h-6 w-6 text-primary" />,
        features: [
            "1 Instagram Account",
            "15 Active Automations",
            "1,000 automated DMs / day",
            "Story Reply Automation",
            "Follow-up Delay Logic",
            "Priority Support (24h)",
        ],
        cta: "Get Growth Pack",
        popular: true
    },
    {
        name: "Pro",
        price: "349",
        upfront: "1,499",
        duration: "12 Months",
        description: "For established businesses",
        icon: <Crown className="h-6 w-6 text-yellow-500" />,
        features: [
            "2 Instagram Accounts",
            "Unlimited Automations",
            "5,000 automated DMs / day",
            "All Growth Features",
            "Custom Logic Support",
            "Phone Support",
        ],
        cta: "Go Unlimited Pro",
        popular: false
    }
];

export default function BillingPage() {
    const [selectedPlan, setSelectedPlan] = useState("growth");

    return (
        <div className="max-w-7xl mx-auto space-y-16 pb-20">
            {/* Header */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4 mx-auto">
                    Simple Transparent Pricing
                </Badge>
                <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                    Scale your engagement <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">for the price of 2 coffees.</span>
                </h1>
                <p className="text-slate-500 text-lg font-medium leading-relaxed">
                    Choose a plan that fits your growth. No hidden fees, no complex contracts. <br className="hidden md:block" />
                    Switch or cancel anytime.
                </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        className={cn(
                            "relative flex flex-col p-8 md:p-10 bg-white rounded-[3rem] border transition-all duration-500 group overflow-hidden",
                            plan.popular
                                ? "border-primary/20 shadow-[0_32px_64px_-16px_rgba(var(--primary-rgb),0.1)] scale-105 z-10"
                                : "border-slate-100 hover:border-slate-200 hover:shadow-xl"
                        )}
                    >
                        {plan.popular && (
                            <div className="absolute top-6 right-8">
                                <Badge className="bg-primary text-white border-none font-black text-[10px] px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg shadow-primary/20">
                                    Recommended
                                </Badge>
                            </div>
                        )}

                        <div className="space-y-6 flex-1">
                            <div className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-500",
                                plan.popular ? "bg-primary/10" : "bg-slate-50"
                            )}>
                                {plan.icon}
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                                <p className="text-sm font-medium text-slate-400 mt-1">{plan.description}</p>
                            </div>

                            <div className="py-2">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{plan.upfront}</span>
                                    <span className="text-slate-400 font-bold text-sm">/ {plan.duration}</span>
                                </div>
                                <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em] mt-2">
                                    Then just ₹{plan.price}/mo
                                </p>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                {plan.features.map((feature) => (
                                    <div key={feature} className="flex items-start gap-3 group/feat">
                                        <div className="mt-1 w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover/feat:bg-primary/10 transition-colors">
                                            <Check className="h-3 w-3 text-slate-400 group-hover/feat:text-primary transition-colors" />
                                        </div>
                                        <p className="text-sm font-bold text-slate-600 tracking-tight">{feature}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-10">
                            <Button
                                className={cn(
                                    "w-full h-14 rounded-2xl font-black text-sm tracking-tight transition-all duration-300 gap-3 group/btn shadow-xl",
                                    plan.popular
                                        ? "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                                        : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                                )}
                            >
                                {plan.cta}
                                <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Trust Badges */}
            <div className="pt-20 border-t border-slate-100 flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="flex items-center gap-2 font-black text-slate-900 italic tracking-tighter text-xl">
                    <ShieldCheck className="h-6 w-6" /> Meta Verified
                </div>
                <div className="flex items-center gap-2 font-black text-slate-900 italic tracking-tighter text-xl">
                    <Rocket className="h-6 w-6" /> Fast Launch
                </div>
                <div className="flex items-center gap-2 font-black text-slate-900 italic tracking-tighter text-xl">
                    <Sparkles className="h-6 w-6" /> 100% Secure
                </div>
            </div>

            {/* FAQ Intro */}
            <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 text-center relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -ml-48 -mt-48 group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] -mr-48 -mb-48 group-hover:scale-150 transition-transform duration-1000" />

                <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight relative z-10">Still have questions?</h2>
                <p className="text-slate-400 font-medium text-lg mt-4 mb-8 relative z-10 max-w-lg mx-auto">
                    We're here to help you get your automations running in minutes.
                    Shoot us an email if you need anything.
                </p>
                <Button variant="outline" className="h-12 px-10 rounded-2xl border-white/20 text-white bg-white/10 hover:bg-white/20 relative z-10 font-bold">
                    Talk to Support
                </Button>
            </div>
        </div>
    );
}
