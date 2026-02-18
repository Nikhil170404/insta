
import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getPlanByRazorpayId, PLAN_HIERARCHY } from "@/lib/pricing";
import { invalidateSessionCache } from "@/lib/auth/cache";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Bug 13 Fix: Rate limiting (same pattern as cancel route)
        try {
            const { ratelimit } = await import("@/lib/ratelimit");
            const { success } = await ratelimit.limit(`change_sub_${session.id}`);
            if (!success) {
                return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
            }
        } catch (e) {
            console.error("Rate limit error:", e);
        }

        const body = await req.json();
        const { newPlanId } = body;

        if (!newPlanId) {
            return NextResponse.json({ error: "New Plan ID is required" }, { status: 400 });
        }

        // Bug 14 Fix: Validate newPlanId against known plans
        const newPlanLookup = getPlanByRazorpayId(newPlanId);
        if (!newPlanLookup) {
            return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
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
        const isActive = ['active', 'created', 'authenticated'].includes(currentStatus);

        if (!isActive || !currentSubscriptionId) {
            return NextResponse.json({ error: "No active subscription to upgrade. Please use the create endpoint." }, { status: 400 });
        }

        // Bug 15 Fix: Fetch current subscription to prevent same-plan or downgrade
        const currentSubscription = await razorpay.subscriptions.fetch(currentSubscriptionId);
        const currentPlanId = currentSubscription.plan_id;

        if (newPlanId === currentPlanId) {
            return NextResponse.json({ error: "You are already on this plan." }, { status: 400 });
        }

        // Check hierarchy to prevent downgrades
        const currentPlanLookup = getPlanByRazorpayId(currentPlanId);
        const currentRank = PLAN_HIERARCHY[currentPlanLookup?.planType || "free"] ?? 0;
        const newRank = PLAN_HIERARCHY[newPlanLookup.planType] ?? 0;

        if (newRank <= currentRank) {
            return NextResponse.json({ error: "Downgrades are not supported through this endpoint. Please cancel and re-subscribe." }, { status: 400 });
        }

        console.log(`Upgrading subscription ${currentSubscriptionId} to plan ${newPlanId}`);

        // 2. Call Razorpay Update (Handles Proration Automatically)
        // Bug 1 Fix: Use correct remaining_count based on plan interval
        const remainingCount = newPlanLookup.isYearly ? 10 : 120;

        try {
            await razorpay.subscriptions.update(currentSubscriptionId, {
                plan_id: newPlanId,
                schedule_change_at: 'now',
                quantity: 1,
                remaining_count: remainingCount,
            });
        } catch (rzpError: any) {
            console.error("Razorpay Update Failed:", rzpError);
            return NextResponse.json({ error: "Failed to update subscription. Please try again." }, { status: 502 });
        }

        // Bug 1 Fix: 3. Update User Record in DB after successful Razorpay call
        const expiryDate = new Date();
        if (newPlanLookup.isYearly) {
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            expiryDate.setDate(expiryDate.getDate() + 5);
        } else {
            expiryDate.setDate(expiryDate.getDate() + 35);
        }

        await (supabase.from("users") as any).update({
            plan_type: newPlanLookup.planType,
            plan_expires_at: expiryDate.toISOString(),
            subscription_interval: newPlanLookup.isYearly ? "yearly" : "monthly",
            updated_at: new Date().toISOString()
        }).eq("id", session.id);

        // Invalidate session cache so UI reflects changes immediately
        await invalidateSessionCache(session.id);

        return NextResponse.json({
            success: true,
            message: "Plan upgraded successfully"
        });

    } catch (error: any) {
        console.error("Subscription Change Error:", error);
        return NextResponse.json({
            error: "Failed to process subscription upgrade. Please try again or contact support."
        }, { status: 500 });
    }
}
