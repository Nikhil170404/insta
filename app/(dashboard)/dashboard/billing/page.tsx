"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    CreditCard,
    Check,
    Zap,
    MessageCircle,
    Crown,
    Sparkles,
} from "lucide-react";

const plans = [
    {
        name: "Free Trial",
        price: "₹0",
        period: "7 days",
        features: [
            "Up to 100 DMs/day",
            "3 Active Automations",
            "Basic Analytics",
            "Email Support",
        ],
        current: true,
    },
    {
        name: "Pro",
        price: "₹499",
        period: "/month",
        features: [
            "Unlimited DMs",
            "Unlimited Automations",
            "Advanced Analytics",
            "Priority Support",
            "Custom Keywords",
            "Follow Requirement",
        ],
        recommended: true,
    },
    {
        name: "Business",
        price: "₹999",
        period: "/month",
        features: [
            "Everything in Pro",
            "Multiple Accounts",
            "Team Access",
            "API Access",
            "Dedicated Support",
            "Custom Integrations",
        ],
    },
];

export default function BillingPage() {
    return (
        <div className="space-y-6 pt-16 lg:pt-0">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
                <p className="text-gray-600">Manage your subscription and payments</p>
            </div>

            {/* Current Plan */}
            <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-200">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white rounded-full shadow-sm">
                                <Sparkles className="h-8 w-8 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Free Trial</h2>
                                <p className="text-gray-600">
                                    You&apos;re currently on the free trial plan
                                </p>
                            </div>
                        </div>
                        <Badge className="bg-purple-600 text-white">Active</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Plans */}
            <div className="grid md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                    <Card
                        key={plan.name}
                        className={`relative ${plan.recommended
                                ? "border-2 border-purple-500 shadow-lg"
                                : ""
                            }`}
                    >
                        {plan.recommended && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <Badge className="bg-purple-600 text-white">
                                    <Crown className="h-3 w-3 mr-1" />
                                    Recommended
                                </Badge>
                            </div>
                        )}
                        <CardHeader className="text-center pb-2">
                            <CardTitle>{plan.name}</CardTitle>
                            <div className="mt-2">
                                <span className="text-3xl font-bold">{plan.price}</span>
                                <span className="text-gray-500">{plan.period}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ul className="space-y-2">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2">
                                        <Check className="h-4 w-4 text-green-500" />
                                        <span className="text-sm">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                            <Button
                                className={`w-full ${plan.current
                                        ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                                        : plan.recommended
                                            ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                                            : ""
                                    }`}
                                disabled={plan.current}
                            >
                                {plan.current ? "Current Plan" : "Upgrade"}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Usage Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Usage This Month
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">DMs Sent</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold">0</span>
                                <span className="text-gray-400">/ 100</span>
                            </div>
                            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{ width: "0%" }} />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-500 mb-1">Active Automations</p>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-bold">0</span>
                                <span className="text-gray-400">/ 3</span>
                            </div>
                            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500" style={{ width: "0%" }} />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Payment Methods
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-2">No payment methods added</p>
                        <p className="text-sm text-gray-400 mb-4">
                            Add a payment method to upgrade your plan
                        </p>
                        <Button variant="outline" disabled>
                            Add Payment Method (Coming Soon)
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
