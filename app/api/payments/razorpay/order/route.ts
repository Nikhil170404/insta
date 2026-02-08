import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";
import { getPlanByName } from "@/lib/pricing";
import { ratelimit } from "@/lib/ratelimit";

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

        const { planId, interval } = await req.json();

        // Server-side price lookup
        const plan = getPlanByName(planId);

        if (!plan) {
            return NextResponse.json({ error: "Invalid Plan ID" }, { status: 400 });
        }

        let amount = 0;
        if (interval === "yearly") {
            amount = parseInt(plan.yearlyPrice || "0");
        } else {
            amount = parseInt(plan.price);
        }

        if (amount <= 0) {
            return NextResponse.json({ error: "Invalid Plan Amount" }, { status: 400 });
        }

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
            currency: "INR",
            receipt: `receipt_${Date.now()}_${session.id.slice(0, 8)}`,
            notes: {
                userId: session.id,
                planId: planId, // This is actually the plan NAME in our current logic (e.g. "Starter Pack")
                interval: interval,
                instagramUsername: session.instagram_username
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json(order);
    } catch (error: any) {
        console.error("Razorpay Order Error:", error);
        // P1 Fix: Don't leak error messages
        return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }
}
