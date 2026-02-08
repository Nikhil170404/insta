import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { invalidateSessionCache } from "@/lib/auth/cache";

export async function POST(req: Request) {
    let eventLogId: string | null = null;

    try {
        const text = await req.text();
        const signature = req.headers.get("x-razorpay-signature");
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

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

        // Log Webhook Event
        const { data: insertedEvent, error: logError } = await (supabase.from("webhook_events") as any).insert({
            event_id: event.id,
            event_type: event.event,
            payload: event,
            status: 'received'
        }).select("id").single();

        if (insertedEvent) eventLogId = insertedEvent.id;

        if (logError) console.error("Failed to log webhook event:", logError);

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
                    expiryDate.setDate(expiryDate.getDate() + 35); // Monthly + 5 days buffer
                }

                // Determine Plan Type from Notes
                // notes.planName should be "Starter Pack" or "Pro Pack"
                const planName = notes?.planName || "Starter Pack";
                let planType = "starter";

                if (planName === "Pro Pack") planType = "pro";
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
                    amount: payment.amount, // Store raw amount in Paise
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

                await invalidateSessionCache(userId);

                // --- NEW: Populate Subscriptions & Invoices Table ---
                try {
                    // Upsert Subscription
                    const currentStart = subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : new Date().toISOString();
                    const currentEnd = subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : expiryDate.toISOString();

                    const { data: existingSub } = await (supabase.from("subscriptions") as any).select("id").eq("razorpay_subscription_id", subscription.id).single();

                    if (existingSub) {
                        await (supabase.from("subscriptions") as any).update({
                            status: "active",
                            current_period_start: currentStart,
                            current_period_end: currentEnd,
                            updated_at: new Date().toISOString()
                        }).eq("id", existingSub.id);
                    } else {
                        await (supabase.from("subscriptions") as any).insert({
                            user_id: userId,
                            razorpay_subscription_id: subscription.id,
                            plan_id: subscription.plan_id,
                            status: "active",
                            current_period_start: currentStart,
                            current_period_end: currentEnd,
                            updated_at: new Date().toISOString()
                        });
                    }

                    // Insert Invoice
                    // Generate Invoice Number: INV-YYYYMM-RANDOM
                    const dateStr = new Date().toISOString().slice(0, 7).replace(/-/g, ""); // YYYYMM
                    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
                    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

                    // Need to link to the payment record we just created.
                    // We can query it by razorpay_payment_id
                    const { data: paymentRecord } = await (supabase.from("payments") as any)
                        .select("id")
                        .eq("razorpay_payment_id", payment.id)
                        .single();

                    await (supabase.from("invoices") as any).insert({
                        user_id: userId,
                        payment_id: paymentRecord?.id, // Link if found
                        invoice_number: invoiceNumber,
                        amount: payment.amount,
                        currency: payment.currency,
                        tax_amount: payment.tax || 0,
                        billing_details: {
                            name: notes?.name, // If captured
                            email: notes?.email, // If captured
                            address: notes?.address // If captured
                        },
                        created_at: new Date().toISOString()
                    });

                } catch (infraError) {
                    console.error("Failed to populate sub/invoice tables:", infraError);
                    // Don't fail the webhook response for this secondary data
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
                await invalidateSessionCache(userId);

                // Update Subscription Status in Table
                try {
                    await (supabase.from("subscriptions") as any).update({
                        status: "halted",
                        updated_at: new Date().toISOString()
                    }).eq("razorpay_subscription_id", subscription.id);
                } catch (e) {
                    console.error("Failed to update subscription status (halted):", e);
                }


                // Send Dunning Email
                try {
                    const { sendPaymentFailedEmail } = await import("@/lib/notifications/email");
                    const { data: user } = await supabase.from("users").select("email, plan_type").eq("id", userId).single() as any;
                    if (user?.email) {
                        // Retry link could be the billing page
                        const retryLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`;
                        await sendPaymentFailedEmail(user.email, user.plan_type || "Subscription", retryLink);
                    }
                } catch (e) {
                    console.error("Failed to send dunning email:", e);
                }
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
                await invalidateSessionCache(userId);

                // Update Subscription Status in Table
                try {
                    await (supabase.from("subscriptions") as any).update({
                        status: "completed",
                        updated_at: new Date().toISOString()
                    }).eq("razorpay_subscription_id", subscription.id);
                } catch (e) {
                    console.error("Failed to update subscription status (completed):", e);
                }
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
                await invalidateSessionCache(userId);

                // Update Subscription Status in Table
                try {
                    await (supabase.from("subscriptions") as any).update({
                        status: "cancelled",
                        updated_at: new Date().toISOString()
                    }).eq("razorpay_subscription_id", subscription.id);
                } catch (e) {
                    console.error("Failed to update subscription status (cancelled):", e);
                }
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
                        amount: payment.amount, // Store raw amount in Paise
                        status: "failed",
                        currency: payment.currency || "INR"
                    });

                    // Send Failed Payment Email
                    try {
                        const { sendPaymentFailedEmail } = await import("@/lib/notifications/email");
                        if (user.email) { // existing user object might not have email depending on query above, verify schema
                            // fetch email if needed
                            const { data: fullUser } = await supabase.from("users").select("email, plan_type").eq("id", user.id).single() as any;

                            if (fullUser?.email) {
                                const retryLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`;
                                await sendPaymentFailedEmail(fullUser.email, fullUser.plan_type || "Subscription", retryLink);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to send payment failed email:", e);
                    }
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

        if (eventLogId) {
            await (supabase.from("webhook_events") as any).update({ status: 'processed' }).eq('id', eventLogId);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);

        if (eventLogId) {
            const supabase = getSupabaseAdmin();
            await (supabase.from("webhook_events") as any).update({
                status: 'failed',
                // we might add an error_message column if it exists, otherwise just fail status is good enough
            }).eq('id', eventLogId);
        }

        // P1 Fix: Don't leak error messages
        return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
    }
}
