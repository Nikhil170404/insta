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
            "Standard Delivery Speed",
            "Queue All Comments ✨",
            "Follow-Gate Feature ✨",
            "Email Support (72h)",
        ],
        limits: {
            accounts: 1,
            automations: 3,
            dmsPerMonth: 1000,
            dmsPerHour: 200, // Max Speed for all
            queueEnabled: true,
            priorityQueue: false,
        },
        cta: "Free Forever",
        popular: false,
        savings: null,
        badge: "FREE",
        monthlyPlanId: null,
        yearlyPlanId: null,
        yearlyPrice: null
    },

    STARTER: {
        name: "Starter Pack",
        price: "99",
        upfront: "0",
        duration: "Monthly",
        description: "Perfect for growing creators",
        hindiDesc: "Naye creators ke liye perfect",
        features: [
            "1 Instagram Account",
            "10 Active Automations",
            "50,000 DMs/month",
            "All Active Automations Priority",
            "Queue All Comments",
            "Handle Viral Posts 🔥",
            "Story Automation ✨",
            "Follow-Gate Feature ✨",
            "Email Support (48h)",
        ],
        limits: {
            accounts: 1,
            automations: 10,
            dmsPerMonth: 50000,
            dmsPerHour: 200, // Max Speed
            queueEnabled: true,
            priorityQueue: false,
        },
        cta: "Start Monthly Plan",
        popular: false,
        savings: "Get 2 months free with Yearly",
        badge: "Most Affordable",
        monthlyPlanId: process.env.NEXT_PUBLIC_PLAN_STARTER_PACK_MONTHLY,
        yearlyPlanId: process.env.NEXT_PUBLIC_PLAN_STARTER_PACK_YEARLY,
        yearlyPrice: "999"
    },

    PRO: {
        name: "Pro Pack",
        price: "299",
        upfront: "0",
        duration: "Monthly",
        description: "Scale your engagement",
        hindiDesc: "Pro creators aur teams ke liye",
        features: [
            "1 Instagram Account",
            "Unlimited Automations",
            "Unlimited DMs/month",
            "Priority Delivery Queue",
            "Instant Queue Processing",
            "Handle Multiple Viral Posts 🔥",
            "Story Automation ✨",
            "Follow-Gate Feature ✨",
            "Detailed Analytics",
            "Priority Support (12h)",
        ],
        limits: {
            accounts: 1,
            automations: 999,
            dmsPerMonth: 1000000,
            dmsPerHour: 200,
            queueEnabled: true,
            priorityQueue: true,
        },
        cta: "Start Pro Plan",
        popular: true,
        savings: "Best Value - Save 16%",
        badge: "Most Popular",
        monthlyPlanId: process.env.NEXT_PUBLIC_PLAN_PRO_PACK_MONTHLY,
        yearlyPlanId: process.env.NEXT_PUBLIC_PLAN_PRO_PACK_YEARLY,
        yearlyPrice: "2999"
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
        starter: ["follow_gate", "story_automation", "basic_analytics", "queue", "viral_handling"],
        pro: ["follow_gate", "story_automation", "detailed_analytics", "queue", "priority_queue", "viral_handling"],
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
    queueEnabled?: boolean;
    priorityQueue?: boolean;
} {
    const planMap: Record<string, typeof PRICING_PLANS.FREE.limits & { planName: string }> = {
        free: { ...PRICING_PLANS.FREE.limits, planName: "Free Starter" },
        starter: { ...PRICING_PLANS.STARTER.limits, planName: "Starter Pack" },
        pro: { ...PRICING_PLANS.PRO.limits, planName: "Pro Pack" },
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
            nextPlanPrice: "₹99/month",
            benefits: ["10 Automations", "50,000 DMs/month", "Story Automation", "Handle Viral Posts"]
        },
        starter: {
            nextPlan: "Pro Pack",
            nextPlanPrice: "₹299/month",
            benefits: ["Unlimited Automations", "Unlimited DMs", "Priority Support", "Detailed Analytics"]
        }
    };

    return upgrades[planType?.toLowerCase()] || upgrades.free;
}
