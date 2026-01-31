import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { refreshLongLivedToken } from "@/lib/instagram/config";

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get("authorization");
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        // Get tokens expiring in the next 10 days
        const expiryThreshold = new Date();
        expiryThreshold.setDate(expiryThreshold.getDate() + 10);

        console.log(`Checking for tokens expiring before: ${expiryThreshold.toISOString()}`);

        const { data: users, error } = await (supabase as any)
            .from('users')
            .select('id, instagram_access_token, instagram_username')
            .lt('instagram_token_expires_at', expiryThreshold.toISOString());

        if (error) {
            console.error("Error fetching users for token refresh:", error);
            throw error;
        }

        console.log(`Found ${users?.length || 0} users with near-expiry tokens.`);

        let successCount = 0;
        let failCount = 0;

        for (const user of users || []) {
            console.log(`Refreshing token for @${user.instagram_username}`);

            const refreshResult = await refreshLongLivedToken(user.instagram_access_token);

            if (refreshResult && refreshResult.accessToken) {
                const newExpiry = new Date();
                // Meta returns expiresIn in seconds (usually 60 days)
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
                    console.error(`Failed to update DB for @${user.instagram_username}:`, updateError);
                    failCount++;
                } else {
                    console.log(`✅ Refreshed token for @${user.instagram_username}`);
                    successCount++;
                }
            } else {
                console.error(`❌ Meta failed to refresh token for @${user.instagram_username}`);
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
        console.error("CRITICAL: Token refresh cron failed:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
