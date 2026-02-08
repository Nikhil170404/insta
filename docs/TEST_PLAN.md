# REPLYKARO — COMPLETE TEST PLAN (Every Single Thing)

## 1. PAYMENT SECURITY TESTS

### 1.1 Order Creation — Server-Side Price Validation
**What to test:** Can a user manipulate the amount?

| # | Test | How to Test | Expected Result |
|---|---|---|---|
| 1 | Valid Starter monthly order | POST `/api/payments/razorpay/order` with `{ planId: "Starter Pack", interval: "monthly" }` | Order created with `amount: 9900` (₹99 × 100 paise) |
| 2 | Valid Pro monthly order | POST with `{ planId: "Pro Pack", interval: "monthly" }` | Order with `amount: 29900` |
| 3 | Valid Starter yearly order | POST with `{ planId: "Starter Pack", interval: "yearly" }` | Order with `amount: 99900` (₹999 × 100) |
| 4 | Valid Pro yearly order | POST with `{ planId: "Pro Pack", interval: "yearly" }` | Order with `amount: 299900` (₹2999 × 100) |
| 5 | **ATTACK: Send fake amount in body** | POST with `{ planId: "Pro Pack", interval: "monthly", amount: 1 }` | Server IGNORES client amount, still creates ₹299 order |
| 6 | **ATTACK: Invalid plan name** | POST with `{ planId: "Hacker Plan", interval: "monthly" }` | Returns 400 "Invalid Plan ID" |
| 7 | **ATTACK: Empty plan name** | POST with `{ planId: "", interval: "monthly" }` | Returns 400 |
| 8 | **ATTACK: Free plan order** | POST with `{ planId: "Free Starter", interval: "monthly" }` | Returns 400 "Invalid Plan Amount" (price is 0) |
| 9 | **ATTACK: No session (logged out)** | POST without session cookie | Returns 401 Unauthorized |
| 10 | **ATTACK: SQL injection in planId** | POST with `{ planId: "'; DROP TABLE users;--" }` | Returns 400 Invalid Plan ID |
| 11 | **ATTACK: XSS in planId** | POST with `{ planId: "<script>alert(1)</script>" }` | Returns 400 |
| 12 | Missing interval field | POST with `{ planId: "Starter Pack" }` | Should use monthly as default OR return error |
| 13 | Invalid interval value | POST with `{ planId: "Starter Pack", interval: "weekly" }` | Amount should be 0 → returns 400 "Invalid Plan Amount" |

### 1.2 One-Time Payment Verification
**What to test:** Can someone fake a payment verification?

| # | Test | How | Expected |
|---|---|---|---|
| 14 | Valid signature verification | POST `/api/payments/razorpay/verify` with correct `razorpay_order_id`, `razorpay_payment_id`, valid HMAC signature | Returns `{ success: true }`, user plan updated |
| 15 | **ATTACK: Tampered signature** | POST with wrong `razorpay_signature` | Returns 400 "Invalid signature" |
| 16 | **ATTACK: Empty signature** | POST with `razorpay_signature: ""` | Returns 400 |
| 17 | **ATTACK: Swapped order_id and payment_id** | Swap the two values in the HMAC input | Signature mismatch → 400 |
| 18 | **Plan type from Razorpay order** | After valid verify, check the DB | `plan_type` should be "starter" or "pro" based on order notes, NOT "paid" |
| 19 | **ATTACK: Client sends `amount: 29900` but actual order was Starter (₹99)** | Send body with `amount: 29900` to try to get Pro | Server fetches order from Razorpay API, reads notes — should set plan from order notes, NOT from client amount |
| 20 | **razorpay_customer_id field check** | After verify, check DB `razorpay_customer_id` field | Verify it's no longer being overwritten by payment_id |
| 21 | **Payment log amount** | After verify, check `payments` table | `amount` field should be correctly logged from the order record |
| 22 | **Expiry date set correctly** | After verify, check `plan_expires_at` | Should be ~1 month from now or 1 year for yearly |
| 23 | No session | POST without cookie | 401 |
| 24 | **Error message leakage** | Force an error (e.g., bad Razorpay key) | Response should NOT contain internal error details |

### 1.3 Timing-Safe Signature Comparison
**What to test:** Is `crypto.timingSafeEqual` actually being used?

| # | Test | How | Expected |
|---|---|---|---|
| 25 | Verify route uses timingSafeEqual | Read code at `verify/route.ts` | Uses `crypto.timingSafeEqual()` |
| 26 | Subscription verify uses timingSafeEqual | Read `subscription/verify/route.ts` | Uses `crypto.timingSafeEqual()` |
| 27 | Webhook uses timingSafeEqual | Read `webhooks/razorpay/route.ts` | Uses `crypto.timingSafeEqual()` |

