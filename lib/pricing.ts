export const PRICING_PLANS = {
    FREE: {
        name: "Free Starter",
        price: "0",
        upfront: "0",
        duration: "Forever",
        description: "Test the waters risk-free",
        hindiDesc: "Bilkul free mein try karo",
        features: [
            "1 Instagram Account",
            "3 Active Automations",
            "1,000 DMs/month",
            "⚡ Up to 200/hour (IG limit)",
            "Queue All Comments ✨",
            "Follow-Gate Feature ✨",
            "Email Support (72h)",
        ],
        limits: {
            accounts: 1,
            automations: 3,
            dmsPerMonth: 1000,
            dmsPerHour: 200, // Instagram API limit per account
            queueEnabled: true,
        },
        cta: "Start Free Forever",
        popular: false,
        savings: null,
        badge: "FREE"
    },

    STARTER: {
        name: "Starter Pack",
        price: "149",
        upfront: "149",
        duration: "Monthly",
        description: "Perfect for growing creators",
        hindiDesc: "Naye creators ke liye perfect",
        features: [
            "1 Instagram Account",
            "5 Active Automations",
            "100,000 DMs/month",
            "⚡ Up to 200/hour",
            "Queue All Comments",
            "Handle Viral Posts 🔥",
            "Story Automation ✨",
            "Follow-Gate Feature ✨",
            "Email Support (48h)",
            "Basic Analytics",
        ],
        limits: {
            accounts: 1,
            automations: 5,
            dmsPerMonth: 100000,
            dmsPerHour: 200,
            queueEnabled: true,
        },
        cta: "Upgrade to Starter",
        popular: false,
        savings: "70% cheaper than ManyChat",
        badge: "Most Affordable"
    },

    GROWTH: {
        name: "Growth Pack",
        price: "299",
        upfront: "299",
        duration: "Monthly",
        description: "Scale your engagement",
        hindiDesc: "Growth creators ke liye",
        features: [
            "3 Instagram Accounts",
            "15 Active Automations",
            "300,000 DMs/month",
            "⚡ 600/hour (3 accounts)",
            "Priority Queue Processing",
            "Handle Multiple Viral Posts 🔥",
            "Story Automation ✨",
            "Follow-Gate Feature ✨",
            "Email Capture 🎯",
            "Advanced Analytics",
            "A/B Testing 🧪",
            "Priority Support (12h)",
        ],
        limits: {
            accounts: 3,
            automations: 15,
            dmsPerMonth: 300000,
            dmsPerHour: 600, // 200 × 3 accounts
            queueEnabled: true,
            priorityQueue: true,
        },
        cta: "Scale to Growth",
        popular: true,
        savings: "40% cheaper than SuperProfile",
        badge: "Most Popular"
    },

    PRO: {
        name: "Pro Pack",
        price: "599",
        upfront: "599",
        duration: "Monthly",
        description: "Enterprise-grade automation",
        hindiDesc: "Pro creators aur teams ke liye",
        features: [
            "10 Instagram Accounts",
            "Unlimited Automations",
            "1,000,000 DMs/month",
            "⚡ 2,000/hour (10 accounts)",
            "Instant Queue Processing",
            "Enterprise Viral Handling 🔥",
            "Multi-Account Load Balancing",
            "All Growth Features",
            "Drip Campaigns 📬",
            "Webhook Integrations 🔗",
            "WhatsApp Coming Soon 💚",
            "Dedicated Support (4h)",
            "Phone Support",
        ],
        limits: {
            accounts: 10,
            automations: 999,
            dmsPerMonth: 1000000,
            dmsPerHour: 2000, // 200 × 10 accounts
            queueEnabled: true,
            priorityQueue: true,
            loadBalancing: true,
        },
        cta: "Go Pro Unlimited",
        popular: false,
        savings: "5x cheaper than ManyChat Pro",
        badge: "Enterprise"
    }
};

export const PLANS_ARRAY = Object.values(PRICING_PLANS);

// Helper to get plan by name
export function getPlanByName(name: string) {
    return Object.values(PRICING_PLANS).find(p => p.name === name);
}

