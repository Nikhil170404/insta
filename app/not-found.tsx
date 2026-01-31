"use client";

import Link from "next/link";
import {
    Ghost,
    Home,
    ArrowRight,
    Search,
    LifeBuoy
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[120px] -mr-[25rem] -mt-[25rem] animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] -ml-[20rem] -mb-[20rem]" />

            <div className="max-w-xl w-full text-center relative z-10">
                {/* 404 Icon */}
                <div className="mb-12 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                    <div className="w-32 h-32 bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl mx-auto flex items-center justify-center relative">
                        <Ghost className="h-16 w-16 text-primary animate-bounce" />
                    </div>
                </div>

                <h1 className="text-8xl font-black text-slate-900 tracking-tighter mb-4 leading-none">
                    404
                </h1>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-6">
                    Masta Rasta Bhul Gaye? 🧭
                </h2>
                <p className="text-slate-500 text-lg font-medium leading-relaxed mb-12 italic">
                    The page you're looking for has been automated out of existence (or it never existed). Hum aapki help kar sakte hain!
                </p>

                <div className="grid gap-4">
                    <Link href="/">
                        <Button className="w-full h-16 rounded-[2rem] bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest gap-4 group shadow-xl transition-all active:scale-95">
                            <Home className="h-5 w-5" />
                            Vapas Home jayein
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
                        </Button>
                    </Link>

                    <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <Link href="/contact" className="flex-1">
                            <Button variant="ghost" className="w-full h-14 rounded-2xl border border-slate-100 hover:bg-slate-50 text-slate-600 font-bold gap-3 box-content border-2 px-0">
                                <LifeBuoy className="h-5 w-5 text-primary" />
                                Support Station
                            </Button>
                        </Link>
                        <Link href="/faq" className="flex-1">
                            <Button variant="ghost" className="w-full h-14 rounded-2xl border border-slate-100 hover:bg-slate-50 text-slate-600 font-bold gap-3 box-content border-2 px-0">
                                <Search className="h-5 w-5 text-indigo-500" />
                                Knowledge Base
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                ReplyKaro Engine &bull; System 404
            </div>
        </div>
    );
}
