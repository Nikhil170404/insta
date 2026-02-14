"use client";

import Link from "next/link";
import {
    Users,
    Target,
    Zap,
    ArrowLeft,
    ChevronRight,
    Heart,
    Globe2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-white flex flex-col selection:bg-primary selection:text-white overflow-x-hidden">

            <main className="flex-1 container mx-auto px-4 pt-32 md:pt-48 pb-16 relative">
                {/* Hero */}
                <div className="max-w-4xl mx-auto text-center mb-20 md:mb-32">
                    <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-50 rounded-full mb-8 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)]">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                            <Zap className="h-4 w-4 text-primary fill-primary" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">The Mission <span className="text-[7px] align-top">IN</span></span>
                    </div>
                    <h1 className="text-4xl md:text-8xl font-[900] text-slate-900 tracking-tighter leading-[0.95] md:leading-[0.85] mb-6 md:mb-8">
                        Democratizing <br />
                        <span className="text-primary italic">Creator Tools.</span>
                    </h1>
                    <p className="text-slate-500 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto px-4">
                        ReplyKaro was built to solve one problem: Why should Indian creators pay $50/mo when all they need is simple, instant engagement?
                    </p>
                </div>

                {/* Story Grid */}
                <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto items-center mb-20 md:mb-32">
                    <div className="space-y-6 md:space-y-8">
                        <div className="p-8 md:p-10 bg-slate-50 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">India First Architecture</h2>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                                We've optimized every line of code for the Indian ecosystem. From supporting localized slang in keyword matching to building for Indian creators who value authentic connections and community growth.
                            </p>
                        </div>
                        <div className="p-8 md:p-10 bg-primary/5 rounded-[2.5rem] md:rounded-[3rem] border border-primary/10">
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">Speed is our DNA</h2>
                            <p className="text-slate-500 font-medium leading-relaxed text-sm md:text-base">
                                Our engine ensures your audience gets a reply within seconds of commenting. Instant replies build trust and foster loyal communities.
                            </p>
                        </div>
                    </div>
                    <div className="relative aspect-square">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary to-indigo-600 rounded-[3rem] md:rounded-[4rem] rotate-6 opacity-10 blur-2xl" />
                        <div className="relative h-full w-full bg-slate-900 rounded-[3rem] md:rounded-[4rem] border border-white/10 flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-hidden">
                            <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-primary/20 rounded-full blur-[60px] md:blur-[80px] -mr-24 md:-mr-32 -mt-24 md:-mt-32" />
                            <Users className="h-16 w-16 md:h-20 md:w-20 text-primary mb-6 animate-pulse" />
                            <p className="text-2xl md:text-3xl font-black text-white tracking-tight">Built by creators, for creators.</p>
                        </div>
                    </div>
                </div>

                {/* Values */}
                <div className="bg-slate-900 rounded-[3rem] md:rounded-[5rem] p-8 md:p-32 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-[20rem] md:w-[50rem] h-[20rem] md:h-[50rem] bg-primary/10 rounded-full blur-[60px] md:blur-[120px] -ml-[10rem] md:-ml-[25rem] -mt-[10rem] md:-mt-[25rem]" />
                    <div className="grid md:grid-cols-3 gap-12 relative z-10">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-primary mx-auto">
                                <Target className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-black text-white">Hyper Focused</h3>
                            <p className="text-slate-400 font-medium text-sm">We don't do everything. We just do Instagram DM automation better than anyone else.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-indigo-400 mx-auto">
                                <Heart className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-black text-white">Trust Driven</h3>
                            <p className="text-slate-400 font-medium text-sm">100% Meta compliant. Your account safety is our non-negotiable priority.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
                                <Globe2 className="h-8 w-8" />
                            </div>
                            <h3 className="text-xl font-black text-white">Built in India</h3>
                            <p className="text-slate-400 font-medium text-sm">Engineering excellence from the heart of India's tech hub.</p>
                        </div>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="mt-20 md:mt-32 text-center pb-20">
                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-8">Ready to build your community?</h2>
                    <Link href="/signin">
                        <Button className="h-14 md:h-16 px-10 md:px-12 rounded-[2rem] bg-primary text-white font-black text-sm md:text-[15px] uppercase tracking-widest gap-4 shadow-2xl transition-all hover:scale-105 active:scale-95">
                            Start your engine
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}
