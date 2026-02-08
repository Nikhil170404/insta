import Razorpay from "razorpay";
import fs from "fs";
import path from "path";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf8");
    envConfig.split("\n").forEach((line) => {
        const [key, value] = line.split("=");
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
}

if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    console.error("❌ Razorpay credentials missing in .env.local");
    process.exit(1);
}

const razorpay = new Razorpay({
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = [
    {
        name: "Starter Pack Monthly",
        period: "monthly",
        interval: 1,
        item: {
            name: "Starter Pack Monthly",
            amount: 9900, // ₹99
            currency: "INR",
            description: "Starter Pack - Monthly Subscription"
        }
    },
    {
        name: "Starter Pack Yearly",
        period: "yearly",
        interval: 1,
        item: {
            name: "Starter Pack Yearly",
            amount: 99900, // ₹999
            currency: "INR",
            description: "Starter Pack - Yearly Subscription"
        }
    },
    {
        name: "Pro Pack Monthly",
        period: "monthly",
        interval: 1,
        item: {
            name: "Pro Pack Monthly",
            amount: 29900, // ₹299
            currency: "INR",
            description: "Pro Pack - Monthly Subscription"
        }
    },
    {
        name: "Pro Pack Yearly",
        period: "yearly",
        interval: 1,
        item: {
            name: "Pro Pack Yearly",
            amount: 299900, // ₹2999
            currency: "INR",
            description: "Pro Pack - Yearly Subscription"
        }
    }
];

async function createPlans() {
    console.log("🚀 Creating Razorpay Subscription Plans...");
    const newEnvVars: string[] = [];

    for (const plan of PLANS) {
        try {
            console.log(`Creating ${plan.name}...`);
            const createdPlan = await razorpay.plans.create({
                period: plan.period as any,
                interval: plan.interval,
                item: plan.item
            });

            const envKey = `NEXT_PUBLIC_PLAN_${plan.name.replace(/\s+/g, "_").toUpperCase()}`;
            console.log(`✅ Created: ${createdPlan.id} -> ${envKey}`);
            newEnvVars.push(`${envKey}=${createdPlan.id}`);
        } catch (error: any) {
            console.error(`❌ Failed to create ${plan.name}:`, error.error?.description || error.message);
        }
    }

    if (newEnvVars.length > 0) {
        console.log("\n📝 Appending IDs to .env.local...");
        const currentEnv = fs.readFileSync(envPath, "utf8");
        // Check if keys already exist to avoid duplicates
        const keysToAdd = newEnvVars.filter(line => !currentEnv.includes(line.split("=")[0]));

        if (keysToAdd.length > 0) {
            fs.appendFileSync(envPath, "\n" + keysToAdd.join("\n") + "\n");
            console.log("✅ .env.local updated successfully!");
        } else {
            console.log("ℹ️ Plans already exist in .env.local");
        }
    }

    console.log("\n🎉 Setup Complete! You can now run the app.");
}

createPlans();
