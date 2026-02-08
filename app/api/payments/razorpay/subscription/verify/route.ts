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
        else if (planName === "Growth Pack") planType = "growth";
        else if (planName === "Starter Pack") planType = "starter";

        // Calculate Expiry
        const expiryDate = new Date();
        if (isYearly) {
            expiryDate.setDate(expiryDate.getDate() + 366); // Yearly + buffer
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

        // Also log the payment
        await (supabase.from("payments") as any).insert({
            user_id: session.id,
            razorpay_payment_id: razorpay_payment_id,
            razorpay_subscription_id: razorpay_subscription_id,
            amount: 0, // We might not know the exact amount here easily without fetching, can leave 0 or fetch from API. 
            // Webhook will update it accurately.
            status: "paid",
            currency: "INR" // Assumption
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Verification Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
