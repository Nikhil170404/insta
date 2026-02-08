# ReplyKaro - Complete Security & Payment Audit Report

**Date:** 2026-02-08
**Auditor:** Automated Code Review
**Standard:** OWASP Top 10 (2025), PCI DSS, Razorpay Security Checklist
**Application:** ReplyKaro - Instagram DM Automation SaaS

---

## OVERALL SCORE: 82/100 (GOOD)

| Category | Score | Grade |
|----------|-------|-------|
| Authentication & Session Management | 85/100 | A- |
| Payment Security (Razorpay) | 88/100 | A |
| Input Validation & Data Sanitization | 80/100 | B+ |
| API Security & Rate Limiting | 82/100 | A- |
| Security Headers & Transport | 78/100 | B+ |
| Database Security | 75/100 | B |
| Error Handling & Logging | 85/100 | A- |
| Secrets Management | 90/100 | A |
| Webhook Security | 92/100 | A |
| Business Logic Security | 80/100 | B+ |
| GDPR/Privacy Compliance | 70/100 | B- |
| Infrastructure & Deployment | 78/100 | B+ |

---

## 1. AUTHENTICATION & SESSION MANAGEMENT — 85/100

### What's Working Well
- **JWT with HS256** using `jose` library — industry standard (`lib/auth/session.ts:38`)
- **SESSION_SECRET enforced >= 32 chars** at both middleware and session level (`middleware.ts:7`, `lib/auth/session.ts:7`)
- **httpOnly cookies** prevent XSS-based token theft (`lib/auth/session.ts:49`)
- **secure flag** enabled in production (`lib/auth/session.ts:50`)
- **sameSite=lax** provides CSRF protection (`lib/auth/session.ts:51`)
- **7-day token expiry** is reasonable (`lib/auth/session.ts:40`)
- **Session cache** in Redis with 5-min TTL reduces DB load (`lib/auth/session.ts:98`)
- **Fresh plan data fetched from DB** on each session — prevents stale JWT abuse (`lib/auth/session.ts:84-88`)
- **OAuth CSRF protection** with random UUID state parameter (`app/api/auth/instagram/route.ts`)
- **Cache invalidation** on plan changes (`lib/auth/cache.ts`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | No token rotation/refresh mechanism — tokens valid for full 7 days even if compromised | `lib/auth/session.ts:40` |
| LOW | Session data in JWT includes `instagram_username` — token size grows with claims | `lib/auth/session.ts:28-36` |
| LOW | No session revocation list — cannot force-logout compromised sessions | `lib/auth/session.ts` |

### Recommendations
- Consider adding a token refresh mechanism (e.g., sliding window with short-lived access + refresh token)
- Add a session blacklist in Redis for force-logout capability

---

## 2. PAYMENT SECURITY (RAZORPAY) — 88/100

### What's Working Well
- **HMAC SHA256 signature verification** on all payment verifications (`app/api/payments/razorpay/verify/route.ts:36-42`)
- **`crypto.timingSafeEqual`** used — prevents timing attacks on signature comparison (`verify/route.ts:41`, `webhooks/razorpay/route.ts:24`)
- **Buffer length check** before timingSafeEqual — prevents crash on length mismatch (`verify/route.ts:41`)
- **Server-side price lookup** — amount is NOT trusted from client (`app/api/payments/razorpay/order/route.ts:23`)
- **Trusted order notes** — plan type fetched from Razorpay order, not client body (`verify/route.ts:56`)
- **Amounts stored in paise** (smallest currency unit) — prevents floating point errors (`order/route.ts:41`)
- **Rate limiting** on payment endpoints (`order/route.ts:10-13`, `verify/route.ts:11-13`)
- **Authentication required** before payment operations (`order/route.ts:15-18`)
- **Idempotency checks** — prevents duplicate payment processing (`webhooks/razorpay/route.ts:53-61`)
- **Webhook signature verification** with dedicated secret (`webhooks/razorpay/route.ts:19-26`)
- **No raw card data handled** — Razorpay Checkout handles PCI scope
- **Error messages don't leak internals** (`verify/route.ts:113`, `order/route.ts:58`)
- **Subscription lifecycle fully handled** — charged, halted, completed, cancelled, failed, refund events
- **Receipt emails** sent on successful payment
- **Dunning emails** on failed payments with retry links
- **Invoice generation** with unique invoice numbers
- **Subscription status tracking** in database

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | `RAZORPAY_WEBHOOK_SECRET` falls back to `RAZORPAY_KEY_SECRET` — webhook should have dedicated secret | `webhooks/razorpay/route.ts:12` |
| MEDIUM | Invoice number uses `Math.random()` — not cryptographically random, potential collisions at scale | `webhooks/razorpay/route.ts:150-151` |
| LOW | Payment amount validation only checks `<= 0`, doesn't validate against known plan prices server-side on webhook | `webhooks/razorpay/route.ts:99` |
| LOW | `razorpay_signature` stored in payments table — unnecessary after verification | `schema.sql:149` |
| INFO | No 3D Secure / SCA enforcement configuration documented | - |

### Recommendations
- Set a dedicated `RAZORPAY_WEBHOOK_SECRET` in environment — don't reuse `RAZORPAY_KEY_SECRET`
- Use `crypto.randomUUID()` or similar for invoice numbers to avoid collisions
- Validate payment amounts against plan pricing in webhook handler as defense-in-depth

---

## 3. INPUT VALIDATION & DATA SANITIZATION — 80/100

### What's Working Well
- **Zod schemas** for all major inputs (`lib/validations.ts`)
- **Automation creation** validated: message length 1-1000 chars, button text <=20 chars, valid URLs (`validations.ts:20-44`)
- **Payment schemas** validated: required fields enforced (`validations.ts:71-83`)
- **Webhook payload validation** with Zod schemas (`validations.ts:102-129`)
- **UUID validation** for IDs (`validations.ts:7`)
- **Pagination limits** capped at 100 (`validations.ts:11`)
- **Lead/contact form** validated: email format, phone regex, message length (`validations.ts:89-96`)
- **Safe validation helpers** with `safeValidate()` and `validateOrThrow()` (`validations.ts:156-172`)
- **DB-level constraints** enforce data integrity (`schema.sql:58-59, 104-105`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | `reply_message` and `comment_reply` not sanitized for HTML/script injection before storing | `validations.ts:30-33` |
| MEDIUM | `link_url` validated as URL format but no allowlist — could link to malicious sites | `validations.ts:36` |
| LOW | `media_caption` allows up to 2200 chars but no content filtering | `validations.ts:25` |
| LOW | Some API routes may not use Zod validation consistently (manual `req.json()` parsing) | `order/route.ts:20` |

### Recommendations
- Add HTML entity encoding for user-generated content before display
- Consider URL allowlisting or at least blocking known malicious URL patterns
- Ensure all API routes consistently use Zod validation schemas

---

## 4. API SECURITY & RATE LIMITING — 82/100

### What's Working Well
- **Tiered rate limiting** by endpoint type (`lib/rate-limit-middleware.ts:71-76`):
  - Auth: 10/min per IP
  - General API: 100/min per IP
  - Analytics: 30/min per IP
  - Automations: 60/min per IP
- **Sliding window algorithm** via Upstash — prevents burst attacks (`rate-limit-middleware.ts:82`)
- **Dual identifier** — rate limits by user ID when authenticated, IP when not (`rate-limit-middleware.ts:134-148`)
- **Rate limit headers** in responses (X-RateLimit-Limit, Remaining, Reset) (`rate-limit-middleware.ts:153-163`)
- **Retry-After header** on 429 responses (`rate-limit-middleware.ts:192`)
- **Fail-open design** — rate limiting gracefully degrades if Redis unavailable (`rate-limit-middleware.ts:100-107`)
- **Authentication checks** on all protected API routes
- **Cron endpoints** protected with `CRON_SECRET` header
- **Middleware** protects dashboard routes server-side (`middleware.ts:46-58`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | Fail-open on Redis failure means no rate limiting during outages | `rate-limit-middleware.ts:118-127` |
| MEDIUM | IP from `x-forwarded-for` can be spoofed without proper proxy configuration | `rate-limit-middleware.ts:141-143` |
| LOW | No per-user rate limiting on payment endpoints — only IP-based | `order/route.ts:9-13` |
| LOW | Webhook endpoints have no rate limiting (expected, but monitor for abuse) | `webhooks/razorpay/route.ts` |

### Recommendations
- Consider fail-closed for critical payment endpoints
- Validate `x-forwarded-for` against trusted proxy IPs (Vercel handles this, but document the assumption)
- Add per-user rate limits on payment creation endpoints

---

## 5. SECURITY HEADERS & TRANSPORT — 78/100

### What's Working Well
- **HSTS** with 2-year max-age, includeSubDomains, preload (`next.config.ts:10`)
- **X-Frame-Options: SAMEORIGIN** — clickjacking protection (`next.config.ts:14`)
- **X-Content-Type-Options: nosniff** — MIME sniffing protection (`next.config.ts:18`)
- **X-XSS-Protection: 1; mode=block** — legacy XSS filter (`next.config.ts:22`)
- **Referrer-Policy: origin-when-cross-origin** — controlled referrer leakage (`next.config.ts:26`)
- **Content-Security-Policy** with restricted sources (`next.config.ts:30-38`)
- **DNS Prefetch Control** enabled (`next.config.ts:6`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| HIGH | CSP allows `'unsafe-eval'` and `'unsafe-inline'` for scripts — significantly weakens XSS protection | `next.config.ts:32` |
| MEDIUM | CSP `img-src` allows `https:` (any HTTPS source) — too permissive | `next.config.ts:34` |
| LOW | No `Permissions-Policy` header — browser features not restricted | `next.config.ts` |
| LOW | `X-XSS-Protection` is deprecated in modern browsers — rely on CSP instead | `next.config.ts:22` |
| INFO | Missing `Cross-Origin-Opener-Policy` and `Cross-Origin-Embedder-Policy` headers | - |

### Recommendations
- Work toward removing `'unsafe-inline'` via nonce-based CSP (Next.js supports this)
- Restrict `img-src` to specific domains (cdninstagram.com, your own domain)
- Add `Permissions-Policy` header to restrict camera, microphone, geolocation, etc.

---

## 6. DATABASE SECURITY — 75/100

### What's Working Well
- **Row Level Security (RLS) enabled** on all tables (`schema.sql:272-277`)
- **Service role only** policies — anon key cannot access data directly (`schema.sql:282-287`)
- **UUID primary keys** — non-guessable IDs (`schema.sql:10`)
- **CASCADE deletes** on user deletion — no orphaned data (`schema.sql:49, 71, etc.`)
- **CHECK constraints** on plan types, amounts, statuses (`schema.sql:37, 158-159`)
- **Unique constraints** prevent duplicate entries (`schema.sql:133, 147, 105`)
- **Indexed queries** for performance and security (`schema.sql:41-42, 63-64, etc.`)
- **Atomic operations** via PostgreSQL functions with `SECURITY DEFINER` (`schema.sql:248, 263`)
- **Access token stored encrypted** (Supabase encrypts at rest)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| HIGH | `instagram_access_token` stored as plain TEXT — should be encrypted at application level | `schema.sql:16` |
| MEDIUM | RLS policies only allow `service_role` — no row-level user isolation enforced at DB level (relies entirely on app code) | `schema.sql:282-287` |
| MEDIUM | No `anon` role policies — if anon key is compromised, RLS blocks access (good) but no explicit deny documented | `schema.sql` |
| LOW | `webhook_events` stores full payload as JSONB — may contain sensitive payment data | `schema.sql:430` |
| LOW | No audit log table for user actions (login, plan changes, deletions) | - |

### Recommendations
- Encrypt `instagram_access_token` at application level before storing (AES-256-GCM)
- Add user-scoped RLS policies as defense-in-depth (even though app code controls access)
- Implement data retention policies and auto-purge for webhook_events
- Add audit logging for security-relevant events

---

## 7. ERROR HANDLING & LOGGING — 85/100

### What's Working Well
- **Centralized error system** with typed errors (`lib/errors.ts`)
- **Operational vs non-operational errors** distinguished (`errors.ts:9`)
- **Error response formatter** prevents sensitive data leakage (`errors.ts:102-134`)
- **Generic error messages** returned to clients — no stack traces (`verify/route.ts:113`, `webhooks/razorpay/route.ts:344`)
- **Structured logging** with JSON format in production (`lib/logger.ts`)
- **Specialized loggers** for webhook, DM, auth, payment operations
- **Webhook events logged** to database with status tracking (`webhooks/razorpay/route.ts:33-38`)
- **Error context preserved** internally while hiding from users
- **Zod error formatting** for user-friendly validation messages (`validations.ts:177-194`)
- **Async error wrapper** for consistent error handling (`errors.ts:157-173`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | `console.error` used in some places instead of structured logger | `webhooks/razorpay/route.ts:42, 116` |
| LOW | Error types (PaymentError, etc.) defined but not consistently used across all routes | Various API routes |
| LOW | No error alerting/monitoring integration documented (PagerDuty, Sentry, etc.) | - |

### Recommendations
- Replace all `console.error` calls with structured logger
- Add Sentry or similar error monitoring for production
- Use typed error classes consistently across all API routes

---

## 8. SECRETS MANAGEMENT — 90/100

### What's Working Well
- **Zod validation** of all environment variables at startup (`lib/env.ts`)
- **Fail-fast approach** — app won't start with missing/invalid secrets (`env.ts:52-55`)
- **Minimum length enforcement** on SESSION_SECRET (32 chars) (`env.ts:6`)
- **URL format validation** for service URLs (`env.ts:10, 24`)
- **NEXT_PUBLIC_ prefix** only for truly public values (Razorpay key_id, Supabase URL) (`env.ts:19-20`)
- **Server-only secrets** never exposed to client bundle (`env.ts:12, 16, 21`)
- **`.env.example`** template provided for developers
- **Razorpay client validates** key presence before initialization (`lib/razorpay.ts:3-8`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| LOW | No `.env` in `.gitignore` verification documented | - |
| LOW | `RAZORPAY_WEBHOOK_SECRET` not in env validation schema — falls back silently | `env.ts` |
| INFO | No secrets rotation documentation or policy | - |

### Recommendations
- Add `RAZORPAY_WEBHOOK_SECRET` to Zod env schema as required
- Document secrets rotation procedures
- Consider using a secrets manager (e.g., Vercel encrypted env vars are good, but document the approach)

---

## 9. WEBHOOK SECURITY — 92/100

### What's Working Well
- **Razorpay webhook signature verification** with HMAC SHA256 + timingSafeEqual (`webhooks/razorpay/route.ts:19-26`)
- **Instagram webhook signature verification** with HMAC SHA256 (`lib/instagram/webhook-service.ts`)
- **Instagram webhook challenge** verification for subscription (`webhooks/instagram`)
- **Raw body used for signature** — parsed after verification (`webhooks/razorpay/route.ts:10, 28`)
- **Idempotency checks** prevent duplicate processing (`webhooks/razorpay/route.ts:52-61`)
- **Webhook events logged** to database for audit trail (`webhooks/razorpay/route.ts:33-38`)
- **Event status tracking** — received, processed, failed (`webhooks/razorpay/route.ts:327, 337`)
- **Non-leaking error responses** (`webhooks/razorpay/route.ts:344`)
- **Batch processing** for viral bursts (`lib/instagram/webhook-service.ts`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| LOW | No webhook event deduplication by `event.id` — only by `payment.id` | `webhooks/razorpay/route.ts:33` |
| LOW | Webhook event_id not checked for uniqueness constraint in DB | `schema.sql:428` |
| INFO | No webhook retry/dead-letter queue for failed processing | - |

### Recommendations
- Add unique constraint on `webhook_events.event_id` to prevent duplicate event logging
- Consider adding dead-letter queue for persistently failing webhooks

---

## 10. BUSINESS LOGIC SECURITY — 80/100

### What's Working Well
- **Plan limits enforced server-side** — automations, DMs per month/hour (`lib/pricing.ts`, `lib/smart-rate-limiter.ts`)
- **One DM per user per automation** — atomic check with unique constraint (`schema.sql:314-316`)
- **Self-comment detection** — prevents triggering own automations (`lib/instagram/processor.ts`)
- **Follow-gate verification** before sending final DM content
- **Smart DM spacing** — humanized timing to avoid Instagram spam detection (`lib/smart-rate-limiter.ts`)
- **Token refresh mechanism** — handles Instagram token expiry proactively (`app/api/cron/refresh-tokens`)
- **Subscription cancellation** honors remaining period — no immediate access revocation (`webhooks/razorpay/route.ts:249`)
- **Plan downgrade protection** — subscription change endpoint handles transitions

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | Plan type determined from `notes.planName` string — could be manipulated if subscription created with wrong notes | `webhooks/razorpay/route.ts:80-84` |
| MEDIUM | No server-side verification that user's plan_type matches before allowing automation creation (only count check) | `app/api/automations/route.ts` |
| LOW | Monthly DM window uses UTC dates — edge case: users near date boundary get extra DMs | `lib/smart-rate-limiter.ts` |
| LOW | No abuse detection for mass comment spamming to trigger DMs | - |

### Recommendations
- Validate plan type against Razorpay plan_id mapping (not just notes string)
- Add abuse detection for unusual comment patterns
- Consider plan verification against Razorpay subscription API as source of truth

---

## 11. GDPR/PRIVACY COMPLIANCE — 70/100

### What's Working Well
- **Data deletion endpoint** exists (`app/api/data-deletion/route.ts`)
- **Meta data deletion** callback supported
- **Privacy policy page** available (`/privacy`)
- **Terms of service page** available (`/terms`)
- **CASCADE deletes** on user deletion — removes all associated data
- **Deletion status page** (`/deletion-status`)

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| HIGH | No data export (portability) feature — GDPR Article 20 requires it | - |
| MEDIUM | No consent management for marketing emails | - |
| MEDIUM | No data retention policy — webhook_events, dm_logs grow indefinitely | `schema.sql` |
| MEDIUM | No cookie consent banner or policy page | - |
| LOW | Instagram access tokens not purged on account deletion verification | - |

### Recommendations
- Implement data export/download feature for user data portability
- Add data retention policies with automatic purging (e.g., 90 days for logs)
- Add cookie consent management
- Document data processing activities

---

## 12. INFRASTRUCTURE & DEPLOYMENT — 78/100

### What's Working Well
- **Vercel deployment** — automatic HTTPS, DDoS protection, edge network
- **TypeScript strict mode** — catches type errors at compile time
- **Vitest + Playwright** testing setup (`vitest.config.mts`, `playwright.config.ts`)
- **Health check endpoint** (`/api/health`)
- **Cron jobs** for maintenance tasks (token refresh, cleanup, queue processing)
- **Redis caching** via Upstash — distributed, serverless-friendly

### Issues Found
| Severity | Issue | Location |
|----------|-------|----------|
| MEDIUM | No dependency vulnerability scanning (npm audit, Snyk) documented | `package.json` |
| LOW | No staging environment configuration documented | - |
| LOW | No backup/recovery procedures documented | - |
| INFO | No performance monitoring (APM) documented | - |

### Recommendations
- Add `npm audit` to CI/CD pipeline
- Set up Snyk or Dependabot for dependency vulnerability alerts
- Document staging and disaster recovery procedures

---

## OWASP TOP 10 (2025) COMPLIANCE MATRIX

| # | OWASP Category | Status | Score |
|---|---------------|--------|-------|
| A01 | Broken Access Control | PASS | 8/10 — Auth middleware + session checks on all protected routes |
| A02 | Injection | PASS | 8/10 — Parameterized queries via Supabase, Zod validation |
| A03 | Software Supply Chain Failures | PARTIAL | 6/10 — No dependency scanning, no lockfile integrity checks |
| A04 | Cryptographic Failures | PASS | 8/10 — HMAC SHA256, timingSafeEqual, HTTPS enforced. Instagram tokens unencrypted |
| A05 | Security Misconfiguration | PASS | 7/10 — CSP has unsafe-eval/unsafe-inline. Headers mostly good |
| A06 | Vulnerable Components | PARTIAL | 6/10 — No automated vulnerability scanning |
| A07 | Authentication Failures | PASS | 8/10 — Strong JWT auth, rate-limited login |
| A08 | Data Integrity Failures | PASS | 9/10 — Signature verification, server-side price validation |
| A09 | Logging & Monitoring | PASS | 7/10 — Structured logging exists but no alerting |
| A10 | Server-Side Request Forgery | PASS | 9/10 — No user-controlled URLs fetched server-side |

**OWASP Compliance Score: 76/100**

---

## PAYMENT SECURITY CHECKLIST (Razorpay Best Practices)

| # | Requirement | Status | Details |
|---|------------|--------|---------|
| 1 | Never handle raw card data | PASS | Razorpay Checkout handles card capture |
| 2 | Verify payment signature server-side | PASS | HMAC SHA256 + timingSafeEqual |
| 3 | Server-side price validation | PASS | Price looked up from `lib/pricing.ts`, not client |
| 4 | Use HTTPS everywhere | PASS | HSTS with preload, Vercel enforces HTTPS |
| 5 | Keep secret keys server-side | PASS | Only `key_id` is public, `key_secret` server-only |
| 6 | Webhook signature verification | PASS | Verified before processing |
| 7 | Idempotent payment processing | PASS | Checks `razorpay_payment_id` uniqueness |
| 8 | Amount in smallest currency unit | PASS | Stored in paise |
| 9 | Trust server-created order data | PASS | Notes from Razorpay order, not client |
| 10 | Handle all lifecycle events | PASS | charged, halted, completed, cancelled, failed, refund |
| 11 | Log all payment events | PASS | payments table + webhook_events table |
| 12 | Rate limit payment endpoints | PASS | Upstash rate limiting |
| 13 | Separate webhook secret | PARTIAL | Falls back to key_secret |
| 14 | Receipt/invoice generation | PASS | Email receipts + invoices table |

**Payment Security Score: 13/14 (93%)**

---

## CRITICAL ACTION ITEMS (Priority Order)

### P0 — Fix Immediately
1. **Encrypt Instagram access tokens** at application level (AES-256-GCM) before storing in database
2. **Remove `'unsafe-eval'` from CSP** — explore Next.js nonce-based CSP

### P1 — Fix This Sprint
3. **Set dedicated `RAZORPAY_WEBHOOK_SECRET`** and add to env validation schema
4. **Add data export feature** for GDPR compliance
5. **Replace `Math.random()` invoice numbers** with `crypto.randomUUID()`
6. **Add dependency vulnerability scanning** to CI/CD

### P2 — Fix This Quarter
7. **Restrict CSP `img-src`** to specific domains
8. **Add `Permissions-Policy` header**
9. **Implement data retention policies** with auto-purge
10. **Add error monitoring** (Sentry or similar)
11. **Add unique constraint** on `webhook_events.event_id`
12. **Add user-scoped RLS policies** as defense-in-depth

### P3 — Backlog
13. **Token refresh/rotation** mechanism for sessions
14. **Cookie consent** management
15. **Audit logging** for security events
16. **Abuse detection** for mass comment patterns

---

## SUMMARY

ReplyKaro demonstrates **strong security fundamentals** across its payment processing, authentication, and webhook handling. The Razorpay integration follows nearly all best practices with proper signature verification, server-side price validation, and idempotent processing. The main areas for improvement are:

1. **CSP hardening** — removing unsafe-eval/unsafe-inline
2. **Token encryption** — Instagram access tokens should be encrypted at rest
3. **GDPR compliance** — data export and retention policies needed
4. **Supply chain security** — dependency scanning should be automated

The application is **production-ready** with the current security posture but should address P0/P1 items to meet enterprise-grade standards.
