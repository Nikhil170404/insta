
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually load .env.local
const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("📅 Analyzing DM Dates...");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Group by User
    const { data: users } = await supabase.from("users").select("id, instagram_username");

    for (const user of users || []) {
        const { count: total } = await supabase
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("reply_sent", true);

        const { count: monthly } = await supabase
            .from("dm_logs")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("reply_sent", true)
            .gte("created_at", monthStart.toISOString());

        console.log(`👤 User: ${user.instagram_username} | Total: ${total} | Monthly: ${monthly} | Diff: ${(total || 0) - (monthly || 0)}`);
    }
}

main();
