import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { handleCommentEvent, handleMessageEvent } from "@/lib/instagram/processor";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

export const maxDuration = 300; // 5 minutes max for batch processing

export async function GET(request: NextRequest) {
    const auth = verifyCronRequest(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    logger.info("Batch processor started", { category: "cron" });
    const startTime = Date.now();

    try {
        const supabase = getSupabaseAdmin();

        // 1. Fetch unprocessed webhooks (limit 2000 per run)
        const { data: webhooks, error } = await (supabase as any)
            .from('webhook_batch')
            .select('*')
            .eq('processed', false)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(2000);

        if (error) throw error;

        if (!webhooks || webhooks.length === 0) {
            logger.info("No webhooks to process", { category: "cron" });
            return NextResponse.json({ success: true, processed: 0 });
        }

        logger.info("Processing webhooks", { count: webhooks.length, category: "cron" });

        let processed = 0;

        // 2. Process in smaller sub-batches for parallel execution
        const batchSize = 50;
        for (let i = 0; i < webhooks.length; i += batchSize) {
            const subBatch = webhooks.slice(i, i + batchSize);

            await Promise.allSettled(
                subBatch.map(async (webhook: any) => {
                    try {
                        if (webhook.event_type === 'comment') {
                            await handleCommentEvent(webhook.instagram_user_id, webhook.payload, supabase);
                        } else {
                            await handleMessageEvent(webhook.instagram_user_id, webhook.payload, supabase);
                        }

                        // Mark as processed
                        await (supabase as any)
                            .from('webhook_batch')
                            .update({
                                processed: true,
                                processed_at: new Date().toISOString()
                            })
                            .eq('id', webhook.id);

                    } catch (err) {
                        logger.error("Failed to process webhook", { webhookId: webhook.id, category: "cron" }, err as Error);
                    }
                })
            );

            processed += subBatch.length;
            logger.info("Processing progress", { processed, total: webhooks.length, category: "cron" });

            // Short delay to avoid hitting Instagram API rate limits
            if (i + batchSize < webhooks.length) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        const duration = Date.now() - startTime;
        return NextResponse.json({
            success: true,
            processed,
            duration: `${duration}ms`
        });

    } catch (error) {
        logger.error("Batch processor error", { category: "cron" }, error as Error);
        return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }
}
