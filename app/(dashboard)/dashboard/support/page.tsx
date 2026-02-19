"use client";

import { Mail, Instagram, HelpCircle, ChevronDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { cn } from "@/lib/utils";

const FAQS = [
    {
        question: "How do I connect my Instagram account?",
        answer: "Go to the 'Settings' tab in the sidebar and click 'Connect Account'. Make sure you have an Instagram Business or Creator account connected to a Facebook Page. This is required by Meta's API."
    },
    {
        question: "Why aren't my DMs sending?",
        answer: "First, check your 'Logs' page for errors. Common reasons include: 1) Permissions missing (reconnect your account), 2) Rate limits reached (wait a few hours), or 3) The user has privacy settings that block DMs."
    },
    {
        question: "Is using ReplyKaro safe for my account?",
        answer: "Yes! We use the official Instagram Graph API approved by Meta. We don't ask for your password and we strictly follow all safety guidelines. Your account is 100% secure with us."
    },
    {
        question: "How does the billing & refund policy work?",
        answer: "We offer a Free Forever plan to test everything. Paid plans are billed monthly. You can cancel anytime from the 'Billing' tab. Since we offer a free tier, we have a strict no-refund policy for partial months."
    },
    {
        question: "Can I use this for multiple accounts?",
        answer: "Currently, each ReplyKaro subscription is linked to one Instagram account. To manage multiple accounts, you'll need to create separate workspaces or contact our support for an Agency Plan."
    }
];

export default function SupportPage() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20">
            {/* Header */}
            <div className="text-center space-y-4 max-w-2xl mx-auto px-4">
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4 mx-auto">
                    Help Center
                </Badge>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                    How can we help?
                </h1>
                <p className="text-slate-500 font-medium text-lg leading-relaxed">
                    Need assistance with your automations? Our team is ready to help you scale.
                </p>
            </div>

            {/* Contact Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                {/* Email Support */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-slate-200 transition-all duration-300 group">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Mail className="h-7 w-7 text-blue-600" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Email Support</h3>
                        <p className="text-slate-500 font-medium leading-relaxed text-sm">
                            For technical issues, billing inquiries, or general questions. We typically respond within 24-48 hours.
                        </p>
                        <a href="mailto:replykaro1704@gmail.com" className="inline-block">
                            <Button className="h-12 rounded-xl bg-slate-900 text-white font-bold px-6 gap-2 hover:bg-slate-800 shadow-lg shadow-slate-200">
                                <Mail className="h-4 w-4" /> replykaro1704@gmail.com
                            </Button>
                        </a>
                    </div>
                </div>

                {/* Instagram Direct */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 hover:border-slate-200 transition-all duration-300 group">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-pink-500/20">
                        <Instagram className="h-7 w-7 text-white" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Instagram DM</h3>
                        <p className="text-slate-500 font-medium leading-relaxed text-sm">
                            Slide into our DMs for quick questions or just to say hi. We love hearing from our community!
                        </p>
                        <a href="https://instagram.com/replykaro.ai" target="_blank" rel="noopener noreferrer" className="inline-block">
                            <Button className="h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-6 gap-2 hover:opacity-90 shadow-lg shadow-pink-500/20">
                                <Instagram className="h-4 w-4" /> @replykaro.ai
                            </Button>
                        </a>
                    </div>
                </div>
            </div>

            {/* General FAQ / Info Area */}
            <div className="max-w-3xl mx-auto px-4">
                <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                            <HelpCircle className="h-6 w-6 text-slate-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Common Topics</h3>
                    </div>

                    <div className="space-y-4">
                        {FAQS.map((faq, index) => (
                            <div
                                key={index}
                                className={cn(
                                    "bg-white rounded-2xl border border-slate-100 overflow-hidden transition-all duration-300",
                                    openIndex === index ? "shadow-md ring-1 ring-primary/5" : "hover:border-slate-200"
                                )}
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <span className="font-bold text-slate-700 text-sm">{faq.question}</span>
                                    <ChevronDown className={cn(
                                        "h-4 w-4 text-slate-300 transition-transform duration-300",
                                        openIndex === index && "rotate-180 text-primary"
                                    )} />
                                </button>

                                <div className={cn(
                                    "px-5 pb-5 text-sm text-slate-500 font-medium leading-relaxed transition-all duration-300",
                                    openIndex === index ? "block opacity-100" : "hidden opacity-0"
                                )}>
                                    <div className="pt-2 border-t border-slate-50 mt-2">
                                        {faq.answer}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
