import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { razorpay } from "@/lib/razorpay";
import { ratelimit } from "@/lib/ratelimit";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
    try {
        const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const { success } = await ratelimit.limit(ip);
        if (!success) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount
        } = body;

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            throw new Error("Razorpay Key Secret is missing");
        }

        // Verify signature using timingSafeEqual
        const hmac = crypto.createHmac("sha256", secret);
        hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
        const generatedSignature = Buffer.from(hmac.digest("hex"), 'utf-8');
        const receivedSignature = Buffer.from(razorpay_signature, 'utf-8');

        if (generatedSignature.length !== receivedSignature.length || !crypto.timingSafeEqual(generatedSignature, receivedSignature)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        // Bypass strict Supabase typing which is failing during build
        const supabase = getSupabaseAdmin() as any;

        // Fetch the order from Razorpay to get trusted details (Validation)
        const order = await razorpay.orders.fetch(razorpay_order_id);

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // 2.1: Validate amount BEFORE plan upgrade
        const finalAmount = Number(order.amount);
        if (!finalAmount || finalAmount <= 0) {
            logger.error("Invalid payment amount detected — rejecting", { amount: finalAmount, orderId: razorpay_order_id, category: "payment" });
            return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
        }

        // Trust the NOTES from the server-created order, NOT the client body
        const planName = order.notes?.planId; // stored as 'planId' in notes
        const interval = order.notes?.interval;

        // Map Plan Name to Plan Type (DB Enum)
        let planType = "starter";
        if (planName === "Pro Pack") planType = "pro";
        else if (planName === "Growth Pack") planType = "growth";
        else if (planName === "Starter Pack") planType = "starter";

        // Determine expiration based on interval
        const expiresAt = new Date();
        if (interval === "yearly") {
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        } else {
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        // Update user plan (amount already validated above)
        // Bug 16 Fix: Also set subscription_status and subscription_interval
        const { error: userError } = await (supabase
            .from("users") as any)
            .update({
                plan_type: planType,
                plan_expires_at: expiresAt.toISOString(),
                subscription_status: "active",
                subscription_interval: interval || "monthly",
                updated_at: new Date().toISOString()
            })
            .eq("id", session.id);

        if (userError) throw userError;

        // Bug 16 Fix: Invalidate session cache so UI reflects changes immediately
        try {
            const { invalidateSessionCache } = await import("@/lib/auth/cache");
            await invalidateSessionCache(session.id);
        } catch (cacheError) {
            logger.error("Cache invalidation failed in order verify", { category: "payment" }, cacheError as Error);
        }

        // Log payment
        const { error: paymentError } = await (supabase
            .from("payments") as any)
            .insert({
                user_id: session.id,
                razorpay_payment_id,
                razorpay_order_id,
                razorpay_signature,
                amount: order.amount, // Store raw amount in Paise (smallest unit)
                currency: order.currency || "INR",
                status: "paid"
            });

        if (paymentError) logger.error("Payment logging error", { category: "payment" }, paymentError as Error);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        logger.error("Razorpay Verification Error", { category: "payment" }, error as Error);
        // P1 Fix: Don't leak error details
        return NextResponse.json({
            error: "Verification failed"
        }, { status: 500 });
    }
}
