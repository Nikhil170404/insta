import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function POST(req: Request) {
    try {
        const text = await req.text();
        const signature = req.headers.get("x-razorpay-signature");
        const secret = process.env.RAZORPAY_KEY_SECRET; // Or dedicated webhook secret if configured

        if (!secret || !signature) {
            return NextResponse.json({ error: "Missing config" }, { status: 500 });
        }

        // Verify Signature using timingSafeEqual to prevent timing attacks
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(text);
        const generatedSignature = Buffer.from(hmac.digest("hex"), 'utf-8');
        const receivedSignature = Buffer.from(signature, 'utf-8');

        if (generatedSignature.length !== receivedSignature.length || !crypto.timingSafeEqual(generatedSignature, receivedSignature)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        const event = JSON.parse(text);
        const { payload } = event;
        const supabase = getSupabaseAdmin();

        // Handle Subscription Charged
        if (event.event === "subscription.charged") {
            const payment = payload.payment.entity;
            const subscription = payload.subscription.entity;
            const notes = subscription.notes;
            const userId = notes?.userId;

            if (userId) {
                // Calculate new expiry (safe buffer logic)
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 32);

                // Determine Plan Type from Notes
                // notes.planName should be "Starter Pack" or "Pro Pack"
                const planName = notes?.planName || "Starter Pack";
                let planType = "starter";

                if (planName === "Pro Pack") planType = "pro";
                else if (planName === "Growth Pack") planType = "growth";
                else if (planName === "Starter Pack") planType = "starter";

                await (supabase.from("users") as any).update({
                    plan_type: planType,
                    plan_expires_at: expiryDate.toISOString(),
                    razorpay_subscription_id: subscription.id,
                    subscription_status: "active",
                    updated_at: new Date().toISOString()
                }).eq("id", userId);

                // Log Payment
                await (supabase.from("payments") as any).insert({
                    user_id: userId,
                    razorpay_payment_id: payment.id,
                    razorpay_subscription_id: subscription.id,
                    amount: payment.amount / 100,
                    status: "paid",
                    currency: payment.currency
                });
            }
        }

        // Handle Subscription Halted (Payment failed multiple times)
        else if (event.event === "subscription.halted") {
            const subscription = payload.subscription.entity;
            const userId = subscription.notes?.userId;
            if (userId) {
                await (supabase.from("users") as any).update({
                    subscription_status: "halted"
                }).eq("id", userId);
            }
        }

        // Handle Subscription Completed (End of total count)
        else if (event.event === "subscription.completed") {
            const subscription = payload.subscription.entity;
            const userId = subscription.notes?.userId;
            if (userId) {
                await (supabase.from("users") as any).update({
                    subscription_status: "completed"
                }).eq("id", userId);
            }
        }

        // Handle Subscription Cancelled
        else if (event.event === "subscription.cancelled") {
            const subscription = payload.subscription.entity;
            const userId = subscription.notes?.userId;

            if (userId) {
                await (supabase.from("users") as any).update({
                    subscription_status: "cancelled"
                }).eq("id", userId);
                // We do NOT expire the plan immediately. They keep access until plan_expires_at.
            }
        }

        // Handle Payment Failed
        else if (event.event === "payment.failed") {
            const payment = payload.payment.entity;
            // payment.notes.userId might be present if it was a direct payment order, 
            // but for subscriptions, we might need to look up via subscription_id if Razorpay doesn't send notes on payment entity for subscription charges.
            // Trusted way: payload.payment.entity.notes.userId OR lookup subscription

            // For now, simple logging if we can find user
            // In many cases, payment.failed events for subscriptions CONTAIN the subscription_id
            const subscriptionId = payment.order_id || payment.subscription_id;

            // Try to log it in payments table matches
            if (subscriptionId) {
                // Here we might not strictly knwo the user_id without a lookup if notes are missing
                // usage of 'razorpay_subscription_id' to find user could work

                // For now, we will just log to console to avoid complex lookup in this MVP
                console.log(`Payment failed for subscription/order ${subscriptionId}: ${payment.error_description}`);
            }
        }

        // Handle Refund
        else if (event.event === "refund.created") {
            const refund = payload.refund.entity;
            const paymentId = refund.payment_id;
            console.log(`Refund created for payment ${paymentId}`);
            // Update payment status if we have it?
            await (supabase.from("payments") as any).update({
                status: "refunded"
            }).eq("razorpay_payment_id", paymentId);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
    }
}
