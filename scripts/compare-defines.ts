
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
    console.log("🔍 Comparing Data Definitions...");

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Automations Sum (Source of Dashboard)
    const { data: automations } = await supabase.from("automations").select("dm_sent_count");
    const dashboardSum = automations?.reduce((acc, curr) => acc + curr.dm_sent_count, 0) || 0;
    console.log(`🏠 Dashboard (Sum of automations.dm_sent_count): ${dashboardSum}`);

    // 2. Logs - A: All Time Success (Should match Dashboard if synced)
    const { count: allTimeSuccess } = await supabase
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("reply_sent", true);
    console.log(`📦 Logs (All Time, reply_sent=true): ${allTimeSuccess}`);

    // 3. Logs - B: This Month Success (Source of Usage/Analytics)
    const { count: monthlySuccess } = await supabase
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .eq("reply_sent", true)
        .gte("created_at", monthStart.toISOString());
    console.log(`📅 Usage/Analytics (This Month, reply_sent=true): ${monthlySuccess}`);

    // 4. Logs - C: Pending/Failed (Should be excluded)
    const { count: failures } = await supabase
        .from("dm_logs")
        .select("*", { count: "exact", head: true })
        .neq("reply_sent", true);
    console.log(`❌ Failures (reply_sent != true): ${failures}`);

    console.log("\n--- Analysis ---");
    if (dashboardSum !== allTimeSuccess) {
        console.log("⚠️  Drift detected: Automations table does not match All-Time Logs.");
    } else {
        console.log("✅ Automations table matches All-Time Logs.");
    }

    if (dashboardSum !== (monthlySuccess || 0)) {
        console.log(`ℹ️  Difference between Dashboard (${dashboardSum}) and Usage (${monthlySuccess}) is due to ${dashboardSum - (monthlySuccess || 0)} logs from previous months.`);
    } else {
        console.log("✅ Dashboard matches Usage (All logs are from this month).");
    }
}

main();
