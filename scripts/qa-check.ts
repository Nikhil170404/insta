import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';

// Load env
dotenv.config({ path: '.env.local' });

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function log(msg: string, color: string = RESET) {
    console.log(`${color}${msg}${RESET}`);
}

async function runQA() {
    log("\n🚀 Starting ReplyKaro Launch Readiness Check...\n", YELLOW);
    let errors = 0;
    let warnings = 0;

    // 1. Environment Variables
    log("1. Checking Environment Variables...", YELLOW);
    const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_RAZORPAY_KEY_ID',
        'RAZORPAY_KEY_SECRET',
        'RESEND_API_KEY',
        'NEXT_PUBLIC_APP_URL',
        'SESSION_SECRET' // Critical for Auth
    ];

    const missingVars = requiredVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        log(`❌ Missing ENV Vars: ${missingVars.join(', ')}`, RED);
        errors++;
    } else {
        log("✅ All critical ENV vars present.", GREEN);
    }

    // 2. Database Connection & Schema
    log("\n2. Checking Database & Schema...", YELLOW);
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Check Users Table & Plan Types
        const { data: users, error: userError } = await supabase.from('users').select('plan_type').limit(10);
        if (userError) {
            log(`❌ Database Connection Failed: ${userError.message}`, RED);
            errors++;
        } else {
            log("✅ Database Connected.", GREEN);

            // Validate Plan Types
            const invalidPlans = users?.filter((u: any) => !['free', 'starter', 'pro', 'expired'].includes(u.plan_type));
            if (invalidPlans && invalidPlans.length > 0) {
                log(`❌ Found users with invalid plan types!`, RED);
                errors++;
            } else {
                log("✅ User plan types seem valid (checked sample).", GREEN);
            }
        }

        // Check Webhook Events Table Exists
        const { error: webhookError } = await supabase.from('webhook_events').select('count', { count: 'exact', head: true });
        if (webhookError) {
            // If error is 404 or "relation does not exist", table is missing
            log(`❌ 'webhook_events' table might be missing or inaccessible: ${webhookError.message}`, RED);
            errors++;
        } else {
            log("✅ 'webhook_events' table exists.", GREEN);
        }

    } catch (e: any) {
        log(`❌ Database Check Exception: ${e.message}`, RED);
        errors++;
    }

    // 3. Email Configuration
    log("\n3. Checking Email Configuration...", YELLOW);
    try {
        const emailPath = path.join(process.cwd(), 'lib/notifications/email.ts');
        if (fs.existsSync(emailPath)) {
            const content = fs.readFileSync(emailPath, 'utf-8');
            if (content.includes('replykaro1704@gmail.com')) {
                log("✅ Email sender configured correctly.", GREEN);
            } else {
                log("⚠️ Email sender might not be updated in email.ts", YELLOW);
                warnings++;
            }
        } else {
            log("❌ lib/notifications/email.ts not found!", RED);
            errors++;
        }
    } catch (e) {
        log("❌ Failed to check email config.", RED);
        errors++;
    }

    // 4. Build Check (Dry Run)
    log("\n4. Checking Type Safety...", YELLOW);
    try {
        // Run tsc --noEmit
        execSync('npx tsc --noEmit', { stdio: 'inherit' });
        log("✅ Type check passed.", GREEN);
    } catch (e) {
        log("❌ Type check failed. Run 'npx tsc' to see errors.", RED);
        errors++;
    }

    log("\n-------------------------------------");
    if (errors === 0) {
        log(`🎉 QA PASSED! Ready for Launch. (Warnings: ${warnings})`, GREEN);
        process.exit(0);
    } else {
        log(`🚫 QA FAILED. Found ${errors} errors and ${warnings} warnings.`, RED);
        process.exit(1);
    }
}

runQA();
