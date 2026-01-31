"use client";

import Link from "next/link";
import {
    CheckCircle2,
    ShieldCheck,
    ArrowLeft,
    HandMetal
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DeletionStatusPage() {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full blur-[100px] -mr-[20rem] -mt-[20rem]" />
            <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-primary/5 rounded-full blur-[100px] -ml-[20rem] -mb-[20rem]" />

            <div className="max-w-lg w-full bg-white p-12 md:p-16 rounded-[3.5rem] border border-slate-100 shadow-2xl relative z-10 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>

                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter mb-4 leading-tight">
                    Data Deleted <br />
                    <span className="text-emerald-500">Successfully.</span>
                </h1>

                <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                    Aapka account data permanently remove kar diya gaya hai. Humne meta policies aur GDPR ke hisab se saari information wipe kar di hai.
                </p>

                <div className="space-y-4">
                    <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4 text-left border border-slate-100">
                        <ShieldCheck className="h-6 w-6 text-slate-400" />
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider uppercase leading-tight">
                            Compliance Check: Meta Data Protection Verified
                        </p>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-50">
                    <Link href="/">
                        <Button className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm uppercase tracking-widest gap-3 shadow-xl shadow-slate-200 transition-all active:scale-95">
                            <ArrowLeft className="h-4 w-4" />
                            Vapas Home jayein
                        </Button>
                    </Link>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-slate-300 font-black italic tracking-tighter">
                    <HandMetal className="h-5 w-5" /> Phir milenge!
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-12 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
                ReplyKaro Engine &bull; Privacy Security System
            </div>
        </div>
    );
}
