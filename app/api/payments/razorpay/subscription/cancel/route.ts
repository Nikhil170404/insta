import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Rate Limiting
        try {
            const { ratelimit } = await import("@/lib/ratelimit");
            const { success } = await ratelimit.limit(`cancel_sub_${session.id}`);
            if (!success) {
                return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
            }
        } catch (e) {
            console.error("Rate limit error:", e);
            return NextResponse.json({ error: "Service temporarily unavailable. Please try again." }, { status: 503 });
        }

        const supabase = getSupabaseAdmin();
        const { data: user } = await supabase
            .from("users")
            .select("razorpay_subscription_id, subscription_status")
            .eq("id", session.id)
            .single() as { data: { razorpay_subscription_id: string | null, subscription_status: string | null } | null, error: any };

        if (!user || !user.razorpay_subscription_id) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 400 });
        }

        if (user.subscription_status === "cancelled") {
            return NextResponse.json({ error: "Subscription is already cancelled" }, { status: 400 });
        }

        const subscriptionId = user.razorpay_subscription_id;

        // Cancel Subscription at the end of the current billing cycle
        // Cancel at end of cycle = true
        // If we pass false, it cancels IMMEDIATELY
        await razorpay.subscriptions.cancel(subscriptionId, true);

        // Update local status to "cancelled" (or wait for webhook?)
        // Better to wait for webhook, but we can optimistically update or just notify user
        // We will return success and let the UX show "Cancellation Pending" or similar.

        // Actually, Razorpay returns the cancelled subscription object. 
        // We can update status to 'cancelled' immediately if we want.

        await (supabase.from("users") as any).update({
            subscription_status: "cancelled"
        }).eq("id", session.id);

        const { invalidateSessionCache } = await import("@/lib/auth/cache");
        await invalidateSessionCache(session.id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Subscription Cancellation Error:", error);
        return NextResponse.json({
            error: "Cancellation failed"
        }, { status: 500 });
    }
}
