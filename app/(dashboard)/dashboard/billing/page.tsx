"use client";

import { useState, useEffect } from "react";
import {
    Check,
    ArrowRight,
    Sparkles,
    Rocket,
    ShieldCheck,
    Gift,
    Coffee,
    Flame,
    Crown,
    Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Script from "next/script";

import { PLANS_ARRAY } from "@/lib/pricing";

export default function BillingPage() {
    const router = useRouter();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string>("Free Starter");
    const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

    // Fetch user's current plan on mount
    useEffect(() => {
        fetch("/api/auth/session")
            .then(res => res.json())
            .then(data => {
                if (data?.user?.plan_type) {
                    const type = data.user.plan_type.toLowerCase();
                    if (type === "starter") setCurrentPlan("Starter Pack");
                    else if (type === "growth") setCurrentPlan("Growth Pack");
                    else if (type === "pro") setCurrentPlan("Pro Pack");
                    else setCurrentPlan("Free Starter");
                }
            })
            .catch(err => console.error("Failed to fetch plan:", err));
    }, []);

    const handlePayment = async (plan: any) => {
        if (plan.name === currentPlan) {
            toast.info("Yeh aapka current plan hai!");
            return;
        }

        console.log("Initializing payment from dashboard for plan:", plan.name);
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
                toast.error("Session expired. Please sign in again.");
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
                            toast.success("Payment Successful! Plan upgraded.");
                            // Update local state immediately before refresh
                            setCurrentPlan(plan.name);
                            router.refresh();
                        } else {
                            throw new Error(result.error || "Verification failed");
                        }
                    } catch (err: any) {
                        toast.error(err.message || "Payment verification failed");
                    }
                },
                prefill: { name: "", email: "", contact: "" },
                theme: { color: "#000000" },
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                console.error("Payment failed:", response.error);
                toast.error("Payment failed: " + response.error.description);
            });
            rzp.open();

        } catch (error: any) {
            console.error("Payment error:", error);
            toast.error(error.message || "Payment initialization failed");
        } finally {
            setLoadingPlan(null);
        }
    };

    function getPlanIcon(name: string) {
        switch (name) {
            case "Free Starter": return <Gift className="h-6 w-6 text-emerald-600" />;
            case "Starter Pack": return <Coffee className="h-6 w-6 text-amber-600" />;
            case "Growth Pack": return <Flame className="h-6 w-6 text-blue-600" />;
            case "Pro Pack": return <Crown className="h-6 w-6 text-purple-600" />;
            default: return <Star className="h-6 w-6 text-slate-600" />;
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-12 pb-20">
            <Script
                id="razorpay-checkout-js-billing"
                src="https://checkout.razorpay.com/v1/checkout.js"
            />

            {/* Header */}
            <div className="text-center space-y-4 max-w-3xl mx-auto">
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4 mx-auto">
                    70% Cheaper than ManyChat 🚀
                </Badge>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                    Upgrade Your Plan
                </h1>
                <p className="text-slate-500 text-lg font-medium leading-relaxed">
                    Same features as ManyChat. Indian pricing. Sabki pahunch mein automation!
                </p>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4">
                {PLANS_ARRAY.map((plan) => {
                    const isCurrentPlan = plan.name === currentPlan;

                    return (
                        <div
                            key={plan.name}
                            className={cn(
                                "relative flex flex-col p-6 bg-white rounded-[2.5rem] border transition-all duration-500 group overflow-hidden",
                                isCurrentPlan
                                    ? "border-emerald-500 ring-4 ring-emerald-500/10 shadow-xl"
                                    : plan.popular
                                        ? "border-primary/20 shadow-[0_32px_64px_-16px_rgba(var(--primary-rgb),0.1)] scale-105 z-10"
                                        : "border-slate-100 hover:border-slate-200 hover:shadow-xl"
                            )}
                        >
                            {plan.badge && !isCurrentPlan && (
                                <div className="absolute top-5 right-5">
                                    <Badge className={cn(
                                        "border-none font-black text-[9px] px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg",
                                        plan.popular ? "bg-primary text-white shadow-primary/20"
                                            : "bg-slate-900 text-white shadow-slate-900/10"
                                    )}>
                                        {plan.badge}
                                    </Badge>
                                </div>
                            )}

                            {isCurrentPlan && (
                                <div className="absolute top-5 right-5">
                                    <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] px-2 py-1 rounded-lg uppercase tracking-widest">
                                        Active Plan
                                    </Badge>
                                </div>
                            )}

                            <div className="space-y-5 flex-1">
                                <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 duration-500",
                                    isCurrentPlan ? "bg-emerald-100" : plan.popular ? "bg-primary/10" : "bg-slate-50"
                                )}>
                                    {getPlanIcon(plan.name)}
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                                    <p className="text-xs font-medium text-slate-400 mt-1">{plan.description}</p>
                                </div>

                                <div className="py-2">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900 tracking-tighter">
                                            {plan.price === "0" ? "FREE" : `₹${plan.upfront}`}
                                        </span>
                                        {plan.price !== "0" && (
                                            <span className="text-slate-400 font-bold text-sm">/ mo</span>
                                        )}
                                    </div>
                                    {plan.savings && (
                                        <Badge variant="outline" className="mt-2 text-emerald-600 bg-emerald-50 border-emerald-100 font-black text-[9px] rounded-md px-2 py-0.5">
                                            {plan.savings}
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-3 pt-4 border-t border-slate-50">
                                    {plan.features.slice(0, expandedPlan === plan.name ? undefined : 6).map((feature) => (
                                        <div key={feature} className="flex items-start gap-2 group/feat">
                                            <div className="mt-0.5 w-4 h-4 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover/feat:bg-primary/10 transition-colors">
                                                <Check className="h-2.5 w-2.5 text-slate-400 group-hover/feat:text-primary transition-colors" />
                                            </div>
                                            <p className="text-xs font-bold text-slate-600 tracking-tight">{feature}</p>
                                        </div>
                                    ))}

                                    {plan.features.length > 6 && (
                                        <button
                                            onClick={() => setExpandedPlan(expandedPlan === plan.name ? null : plan.name)}
                                            className="text-[10px] font-bold text-primary hover:text-primary/80 pl-6 hover:underline focus:outline-none transition-colors"
                                        >
                                            {expandedPlan === plan.name ? "Show Less" : `+${plan.features.length - 6} more features`}
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6">
                                <Button
                                    onClick={() => handlePayment(plan)}
                                    disabled={loadingPlan === plan.name || isCurrentPlan}
                                    className={cn(
                                        "w-full h-12 rounded-2xl font-black text-xs tracking-tight transition-all duration-300 gap-2 group/btn shadow-lg",
                                        isCurrentPlan
                                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 shadow-none cursor-default opacity-100"
                                            : plan.popular
                                                ? "bg-primary text-white hover:bg-primary/90 shadow-primary/20"
                                                : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-200"
                                    )}
                                >
                                    {isCurrentPlan
                                        ? "Current Plan"
                                        : loadingPlan === plan.name
                                            ? "Processing..."
                                            : plan.cta}
                                    {!isCurrentPlan && <ArrowRight className="h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />}
                                </Button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Trust Badges */}
            <div className="pt-16 border-t border-slate-100 flex flex-wrap justify-center gap-12 md:gap-24 opacity-40 grayscale hover:grayscale-0 transition-all duration-700">
                <div className="flex items-center gap-2 font-black text-slate-900 italic tracking-tighter text-lg">
                    <ShieldCheck className="h-5 w-5" /> Meta Verified
                </div>
                <div className="flex items-center gap-2 font-black text-slate-900 italic tracking-tighter text-lg">
                    <Rocket className="h-5 w-5" /> Fast Launch
                </div>
                <div className="flex items-center gap-2 font-black text-slate-900 italic tracking-tighter text-lg">
                    <Sparkles className="h-5 w-5" /> 100% Secure
                </div>
            </div>
        </div>
    );
}
