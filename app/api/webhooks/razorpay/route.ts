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

        // Verify Signature
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(text);
        const digest = hmac.digest("hex");

        if (digest !== signature) {
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
                // Calculate new expiry (30 days or yearly based on plan?)
                // Access period logic:
                // We should ideally fetch plan interval, but for now assuming monthly default or checking plan ID
                // Simple logic: Add 30 days from now (or from current expiry if valid)

                const now = new Date();
                const currentExpiry = new Date(); // Need to fetch user to overlap? 
                // Creating a new expiry date:
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 32); // Give slightly more than 30 days buffer

                await (supabase.from("users") as any).update({
                    plan_type: "paid", // or specific type based on plan ID checking
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

        return NextResponse.json({ received: true });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
    }
}
