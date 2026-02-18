import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";
import { razorpay } from "@/lib/razorpay";
import { PLANS_ARRAY } from "@/lib/pricing";

export async function POST(req: Request) {
    let sessionId: string | null = null;
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        sessionId = session.id;

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
            expiryDate.setDate(expiryDate.getDate() + 35); // Monthly + 5 days buffer
        }

        // Fetch payment details to get exact amount and currency
        let paymentAmount: number;
        let paymentCurrency: string;

        try {
            const payment = await razorpay.payments.fetch(razorpay_payment_id);
            paymentAmount = Number(payment.amount); // Amount in paise
            paymentCurrency = payment.currency;
        } catch (fetchError) {
            // Bug 4 Fix: Fail instead of storing $0 — the webhook will activate the plan as fallback
            console.error("Error fetching payment details:", fetchError);
            return NextResponse.json({ error: "Unable to verify payment amount. Your plan will activate shortly via automatic confirmation." }, { status: 502 });
        }

        // --- ATOMIC DB UPDATE (RPC) ---
        const currentStart = subscription.current_start ? new Date(subscription.current_start * 1000).toISOString() : new Date().toISOString();
        const currentEnd = subscription.current_end ? new Date(subscription.current_end * 1000).toISOString() : expiryDate.toISOString();

        const { error: rpcError } = await (supabase.rpc as any)("verify_subscription_payment", {
            p_user_id: session.id,
            p_razorpay_payment_id: razorpay_payment_id,
            p_razorpay_subscription_id: razorpay_subscription_id,
            p_plan_type: planType,
            p_plan_expires_at: expiryDate.toISOString(),
            p_payment_amount: paymentAmount,
            p_payment_currency: paymentCurrency,
            p_payment_status: "paid",
            p_subscription_status: "active",
            p_current_period_start: currentStart,
            p_current_period_end: currentEnd,
            p_plan_id: planId
        });

        if (rpcError) {
            console.error("RPC Error in verify:", rpcError);
            return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Verification Error:", error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    } finally {
        // Bug 5 Fix: Reuse sessionId captured at start — no double getSession() call
        if (sessionId) {
            try {
                const { invalidateSessionCache } = await import("@/lib/auth/cache");
                await invalidateSessionCache(sessionId);
            } catch (e) {
                console.error("Cache invalidation failed in verify:", e);
            }
        }
    }
}
