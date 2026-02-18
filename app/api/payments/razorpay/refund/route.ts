
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { invalidateSessionCache } from "@/lib/auth/cache";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { paymentId } = body;

        if (!paymentId) {
            return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // 1. Verify Payment exists
        const { data: payment } = await supabase
            .from("payments")
            .select("*")
            .eq("razorpay_payment_id", paymentId)
            .single();

        if (!payment) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        // Bug 3 Fix: Ownership check — return 404 (not 403) to avoid confirming existence
        if ((payment as any).user_id !== session.id) {
            return NextResponse.json({ error: "Payment not found" }, { status: 404 });
        }

        // 2. Process Refund via Razorpay
        const refund = await razorpay.payments.refund(paymentId, {
            speed: "normal"
        });

        // 3. Update Payment Status
        await (supabase.from("payments") as any).update({
            status: "refunded"
        }).eq("razorpay_payment_id", paymentId);

        // Bug 4 Fix: Revoke plan access after refund
        // 4a. Fetch user to check for active subscription
        const { data: user } = await supabase
            .from("users")
            .select("razorpay_subscription_id, subscription_status")
            .eq("id", session.id)
            .single() as { data: any; error: any };

        // 4b. Cancel Razorpay subscription if one exists
        if (user?.razorpay_subscription_id) {
            try {
                await razorpay.subscriptions.cancel(user.razorpay_subscription_id, false);
            } catch (cancelError) {
                // Subscription may already be cancelled/completed — log but continue
                console.error("Failed to cancel Razorpay subscription during refund:", cancelError);
            }
        }

        // 4c. Revoke plan access in DB
        await (supabase.from("users") as any).update({
            plan_type: "free",
            plan_expires_at: null,
            subscription_status: "expired",
            updated_at: new Date().toISOString()
        }).eq("id", session.id);

        // 4d. Invalidate session cache so UI reflects changes immediately
        await invalidateSessionCache(session.id);

        return NextResponse.json({ success: true, refundId: refund.id });

    } catch (error: any) {
        // Bug 3 Fix: Don't leak internal error details
        console.error("Refund Error:", error);
        return NextResponse.json({
            error: "Refund failed"
        }, { status: 500 });
    }
}
