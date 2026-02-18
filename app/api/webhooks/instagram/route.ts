import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { InstagramWebhookService } from "@/lib/instagram/webhook-service";
import { logger } from "@/lib/logger";

const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

/**
 * GET Handler - Used by Meta to verify the webhook URL.
 */
export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    if (mode && token && VERIFY_TOKEN) {
        // 2.4: Timing-safe comparison for verify token
        const tokenBuf = Buffer.from(token, "utf-8");
        const expectedBuf = Buffer.from(VERIFY_TOKEN, "utf-8");

        if (mode === "subscribe" && tokenBuf.length === expectedBuf.length && crypto.timingSafeEqual(tokenBuf, expectedBuf)) {
            logger.info("Webhook verified by Meta", { category: "webhook" });
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
        if (!InstagramWebhookService.verifySignature(rawBody, signature)) {
            logger.warn("Invalid Meta Signature received", { category: "webhook" });
            return new NextResponse('Invalid signature', { status: 403 });
        }

        const body = JSON.parse(rawBody);
        logger.info("Webhook verified & received", { category: "webhook" });

        if (body.object === "instagram") {
            // P1 Audit Fix: Timestamp Replay Protection
            for (const entry of body.entry || []) {
                if (entry.time) {
                    const eventAge = (Date.now() / 1000) - entry.time;
                    if (eventAge > 300) { // 5 minutes
                        logger.warn("Instagram webhook event too old — rejecting", { age: eventAge, category: "webhook" });
                        return new NextResponse("Request too old", { status: 400 });
                    }
                }
            }

            // Processing happens asynchronously so we can return 200 OK fast to Meta
            // However, on Vercel/Serverless, we must await to ensure execution isn't frozen
            await InstagramWebhookService.processWebhookEvents(body);
            return new NextResponse("EVENT_RECEIVED", { status: 200 });
        }

        return new NextResponse("Not Found", { status: 404 });
    } catch (error) {
        logger.error("Webhook processing error", { category: "webhook" }, error as Error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
