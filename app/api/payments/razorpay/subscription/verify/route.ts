import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";
import { razorpay } from "@/lib/razorpay";
import { PLANS_ARRAY } from "@/lib/pricing";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const {
            razorpay_payment_id,
            razorpay_subscription_id,
            razorpay_signature
        } = body;

        if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
            return NextResponse.json({ error: "Missing verification fields" }, { status: 400 });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // Verify Signature (Safe)
        const generatedSignature = Buffer.from(
            crypto
                .createHmac("sha256", secret)
                .update(razorpay_payment_id + "|" + razorpay_subscription_id)
                .digest("hex"),
            'utf-8'
        );
        const receivedSignature = Buffer.from(razorpay_signature, 'utf-8');

        if (generatedSignature.length !== receivedSignature.length || !crypto.timingSafeEqual(generatedSignature, receivedSignature)) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        // Verify Ownership: Fetch subscription to check userId
        const subscription = await razorpay.subscriptions.fetch(razorpay_subscription_id);

        if (!subscription || subscription.notes?.userId !== session.id) {
            return NextResponse.json({ error: "Subscription verification failed: Ownership mismatch" }, { status: 403 });
        }

        // Signature checks out. Update DB.
        const supabase = getSupabaseAdmin();

        // Determine Plan Interval & Type
        // We already fetched 'subscription' above for ownership check
        const planId = subscription.plan_id;
        const notes = subscription.notes;

        // Check if Yearly
        const pricingPlan = PLANS_ARRAY.find((p: any) => p.monthlyPlanId === planId || p.yearlyPlanId === planId);

        const isYearly = pricingPlan?.yearlyPlanId === planId;
        const planName = pricingPlan?.name || notes?.planName || "Starter Pack";

        let planType = "starter";
        if (planName === "Pro Pack") planType = "pro";
        else if (planName === "Starter Pack") planType = "starter";

        // Calculate Expiry
        const expiryDate = new Date();
        if (isYearly) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            expiryDate.setDate(expiryDate.getDate() + 5); // Yearly + buffer
        } else {
            expiryDate.setDate(expiryDate.getDate() + 32); // Monthly + buffer
        }

        await (supabase.from("users") as any).update({
            razorpay_subscription_id: razorpay_subscription_id,
            subscription_status: "active",
            plan_type: planType,
            plan_expires_at: expiryDate.toISOString(),
            updated_at: new Date().toISOString()
        }).eq("id", session.id);

        // Fetch payment details to get exact amount and currency
        let paymentAmount = 0;
        let paymentCurrency = "INR";

        try {
            const payment = await razorpay.payments.fetch(razorpay_payment_id);
            if (payment) {
                paymentAmount = Number(payment.amount); // Amount in paise
                paymentCurrency = payment.currency;
            }
        } catch (fetchError) {
            console.error("Error fetching payment details:", fetchError);
            // Fallback to 0 if fetch fails, but log it. 
            // Ideally we should probably fail, but let's not block the user activation if signature was valid.
        }

        // Also log the payment
        await (supabase.from("payments") as any).insert({
            user_id: session.id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_subscription_id: razorpay_subscription_id,
            amount: paymentAmount,
            status: "paid",
            currency: paymentCurrency
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Verification Error:", error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    } finally {
        // Invalidate cache so UI updates immediately
        // We need session to be available, or pass userId if we have it
        try {
            const session = await getSession();
            if (session?.id) {
                const { invalidateSessionCache } = await import("@/lib/auth/cache");
                await invalidateSessionCache(session.id);
            }
        } catch (e) {
            console.error("Cache invalidation failed in verify:", e);
        }
    }
}
