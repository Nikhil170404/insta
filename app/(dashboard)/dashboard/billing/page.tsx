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
    Star,
    RefreshCw,
    CreditCard,
    Loader2,
    HelpCircle,
    ShieldAlert
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
    const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
    const [userData, setUserData] = useState<any>(null);
    const [cancelling, setCancelling] = useState(false);

    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // Fetch data
    useEffect(() => {
        // Fetch User Session
        fetch("/api/auth/session")
            .then(res => res.json())
            .then(data => {
                if (data?.user) {
                    setUserData(data.user);
                    if (data.user.plan_type) {
                        const type = data.user.plan_type.toLowerCase();
                        if (type === "starter") setCurrentPlan("Starter Pack");
                        else if (type === "pro") setCurrentPlan("Pro Pack");
                        else setCurrentPlan("Free Starter");
                    }
                }
            })
            .catch(err => console.error("Failed to fetch plan:", err));

        // Fetch Payment History (Initial)
        fetchHistory(1);
    }, []);

    const fetchHistory = (pageNum: number) => {
        setLoadingHistory(pageNum === 1);
        fetch(`/api/payments/razorpay/history?page=${pageNum}&limit=5`)
            .then(res => res.json())
            .then(data => {
                if (data?.payments) {
                    if (pageNum === 1) setPaymentHistory(data.payments);
                    else setPaymentHistory(prev => [...prev, ...data.payments]);

                    if (data.pagination) {
                        setHasMore(data.pagination.page < data.pagination.totalPages);
                    }
                    setPage(pageNum);
                }
                setLoadingHistory(false);
            })
            .catch(err => {
                console.error("Failed to fetch history:", err);
                setLoadingHistory(false);
            });
    };

    const handleCancelSubscription = async () => {
        if (!confirm("Are you sure you want to cancel? You will lose access at the end of the billing cycle.")) return;

        setCancelling(true);
        try {
            const res = await fetch("/api/payments/razorpay/subscription/cancel", { method: "POST" });
            const data = await res.json();

            if (data.success) {
                toast.success("Subscription cancelled successfully.");
                window.location.reload();
            } else {
                throw new Error(data.error || "Cancellation failed");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setCancelling(false);
        }
    };

    function getStatusBadge(status: string) {
        switch (status?.toLowerCase()) {
            case 'refunded': return <Badge className="bg-blue-100 text-blue-700 border-none px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Refunded</Badge>;
            case 'failed': return <Badge className="bg-rose-100 text-rose-700 border-none px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">Failed</Badge>;
            default: return <Badge className="bg-slate-100 text-slate-700 border-none px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">{status}</Badge>;
        }
    }

    const handlePayment = async (plan: any) => {
        // [Existing handlePayment code - keeping it same]
        if (plan.name === currentPlan) {
            toast.info("Yeh aapka current plan hai!");
            return;
        }

        console.log("Initializing subscription for plan:", plan.name, billingInterval);
        try {
            setLoadingPlan(plan.name);

            const planId = billingInterval === "yearly" ? plan.yearlyPlanId : plan.monthlyPlanId;
            if (!planId) {
                toast.error("Plan details unavailable for this interval");
                return;
            }

            // Check for upgrade (Active Subscription)
            const isUpgrade = ["active", "created", "authenticated"].includes(userData?.subscription_status);

            if (isUpgrade) {
                const response = await fetch("/api/payments/razorpay/subscription/change", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        newPlanId: planId
                    }),
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || "Upgrade failed");
                }

                toast.success("Plan upgraded successfully! Your benefits are active immediately.");
                setTimeout(() => window.location.reload(), 1500);
                return;
            }

            // Create New Subscription (if no active plan)
            const response = await fetch("/api/payments/razorpay/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    planId: planId
                }),
            });

            if (response.status === 401) {
                toast.error("Session expired. Please sign in again.");
                router.push("/signin");
                return;
            }

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                subscription_id: data.subscriptionId,
                name: "ReplyKaro",
                description: `Upgrade to ${plan.name} (${billingInterval})`,
                image: "/logo.png",
                handler: async function (response: any) {
                    try {
                        const verifyRes = await fetch("/api/payments/razorpay/subscription/verify", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_subscription_id: response.razorpay_subscription_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        if (verifyRes.ok) {
                            toast.success("Payment Verified! plan upgraded.");
                            router.refresh();
                            setTimeout(() => window.location.reload(), 1000);
                        } else {
                            toast.error("Verification failed, but don't worry. Your plan will activate shortly.");
                        }
                    } catch (err) {
                        console.error("Verification fetch error", err);
                        toast.error("Verification error. Please check status later.");
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
            <div className="text-center space-y-4 max-w-3xl mx-auto px-4">
                <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4 mx-auto">
                    Manage Subscription
                </Badge>
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-tight">
                    Billing & Plans
                </h1>

                {(["active", "cancelled"].includes(userData?.subscription_status || "") || ["starter", "pro"].includes(userData?.plan_type?.toLowerCase() || "")) ? (
                    <div className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-8 md:p-10 max-w-3xl mx-auto mt-10 shadow-2xl shadow-slate-200/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="h-16 w-16 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-xl rotate-3">
                                    <Crown className="h-8 w-8" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em] mb-1">
                                        {userData?.subscription_status === "cancelled" ? "Cancelled Membership" : "Active Membership"}
                                    </p>
                                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">{currentPlan}</h3>
                                </div>
                            </div>
                            <div className="flex flex-col items-end">
                                {userData?.subscription_status === "cancelled" ? (
                                    <Badge className="bg-rose-50 text-rose-500 border-2 border-rose-100 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest mb-2 text-center">Pending Cancellation</Badge>
                                ) : (
                                    <Badge className="bg-emerald-50 text-emerald-600 border-2 border-emerald-100 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest mb-2">Verified Active</Badge>
                                )}
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {userData?.subscription_status === "cancelled" ? "Access will be revoked on expiry" : "Next billing cycle sync active"}
                                </p>
                            </div>
                        </div>

                        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <RefreshCw className="h-3 w-3 text-emerald-400" /> Subscription Status
                                </p>
                                <div className="flex items-center gap-2">
                                    {userData?.subscription_status === "cancelled" ? (
                                        <>
                                            <div className="h-2 w-2 rounded-full bg-rose-400" />
                                            <span className="font-black text-slate-700 tracking-tight text-sm">Finishing Cycle</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981] animate-pulse" />
                                            <span className="font-black text-slate-700 tracking-tight">Active & Healthy</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <ShieldCheck className="h-3 w-3 text-primary" /> Cycle Refresh
                                </p>
                                <span className="font-black text-slate-700 tracking-tight">
                                    {userData?.plan_expires_at ? new Date(userData.plan_expires_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : "Manual Refresh"}
                                </span>
                            </div>
                        </div>

                        <div className="mt-8 flex flex-col gap-4">
                            {userData?.subscription_status !== "cancelled" && (
                                <div className="space-y-4">
                                    <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4 flex gap-3 items-start">
                                        <div className="p-2 bg-rose-100/50 rounded-xl text-rose-500 mt-0.5">
                                            <ShieldAlert className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black text-rose-600 uppercase tracking-widest leading-none mb-1.5">No-Refund Policy</p>
                                            <p className="text-[10px] text-rose-500/80 font-bold leading-relaxed">
                                                Cancellations are effective at the end of the current cycle. We do not provide refunds for any unused time or partial periods.
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={handleCancelSubscription}
                                        disabled={cancelling}
                                        className="w-full h-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-100 hover:bg-rose-50/10 font-black text-[10px] uppercase tracking-[0.2em] transition-all"
                                    >
                                        {cancelling ? "Processing..." : "Cancel Subscription"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-6 mt-10">
                        <p className="text-slate-500 text-lg font-medium leading-relaxed">
                            {userData?.plan_type === 'expired'
                                ? "Oops! Your plan has expired. Re-energize your system to resume automation."
                                : "You are currently exploring ReplyKaro. Upgrade to a power-node to unlock full automation potential."}
                        </p>
                        <div className="flex justify-center flex-wrap gap-4">
                            <Badge className="bg-slate-100 text-slate-600 border-none px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest">
                                Status: {userData?.plan_type?.toUpperCase() || "TRIAL"}
                            </Badge>
                            {userData?.plan_expires_at && (
                                <Badge className="bg-rose-50 text-rose-500 border-none px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest">
                                    Reset at: {new Date(userData?.plan_expires_at).toLocaleDateString()}
                                </Badge>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-8 relative z-10">
                <div className="bg-white p-1.5 rounded-full border border-slate-100 flex items-center shadow-lg shadow-slate-200/50">
                    <button
                        onClick={() => setBillingInterval("monthly")}
                        className={cn(
                            "px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300",
                            billingInterval === "monthly"
                                ? "bg-slate-900 text-white shadow-md"
                                : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBillingInterval("yearly")}
                        className={cn(
                            "px-6 py-2.5 rounded-full text-sm font-black transition-all duration-300 flex items-center gap-2",
                            billingInterval === "yearly"
                                ? "bg-primary text-white shadow-md shadow-primary/20"
                                : "text-slate-500 hover:text-slate-900"
                        )}
                    >
                        Yearly
                        <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 border-none text-[9px] px-1.5 py-0">
                            -16%
                        </Badge>
                    </button>
                </div>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-4 max-w-7xl mx-auto">
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
                                            {plan.price === "0"
                                                ? "FREE"
                                                : billingInterval === "yearly" && plan.yearlyPrice
                                                    ? `₹${Math.round(parseInt(plan.yearlyPrice) / 12)}` // Show effective monthly price
                                                    : `₹${plan.price}`
                                            }
                                        </span>
                                        {plan.price !== "0" && (
                                            <span className="text-slate-400 font-bold text-sm">/ mo</span>
                                        )}
                                    </div>
                                    {billingInterval === "yearly" && plan.yearlyPrice && (
                                        <div className="text-xs font-bold text-slate-400 mt-1">
                                            Billed ₹{plan.yearlyPrice} yearly
                                        </div>
                                    )}
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
                                {plan.name !== "Free Starter" && (
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
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Payment History Section */}
            <div className="max-w-7xl mx-auto px-4 pt-10">
                <div className="bg-white rounded-[2.5rem] border-2 border-slate-50 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Payment History</h2>
                            <p className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-widest">Your recent signals & transactions</p>
                        </div>
                        <CreditCard className="h-6 w-6 text-slate-200" />
                    </div>

                    <div className="overflow-x-auto overflow-y-hidden">
                        {loadingHistory && page === 1 ? (
                            <div className="p-20 flex flex-col items-center justify-center space-y-4">
                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Syncing History Data...</p>
                            </div>
                        ) : paymentHistory.length === 0 ? (
                            <div className="p-20 flex flex-col items-center justify-center text-center">
                                <div className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center mb-4">
                                    <HelpCircle className="h-8 w-8 text-slate-200" />
                                </div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">No signals detected</h3>
                                <p className="text-xs font-bold text-slate-400 max-w-xs mt-1 uppercase tracking-wider leading-relaxed">Upgrade your plan to see your first transactions here.</p>
                            </div>
                        ) : (
                            <>
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Signal Date</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment ID</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                            <th className="px-8 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {paymentHistory.map((payment: any) => (
                                            <tr key={payment.id} className="hover:bg-slate-50/30 transition-colors group">
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <p className="font-black text-slate-900 text-sm italic tracking-tight">{new Date(payment.created_at).toLocaleDateString()}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(payment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <code className="text-[10px] bg-slate-100/80 text-slate-600 px-3 py-1.5 rounded-xl font-mono border border-slate-200/50">
                                                        {payment.razorpay_payment_id}
                                                    </code>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    <p className="font-black text-slate-900 tracking-tight text-base">₹{payment.amount / 100}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{payment.currency}</p>
                                                </td>
                                                <td className="px-8 py-6 whitespace-nowrap">
                                                    {getStatusBadge(payment.status)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {hasMore && (
                                    <div className="p-4 flex justify-center border-t border-slate-50">
                                        <Button
                                            variant="ghost"
                                            onClick={() => fetchHistory(page + 1)}
                                            className="text-xs font-bold text-slate-500 hover:text-primary uppercase tracking-wider"
                                            disabled={loadingHistory}
                                        >
                                            {loadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load More Activity"}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
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
