
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
    console.log("🛠️  Migrating Database: Adding is_archived to automations...");

    // Try to check if column exists first (by selecting it)
    const { error } = await supabase.from("automations").select("is_archived").limit(1);

    if (!error) {
        console.log("✅ Column 'is_archived' already exists.");
        return;
    }

    console.log("⚠️  Column 'is_archived' missing. Attempting to add...");

    // We cannot execute DDL directly via supabase-js client without a helper function.
    // However, if the user has an 'exec_sql' or similar RPC, we could use it.
    // Since we don't know, we will try a direct pg connection if the 'postgres' lib is available, 
    // but based on package.json (checked next), it might not be.

    // Fallback: We will log the SQL needed.
    console.log("\n❌ AUTOMATED MIGRATION FAILED (Supabase JS client cannot run DDL directly).");
    console.log("👉 Please run this SQL in your Supabase SQL Editor:");
    console.log("\nALTER TABLE public.automations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;\n");
}

main();
