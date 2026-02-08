
import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";

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

        // Verify Signature
        // For subscriptions, the signature is created as:
        // hmac_sha256(razorpay_payment_id + "|" + razorpay_subscription_id, secret)
        const generated_signature = crypto
            .createHmac("sha256", secret)
            .update(razorpay_payment_id + "|" + razorpay_subscription_id)
            .digest("hex");

        if (generated_signature !== razorpay_signature) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
        }

        // Signature checks out. Update DB.
        const supabase = getSupabaseAdmin();

        // Calculate expiry (approximate, webhook will correct it)
        // Default 30 days buffer for now, webhook logic is better but this gives immediate access
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 32);

        await (supabase.from("users") as any).update({
            razorpay_subscription_id: razorpay_subscription_id,
            subscription_status: "active",
            plan_type: "paid", // You might want to be more specific if possible, but 'paid' is safe
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
