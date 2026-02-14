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

            <main className="flex-1 container mx-auto px-4 pt-32 md:pt-48 pb-16 relative">
                {/* Background Blobs */}
                <div className="absolute top-0 right-0 w-[20rem] md:w-[50rem] h-[20rem] md:h-[50rem] bg-primary/5 rounded-full blur-[60px] md:blur-[120px] -mr-[10rem] md:-mr-[25rem] -mt-[10rem] md:-mt-[20rem] pointer-events-none" />

                <div className="max-w-4xl mx-auto">
                    <div className="text-center space-y-4 mb-12 md:mb-20">
                        <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-50 rounded-full mb-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)]">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-primary fill-primary" />
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Support Station <span className="text-[7px] align-top">IN</span></span>
                        </div>
                        <h1 className="text-4xl md:text-7xl font-[900] text-slate-900 tracking-tighter leading-tight">
                            We're here to help <br />
                            <span className="text-primary italic">you engage better.</span>
                        </h1>
                        <p className="text-slate-500 text-base md:text-lg font-medium max-w-lg mx-auto leading-relaxed italic px-4">
                            Aapki success hamari priority hai. Get in touch with our team for any queries.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                        {/* Direct Support */}
                        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 group transition-all hover:border-primary/20">
                            <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 md:mb-8 transition-transform group-hover:scale-110 group-hover:rotate-3">
                                <Mail className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-2">Email Us</h3>
                            <p className="text-slate-400 font-medium mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                                Best for technical queries and plan upgrades. We usually reply within 2 hours.
                            </p>
                            <a href="mailto:replykaro1704@gmail.com" className="block">
                                <Button className="w-full h-12 md:h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs md:text-sm uppercase tracking-widest gap-3 shadow-xl">
                                    replykaro1704@gmail.com
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>

                        {/* Social Support */}
                        <div className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 group transition-all hover:border-indigo-200">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 md:mb-8 transition-transform group-hover:scale-110 group-hover:-rotate-3">
                                <Instagram className="h-7 w-7" />
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mb-2">Instagram DM</h3>
                            <p className="text-slate-400 font-medium mb-6 md:mb-8 leading-relaxed text-sm md:text-base">
                                Join our community and see our own automations in action! 🚀
                            </p>
                            <a href="https://instagram.com/replykaro.ai" target="_blank" rel="noopener noreferrer" className="block">
                                <Button className="w-full h-12 md:h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white font-black text-xs md:text-sm uppercase tracking-widest gap-3 shadow-xl">
                                    @replykaro.ai
                                    <Instagram className="h-4 w-4" />
                                </Button>
                            </a>
                        </div>
                    </div>

                    {/* Trust Banner */}
                    <div className="mt-12 md:mt-20 p-8 md:p-12 bg-slate-900 rounded-[2.5rem] md:rounded-[3.5rem] relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-primary/20 rounded-full blur-[60px] md:blur-[80px] -mr-24 md:-mr-32 -mt-24 md:-mt-32" />
                        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 relative z-10 text-center md:text-left">
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 shrink-0">
                                <Shield className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                            </div>
                            <div>
                                <h4 className="text-xl md:text-2xl font-black text-white tracking-tight">Enterprise & Agency?</h4>
                                <p className="text-slate-400 font-medium mt-1 text-sm md:text-base">If you need custom limits or a dedicated account manager, humein mail kijiye!</p>
                            </div>
                            <div className="md:ml-auto w-full md:w-auto">
                                <Link href="mailto:replykaro1704@gmail.com" className="block w-full md:w-auto">
                                    <Button className="w-full md:w-auto h-12 px-8 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-xl shadow-primary/20">
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
