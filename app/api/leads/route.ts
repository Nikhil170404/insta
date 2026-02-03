import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

// POST - Save a new lead
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { automation_id, instagram_user_id, instagram_username, email, phone, metadata } = await request.json();

        if (!instagram_user_id) {
            return NextResponse.json({ error: "Instagram user ID is required" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        const { data, error } = await (supabase as any)
            .from("leads")
            .insert({
                user_id: session.id,
                automation_id: automation_id || null,
                instagram_user_id,
                instagram_username: instagram_username || null,
                email: email || null,
                phone: phone || null,
                metadata: metadata || null,
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, lead: data });
    } catch (error) {
        console.error("Error saving lead:", error);
        return NextResponse.json(
            { error: "Failed to save lead" },
            { status: 500 }
        );
    }
}

// GET - Fetch leads for the user
export async function GET(request: NextRequest) {
    try {
        const session = await getSession();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const automation_id = searchParams.get("automation_id");
        const limit = parseInt(searchParams.get("limit") || "100");

        let query = (supabase as any)
            .from("leads")
            .select("*")
            .eq("user_id", session.id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (automation_id) {
            query = query.eq("automation_id", automation_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({
            leads: data || [],
            count: data?.length || 0
        });
    } catch (error) {
        console.error("Error fetching leads:", error);
        return NextResponse.json(
            { error: "Failed to fetch leads" },
            { status: 500 }
        );
    }
}