// Helper to get plan by type
export function getPlanByType(type: string) {
    return PRICING_PLANS[type.toUpperCase() as keyof typeof PRICING_PLANS] || PRICING_PLANS.FREE;
}

// Helper to check feature access
export function hasFeature(planType: string, feature: string): boolean {
    const featureMap: Record<string, string[]> = {
        free: ["follow_gate", "basic_automation", "queue"],
        trial: ["follow_gate", "basic_automation", "queue"],
        starter: ["follow_gate", "story_automation", "basic_analytics", "queue", "viral_handling"],
        growth: ["follow_gate", "story_automation", "email_capture", "ab_testing", "advanced_analytics", "queue", "priority_queue", "viral_handling"],
        pro: ["follow_gate", "story_automation", "email_capture", "ab_testing", "drip_campaigns", "webhooks", "advanced_analytics", "queue", "priority_queue", "load_balancing", "viral_handling"],
        paid: ["follow_gate", "story_automation", "email_capture", "ab_testing", "advanced_analytics", "queue", "priority_queue", "viral_handling"],
    };

    return featureMap[planType.toLowerCase()]?.includes(feature) || false;
}

// Get limits for a plan type
export function getPlanLimits(planType: string): {
    accounts: number;
    automations: number;
    dmsPerMonth: number;
    dmsPerHour: number;
    planName: string;
} {
    const planMap: Record<string, typeof PRICING_PLANS.FREE.limits & { planName: string }> = {
        free: { ...PRICING_PLANS.FREE.limits, planName: "Free Starter" },
        trial: { ...PRICING_PLANS.FREE.limits, planName: "Free Trial" },
        starter: { ...PRICING_PLANS.STARTER.limits, planName: "Starter Pack" },
        growth: { ...PRICING_PLANS.GROWTH.limits, planName: "Growth Pack" },
        pro: { ...PRICING_PLANS.PRO.limits, planName: "Pro Pack" },
        paid: { ...PRICING_PLANS.GROWTH.limits, planName: "Paid Plan" }, // Default paid to Growth
    };

    return planMap[planType?.toLowerCase()] || planMap.free;
}

// Check if user can create more automations
export function canCreateAutomation(planType: string, currentCount: number): boolean {
    const limits = getPlanLimits(planType);
    return currentCount < limits.automations;
}

// Check if user can send more DMs this month
export function canSendDM(planType: string, currentMonthCount: number): boolean {
    const limits = getPlanLimits(planType);
    return currentMonthCount < limits.dmsPerMonth;
}

// Get upgrade suggestion based on current plan
export function getUpgradeSuggestion(planType: string): {
    nextPlan: string;
    nextPlanPrice: string;
    benefits: string[];
} | null {
    const upgrades: Record<string, { nextPlan: string; nextPlanPrice: string; benefits: string[] }> = {
        free: {
            nextPlan: "Starter Pack",
            nextPlanPrice: "₹149/month",
            benefits: ["5 Automations", "100,000 DMs/month", "Story Automation", "Handle Viral Posts"]
        },
        trial: {
            nextPlan: "Starter Pack",
            nextPlanPrice: "₹149/month",
            benefits: ["5 Automations", "100,000 DMs/month", "Story Automation", "Handle Viral Posts"]
        },
        starter: {
            nextPlan: "Growth Pack",
            nextPlanPrice: "₹299/month",
            benefits: ["3 Accounts", "15 Automations", "300,000 DMs/month", "Email Capture", "A/B Testing"]
        },
        growth: {
            nextPlan: "Pro Pack",
            nextPlanPrice: "₹599/month",
            benefits: ["10 Accounts", "Unlimited Automations", "1M DMs/month", "Drip Campaigns", "Webhooks"]
        },
        paid: {
            nextPlan: "Pro Pack",
            nextPlanPrice: "₹599/month",
            benefits: ["10 Accounts", "Unlimited Automations", "1M DMs/month", "Drip Campaigns", "Webhooks"]
        }
    };

    return upgrades[planType?.toLowerCase()] || upgrades.free;
}
