"use client";

import Link from "next/link";
import {
    ArrowRight,
    Check,
    Gift,
    Coffee,
    Flame,
    Crown,
    Zap,
    Rocket,
    ShieldCheck,
    Sparkles,
    Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PLANS_ARRAY } from "@/lib/pricing";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Script from "next/script";

export default function PricingPage() {
    const router = useRouter();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    // Check if user is logged in and redirect to billing page
    useEffect(() => {
        fetch("/api/auth/session")
            .then((res) => res.json())
            .then((data) => {
                if (data.user) {
                    setIsLoggedIn(true);
                    router.push("/dashboard/billing");
                } else {
                    setIsLoggedIn(false);
                }
            })
            .catch(() => setIsLoggedIn(false));
    }, [router]);

    const handlePayment = async (plan: any) => {
        // FREE plan - redirect to signin
        if (plan.price === "0") {
            router.push("/signin");
            return;
        }

        console.log("Initializing payment for plan:", plan.name);
        try {
            setLoadingPlan(plan.name);

            const response = await fetch("/api/payments/razorpay/order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: parseInt(plan.upfront.replace(/,/g, "")),
                    planId: plan.name
                }),
            });

            if (response.status === 401) {
                console.log("Unauthorized: Redirecting to signin");
                toast.error("Humein pehle Sign In karna hoga");
                router.push("/signin");
                return;
            }

            const order = await response.json();
            if (order.error) throw new Error(order.error);

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "ReplyKaro",
                description: `Upgrade to ${plan.name}`,
                image: "/logo.png",
                order_id: order.id,
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch("/api/payments/razorpay/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                amount: parseInt(plan.upfront.replace(/,/g, ""))
                            }),
                        });

                        const result = await verifyRes.json();
                        if (result.success) {
                            toast.success("Payment Successful! Aapka plan update ho gaya hai.");
                            router.push("/dashboard");
                        } else {
                            throw new Error(result.error || "Verification failed");
                        }
                    } catch (err: any) {
                        toast.error(err.message || "Payment verification fail ho gaya");
                    }
                },
                prefill: { name: "", email: "", contact: "" },
                theme: { color: "#000000" },
            };

            console.log("Opening Razorpay modal...");
            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                console.error("Payment failed event:", response.error);
                toast.error("Payment fail ho gaya: " + response.error.description);
            });
            rzp.open();

        } catch (error: any) {
            console.error("Payment error:", error);
            toast.error(error.message || "Payment initialize nahi ho paaya");
        } finally {
            setLoadingPlan(null);
        }
    };

    const getPlanIcon = (name: string) => {
        switch (name) {
            case "Free Starter": return <Gift className="h-7 w-7 text-emerald-500" />;
            case "Starter Pack": return <Coffee className="h-7 w-7 text-orange-400" />;
            case "Growth Pack": return <Flame className="h-7 w-7 text-primary" />;
            case "Pro Pack": return <Crown className="h-7 w-7 text-yellow-500" />;
            default: return <Star className="h-7 w-7" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-primary selection:text-white">
            <Script
                id="razorpay-checkout-js"
                src="https://checkout.razorpay.com/v1/checkout.js"
            />

            <main className="flex-1 container mx-auto px-4 pt-48 pb-16 relative">
                {/* Background */}
                <div className="absolute top-0 right-0 w-[50rem] h-[50rem] bg-primary/5 rounded-full blur-[120px] -mr-[25rem] -mt-[20rem] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[100px] -ml-[20rem] -mb-[10rem] pointer-events-none" />

                {/* Header */}
                <div className="text-center space-y-6 max-w-4xl mx-auto mb-12 relative z-10 px-4">
                    <div className="inline-flex items-center gap-4 px-6 py-3 bg-white border border-slate-50 rounded-full mb-4 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.1)]">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                            <Gift className="h-4 w-4 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Start FREE Forever 🎁</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-[900] text-slate-900 tracking-tighter leading-[0.85]">
                        70% cheaper than <br />
                        <span className="text-primary italic">ManyChat.</span>
                    </h1>
                    <p className="text-slate-400 text-lg md:text-xl font-bold leading-relaxed max-w-2xl mx-auto italic">
                        Same features. Indian pricing. Sabki pahunch mein automation.
                    </p>
                </div>

                {/* Comparison Banner */}
                <div className="max-w-4xl mx-auto mb-16 bg-gradient-to-r from-slate-900 to-slate-800 rounded-[2rem] p-6 md:p-8 relative z-10">
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">ManyChat</p>
                            <p className="text-white text-2xl font-black line-through opacity-50">₹1,250/mo</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">SuperProfile</p>
                            <p className="text-white text-2xl font-black line-through opacity-50">₹499/mo</p>
                        </div>
                        <div>
                            <p className="text-primary text-[10px] font-black uppercase tracking-widest mb-2">ReplyKaro 🚀</p>
                            <p className="text-primary text-2xl font-black">₹99/mo</p>
                        </div>
                    </div>
                </div>

                {/* Pricing Grid - 4 columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10 px-4 max-w-7xl mx-auto">
                    {PLANS_ARRAY.map((plan) => (
                        <div
                            key={plan.name}
                            className={cn(
                                "relative flex flex-col p-6 md:p-8 bg-white rounded-[2.5rem] border transition-all duration-500 group overflow-hidden",
                                plan.popular
                                    ? "border-primary/20 shadow-[0_40px_80px_-20px_rgba(var(--primary-rgb),0.15)] scale-105 z-10"
                                    : plan.name === "Free Starter"
                                        ? "border-emerald-200 bg-gradient-to-b from-emerald-50/50 to-white"
                                        : "border-slate-100 hover:border-slate-200 hover:shadow-2xl shadow-slate-200/50"
                            )}
                        >
                            {plan.badge && (
                                <div className="absolute top-6 right-6">
                                    <Badge className={cn(
                                        "border-none font-black text-[9px] px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg",
                                        plan.popular ? "bg-primary text-white shadow-primary/20"
                                            : plan.name === "Free Starter" ? "bg-emerald-500 text-white"
                                                : "bg-slate-900 text-white shadow-slate-900/10"
                                    )}>
                                        {plan.badge}
                                    </Badge>
                                </div>
                            )}

                            <div className="space-y-6 flex-1">
                                <div className={cn(
                                    "w-14 h-14 rounded-[1.5rem] flex items-center justify-center mb-4 transition-all group-hover:scale-110 duration-700 group-hover:rotate-6 shadow-sm",
                                    plan.popular ? "bg-primary/10" : plan.name === "Free Starter" ? "bg-emerald-100" : "bg-slate-50"
                                )}>
                                    {getPlanIcon(plan.name)}
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                                    <p className="text-xs font-bold text-slate-400 mt-1">{plan.description}</p>
                                    <p className="text-[10px] font-black text-primary/60 uppercase mt-1 tracking-widest italic">{plan.hindiDesc}</p>
                                </div>

                                <div className="py-2">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black text-slate-900 tracking-tighter">
                                            {plan.price === "0" ? "FREE" : `₹${plan.upfront}`}
                                        </span>
                                        {plan.price !== "0" && (
                                            <span className="text-slate-400 font-bold text-sm">/ mo</span>
                                        )}
                                    </div>
                                    {plan.savings && (
                                        <Badge variant="outline" className="mt-2 text-emerald-600 bg-emerald-50 border-emerald-100 font-black text-[9px] rounded-lg px-2 py-0.5 uppercase tracking-tight">
                                            {plan.savings}
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-50">
                                    {plan.features.slice(0, expandedPlan === plan.name ? undefined : 6).map((feature) => (
                                        <div key={feature} className="flex items-start gap-3 group/feat">
                                            <div className="mt-0.5 w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover/feat:bg-primary/10 transition-all duration-300">
                                                <Check className="h-3 w-3 text-slate-400 group-hover/feat:text-primary transition-colors" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 tracking-tight leading-snug">{feature}</p>
                                        </div>
                                    ))}
                                    {plan.features.length > 6 && (
                                        <button
                                            onClick={() => setExpandedPlan(expandedPlan === plan.name ? null : plan.name)}
                                            className="text-[10px] font-bold text-primary hover:text-primary/80 pl-8 hover:underline focus:outline-none transition-colors"
                                        >
                                            {expandedPlan === plan.name ? "Show Less" : `+${plan.features.length - 6} more...`}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8">
                                <Button
                                    onClick={() => handlePayment(plan)}
                                    disabled={loadingPlan === plan.name}
                                    className={cn(
                                        "w-full h-14 rounded-[1.5rem] font-black text-xs tracking-[0.05em] uppercase transition-all duration-500 gap-3 group/btn shadow-xl active:scale-95",
                                        plan.popular
                                            ? "bg-primary text-white hover:bg-primary/90 shadow-primary/25"
                                            : plan.name === "Free Starter"
                                                ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                                    )}
                                >
                                    {loadingPlan === plan.name ? "Processing..." : plan.cta}
                                    <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-2 transition-transform duration-500" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Trust Badges */}
                <div className="mt-24 pt-16 border-t border-slate-200/60 flex flex-wrap justify-center gap-10 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-1000 relative z-10 px-4">
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <ShieldCheck className="h-7 w-7 text-primary" /> Meta Verified
                    </div>
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <Rocket className="h-7 w-7 text-indigo-600" /> 10,000+ Creators
                    </div>
                    <div className="flex items-center gap-3 font-black text-slate-900 italic tracking-tighter text-xl">
                        <Sparkles className="h-7 w-7 text-primary" /> Made in India 🇮🇳
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-20 text-center relative z-10 px-4">
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.2em] mb-4">
                        No credit card required
                    </p>
                    <Link href="/signin">
                        <Button variant="ghost" className="text-primary font-black text-lg gap-2 hover:bg-primary/5 px-8 h-14 rounded-full">
                            Start FREE Forever <Zap className="h-5 w-5 fill-current" />
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
