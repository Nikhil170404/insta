"use client";

import Link from "next/link";
import {
    Mail,
    MessageSquare,
    Instagram,
    ChevronRight,
    ArrowLeft,
    Shield,
    Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function ContactPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-primary selection:text-white overflow-x-hidden">

            <main className="flex-1 container mx-auto px-4 pt-48 pb-16 relative">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[120px] -mr-[25rem] -mt-[20rem] pointer-events-none" />

                <div className="max-w-4xl mx-auto">
                    <div className="text-center space-y-4 mb-20">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-50 rounded-full mb-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)]">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-primary fill-primary" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Support Station <span className="text-[7px] align-top">IN</span></span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-[900] text-slate-900 tracking-tighter leading-tight">
                            We're here to help <br />
                            <span className="text-primary italic">you engage better.</span>
                        </h1>
                        <p className="text-slate-500 text-lg font-medium max-w-lg mx-auto leading-relaxed italic">
                            Aapki success hamari priority hai. Get in touch with our team for any queries.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Direct Support */}
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 group transition-all hover:border-primary/20">
                            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3">
                                <Mail className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Email Us</h3>
                            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                                Best for technical queries and plan upgrades. We usually reply within 2 hours.
                            </p>
                            <a href="mailto:replykaro1704@gmail.com" className="block">
                                <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest gap-3 shadow-xl">
                                    replykaro1704@gmail.com
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>

                        {/* Social Support */}
                        <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 group transition-all hover:border-indigo-200">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 transition-transform group-hover:scale-110 group-hover:-rotate-3">
                                <Instagram className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Instagram DM</h3>
                            <p className="text-slate-400 font-medium mb-8 leading-relaxed">
                                Join our community and see our own automations in action! 🚀
                            </p>
                            <a href="https://instagram.com/replykaro.ai" target="_blank" rel="noopener noreferrer" className="block">
                                <Button className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-black text-sm uppercase tracking-widest gap-3 shadow-xl">
                                    @replykaro.ai
                                    <Instagram className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Trust Banner */}
                    <div className="mt-20 p-12 bg-slate-900 rounded-[3.5rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[80px] -mr-32 -mt-32" />
                        <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                            <div className="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                                <Shield className="h-10 w-10 text-primary" />
                            </div>
                            <div className="text-center md:text-left">
                                <h4 className="text-2xl font-black text-white tracking-tight">Enterprise & Agency?</h4>
                                <p className="text-slate-400 font-medium mt-1">If you need custom limits or a dedicated account manager, humein mail kijiye!</p>
                            </div>
                            <div className="md:ml-auto">
                                <Link href="mailto:replykaro1704@gmail.com">
                                    <Button className="h-12 px-8 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-xl shadow-primary/20">
                                        Agency Plan
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="py-20 bg-white border-t border-slate-50 flex items-center justify-center">
                <div className="flex items-center gap-3 opacity-20 font-black text-slate-900 tracking-tighter text-2xl">
                    <MessageSquare className="h-7 w-7" /> ReplyKaro
                </div>
            </footer>
        </div>
    );
}
