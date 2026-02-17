import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { verifyCronRequest } from "@/lib/cron-auth";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
    const auth = verifyCronRequest(req);
    if (!auth.authorized) {
        return NextResponse.json({ error: auth.message }, { status: auth.status });
    }

    try {
        const supabase = getSupabaseAdmin();
        const now = new Date().toISOString();

        // Find expired users
        const { data: expiredUsers, error: fetchError } = await (supabase
            .from("users") as any)
            .select("id, instagram_username, plan_type")
            .in("plan_type", ["starter", "pro"])
            .lt("plan_expires_at", now);

        if (fetchError) throw fetchError;

        if (!expiredUsers || expiredUsers.length === 0) {
            return NextResponse.json({ message: "No expired users found" });
        }

        logger.info("Downgrading expired users", { count: expiredUsers.length, category: "cron" });

        const idsToUpdate = expiredUsers.map((u: any) => u.id);

        const { error: updateError } = await (supabase
            .from("users") as any)
            .update({
                plan_type: "free",
                plan_expires_at: null,
                subscription_status: "expired",
                updated_at: new Date().toISOString()
            })
            .in("id", idsToUpdate);

        if (updateError) throw updateError;

        return NextResponse.json({
            success: true,
            downgraded_count: expiredUsers.length
        });

    } catch (error) {
        logger.error("Cron expiry error", { category: "cron" }, error as Error);
        return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }
}
