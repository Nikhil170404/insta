export const PRICING_PLANS = {
    STARTER: {
        name: "Starter Pack",
        price: "133",
        upfront: "399",
        duration: "3 Months",
        description: "Perfect for budding creators",
        hindiDesc: "Chhote creators ke liye perfect",
        features: [
            "1 Instagram Account",
            "10 Active Automations",
            "500 DMs per day",
            "5,000 comments handled daily",
            "Email Support (48h)",
        ],
        cta: "Start ₹399 Pack",
        popular: false,
        savings: "₹48 bachao!",
        badge: "🔥 Most Popular"
    },
    GROWTH: {
        name: "Growth Pack",
        price: "266",
        upfront: "799",
        duration: "3 Months",
        description: "Best for growing creators",
        hindiDesc: "Growing creators ke liye best",
        features: [
            "2 Instagram Accounts",
            "25 Active Automations",
            "2,000 DMs per day",
            "25,000 comments handled daily",
            "Story Automation",
            "Priority Support (12h)",
        ],
        cta: "Start ₹799 Pack",
        popular: true,
        savings: "₹98 bachao!",
        badge: "⚡ Best Value"
    },
    PRO: {
        name: "Pro Pack",
        price: "500",
        upfront: "1,499",
        duration: "3 Months",
        description: "Established creators & agencies",
        hindiDesc: "Established creators ke liye",
        features: [
            "5 Instagram Accounts",
            "Unlimited Automations",
            "10,000 DMs per day",
            "1 LAKH comments handled daily 💪",
            "All Growth Features",
            "Dedicated Support Manager",
            "Phone Support",
        ],
        cta: "Start ₹1,499 Pack",
        popular: false,
        savings: "₹298 bachao!",
        badge: "👑 Enterprise"
    }
};

export const PLANS_ARRAY = Object.values(PRICING_PLANS);
