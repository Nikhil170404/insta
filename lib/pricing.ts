export const PRICING_PLANS = {
    STARTER: {
        name: "Starter Pack",
        price: "299",
        upfront: "899",
        duration: "3 Months",
        description: "Perfect for budding creators",
        hindiDesc: "Naye creators ke liye perfect",
        features: [
            "1 Instagram Account",
            "10 Active Automations",
            "200 automated responses per day",
            "⚡ Responses within 30 seconds",
            "Email Support (48h)",
        ],
        cta: "Get Started Now",
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
            "1,000 automated responses per day",
            "⚡ Real-time processing",
            "Story Engagement",
            "Priority Support (12h)",
        ],
        cta: "Scale your Reach",
        popular: true,
        savings: "Save ₹300+",
        badge: "Most Popular"
    },
    PRO: {
        name: "Creator Pro",
        price: "1,299",
        upfront: "3,499",
        duration: "3 Months",
        description: "Established creators & agencies",
        hindiDesc: "Teams aur Pro creators ke liye",
        features: [
            "3 Instagram Accounts",
            "Unlimited Automations",
            "5,000 automated responses per day",
            "Handle up to 1 lakh comments daily 💪",
            "Dedicated Support Manager",
            "Phone Support",
        ],
        cta: "Go Pro Unlimited",
        popular: false,
        savings: "Save ₹600+",
        badge: "Creator Choice"
    }
};

export const PLANS_ARRAY = Object.values(PRICING_PLANS);
