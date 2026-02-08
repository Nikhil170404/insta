import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET() {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ user: null }, { status: 200 });
        }

        // Fetch fresh user data from DB
        const supabase = getSupabaseAdmin();
        const { data: user, error } = await supabase
            .from("users")
            .select("*")
            .eq("id", session.id)
            .single();

        if (error || !user) {
            console.error("Error fetching user session data:", error);
            return NextResponse.json({ user: session }); // Fallback to session data
        }

        return NextResponse.json({ user });
    } catch (error) {
        return NextResponse.json({ user: null }, { status: 200 });
    }
}
