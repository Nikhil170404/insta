import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getSession } from "@/lib/auth/session";

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { amount, planId } = await req.json();

        if (!amount || !planId) {
            return NextResponse.json({ error: "Amount and Plan ID are required" }, { status: 400 });
        }

        const options = {
            amount: Math.round(amount * 100), // amount in smallest currency unit (paise)
            currency: "INR",
            receipt: `receipt_${Date.now()}_${session.id.slice(0, 8)}`,
            notes: {
                userId: session.id,
                planId: planId,
                instagramUsername: session.instagram_username
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json(order);
    } catch (error: any) {
        console.error("Razorpay Order Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
    }
}
