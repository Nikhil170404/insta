import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";
import { getSession } from "@/lib/auth/session";
import { z } from "zod";

const updateEmailSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const supabase = getSupabaseAdmin();

        const body = await req.json();
        const result = updateEmailSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error.errors[0].message },
                { status: 400 }
            );
        }

        const { email } = result.data;
        const userId = session.id;

        // Check if email is already taken (optional, but good practice)
        // For now, we assume it's fine since we are just storing contact email, 
        // not changing auth email (which is handled by Supabase Auth).
        // Actually, we are updating the `email` column in `public.users`.

        const { error } = await (supabase
            .from("users") as any)
            .update({ email })
            .eq("id", userId);

        if (error) {
            console.error("Error updating email:", error);
            return NextResponse.json(
                { error: "Failed to update email" },
                { status: 500 }
            );
        }

        // Attempt to invalidate cache (if applicable)
        try {
            const { invalidateSessionCache } = await import("@/lib/auth/cache");
            await invalidateSessionCache(userId);
        } catch (e) {
            console.error("Cache invalidation error:", e);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error in update-email route:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
