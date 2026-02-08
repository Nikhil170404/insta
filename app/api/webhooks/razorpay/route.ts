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
                // IDEMPOTENCY CHECK: Check if this payment ID already exists
                const { data: existingPayment } = await supabase
                    .from("payments")
                    .select("id")
                    .eq("razorpay_payment_id", payment.id)
                    .single();

                if (existingPayment) {
                    console.log(`Payment ${payment.id} already processed. Skipping.`);
                    return NextResponse.json({ received: true });
                }

                // Calculate new expiry (safe buffer logic)
                const expiryDate = new Date();

                // Check subscription period
                // Razorpay 'period' can be 'daily', 'weekly', 'monthly', 'yearly'
                // Defaults to monthly logic if not yearly
                if (subscription.period === 'yearly') {
                    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                    // Add buffer of 5 days
                    expiryDate.setDate(expiryDate.getDate() + 5);
                } else {
                    expiryDate.setDate(expiryDate.getDate() + 32);
                }

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

                // Send Receipt Email
                try {
                    const { sendReceiptEmail } = await import("@/lib/notifications/email");
                    // Fetch user email
                    const { data: user } = await supabase.from("users").select("email").eq("id", userId).single() as any;

                    if (user?.email) {
                        const amountFormatted = (payment.amount / 100).toFixed(2);
                        await sendReceiptEmail(user.email, planName, amountFormatted, new Date().toDateString());
                    }
                } catch (emailError) {
                    console.error("Failed to send receipt email:", emailError);
                }
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
                // Fetch user from razorpay_subscription_id if notes are missing
                const { data: user } = await (supabase.from("users") as any)
                    .select("id")
                    .eq("razorpay_subscription_id", subscriptionId)
                    .single();

                if (user) {
                    await (supabase.from("payments") as any).insert({
                        user_id: user.id,
                        razorpay_payment_id: payment.id,
                        razorpay_subscription_id: subscriptionId,
                        amount: payment.amount / 100,
                        status: "failed",
                        currency: payment.currency || "INR"
                    });
                }

                console.log(`Payment failed for subscription/order ${subscriptionId}: ${payment.error_description}`);
            }
        }

        // Handle Refund
        else if (event.event === "refund.created") {
            const refund = payload.refund.entity;
            const paymentId = refund.payment_id;
            console.log(`Refund created for payment ${paymentId}`);
            // Update payment status if we have it?
            // Note: DB constraint updated to allow 'refunded'
            await (supabase.from("payments") as any).update({
                status: "refunded"
            }).eq("razorpay_payment_id", paymentId);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        // P1 Fix: Don't leak error messages
        return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
    }
}
