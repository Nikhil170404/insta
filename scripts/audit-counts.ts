
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
    console.log("🔍 Analyzing Data Discrepancies...");

    // 1. Get Automation Counts
    const { data: automations } = await supabase.from("automations").select("id, trigger_keyword, dm_sent_count");

    console.log("\n📊 Automations Table (dm_sent_count):");
    automations?.forEach(a => {
        console.log(`- [${a.trigger_keyword}] ID: ${a.id.substring(0, 8)}... : ${a.dm_sent_count}`);
    });

    // 2. Get Actual Logs Counts (Grouped)
    console.log("\n DM Logs Table (Count by automation_id where reply_sent=true):");
    const { data: logs } = await supabase.from("dm_logs").select("automation_id, reply_sent");

    const counts: Record<string, number> = {};
    logs?.forEach((log: any) => {
        if (log.reply_sent) { // Only count success
            const id = log.automation_id || "unknown";
            counts[id] = (counts[id] || 0) + 1;
        }
    });

    Object.entries(counts).forEach(([id, count]) => {
        console.log(`- ID: ${id.substring(0, 8)}... : ${count}`);
    });

    // 3. Compare
    console.log("\n⚖️  Comparison (Drift):");
    let driftFound = false;
    automations?.forEach(a => {
        const actual = counts[a.id] || 0;
        const stored = a.dm_sent_count;
        if (actual !== stored) {
            console.log(`⚠️  Mismatch for [${a.trigger_keyword}]: Stored ${stored} vs Actual ${actual}`);
            driftFound = true;
        }
    });

    if (!driftFound) console.log("✅ No drift found. Counts are perfect.");
}

main();
