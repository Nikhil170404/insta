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

    // Check for waitlist DM boost (discount tier: 15K for 1 month)
    let effectiveMonthlyLimit = plan.limits.dmsPerMonth;
    const { data: userBoost } = await (supabase as any)
        .from("users")
        .select("waitlist_dms_per_month, waitlist_dms_boost_until")
        .eq("id", userId)
        .single();

    if (userBoost?.waitlist_dms_per_month && userBoost?.waitlist_dms_boost_until) {
        const boostExpiry = new Date(userBoost.waitlist_dms_boost_until);
        if (boostExpiry > new Date()) {
            effectiveMonthlyLimit = userBoost.waitlist_dms_per_month;
        }
    }

    // CHECK: Only monthly limit (NO daily limits!)
    if (monthlyCount >= effectiveMonthlyLimit) {
        return {
            allowed: false,
            reason: `Monthly limit reached (${effectiveMonthlyLimit.toLocaleString()} DMs). Upgrade for more!`,
            monthlyUsed: monthlyCount,
            monthlyLimit: effectiveMonthlyLimit,
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
            monthlyLimit: effectiveMonthlyLimit,
            hourlyUsed: hourlyCount,
            hourlyLimit: plan.limits.dmsPerHour,
            retryAfterMinutes: minutesUntilReset,
        };
    }

    return {
        allowed: true,
        monthlyUsed: monthlyCount,
        monthlyLimit: effectiveMonthlyLimit,
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

    // Check for waitlist DM boost (same as checkUsageLimits)
    let effectiveDmsLimit = plan.limits.dmsPerMonth;
    const { data: statsBoost } = await (supabase as any)
        .from("users")
        .select("waitlist_dms_per_month, waitlist_dms_boost_until")
        .eq("id", userId)
        .single();

    if (statsBoost?.waitlist_dms_per_month && statsBoost?.waitlist_dms_boost_until) {
        const boostExpiry = new Date(statsBoost.waitlist_dms_boost_until);
        if (boostExpiry > new Date()) {
            effectiveDmsLimit = statsBoost.waitlist_dms_per_month;
        }
    }

    return {
        dms_sent: monthlyDms || 0,
        dms_limit: effectiveDmsLimit,
        dms_per_hour: plan.limits.dmsPerHour,
        automations_active: automationsCount || 0,
        automations_limit: plan.limits.automations,
        accounts_limit: plan.limits.accounts,
        percentage_used: Math.round(((monthlyDms || 0) / effectiveDmsLimit) * 100),
    };
}
