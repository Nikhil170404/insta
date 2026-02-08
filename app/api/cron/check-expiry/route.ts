import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET(req: Request) {
    // P0 Fix: Verify Cron Secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const supabase = getSupabaseAdmin();
        const now = new Date().toISOString();

        // Find expired users
        // plan_type is NOT 'free' or 'trial' (already handled or valid)
        // plan_expires_at is in the past
        const { data: expiredUsers, error: fetchError } = await (supabase
            .from("users") as any)
            .select("id, instagram_username, plan_type")
            .in("plan_type", ["starter", "growth", "pro", "paid"])
            .lt("plan_expires_at", now);

        if (fetchError) throw fetchError;

        if (!expiredUsers || expiredUsers.length === 0) {
            return NextResponse.json({ message: "No expired users found" });
        }

        console.log(`Found ${expiredUsers.length} expired users. Downgrading...`);

        // Downgrade them to FREE
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

    } catch (error: any) {
        console.error("Cron Expiry Error:", error);
        // P1 Fix: Don't leak error messages
        return NextResponse.json({ error: "Operation failed" }, { status: 500 });
    }
}
