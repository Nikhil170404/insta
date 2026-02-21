import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

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
        .select("dm_count")
        .eq("user_id", userId)
        .gte("hour_bucket", new Date(new Date().setMinutes(0, 0, 0)).toISOString());

    // 3. Fetch token expiry from users
    const { data: user } = await (supabase
        .from("users") as any)
        .select("instagram_token_expires_at")
        .eq("id", userId)
        .single();

    // --- Factor 1: DM Success Rate ---
    const totalSent = automations?.reduce((s: number, a: any) => s + (a.dm_sent_count || 0), 0) ?? 0;
    const totalFailed = automations?.reduce((s: number, a: any) => s + (a.dm_failed_count || 0), 0) ?? 0;
    const totalDMs = totalSent + totalFailed;
    let successRate = totalDMs === 0 ? null : totalSent / totalDMs;
    let successScore = successRate === null ? 20 :
        successRate >= 0.95 ? 30 : successRate >= 0.90 ? 25 :
            successRate >= 0.80 ? 20 : successRate >= 0.70 ? 10 : 0; // Adjusted to match 30 max points per user spec

    // --- Factor 2: Automation Status ---
    const autoCount = automations?.length ?? 0;
    const activeCount = automations?.filter((a: any) => a.is_active).length ?? 0;
    let autoScore = autoCount === 0 ? 15 : activeCount === autoCount ? 20 :
        activeCount > 0 ? 10 : 0;

    // --- Factor 3: Rate Limit Health ---
    const currentUsage = rateLimitRows?.reduce((s: number, r: any) => s + (r.dm_count || 0), 0) ?? 0;
    // Reduce safe upper limit to match revised safety patterns (190 baseline assumed)
    const pct = currentUsage / 190;
    let rateScore = pct < 0.50 ? 20 : pct < 0.70 ? 15 : pct < 0.80 ? 10 : pct < 0.95 ? 5 : 0;

    // --- Factor 4: Message Quality ---
    const spintaxRegex = /\{[^{}|]+\|[^{}]+\}/;
    const personalizationRegex = /\{username\}|\{first_name\}/i;
    const hasSpintax = automations?.some((a: any) => spintaxRegex.test(a.reply_message || "")) ?? false;
    const hasPersonalization = automations?.some((a: any) => personalizationRegex.test(a.reply_message || "")) ?? false;
    const hasButton = automations?.some((a: any) => !!a.link_url) ?? false;
    const qualityScore = (hasSpintax ? 5 : 0) + (hasPersonalization ? 5 : 0) + (hasButton ? 5 : 0);

    // --- Factor 5: Token Health ---
    const expiresAt = user?.instagram_token_expires_at ? new Date(user.instagram_token_expires_at) : null;
    const daysLeft = expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / 86400000) : 0;
    const tokenScore = daysLeft >= 30 ? 15 : daysLeft >= 14 ? 10 : daysLeft >= 7 ? 5 : 0;

    // --- Total Score ---
    let score = successScore + autoScore + rateScore + qualityScore + tokenScore;
    if (score > 100) score = 100; // Cap just in case

    const label = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Fair" : score >= 30 ? "Poor" : "Critical";
    const color = score >= 85 ? "green" : score >= 70 ? "teal" : score >= 50 ? "amber" : score >= 30 ? "orange" : "red";

    return NextResponse.json({
        score,
        label,
        color,
        breakdown: {
            successRate: {
                score: successScore, maxPoints: 30,
                value: successRate === null ? "No DMs yet" : `${Math.round(successRate * 100)}%`,
                label: "DM Success Rate"
            },
            automationStatus: {
                score: autoScore, maxPoints: 20,
                value: autoCount === 0 ? "No automations" : `${activeCount}/${autoCount} active`,
                label: "Automation Health"
            },
            rateLimitHealth: {
                score: rateScore, maxPoints: 20,
                value: `${currentUsage}/190 this hour`,
                label: "Rate Limit Safety"
            },
            messageQuality: {
                score: qualityScore, maxPoints: 15,
                value: `${[hasSpintax, hasPersonalization, hasButton].filter(Boolean).length}/3 features`,
                label: "Message Quality"
            },
            tokenHealth: {
                score: tokenScore, maxPoints: 15,
                value: expiresAt ? `${daysLeft} days left` : "Unknown",
                label: "Token Health"
            }
        }
    });
}
