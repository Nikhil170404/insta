
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const offset = (page - 1) * limit;

        const supabase = getSupabaseAdmin();
        const { data: payments, error, count } = await supabase
            .from("payments")
            .select("*", { count: "exact" })
            .eq("user_id", session.id)
            .order("created_at", { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error("Error fetching payment history:", error);
            return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
        }

        return NextResponse.json({
            payments,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil((count || 0) / limit)
            }
        });
    } catch (error) {
        console.error("Payment history error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
