"use client";

import Link from "next/link";
import {
    HelpCircle,
    ArrowLeft,
    ChevronRight,
    Search,
    Zap,
    Shield,
    CreditCard,
    Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
    {
        category: "Getting Started",
        icon: <Rocket className="h-5 w-5" />,
        questions: [
            {
                q: "How fast can I start my first automation?",
                a: "Within 60 seconds! Once you connect your Instagram account, just choose a Reel, pick a keyword, and set your reply. Your automation goes live instantly."
            },
            {
                q: "Do I need technical skills?",
                a: "Nahi! ReplyKaro is designed for creators with ZERO tech knowledge. No complex flows or coding required. It's point-and-click simple."
            }
        ]
    },
    {
        category: "Security & Safety",
        icon: <Shield className="h-5 w-5" />,
        questions: [
            {
                q: "Is my Instagram account safe?",
                a: "Yes. Hum sirf official Meta Graph API use karte hain. We have built-in rate limiters and randomized delays to ensure your account stays 100% compliant with Instagram's policies."
            },
            {
                q: "Do you store my DMs?",
                a: "No. We only process the triggers to send replies. Your private conversations remain private. We only process trigger data to ensure your engagement flows smoothly and connections are made instantly."
            }
        ]
    },
    {
        category: "Pricing & Billing",
        icon: <CreditCard className="h-5 w-5" />,
        questions: [
            {
                q: "Is there a free trial?",
                a: "No, because we offer a 'Free Forever' plan! You can use ReplyKaro for free as long as you like. Upgrade only when you need more power."
            },
            {
                q: "Can I upgrade or downgrade my plan?",
                a: "Bilkul! You can change your plan anytime from the billing dashboard. The changes will be prorated automatically."
            },
            {
                q: "What is the refund policy?",
                a: "We have a strict no-refund policy. Since we offer a Free Forever plan, we encourage you to try everything before you buy. Cancellations stop future billing, but previous payments are final."
            }
        ]
    }
];

export default function FAQPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white overflow-x-hidden">

            <main className="flex-1 container mx-auto px-4 pt-48 pb-16 relative">
                {/* Decorative */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60rem] h-[60rem] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

                <div className="max-w-4xl mx-auto">
                    <div className="text-center space-y-6 mb-20">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-50 rounded-full mb-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)]">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-primary fill-primary" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Knowledge Base <span className="text-[7px] align-top">IN</span></span>
                        </div>
                        <h1 className="text-6xl md:text-8xl font-[900] text-slate-900 tracking-tighter leading-[0.85]">
                            Everything <br />
                            <span className="text-primary italic">explained simply.</span>
                        </h1>
                    </div>

                    {/* FAQ Items */}
                    <div className="space-y-16">
                        {FAQS.map((category) => (
                            <section key={category.category} className="space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-primary shadow-sm">
                                        {category.icon}
                                    </div>
                                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{category.category}</h2>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>

                                <div className="grid gap-6">
                                    {category.questions.map((q, i) => (
                                        <div key={i} className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm transition-all hover:shadow-xl hover:border-primary/10 group">
                                            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-4 group-hover:text-primary transition-colors">
                                                {q.q}
                                            </h3>
                                            <p className="text-slate-500 font-medium leading-relaxed md:text-lg italic">
                                                {q.a}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>

                    {/* Still have questions? */}
                    <div className="mt-32 p-12 bg-slate-900 rounded-[4rem] text-center relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48" />
                        <h3 className="text-3xl font-black text-white tracking-tight relative z-10 mb-4">Aapka sawal yahan nahi hai?</h3>
                        <p className="text-slate-400 font-medium max-w-md mx-auto relative z-10 mb-8 leading-relaxed">
                            No worries! Our team is available 24/7 on email and Instagram.
                        </p>
                        <Link href="/contact" className="relative z-10">
                            <Button className="h-14 px-10 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 font-black text-sm uppercase tracking-widest gap-3 shadow-2xl">
                                Support se baat karein
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>

            <footer className="py-20 border-t border-slate-100 flex flex-col items-center gap-4">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Powered by ReplyKaro AI Engine</p>
            </footer>
        </div>
    );
}
