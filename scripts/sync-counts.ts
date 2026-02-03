
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
    console.log("🔄 Syncing Automation Counts...");

    // 1. Get Actual Logs Counts (Grouped)
    const { data: logs } = await supabase.from("dm_logs").select("automation_id, reply_sent");

    const counts: Record<string, number> = {};
    logs?.forEach((log: any) => {
        if (log.reply_sent && log.automation_id) { // Only count success & valid automation_id
            counts[log.automation_id] = (counts[log.automation_id] || 0) + 1;
        }
    });

    // 2. Update Automations
    const { data: automations } = await supabase.from("automations").select("id, trigger_keyword");

    for (const auto of automations || []) {
        const correctCount = counts[auto.id] || 0;
        console.log(`- Updating [${auto.trigger_keyword}] ${auto.id}: ${correctCount}`);

        await supabase
            .from("automations")
            .update({ dm_sent_count: correctCount })
            .eq("id", auto.id);
    }

    console.log("✅ Sync Complete.");
}

main();