---

## 2. SUBSCRIPTION LIFECYCLE TESTS

### 2.1 Subscription Creation

| # | Test | How | Expected |
|---|---|---|---|
| 29 | Create Starter monthly subscription | POST `/api/payments/razorpay/subscription` with `{ planId: "plan_starter_monthly_id" }` | Returns `{ subscriptionId, key }` |
| 30 | Create Pro yearly subscription | POST with Pro yearly plan ID | Returns subscription ID |
| 31 | **ATTACK: Invalid plan ID** | POST with `{ planId: "plan_fake_123" }` | Returns 400 "Invalid Plan ID" |
| 32 | **ATTACK: No session** | POST without cookie | Returns 401 |
| 33 | **DB state after creation** | Check DB after step 29 | `razorpay_subscription_id` set, `subscription_status: "created"`, `subscription_interval` set |
| 34 | **planName in notes** | Fetch the created subscription from Razorpay API | `notes.planName` should be "Starter Pack" or "Pro Pack" |
| 35 | **Error message leakage** | Force error (e.g., Razorpay down) | Response should NOT contain `details: error.message` |

### 2.2 Subscription Verification (Post-Checkout)

| # | Test | How | Expected |
|---|---|---|---|
| 37 | Valid subscription verify | POST `/api/payments/razorpay/subscription/verify` with correct `razorpay_payment_id`, `razorpay_subscription_id`, valid signature | Returns `{ success: true }` |
| 38 | **ATTACK: Tampered signature** | Wrong signature | Returns 400 |
| 39 | **Ownership check** | User A logged in, sends User B's `razorpay_subscription_id` | Returns 403 "Ownership mismatch" |
| 40 | **Plan type correctly set** | After valid verify of Starter subscription | DB `plan_type` = "starter" |
| 41 | **Plan type correctly set (Pro)** | After valid verify of Pro subscription | DB `plan_type` = "pro" |
| 42 | **Monthly expiry** | Verify monthly subscription, check `plan_expires_at` | Should be ~32 days from now |
| 43 | **Yearly expiry** | Verify yearly subscription, check `plan_expires_at` | Should be ~366 days from now |
| 44 | **Payment amount logged** | Check `payments` table after verify | Amount should be > 0 |

---

## 3. WEBHOOK TESTS

### 3.1 Signature & Auth

| # | Test | How | Expected |
|---|---|---|---|
| 57 | Valid webhook signature | POST `/api/webhooks/razorpay` with correct HMAC of body | Returns `{ received: true }` |
| 58 | **ATTACK: No signature header** | POST without `x-razorpay-signature` header | Returns 500 "Missing config" |
| 59 | **ATTACK: Wrong signature** | POST with wrong signature | Returns 400 "Invalid signature" |

### 3.2 subscription.charged Event

| # | Test | How | Expected |
|---|---|---|---|
| 62 | Valid subscription.charged | Send webhook with event "subscription.charged" | User's plan updated, payment logged |
| 63 | **Plan type from notes** | subscription.charged with `notes.planName: "Pro Pack"` | DB `plan_type` set to "pro" |
| 65 | **Expiry Logic** | subscription.charged for a YEARLY subscription | Sets +366 days (Yearly) or +32 days (Monthly) |
| 66 | **Payment amount** | Check payments table after webhook | Amount = `payment.amount / 100` (converted to rupees) |
| 69 | **Idempotency** | Send same subscription.charged webhook twice | Should ignore the second call if payment ID exists |

### 3.7 refund.created Event

| # | Test | How | Expected |
|---|---|---|---|
| 77 | refund.created | Webhook with "refund.created" | Updates payment status to "refunded" in DB |

---

## 4. PLAN EXPIRY CRON TESTS

### 4.1 Check-Expiry Cron

| # | Test | How | Expected |
|---|---|---|---|
| 82 | Expired user downgraded | User with `plan_expires_at: yesterday` | Downgraded to "free" |
| 86 | **SECURITY: Auth check** | Call endpoint without `Authorization` header | Returns 401 Unauthorized |
| 88 | **No data leak** | Check response body | Should NOT leak usernames |

---

## 5. SESSION & AUTH SECURITY TESTS

### 5.1 JWT Session

| # | Test | How | Expected |
|---|---|---|---|
| 94 | Valid session | Login, call `/api/auth/session` | Returns fresh plan data |
| 103 | **Session Caching** | Multiple rapid calls to getSession() | Should use Redis cache (avoid DB hit every time) |

---

## 6. RATE LIMITING TESTS

### 6.1 API Rate Limits

| # | Test | How | Expected |
|---|---|---|---|
| 112 | Rate limiting enabled | Rapidly hit payment/auth routes | Should trigger 429 Too Many Requests |
