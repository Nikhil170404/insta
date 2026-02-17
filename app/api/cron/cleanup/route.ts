import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
    const auth = verifyCronRequest(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    const supabase = getSupabaseAdmin();

    try {
        logger.info("Starting database cleanup", { category: "cron" });

        // 1. Delete processed webhooks older than 1 HOUR
        const { count: webhookCount, error: webhookError } = await (supabase as any)
            .from('webhook_batch')
            .delete({ count: 'exact' })
            .eq('processed', true)
            .lt('processed_at', new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString());

        if (webhookError) logger.error("Error cleaning up webhooks", { category: "cron" }, webhookError as Error);

        // 2. Delete old DM logs (Keep 60 days for monthly usage limits)
        const { count: logCount, error: logError } = await (supabase as any)
            .from('dm_logs')
            .delete({ count: 'exact' })
            .lt('created_at', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString());

        if (logError) logger.error("Error cleaning up logs", { category: "cron" }, logError as Error);

        logger.info("Cleanup complete", { removedWebhooks: webhookCount || 0, removedLogs: logCount || 0, category: "cron" });

        return NextResponse.json({
            success: true,
            removed_webhooks: webhookCount || 0,
            removed_logs: logCount || 0
        });

    } catch (error) {
        logger.error("Cleanup cron error", { category: "cron" }, error as Error);
        return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }
}
