"use client";

import { useState } from "react";
import { X, Zap, Crown, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentPlan: string;
    limitType: "automations" | "dms" | "accounts";
    currentUsage: number;
    maxAllowed: number;
    nextPlan?: {
        name: string;
        price: string;
        benefits: string[];
    };
}

export default function UpgradeModal({
    isOpen,
    onClose,
    currentPlan,
    limitType,
    currentUsage,
    maxAllowed,
    nextPlan
}: UpgradeModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const getLimitMessage = () => {
        switch (limitType) {
            case "automations":
                return `You've used ${currentUsage}/${maxAllowed} automations`;
            case "dms":
                return `You've sent ${currentUsage.toLocaleString()}/${maxAllowed.toLocaleString()} DMs this month`;
            case "accounts":
                return `You've connected ${currentUsage}/${maxAllowed} accounts`;
            default:
                return "You've reached your plan limit";
        }
    };

    const handleUpgrade = () => {
        setLoading(true);
        router.push("/dashboard/billing");
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-[2rem] max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
                        <Crown className="h-7 w-7 text-white" />
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                    Upgrade Required 🚀
                </h2>
                <p className="text-slate-500 font-medium mb-6">
                    {getLimitMessage()}
                </p>

                {/* Current Plan Badge */}
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mb-6">
                    <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                        <Zap className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Current Plan</p>
                        <p className="text-sm font-bold text-slate-900">{currentPlan}</p>
                    </div>
                </div>

                {/* Next Plan Suggestion */}
                {nextPlan && (
                    <div className="border-2 border-primary/20 bg-primary/5 rounded-2xl p-5 mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-xs text-primary font-black uppercase tracking-widest">Recommended</p>
                                <p className="text-lg font-black text-slate-900">{nextPlan.name}</p>
                            </div>
                            <p className="text-xl font-black text-primary">{nextPlan.price}</p>
                        </div>
                        <ul className="space-y-2">
                            {nextPlan.benefits.map((benefit, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                                    <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                                    <span>{benefit}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* CTA Buttons */}
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 h-12 rounded-xl font-bold border-slate-200"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleUpgrade}
                        disabled={loading}
                        className={cn(
                            "flex-1 h-12 rounded-xl font-black bg-primary text-white hover:opacity-90 gap-2",
                            loading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {loading ? "Loading..." : "View Plans"}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
