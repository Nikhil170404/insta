import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { handleCommentEvent, handleMessageEvent } from "@/lib/instagram/processor";

export const maxDuration = 300; // 5 minutes max for batch processing

export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const validSecrets = [
        process.env.CRON_SECRET,
        process.env.EXTERNAL_CRON_SECRET
    ].filter(Boolean);

    const isAuthorized = validSecrets.some(
        secret => authHeader === `Bearer ${secret}`
    );

    if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("⏰ Batch processor started");
    const startTime = Date.now();

    try {
        const supabase = getSupabaseAdmin();

        // 1. Fetch unprocessed webhooks
        // Limit to 2000 per run to stay within timeout and memory limits
        const { data: webhooks, error } = await (supabase as any)
            .from('webhook_batch')
            .select('*')
            .eq('processed', false)
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(2000);

        if (error) throw error;

        if (!webhooks || webhooks.length === 0) {
            console.log("ℹ️ No webhooks to process");
            return NextResponse.json({ success: true, processed: 0 });
        }

        console.log(`📦 Processing ${webhooks.length} webhooks...`);

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
                        console.error(`❌ Failed to process webhook ${webhook.id}:`, err);
                    }
                })
            );

            processed += subBatch.length;
            console.log(`✅ Progress: ${processed}/${webhooks.length}`);

            // Short delay to avoid hitting Instagram API rate limits too hard in one burst
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
        console.error("❌ Batch processor error:", error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
    }
}
