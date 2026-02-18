import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import { PLANS_ARRAY } from "@/lib/pricing";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { ratelimit } from "@/lib/ratelimit";

export async function POST(req: Request) {
    try {
        // P1 Audit Fix: Unified Rate Limiting
        const { checkRateLimit, getRateLimitIdentifier } = await import("@/lib/rate-limit-middleware");
        const identifier = getRateLimitIdentifier(req as any); // IP-based for pre-auth
        const rateLimit = await checkRateLimit("auth", identifier);

        if (!rateLimit.success) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }


        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check for existing active subscription to prevent duplicates
        const supabase = getSupabaseAdmin();
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("plan_type, plan_expires_at, subscription_status, razorpay_subscription_id")
            .eq("id", session.id)
            .single() as { data: any, error: any };

        if (userError) {
            console.error("Error checking user subscription status:", userError);
            return NextResponse.json({ error: "Failed to verify account status" }, { status: 500 });
        }

        const activePlans = ['starter', 'pro'];
        const isActive = activePlans.includes(userData.plan_type) &&
            userData.plan_expires_at &&
            new Date(userData.plan_expires_at) > new Date();

        if (isActive) {
            return NextResponse.json({
                error: "You already have an active subscription. Please cancel your current plan first."
            }, { status: 400 });
        }

        const body = await req.json();
        const { planId } = body;

        if (!planId) {
            return NextResponse.json({ error: "Plan ID is required" }, { status: 400 });
        }

        // Check for existing PENDING subscription to reuse
        if (userData.subscription_status === 'created' && userData.razorpay_subscription_id) {
            try {
                const existingSub = await razorpay.subscriptions.fetch(userData.razorpay_subscription_id);
                // If it's the same plan and still in created state, return it
                if (existingSub.status === 'created' && existingSub.plan_id === planId) {
                    console.log(`Reusing existing pending subscription: ${existingSub.id}`);
                    return NextResponse.json({
                        subscriptionId: existingSub.id,
                        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
                    });
                }
            } catch (e) {
                console.warn("Failed to fetch existing pending subscription, creating new one.", e);
            }
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
        // supabase instance already created above

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
        // P1 Fix: Don't leak error messages
        return NextResponse.json({
            error: "Subscription creation failed"
        }, { status: 500 });
    }
}
