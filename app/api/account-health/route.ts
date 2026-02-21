import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { redis } from "@/lib/upstash";
import { getPlanLimits } from "@/lib/pricing";

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const userId = session.id;

    // 1. Fetch automations for this user
    const { data: automations } = await (supabase
        .from("automations") as any)
        .select("dm_sent_count, dm_failed_count, is_active, reply_message, link_url")
        .eq("user_id", userId)
        .eq("is_archived", false);

    // 2. Fetch current hour's rate limit usage
    const { data: rateLimitRows } = await (supabase
        .from("rate_limits") as any)
        .select("dm_count, comment_count")
        .eq("user_id", userId)
        .gte("hour_bucket", new Date(new Date().setMinutes(0, 0, 0)).toISOString());

    // 3. Fetch token expiry and plan from users
    const { data: user } = await (supabase
        .from("users") as any)
        .select("instagram_token_expires_at, instagram_user_id, plan_type")
        .eq("id", userId)
        .single();

    // 4. Fetch queue depth
    const { count: pendingQueueCount } = await (supabase
        .from("dm_queue") as any)
        .select("*", { count: 'exact', head: true })
        .eq("user_id", userId)
        .eq("status", "pending");

    // 5. Fetch Meta API Usage from Redis
    let metaUsagePercent = 0;
    if (user?.instagram_user_id) {
        try {
            const cached = await redis.get<{ info: any; updatedAt: number }>(`meta_rate_limit:${user.instagram_user_id}`);
            if (cached && (Date.now() - cached.updatedAt <= 5 * 60 * 1000)) {
                const info = cached.info;
                metaUsagePercent = Math.max(info.callCount || 0, info.totalCpuTime || 0, info.totalTime || 0);
            }
        } catch (e) {
            // Redis error or missing, default to 0
        }
    }

    // --- Factor 1: DM Success Rate (15 pts) ---
    const totalSent = automations?.reduce((s: number, a: any) => s + (a.dm_sent_count || 0), 0) ?? 0;
    const totalFailed = automations?.reduce((s: number, a: any) => s + (a.dm_failed_count || 0), 0) ?? 0;
    const totalDMs = totalSent + totalFailed;
    let successRate = totalDMs === 0 ? null : totalSent / totalDMs;
    let successScore = successRate === null ? 15 :
        successRate >= 0.95 ? 15 : successRate >= 0.85 ? 10 :
            successRate >= 0.70 ? 5 : 0;

    // --- Factor 2: Automation Status (15 pts) ---
    const autoCount = automations?.length ?? 0;
    const activeCount = automations?.filter((a: any) => a.is_active).length ?? 0;
    let autoScore = autoCount === 0 ? 10 : activeCount === autoCount ? 15 :
        activeCount > 0 ? 5 : 0;

    // --- Factor 3: Internal Rate Limit Health (15 pts) ---
    const limits = getPlanLimits(user?.plan_type || "free");
    const maxComboLimit = limits.dmsPerHour + limits.commentsPerHour;

    const currentDMUsage = rateLimitRows?.reduce((s: number, r: any) => s + (r.dm_count || 0), 0) ?? 0;
    const currentCommentUsage = rateLimitRows?.reduce((s: number, r: any) => s + (r.comment_count || 0), 0) ?? 0;
    const currentUsage = currentDMUsage + currentCommentUsage;

    const pct = currentUsage / maxComboLimit;
    let rateScore = pct < 0.50 ? 15 : pct < 0.75 ? 10 : pct < 0.90 ? 5 : 0;

    // --- Factor 4: Message Quality (15 pts) ---
    const spintaxRegex = /\{[^{}|]+\|[^{}]+\}/;
    const personalizationRegex = /\{username\}|\{first_name\}/i;
    const hasSpintax = automations?.some((a: any) => spintaxRegex.test(a.reply_message || "")) ?? false;
    const hasPersonalization = automations?.some((a: any) => personalizationRegex.test(a.reply_message || "")) ?? false;
    const hasButton = automations?.some((a: any) => !!a.link_url) ?? false;
    const qualityScore = (hasSpintax ? 5 : 0) + (hasPersonalization ? 5 : 0) + (hasButton ? 5 : 0);

    // --- Factor 5: Token Health (10 pts) ---
    const expiresAt = user?.instagram_token_expires_at ? new Date(user.instagram_token_expires_at) : null;
    const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 86400000) : 0;
    const tokenScore = daysLeft >= 30 ? 10 : daysLeft >= 14 ? 5 : daysLeft >= 7 ? 2 : 0;

    // --- Factor 6: Queue Health (15 pts) ---
    const qCount = pendingQueueCount || 0;
    let queueScore = qCount < 50 ? 15 : qCount < 200 ? 10 : qCount < 500 ? 5 : 0;

    // --- Factor 7: Meta API Usage (15 pts) ---
    let metaScore = metaUsagePercent < 50 ? 15 : metaUsagePercent < 80 ? 10 : metaUsagePercent < 95 ? 5 : 0;

    // --- Total Score ---
    let score = successScore + autoScore + rateScore + qualityScore + tokenScore + queueScore + metaScore;
    if (score > 100) score = 100; // Cap just in case

    const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : score >= 30 ? "Poor" : "Critical";
    const color = score >= 85 ? "green" : score >= 70 ? "teal" : score >= 50 ? "amber" : score >= 30 ? "orange" : "red";

    return NextResponse.json({
        score,
        label,
        color,
        breakdown: {
            successRate: {
                score: successScore, maxPoints: 15,
                value: successRate === null ? "No DMs yet" : `${Math.round(successRate * 100)}%`,
                label: "DM Success Rate"
            },
            automationStatus: {
                score: autoScore, maxPoints: 15,
                value: autoCount === 0 ? "No automations" : `${activeCount}/${autoCount} active`,
                label: "Automation Health"
            },
            rateLimitHealth: {
                score: rateScore, maxPoints: 15,
                value: `${currentUsage}/${maxComboLimit} max limits`,
                label: "Internal Rate Limits"
            },
            metaApiHealth: {
                score: metaScore, maxPoints: 15,
                value: `${Math.round(metaUsagePercent)}% capacity`,
                label: "Meta API Usage"
            },
            queueHealth: {
                score: queueScore, maxPoints: 15,
                value: `${qCount} pending DMs`,
                label: "Queue Backlog"
            },
            messageQuality: {
                score: qualityScore, maxPoints: 15,
                value: `${[hasSpintax, hasPersonalization, hasButton].filter(Boolean).length}/3 features`,
                label: "Message Quality"
            },
            tokenHealth: {
                score: tokenScore, maxPoints: 10,
                value: expiresAt ? `${daysLeft} days left` : "Unknown",
                label: "Token Health"
            }
        }
    });
}
