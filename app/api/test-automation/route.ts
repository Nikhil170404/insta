import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

/**
 * Test endpoint to verify automations are set up correctly
 * Visit: /api/test-automation
 */
export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({
                error: "Not logged in",
                action: "Go to /signin to login first"
            }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Get user's automations
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: automations, error: autoError } = await (supabase as any)
            .from("automations")
            .select("*")
            .eq("user_id", session.id)
            .order("created_at", { ascending: false });

        // Get user's access token
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: user, error: userError } = await (supabase as any)
            .from("users")
            .select("instagram_access_token, instagram_user_id, instagram_username")
            .eq("id", session.id)
            .single();

        if (userError || !user) {
            return NextResponse.json({
                error: "User not found",
                details: userError
            }, { status: 404 });
        }

        if (autoError || !automations || automations.length === 0) {
            return NextResponse.json({
                status: "⚠️ No automations found",
                message: "You need to create an automation first",
                action: "Go to /dashboard and click on a reel to set up automation",
                user: {
                    instagram_username: user.instagram_username,
                    instagram_user_id: user.instagram_user_id,
                }
            });
        }

        // Fetch recent media from Instagram
        const mediaResponse = await fetch(
            `https://graph.instagram.com/v21.0/${user.instagram_user_id}/media?fields=id,caption,media_type,permalink&limit=20&access_token=${user.instagram_access_token}`
        );

        if (!mediaResponse.ok) {
            const errorData = await mediaResponse.json();
            return NextResponse.json({
                error: "Failed to fetch Instagram media",
                details: errorData,
                recommendations: [
                    "Your access token might be invalid",
                    "Visit /api/test-token to verify",
                    "Try logging in again: /signin"
                ]
            }, { status: 500 });
        }

        const mediaData = await mediaResponse.json();
        const instagramPosts = mediaData.data || [];

        // Compare automation media IDs with actual Instagram posts
        const automationMediaIds = automations.map((a: any) => a.media_id);
        const actualMediaIds = instagramPosts.map((m: any) => m.id);

        // Analyze each automation
        const automationAnalysis = automations.map((auto: any) => {
            const existsOnInstagram = actualMediaIds.includes(auto.media_id);
            const matchingPost = instagramPosts.find((m: any) => m.id === auto.media_id);

            return {
                automation_id: auto.id,
                media_id: auto.media_id,
                trigger_type: auto.trigger_type,
                trigger_keyword: auto.trigger_keyword,
                is_active: auto.is_active,
                reply_message: auto.reply_message.substring(0, 50) + "...",
                exists_on_instagram: existsOnInstagram,
                instagram_post: matchingPost ? {
                    id: matchingPost.id,
                    type: matchingPost.media_type,
                    caption: matchingPost.caption?.substring(0, 60) + "...",
                    permalink: matchingPost.permalink
                } : null,
                status: existsOnInstagram
                    ? (auto.is_active ? "✅ Ready to receive webhooks" : "⏸️ Paused")
                    : "❌ Post not found on Instagram (wrong media_id?)",
                analytics: {
                    comments_received: auto.comment_count || 0,
                    dms_sent: auto.dm_sent_count || 0,
                    dms_failed: auto.dm_failed_count || 0,
                }
            };
        });

        // Find posts without automations
        const postsWithoutAutomation = instagramPosts
            .filter((post: any) => !automationMediaIds.includes(post.id))
            .slice(0, 5)
            .map((post: any) => ({
                id: post.id,
                type: post.media_type,
                caption: post.caption?.substring(0, 60) + "...",
                permalink: post.permalink,
                has_automation: false
            }));

        // Summary
        const activeAutomations = automations.filter((a: any) => a.is_active);
        const validAutomations = automations.filter((a: any) =>
            actualMediaIds.includes(a.media_id) && a.is_active
        );

        const summary = {
            total_automations: automations.length,
            active_automations: activeAutomations.length,
            valid_and_active: validAutomations.length,
            inactive_automations: automations.length - activeAutomations.length,
            invalid_media_ids: automations.filter((a: any) =>
                !actualMediaIds.includes(a.media_id)
            ).length,
            total_dms_sent: automations.reduce((sum: number, a: any) =>
                sum + (a.dm_sent_count || 0), 0
            ),
        };

        return NextResponse.json({
            status: validAutomations.length > 0
                ? "✅ You have active automations ready!"
                : "⚠️ Issues found with your automations",
            user: {
                instagram_username: user.instagram_username,
                instagram_user_id: user.instagram_user_id,
            },
            summary,
            automations: automationAnalysis,
            recent_instagram_posts: instagramPosts.slice(0, 5).map((post: any) => ({
                id: post.id,
                type: post.media_type,
                caption: post.caption?.substring(0, 60) + "...",
                has_automation: automationMediaIds.includes(post.id),
                permalink: post.permalink
            })),
            posts_without_automation: postsWithoutAutomation,
            recommendations: [
                validAutomations.length === 0
                    ? "❌ No valid active automations! Create one in /dashboard"
                    : `✅ ${validAutomations.length} automation(s) ready to receive webhooks`,
                summary.invalid_media_ids > 0
                    ? `⚠️ ${summary.invalid_media_ids} automation(s) have wrong media_id - delete and recreate them`
                    : "✅ All media_ids are valid",
                postsWithoutAutomation.length > 0
                    ? `💡 You have ${postsWithoutAutomation.length} posts without automation - set them up!`
                    : "✅ All recent posts have automations",
                "Next: Test by commenting on your reel with the trigger keyword"
            ]
        });
    } catch (error) {
        return NextResponse.json({
            error: "Failed to check automations",
            details: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined
        }, { status: 500 });
    }
}
