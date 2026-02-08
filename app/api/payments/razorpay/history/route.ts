
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const { data: payments, error } = await supabase
            .from("payments")
            .select("*")
            .eq("user_id", session.id)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching payment history:", error);
            return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
        }

        return NextResponse.json({ payments });
    } catch (error) {
        console.error("Payment history error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
