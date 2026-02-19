import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const now = new Date();

        // Count pending DMs in queue
        const { count: pendingCount, error: pendingError } = await (supabase as any)
            .from("dm_queue")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("status", "pending");

        if (pendingError) {
            console.error("Error fetching pending queue:", pendingError);
            return NextResponse.json({ error: "Failed to fetch queue status" }, { status: 500 });
        }

        // Count failed DMs
        const { count: failedCount, error: failedError } = await (supabase as any)
            .from("dm_queue")
            .select("*", { count: "exact", head: true })
            .eq("user_id", session.id)
            .eq("status", "failed");

        if (failedError) {
            console.error("Error fetching failed queue:", failedError);
        }

        // Get the earliest scheduled send time for pending DMs
        let nextSendAt: string | null = null;
        let estimatedMinutes: number | null = null;

        if ((pendingCount || 0) > 0) {
            const { data: nextDM } = await (supabase as any)
                .from("dm_queue")
                .select("scheduled_send_at")
                .eq("user_id", session.id)
                .eq("status", "pending")
                .order("scheduled_send_at", { ascending: true })
                .limit(1)
                .single();

            if (nextDM?.scheduled_send_at) {
                nextSendAt = nextDM.scheduled_send_at;
                const sendTime = new Date(nextDM.scheduled_send_at);
                const diffMs = sendTime.getTime() - now.getTime();
                estimatedMinutes = Math.max(0, Math.ceil(diffMs / 60000));
            }
        }

        return NextResponse.json({
            pending: pendingCount || 0,
            failed: failedCount || 0,
            nextSendAt,
            estimatedMinutes,
        });

    } catch (error) {
        console.error("Error fetching queue status:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
