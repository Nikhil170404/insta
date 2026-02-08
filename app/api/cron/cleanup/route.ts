import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.EXTERNAL_CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    try {
        console.log("🧹 Starting database cleanup...");

        // 1. Delete processed webhooks older than 1 HOUR (Immediate recovery)
        const { count: webhookCount, error: webhookError } = await (supabase as any)
            .from('webhook_batch')
            .delete({ count: 'exact' })
            .eq('processed', true)
            .lt('processed_at', new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString());

        if (webhookError) console.error("Error cleaning up webhooks:", webhookError);

        // 2. Delete old DM logs (Keep 60 days for monthly usage limits)
        const { count: logCount, error: logError } = await (supabase as any)
            .from('dm_logs')
            .delete({ count: 'exact' })
            .lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

        if (logError) console.error("Error cleaning up logs:", logError);

        console.log(`✅ Cleanup complete. Removed ${webhookCount || 0} webhooks and ${logCount || 0} logs.`);

        return NextResponse.json({
            success: true,
            removed_webhooks: webhookCount || 0,
            removed_logs: logCount || 0
        });

    } catch (error) {
        console.error("❌ Cleanup cron error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
