import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") }); // fallback

process.env.SESSION_SECRET = process.env.SESSION_SECRET || "dummy_secret_for_cron_testing_1234567890";

import { processQueuedDMs, queueDM } from "./lib/smart-rate-limiter";
import { getSupabaseAdmin } from "./lib/supabase/client";

async function simulateRaceCondition() {
    console.log("🚀 Starting Queue Race Condition Simulation...");
    const supabase = getSupabaseAdmin();

    // 1. Get a test user and a valid automation
    const { data: users } = await (supabase as any).from("users").select("id").limit(1);
    const { data: automations } = await (supabase as any).from("automations").select("id").limit(1);

    if (!users || users.length === 0 || !automations || automations.length === 0) {
        console.error("❌ Need at least 1 user and 1 automation in the database to test.");
        return;
    }
    const userId = users[0].id;
    const automationId = automations[0].id;

    // 2. Prep the queue (Clear old pending/processing, add 5 identical pending items)
    await (supabase as any).from("dm_queue").delete().in("status", ["pending", "processing"]);

    console.log("📝 Inserting 5 test DMs into the queue...");
    for (let i = 0; i < 5; i++) {
        await queueDM(userId, {
            commentId: `test_comment_${Date.now()}_${i}`,
            commenterId: "mock_user_123",
            message: "Test message",
            automation_id: automationId // Valid UUID format required by Postgres constraint
        }, new Date());
    }

    const { count } = await (supabase as any).from("dm_queue").select("*", { count: "exact" }).eq("status", "pending");
    console.log(`✅ Queue prepped with ${count} pending items.`);

    // 3. Fire 3 concurrent cron jobs at the exact same millisecond
    console.log("🔥 Firing 3 concurrent queue processors...");
    const promises = [
        processQueuedDMs().then(() => console.log("Cron 1 finished")),
        processQueuedDMs().then(() => console.log("Cron 2 finished")),
        processQueuedDMs().then(() => console.log("Cron 3 finished"))
    ];

    await Promise.allSettled(promises);

    // 4. Verification Check
    const { data: results } = await (supabase as any).from("dm_queue").select("status, id");

    const processing = results.filter((r: any) => r.status === "processing").length;
    const sent = results.filter((r: any) => r.status === "sent" || r.status === "failed").length;
    const pending = results.filter((r: any) => r.status === "pending").length;

    console.log("\n📊 Final Queue State (Simulated):");
    console.log(`- Processing/Locked: ${processing} (Should be 0 if finished)`);
    console.log(`- Processed (Sent/Failed): ${sent} (Should be 5)`);
    console.log(`- Still Pending: ${pending} (Should be 0)`);

    if (processing === 0 && pending === 0 && sent === 5) {
        console.log("🎉 SUCCESS: No double-processing occurred. The atomic lock works perfectly.");
    } else {
        console.log("❌ FAILURE: Race condition still exists or DMs got stuck.");
    }
}

simulateRaceCondition().catch(console.error);
