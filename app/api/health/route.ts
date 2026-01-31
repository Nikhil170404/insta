import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/client";

export async function GET() {
    const supabase = getSupabaseAdmin();

    try {
        // Test DB connection with a simple query
        const { data, error } = await (supabase as any)
            .from('users')
            .select('id')
            .limit(1);

        if (error) {
            console.error("Health Check DB Error:", error);
            throw error;
        }

        return NextResponse.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            version: '1.2.0',
            environment: process.env.NODE_ENV
        });
    } catch (error) {
        return NextResponse.json({
            status: 'unhealthy',
            error: (error as Error).message,
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}
