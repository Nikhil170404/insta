import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getPlanByType } from "@/lib/pricing";

interface UsageResult {
    allowed: boolean;
    reason?: string;
    monthlyUsed: number;
    monthlyLimit: number;
    hourlyUsed?: number;
    hourlyLimit?: number;
    retryAfterMinutes?: number;
}

/**
 * Check if user can send more DMs
 * Only monthly limits + Instagram's hourly rate limit (200/hour/account)
 * NO daily limits - queue everything!
 */
export async function checkUsageLimits(userId: string, planType: string): Promise<UsageResult> {
    const supabase = getSupabaseAdmin();
    const plan = getPlanByType(planType);

    if (!plan) {
        return {
            allowed: false,
            reason: "Invalid plan",
            monthlyUsed: 0,
            monthlyLimit: 0
        };
    }

    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyUsed } = await (supabase as any)
        .from("dm_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString());

    const monthlyCount = monthlyUsed || 0;

    // CHECK: Only monthly limit (NO daily limits!)
    if (monthlyCount >= plan.limits.dmsPerMonth) {
        return {
            allowed: false,
            reason: `Monthly limit reached (${plan.limits.dmsPerMonth.toLocaleString()} DMs). Upgrade for more!`,
            monthlyUsed: monthlyCount,
            monthlyLimit: plan.limits.dmsPerMonth,
        };
    }

    // CHECK: Instagram hourly rate limit (200/hour per account)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const { count: hourlyUsed } = await (supabase as any)
        .from("dm_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", oneHourAgo.toISOString());

    const hourlyCount = hourlyUsed || 0;

    if (hourlyCount >= plan.limits.dmsPerHour) {
        const minutesUntilReset = 60 - Math.floor((Date.now() % (60 * 60 * 1000)) / 60000);
        return {
            allowed: false,
            reason: `Instagram rate limit (${plan.limits.dmsPerHour}/hour). Queued for processing.`,
            monthlyUsed: monthlyCount,
            monthlyLimit: plan.limits.dmsPerMonth,
            hourlyUsed: hourlyCount,
            hourlyLimit: plan.limits.dmsPerHour,
            retryAfterMinutes: minutesUntilReset,
        };
    }

    return {
        allowed: true,
        monthlyUsed: monthlyCount,
        monthlyLimit: plan.limits.dmsPerMonth,
        hourlyUsed: hourlyCount,
        hourlyLimit: plan.limits.dmsPerHour,
    };
}

/**
 * Get usage stats for dashboard display
 */
export async function getUsageStats(userId: string, planType: string) {
    const supabase = getSupabaseAdmin();
    const plan = getPlanByType(planType);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: monthlyDms } = await (supabase as any)
        .from("dm_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", startOfMonth.toISOString());

    const { count: automationsCount } = await (supabase as any)
        .from("automations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_active", true);

    return {
        dms_sent: monthlyDms || 0,
        dms_limit: plan.limits.dmsPerMonth,
        dms_per_hour: plan.limits.dmsPerHour,
        automations_active: automationsCount || 0,
        automations_limit: plan.limits.automations,
        accounts_limit: plan.limits.accounts,
        percentage_used: Math.round(((monthlyDms || 0) / plan.limits.dmsPerMonth) * 100),
    };
}
