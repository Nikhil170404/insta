import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { invalidateSessionCache } from "@/lib/auth/cache";
import { logger } from "@/lib/logger";

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

        if (logError) logger.error("Failed to log webhook event", { category: "payment" }, logError as Error);

        // Handle Subscription Charged
        if (event.event === "subscription.charged") {
            const payment = payload.payment.entity;
            const subscription = payload.subscription.entity;
            const notes = subscription.notes;
            const userId = notes?.userId;

            // 2.3: Defensive userId validation
            if (!userId || typeof userId !== "string" || userId.trim().length === 0) {
                logger.warn("Subscription charged but userId is missing or invalid in notes — skipping", {
                    eventId: event.id,
                    subscriptionId: subscription.id,
                    category: "payment",
                });
                // Still return 200 to acknowledge the webhook
                if (eventLogId) {
                    await (supabase.from("webhook_events") as any).update({ status: 'skipped_no_user' }).eq('id', eventLogId);
                }
                return NextResponse.json({ received: true });
            }

            // IDEMPOTENCY CHECK: Check if this payment ID already exists
            const { data: existingPayment } = await supabase
                .from("payments")
                .select("id")
                .eq("razorpay_payment_id", payment.id)
                .single();

            if (existingPayment) {
                logger.info("Payment already processed — skipping", { paymentId: payment.id, category: "payment" });
                return NextResponse.json({ received: true });
            }

            // Calculate new expiry (safe buffer logic)
            const expiryDate = new Date();

            // Check subscription period
            if (subscription.period === 'yearly') {
                expiryDate.setFullYear(expiryDate.getFullYear() + 1);
                expiryDate.setDate(expiryDate.getDate() + 5);
            } else {
                expiryDate.setDate(expiryDate.getDate() + 35); // Monthly + 5 days buffer
            }

            // Determine Plan Type from Notes
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
                logger.error("Failed to send receipt email", { category: "payment" }, emailError as Error);
            }

            await invalidateSessionCache(userId);

            // --- Populate Subscriptions & Invoices Table ---
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
                // 2.5: Crypto-safe invoice number generation
                const dateStr = new Date().toISOString().slice(0, 7).replace(/-/g, ""); // YYYYMM
                const randomSuffix = crypto.randomInt(10000).toString().padStart(4, "0");
                const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

                // Link to the payment record we just created
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
                        name: notes?.name,
                        email: notes?.email,
                        address: notes?.address
                    },
                    created_at: new Date().toISOString()
                });

            } catch (infraError) {
                logger.error("Failed to populate sub/invoice tables", { category: "payment" }, infraError as Error);
                // Don't fail the webhook response for this secondary data
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
                    logger.error("Failed to update subscription status (halted)", { category: "payment" }, e as Error);
                }


                // Send Dunning Email
                try {
                    const { sendPaymentFailedEmail } = await import("@/lib/notifications/email");
                    const { data: user } = await supabase.from("users").select("email, plan_type").eq("id", userId).single() as any;
                    if (user?.email) {
                        const retryLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`;
                        await sendPaymentFailedEmail(user.email, user.plan_type || "Subscription", retryLink);
                    }
                } catch (e) {
                    logger.error("Failed to send dunning email", { category: "payment" }, e as Error);
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
                    logger.error("Failed to update subscription status (completed)", { category: "payment" }, e as Error);
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
                    logger.error("Failed to update subscription status (cancelled)", { category: "payment" }, e as Error);
                }
            }
        }

        // Handle Payment Failed
        else if (event.event === "payment.failed") {
            const payment = payload.payment.entity;
            const subscriptionId = payment.order_id || payment.subscription_id;

            if (subscriptionId) {
                const { data: user } = await (supabase.from("users") as any)
                    .select("id")
                    .eq("razorpay_subscription_id", subscriptionId)
                    .single();

                if (user) {
                    await (supabase.from("payments") as any).insert({
                        user_id: user.id,
                        razorpay_payment_id: payment.id,
                        razorpay_subscription_id: subscriptionId,
                        amount: payment.amount,
                        status: "failed",
                        currency: payment.currency || "INR"
                    });

                    // Send Failed Payment Email
                    try {
                        const { sendPaymentFailedEmail } = await import("@/lib/notifications/email");
                        if (user.email) {
                            const { data: fullUser } = await supabase.from("users").select("email, plan_type").eq("id", user.id).single() as any;

                            if (fullUser?.email) {
                                const retryLink = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`;
                                await sendPaymentFailedEmail(fullUser.email, fullUser.plan_type || "Subscription", retryLink);
                            }
                        }
                    } catch (e) {
                        logger.error("Failed to send payment failed email", { category: "payment" }, e as Error);
                    }
                }

                logger.info("Payment failed for subscription/order", { subscriptionId, errorDescription: payment.error_description, category: "payment" });
            }
        }

        // Handle Refund
        else if (event.event === "refund.created") {
            const refund = payload.refund.entity;
            const paymentId = refund.payment_id;
            logger.info("Refund created for payment", { paymentId, category: "payment" });
            await (supabase.from("payments") as any).update({
                status: "refunded"
            }).eq("razorpay_payment_id", paymentId);
        }

        if (eventLogId) {
            await (supabase.from("webhook_events") as any).update({ status: 'processed' }).eq('id', eventLogId);
        }

        return NextResponse.json({ received: true });

    } catch (error: any) {
        logger.error("Webhook Error", { category: "payment" }, error as Error);

        if (eventLogId) {
            const supabase = getSupabaseAdmin();
            await (supabase.from("webhook_events") as any).update({
                status: 'failed',
            }).eq('id', eventLogId);
        }

        // P1 Fix: Don't leak error messages
        return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
    }
}
