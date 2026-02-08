
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { PLANS_ARRAY, getPlanByType } from "@/lib/pricing";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { newPlanId } = body;

        if (!newPlanId) {
            return NextResponse.json({ error: "New Plan ID is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("razorpay_subscription_id, plan_type, subscription_status")
            .eq("id", session.id)
            .single() as { data: any, error: any };

        if (userError || !user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // 1. Check if user has an active subscription
        const currentSubscriptionId = user.razorpay_subscription_id;
        const currentStatus = user.subscription_status;
        const isActive = currentStatus === 'active' || currentStatus === 'created'; // simplified check

        if (isActive && currentSubscriptionId) {
            // Cancel the OLD subscription immediately
            try {
                // cancel_at_cycle_end = false (Immediate cancellation)
                await razorpay.subscriptions.cancel(currentSubscriptionId, false);
                console.log(`Cancelled old subscription: ${currentSubscriptionId}`);
            } catch (cancelError) {
                console.error("Error cancelling old subscription:", cancelError);
                // Proceed anyway? Or fail? If we fail, user can't upgrade. 
                // Best to proceed but warn.
            }
        }

        // 2. Create NEW subscription
        // Fetch Plan details to determine total_count
        let plan;
        try {
            plan = await razorpay.plans.fetch(newPlanId);
        } catch (err) {
            return NextResponse.json({ error: "Invalid Plan ID" }, { status: 400 });
        }

        const isYearly = plan.period === "yearly";
        const totalCount = isYearly ? 10 : 120; // 10 years

        // Lookup Plan Name
        const pricingPlan = PLANS_ARRAY.find((p: any) => p.monthlyPlanId === newPlanId || p.yearlyPlanId === newPlanId);
        const planName = pricingPlan ? pricingPlan.name : "Unknown Plan";

        const subscription = await razorpay.subscriptions.create({
            plan_id: newPlanId,
            customer_notify: 1,
            total_count: totalCount,
            notes: {
                userId: session.id,
                planId: newPlanId,
                planName: planName
            }
        });

        // 3. Update User Record
        await (supabase.from("users") as any).update({
            razorpay_subscription_id: subscription.id, // Update with NEW ID
            subscription_status: "created",
            subscription_interval: plan.period
        }).eq("id", session.id);

        // 4. Invalidate Cache
        const { invalidateSessionCache } = await import("@/lib/auth/cache");
        await invalidateSessionCache(session.id);

        return NextResponse.json({
            subscriptionId: subscription.id,
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
        });

    } catch (error: any) {
        console.error("Subscription Change Error:", error);
        return NextResponse.json({
            error: "Failed to change subscription",
            details: error.message
        }, { status: 500 });
    }
}
