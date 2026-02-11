"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    CheckCircle,
    AlertTriangle,
    Facebook,
    Instagram,
    Smartphone,
    Settings,
    ArrowRight,
    ExternalLink,
    Zap,
    ShieldCheck,
    AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SetupGuidePage() {
    return (
        <div className="max-w-4xl space-y-12">
            {/* Header */}
            <div className="px-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                    <Zap className="h-3 w-3 fill-current" />
                    Onboarding Protocol
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Deployment Blueprint</h1>
                <p className="text-slate-400 font-medium text-lg mt-2">Follow these specific architectural steps to synchronize your account.</p>
            </div>

            <div className="space-y-8 relative">
                {/* Visual Line */}
                <div className="absolute left-8 top-0 bottom-0 w-1 bg-slate-100 rounded-full hidden md:block" />

                {/* Step 1: Facebook Page */}
                <div className="relative pl-0 md:pl-20 group">
                    <div className="absolute left-2.5 top-0 w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:border-primary group-hover:text-primary transition-all shadow-sm hidden md:flex z-10">
                        01
                    </div>
                    <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm p-8 space-y-6 hover:shadow-xl transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Facebook className="h-6 w-6 text-[#1877F2]" />
                                Bridge to Facebook Page
                            </h2>
                            <Badge className="bg-rose-100 text-rose-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Mandatory</Badge>
                        </div>

                        <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 flex gap-4">
                            <AlertCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs font-medium text-slate-600 leading-relaxed">
                                Instagram Graph API requires a linked Facebook Page to receive real-time updates. If this bridge is missing, <span className="font-bold text-rose-600">automations will not fire.</span>
                            </p>
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Synchronization Sequence</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <a href="https://facebook.com/pages/create" target="_blank" className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary hover:bg-white transition-all group/card">
                                    <p className="font-bold text-sm text-slate-900">1. Connect Page</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">Create a Facebook Business asset if you don't have one.</p>
                                </a>
                                <a href="https://business.facebook.com" target="_blank" className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-primary hover:bg-white transition-all">
                                    <p className="font-bold text-sm text-slate-900">2. Link Asset</p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">Visit Meta Business Suite &gt; Inbox &gt; Instagram.</p>
                                </a>
                            </div>
                        </div>

                        <Button className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-sm gap-2">
                            Check Connection Status
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Step 2: Connected Tools */}
                <div className="relative pl-0 md:pl-20 group">
                    <div className="absolute left-2.5 top-0 w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:border-primary group-hover:text-primary transition-all shadow-sm hidden md:flex z-10">
                        02
                    </div>
                    <div className="bg-white rounded-[2.5rem] border border-slate-50 shadow-sm p-8 space-y-6 hover:shadow-xl transition-all">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                                <Smartphone className="h-6 w-6 text-primary" />
                                Activate Connected Tools
                            </h2>
                            <Badge className="bg-amber-100 text-amber-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Security Link</Badge>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs shadow-sm">1</div>
                                <p className="text-sm font-bold text-slate-700">Open Settings and Activity in Instagram App</p>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl">
                                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center font-bold text-xs shadow-sm">2</div>
                                <p className="text-sm font-bold text-slate-700">Navigate to: Messages and story replies &gt; Message controls</p>
                            </div>
                            <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/20">
                                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shadow-sm">3</div>
                                <p className="text-sm font-bold text-slate-900">Toggle "Allow access to messages" to ON</p>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Why do I need this?</p>
                            <p className="text-[11px] text-slate-400 mt-1 italic">This securely grants our logic brain permission to deliver your DMs.</p>
                        </div>
                    </div>
                </div>

                {/* Step 3: Deployment Verification */}
                <div className="relative pl-0 md:pl-20 group">
                    <div className="absolute left-2.5 top-0 w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:border-primary group-hover:text-primary transition-all shadow-sm hidden md:flex z-10">
                        03
                    </div>
                    <div className="bg-primary rounded-[2.5rem] shadow-xl shadow-primary/20 p-8 space-y-6">
                        <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                            <ShieldCheck className="h-6 w-6" />
                            System Verification
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <p className="text-white font-bold text-sm mb-1">Live Test Protocol</p>
                                <p className="text-white/60 text-[10px] leading-relaxed">Use a secondary account to comment your trigger keyword on a reel.</p>
                            </div>
                            <div className="p-5 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <p className="text-white font-bold text-sm mb-1">Expected Outcome</p>
                                <p className="text-white/60 text-[10px] leading-relaxed">Automation should fire within 5-10 seconds of comment placement.</p>
                            </div>
                        </div>

                        <Button className="w-full h-14 rounded-2xl bg-white text-primary font-black text-xs uppercase tracking-widest hover:bg-slate-50 shadow-lg">
                            Run Diagnostics Check
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-8 bg-slate-50 rounded-[3rem] border border-slate-100 text-center space-y-4">
                <p className="text-sm font-bold text-slate-600">Still stuck in the loop?</p>
                <div className="flex flex-center justify-center gap-4">
                    <button className="text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest flex items-center gap-1 transition-colors">
                        <Settings className="h-3 w-3" />
                        Account Re-link
                    </button>
                    <button className="text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest flex items-center gap-1 transition-colors">
                        <ExternalLink className="h-3 w-3" />
                        Meta Documentation
                    </button>
                </div>
            </div>
        </div>
    );
}

function Badge({ children, className }: { children: React.ReactNode, className?: string }) {
    return (
        <span className={cn("px-2 py-1 rounded-md text-xs font-medium", className)}>
            {children}
        </span>
    );
}
