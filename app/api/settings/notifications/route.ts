import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const { data: user, error } = await (supabase.from("users") as any)
        .select("notification_settings")
        .eq("id", session.id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = (user as any)?.notification_settings;

    return NextResponse.json(settings || {
        dm_sent: true,
        billing: true,
        security: true,
        web_push_token: null
    });
}

export async function PATCH(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const supabase = getSupabaseAdmin();

    const { error } = await (supabase.from("users") as any)
        .update({
            notification_settings: body
        })
        .eq("id", session.id);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
