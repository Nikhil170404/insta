import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import { PLANS_ARRAY } from "@/lib/pricing";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { planId } = body;

        if (!planId) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        // Fetch Plan details to determine total_count
        let plan;
        try {
            plan = await razorpay.plans.fetch(planId);
        } catch (err) {
            console.error("Error fetching plan:", err);
            return NextResponse.json({ error: "Invalid Plan ID" }, { status: 400 });
        }

        const isYearly = plan.period === "yearly";
        const totalCount = isYearly ? 10 : 120; // 10 years for both

        console.log(`Creating subscription for ${planId} (${plan.period}), total_count: ${totalCount}`);

        // Lookup Plan Name from our config
        const pricingPlan = PLANS_ARRAY.find((p: any) => p.monthlyPlanId === planId || p.yearlyPlanId === planId);
        const planName = pricingPlan ? pricingPlan.name : "Unknown Plan";

        // Create Subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: totalCount,
            notes: {
                userId: session.id,
                planId: planId,
                planName: planName // Store "Starter Pack", "Pro Pack" etc.
            }
        });

        // Store subscription ID in DB immediately
        const supabase = getSupabaseAdmin();

        await (supabase.from("users") as any).update({
            razorpay_subscription_id: subscription.id,
            subscription_status: "created", // Initial state
            subscription_interval: plan.period
        }).eq("id", session.id);

        return NextResponse.json({
            subscriptionId: subscription.id,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        });

    } catch (error: any) {
        console.error("Razorpay Subscription Error:", error);
        return NextResponse.json({
            error: "Subscription creation failed",
            details: error.message
        }, { status: 500 });
    }
}
