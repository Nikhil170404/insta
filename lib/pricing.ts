export const PRICING_PLANS = {
    STARTER: {
        name: "Starter Pack",
        price: "299",
        upfront: "899",
        duration: "3 Months",
        description: "Perfect for budding creators",
        hindiDesc: "Chhote creators ke liye perfect",
        features: [
            "1 Instagram Account",
            "10 Active Automations",
            "200 DMs per day",
            "⚡ DMs sent within 30 seconds",
            "Email Support (48h)",
        ],
        cta: "Get Starter Pack",
        popular: false,
        savings: "Save ₹100+",
        badge: "Most Affordable"
    },
    GROWTH: {
        name: "Growth Pack",
        price: "699",
        upfront: "1,999",
        duration: "3 Months",
        description: "Best for growing creators",
        hindiDesc: "Growing creators ke liye best",
        features: [
            "1 Instagram Account",
            "25 Active Automations",
            "1,000 DMs per day",
            "⚡ Real-time processing",
            "Story Automation",
            "Priority Support (12h)",
        ],
        cta: "Get Growth Pack",
        popular: true,
        savings: "Save ₹300+",
        badge: "Best Seller"
    },
    PRO: {
        name: "Pro Pack",
        price: "1,299",
        upfront: "3,499",
        duration: "3 Months",
        description: "Established creators & agencies",
        hindiDesc: "Agencies aur Pro creators ke liye",
        features: [
            "3 Instagram Accounts",
            "Unlimited Automations",
            "5,000 DMs per day",
            "1 LAKH comments handled daily 💪",
            "Dedicated Support Manager",
            "Phone Support",
        ],
        cta: "Go Pro Unlimited",
        popular: false,
        savings: "Save ₹600+",
        badge: "Agency Choice"
    }
};

export const PLANS_ARRAY = Object.values(PRICING_PLANS);
