
# 1. Run the QA Script first
npx tsx scripts/qa-check.ts

# 2. If QA Passes, run these git commands:
git add .
git commit -m "feat: complete plan cleanup and payment hardening"
git push origin main

# 3. Verify Production Deployment
npx vercel --prod
