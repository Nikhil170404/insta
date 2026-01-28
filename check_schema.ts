import { getSupabaseAdmin } from "./lib/supabase/client";

async function checkSchema() {
    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase as any)
        .from("dm_logs")
        .select("*")
        .limit(1);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Columns:", Object.keys(data[0] || {}));
    }
}

checkSchema();
