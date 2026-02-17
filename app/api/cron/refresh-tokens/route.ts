import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { refreshLongLivedToken } from "@/lib/instagram/config";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

export async function GET(request: Request) {
    const auth = verifyCronRequest(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    try {
        const supabase = getSupabaseAdmin();

        // Get tokens expiring in the next 10 days
        const expiryThreshold = new Date();
        expiryThreshold.setDate(expiryThreshold.getDate() + 10);

        logger.info("Checking for expiring tokens", { before: expiryThreshold.toISOString(), category: "cron" });

        const { data: users, error } = await (supabase as any)
            .from('users')
            .select('id, instagram_access_token, instagram_username')
            .lt('instagram_token_expires_at', expiryThreshold.toISOString());

        if (error) {
            logger.error("Error fetching users for token refresh", { category: "cron" }, error as Error);
            throw error;
        }

        logger.info("Users with near-expiry tokens", { count: users?.length || 0, category: "cron" });

        let successCount = 0;
        let failCount = 0;

        for (const user of users || []) {
            logger.info("Refreshing token", { username: user.instagram_username, category: "cron" });

            const refreshResult = await refreshLongLivedToken(user.instagram_access_token);

            if (refreshResult && refreshResult.accessToken) {
                const newExpiry = new Date();
                newExpiry.setSeconds(newExpiry.getSeconds() + refreshResult.expiresIn);

                const { error: updateError } = await (supabase as any)
                    .from('users')
                    .update({
                        instagram_access_token: refreshResult.accessToken,
                        instagram_token_expires_at: newExpiry.toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', user.id);

                if (updateError) {
                    logger.error("Failed to update token in DB", { username: user.instagram_username, category: "cron" }, updateError as Error);
                    failCount++;
                } else {
                    logger.info("Token refreshed successfully", { username: user.instagram_username, category: "cron" });
                    successCount++;
                }
            } else {
                logger.error("Meta failed to refresh token", { username: user.instagram_username, category: "cron" });
                failCount++;
            }
        }

        return NextResponse.json({
            success: true,
            processed: users?.length || 0,
            refreshed: successCount,
            failed: failCount
        });

    } catch (error) {
        logger.error("Token refresh cron failed", { category: "cron" }, error as Error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
