import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import {
    sendInstagramDM,
    replyToComment,
    checkFollowStatus,
    getUniqueMessage,
    incrementAutomationCount
} from "@/lib/instagram/service";
import { smartRateLimit, queueDM, RATE_LIMITS } from "@/lib/smart-rate-limiter";
import { handleCommentEvent, handleMessageEvent } from "@/lib/instagram/processor";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

/**
 * GET Handler - Used by Meta to verify the webhook URL.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode && token) {
        if (mode === "subscribe" && token === VERIFY_TOKEN) {
            console.log("WEBHOOK_VERIFIED");
            return new NextResponse(challenge, { status: 200 });
        } else {
            return new NextResponse("Forbidden", { status: 403 });
        }
    }

    return new NextResponse("Bad Request", { status: 400 });
}

/**
 * POST Handler - Receives comment updates from Instagram and sends DMs.
 */
export async function POST(request: NextRequest) {
    try {
        const signature = request.headers.get('x-hub-signature-256');
        const rawBody = await request.text();

        // 1. Verify Meta Signature
        if (process.env.NODE_ENV === "production" || process.env.INSTAGRAM_APP_SECRET) {
            const expectedSignature = crypto
                .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET!)
                .update(rawBody)
                .digest('hex');

            if (signature !== `sha256=${expectedSignature}`) {
                console.warn("⚠️ Invalid Meta Signature received");
                return new NextResponse('Invalid signature', { status: 403 });
            }
        }

        const body = JSON.parse(rawBody);
        console.log("Webhook verified & received:", JSON.stringify(body, null, 2));

        if (body.object === "instagram") {
            const supabase = getSupabaseAdmin();
            const batchInserts: any[] = [];
            const instantResults: any[] = [];

            // 1. Collect all events
            for (const entry of body.entry || []) {
                const instagramUserId = entry.id;

                // Handle comments
                for (const change of entry.changes || []) {
                    if (change.field === "comments") {
                        const event = { type: 'comment', igId: instagramUserId, data: change.value };
                        // If burst is small (< 5), try instant processing
                        if (instantResults.length < 5) {
                            instantResults.push(handleCommentEvent(instagramUserId, change.value, supabase));
                        } else {
                            batchInserts.push({ instagram_user_id: instagramUserId, event_type: 'comment', payload: change.value });
                        }
                    }
                }

                // Handle messaging
                for (const messaging of entry.messaging || []) {
                    if (!messaging.message?.is_echo) {
                        const isStoryReply = !!messaging.message?.reply_to?.story_id;
                        const eventType = isStoryReply ? 'story_reply' : 'message';

                        if (instantResults.length < 5) {
                            instantResults.push(handleMessageEvent(instagramUserId, messaging, supabase));
                        } else {
                            batchInserts.push({ instagram_user_id: instagramUserId, event_type: eventType, payload: messaging });
                        }
                    }
                }
            }

            // 2. Fire off instant processors in parallel (but don't await yet to keep response fast)
            // We await them before returning to ensure reliability for small bursts
            if (instantResults.length > 0) {
                console.log(`⚡ Processing ${instantResults.length} events instantly...`);
                await Promise.allSettled(instantResults);
            }

            // 3. Batch any remainder (viral bursts)
            if (batchInserts.length > 0) {
                console.log(`📦 Burst detected! Batching ${batchInserts.length} events for cron fallback.`);
                const { error } = await (supabase as any)
                    .from('webhook_batch')
                    .insert(batchInserts.map(i => ({ ...i, priority: 5 })));

                if (error) console.error("❌ Batch insert error:", error);
            }

            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        return new NextResponse("Not Found", { status: 404 });
    } catch (error) {
        console.error("❌ Webhook processing error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
