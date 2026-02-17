import { NextResponse } from "next/server";
import { processQueuedDMs } from "@/lib/smart-rate-limiter";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

/**
 * process-queue Cron Job
 * 
 * This endpoint should be called every minute by a cron service (like Vercel Cron).
 * It processes pending DMs in the queue to maintain smart rate limits and time spreading.
 */

export const maxDuration = 60; // 60 seconds timeout

export async function GET(request: Request) {
    const auth = verifyCronRequest(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    try {
        logger.info("Cron started: Processing DM queue", { category: "cron" });
        await processQueuedDMs();
        return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
        logger.error("Cron queue processing error", { category: "cron" }, error as Error);
        return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }
}

// For manual testing without bearer token (remove or protect in production)
export async function POST() {
    if (process.env.NODE_ENV === 'development') {
        await processQueuedDMs();
        return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
