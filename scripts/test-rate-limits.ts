import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

process.env.SESSION_SECRET = process.env.SESSION_SECRET || "dummy_secret_for_cron_testing_1234567890";
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbG.dummy.anonkey";
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || "https://dummy-upstash.com";
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || "dummy_token";

async function runRateLimitSeparationTest() {
    // Dynamically import so env vars apply before Zod schema execution
    const { processQueuedDMs, queueDM } = await import("../lib/smart-rate-limiter");
    const { getSupabaseAdmin } = await import("../lib/supabase/client");

    console.log("🚀 Starting Rate Limit Separation Test...");
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

    console.log(`👤 Using test user: ${userId}`);

    // 2. Prep the queue (Clear ALL old items for this user to ensure pristine counts)
    await (supabase as any).from("dm_queue").delete().eq("user_id", userId);

    // 3. Prep Rate Limits (Force DM limit to maximum, leave Comment limit free)
    // CRITICAL: Must exactly match PostgreSQL `date_trunc('hour', NOW())` in UTC.
    const currentHour = new Date();
    currentHour.setUTCMinutes(0, 0, 0); // Use UTC to avoid +5:30 fractional offset offset

    // Delete existing limits for this hour
    await (supabase as any).from("rate_limits").delete().eq("user_id", userId).gte("hour_bucket", currentHour.toISOString());

    // Insert dummy limit: DMs maxed out at 250, but no comments used
    const { error: limitError } = await (supabase as any).from("rate_limits").insert({
        user_id: userId,
        hour_bucket: currentHour.toISOString(),
        dm_count: 500, // Deliberately over any hourly limit to force reschedule
        comment_count: 0 // Completely free
    });

    if (limitError) {
        console.error("❌ Failed to set mock rate limits", limitError);
        return;
    }

    console.log("📝 Inserting 10 Private DMs and 10 Public Replies into the queue...");

    // Insert 10 Private DMs
    for (let i = 0; i < 10; i++) {
        await queueDM(userId, {
            commentId: `test_dm_${Date.now()}_${i}`,
            commenterId: "mock_user_123",
            message: `Test Private DM ${i}`,
            automation_id: automationId
        }, new Date());
    }

    // Insert 10 Public Replies
    for (let i = 0; i < 10; i++) {
        await queueDM(userId, {
            commentId: `test_reply_${Date.now()}_${i}`,
            commenterId: "mock_user_123",
            message: `__PUBLIC_REPLY__:Test Public Reply ${i}`,
            automation_id: automationId
        }, new Date());
    }

    const { count } = await (supabase as any).from("dm_queue").select("*", { count: "exact" }).eq("status", "pending");
    console.log(`✅ Queue prepped with ${count} total pending items globally.`);

    // 4. Process the Queue
    console.log("🔥 Running Queue Processor...");
    await processQueuedDMs();
    console.log("✅ Processor finished.");

    // 5. Verification Check
    const { data: results } = await (supabase as any).from("dm_queue")
        .select("status, message, scheduled_send_at")
        .eq("user_id", userId);

    const privateDMs = results.filter((r: any) => !r.message.startsWith("__PUBLIC_REPLY__:"));
    const publicReplies = results.filter((r: any) => r.message.startsWith("__PUBLIC_REPLY__:"));

    const dmsPending = privateDMs.filter((r: any) => r.status === "pending").length;
    const dmsProcessed = privateDMs.filter((r: any) => r.status === "sent" || r.status === "failed").length;

    const repliesPending = publicReplies.filter((r: any) => r.status === "pending").length;
    const repliesProcessed = publicReplies.filter((r: any) => r.status === "sent" || r.status === "failed").length;

    console.log("\n📊 Final Queue State (Integration Test):");

    console.log("\n[PRIVATE DMs] (Limit was explicitly maxed out to 500/hr)");
    console.log(`- Rescheduled/Pending: ${dmsPending} (Should be 10)`);
    console.log(`- Processed: ${dmsProcessed} (Should be 0)`);
    if (dmsPending === 10) console.log("   ✅ Private DMs correctly throttled!");

    console.log("\n[PUBLIC REPLIES] (Limit was empty at 0/hr)");
    console.log(`- Rescheduled/Pending: ${repliesPending} (Should be 0)`);
    console.log(`- Processed: ${repliesProcessed} (Should be 10)`);
    if (repliesProcessed === 10) console.log("   ✅ Public Replies correctly bypassed DM limit!");

    if (dmsPending === 10 && repliesProcessed === 10) {
        console.log("\n🎉 SUCCESS: DM and Comment Rate Limits are 100% perfectly separated!");
    } else {
        console.log("\n❌ FAILURE: Logic failed to separate the limits correctly.");
    }
}

runRateLimitSeparationTest().catch(console.error);
