import { NextResponse } from "next/server";
import { processQueuedDMs } from "@/lib/smart-rate-limiter";

/**
 * process-queue Cron Job
 * 
 * This endpoint should be called every minute by a cron service (like Vercel Cron).
 * It processes pending DMs in the queue to maintain smart rate limits and time spreading.
 */

export const maxDuration = 60; // 60 seconds timeout

export async function GET(request: Request) {
    // Verify cron secret (security)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.warn("⚠️ Unauthorized cron attempt blocked");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("⏰ Cron started: Processing DM queue...");
        await processQueuedDMs();
        return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
    } catch (error) {
        console.error("❌ Cron error:", error);
        return NextResponse.json(
            { error: (error as Error).message },
            { status: 500 }
        );
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
