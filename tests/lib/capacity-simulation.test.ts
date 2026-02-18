/**
 * CAPACITY SIMULATION: Full System Load & User Journey Test
 * 
 * Simulates the complete user journey across all plan tiers and measures
 * how many concurrent users, DMs, and bursts the system can handle.
 * 
 * @module tests/lib/capacity-simulation.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPlanLimits, PRICING_PLANS } from '@/lib/pricing';

// ─── Tracking Counters ───────────────────────────────────────────────
let dmsSentByUser: Record<string, { hourly: number; monthly: number }> = {};
let dmsQueuedByUser: Record<string, number> = {};
let totalApiCalls = 0;

function getUserCounters(userId: string) {
    if (!dmsSentByUser[userId]) dmsSentByUser[userId] = { hourly: 0, monthly: 0 };
    return dmsSentByUser[userId];
}

// ─── Mock All External Dependencies ──────────────────────────────────
vi.mock('@/lib/instagram/service', () => ({
    sendInstagramDM: vi.fn().mockImplementation(() => {
        totalApiCalls++;
        return Promise.resolve(true);
    }),
    replyToComment: vi.fn().mockResolvedValue(true),
    checkFollowStatus: vi.fn().mockResolvedValue(true),
    checkIsFollowing: vi.fn().mockResolvedValue(true),
    getUniqueMessage: vi.fn((m: string) => m),
    incrementAutomationCount: vi.fn(),
    sendFollowGateCard: vi.fn().mockResolvedValue(true),
    hasReceivedFollowGate: vi.fn().mockResolvedValue(false),
    getMediaDetails: vi.fn()
}));

// Dummy Supabase for background instantiations (like in push.ts)
const dummySupabase = vi.hoisted(() => ({
    from: vi.fn(() => ({
        select: vi.fn(() => ({
            eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({ data: {}, error: null })),
                maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
        }))
    }))
}));

vi.mock('@/lib/supabase/client', () => ({
    getSupabaseAdmin: vi.fn(() => dummySupabase)
}));

vi.mock('@/lib/notifications/push', () => ({
    notifyUser: vi.fn()
}));

// Mock web-push to prevent VAPID validation errors from side-effect imports
vi.mock('web-push', () => ({
    default: {
        setVapidDetails: vi.fn(),
        sendNotification: vi.fn(),
    }
}));

vi.mock('@/lib/smart-rate-limiter', () => ({
    smartRateLimit: vi.fn().mockImplementation((userId: string) => {
        const counters = getUserCounters(userId);
        const plan = userPlans[userId] || 'free';
        const limits = getPlanLimits(plan);

        const hourlyRemaining = Math.max(0, limits.dmsPerHour - counters.hourly);
        const monthlyRemaining = Math.max(0, limits.dmsPerMonth - counters.monthly);

        const allowed = hourlyRemaining > 0 && monthlyRemaining > 0;

        if (allowed) {
            counters.hourly++;
            counters.monthly++;
        }

        return Promise.resolve({
            allowed,
            remaining: { hourly: hourlyRemaining, monthly: monthlyRemaining },
            estimatedSendTime: allowed ? undefined : new Date(Date.now() + 3600000)
        });
    }),
    queueDM: vi.fn().mockImplementation((userId: string) => {
        if (!dmsQueuedByUser[userId]) dmsQueuedByUser[userId] = 0;
        dmsQueuedByUser[userId]++;
        return Promise.resolve();
    })
}));

// ─── Track mock data ─────────────────────────────────────────────────
let mockUsers: Record<string, any> = {};
let mockAutomations: Record<string, any> = {};

vi.mock('@/lib/cache', () => ({
    getCachedUser: vi.fn().mockImplementation((id: string) => Promise.resolve(mockUsers[id])),
    setCachedUser: vi.fn(),
    getCachedAutomation: vi.fn().mockImplementation((id: string) => Promise.resolve(mockAutomations[id] || mockAutomations[`auto_${id}`])),
    setCachedAutomation: vi.fn()
}));

import { handleCommentEvent } from '@/lib/instagram/processor';
import { getCachedUser, getCachedAutomation } from '@/lib/cache';
import { sendInstagramDM } from '@/lib/instagram/service';
import { queueDM } from '@/lib/smart-rate-limiter';

// ─── Track which plan each user is on ────────────────────────────────
let userPlans: Record<string, string> = {};

// ─── Chainable Supabase Mock ─────────────────────────────────────────
function createMockSupabase() {
    // Responses consumed per call
    let singleResponses: any[] = [];
    let maybeSingleResponses: any[] = [];
    let selectAllResponses: any[] = [];
    let insertResponses: any[] = [];

    function setSingleResponses(responses: any[]) { singleResponses = [...responses]; }
    function setMaybeSingleResponses(responses: any[]) { maybeSingleResponses = [...responses]; }
    function setSelectAllResponses(responses: any[]) { selectAllResponses = [...responses]; }

    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        insert: vi.fn(() => {
            const resp = insertResponses.shift() || { error: null };
            return { ...chain, then: (resolve: any) => resolve(resp) };
        }),
        update: vi.fn(() => chain),
        single: vi.fn(() => {
            const resp = singleResponses.shift() || { data: null, error: null };
            return Promise.resolve(resp);
        }),
        maybeSingle: vi.fn(() => {
            const resp = maybeSingleResponses.shift() || { data: null, error: null };
            return Promise.resolve(resp);
        }),
        then: function (resolve: any) {
            const resp = selectAllResponses.shift() || { data: [], error: null };
            return resolve(resp);
        }
    };

    const supabase = {
        from: vi.fn(() => chain),
        _setSingleResponses: setSingleResponses,
        _setMaybeSingleResponses: setMaybeSingleResponses,
        _setSelectAllResponses: setSelectAllResponses,
    };

    return supabase;
}

// ─── Helper: simulate N comments for a given user ────────────────────
async function simulateComments(
    userId: string,
    planType: string,
    commentCount: number,
    mockSupabase: any
) {
    const user = {
        id: userId,
        instagram_access_token: `token_${userId}`,
        instagram_user_id: userId,
        instagram_username: `user_${userId}`,
        plan_type: planType
    };

    const automation = {
        id: `auto_${userId}`,
        user_id: userId,
        media_id: `media_${userId}`,
        trigger_type: 'any',
        reply_message: 'Thanks for your comment!',
        comment_reply: 'Check DM!',
        button_text: 'Get Link',
        link_url: 'https://example.com',
        is_active: true,
        require_follow: false,
        created_at: '2026-01-01T00:00:00Z'
    };

    userPlans[userId] = planType;

    // Set up mocks for this user
    mockUsers[userId] = user;

    // Processor uses cache key: `automation:${user.id}:${mediaId}`
    const automationCacheKey = `automation:${userId}:media_${userId}`;
    mockAutomations[automationCacheKey] = automation;

    mockAutomations[`auto_${userId}`] = automation;
    // Fallback for direct ID lookups if any
    mockAutomations[userId] = automation;

    for (let i = 0; i < commentCount; i++) {
        // Each comment needs fresh Supabase responses:
        // 1. Idempotency check (single) → no existing log
        // 2. One-DM-per-user check (maybeSingle) → no existing DM
        // 3. Insert placeholder → success
        mockSupabase._setSingleResponses([{ data: null, error: null }]);
        mockSupabase._setMaybeSingleResponses([{ data: null, error: null }]);

        await handleCommentEvent(userId, {
            id: `comment_${userId}_${i}_${Date.now()}`,
            text: 'interested',
            from: { id: `commenter_${i}`, username: `fan_${i}` },
            media: { id: `media_${userId}` }
        }, mockSupabase);
    }
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════

describe('🚀 Capacity Simulation: Full System Load Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        dmsSentByUser = {};
        dmsQueuedByUser = {};
        userPlans = {};
        totalApiCalls = 0;
    });

    // ─── 1. Per-Plan Capacity Report ─────────────────────────────────
    describe('📊 Per-Plan Capacity Report', () => {
        it('prints capacity for all plan tiers', () => {
            console.log('\n╔══════════════════════════════════════════════════════════╗');
            console.log('║          REPLYKARO CAPACITY REPORT                      ║');
            console.log('╠══════════════════════════════════════════════════════════╣');

            const plans = ['free', 'starter', 'pro'] as const;
            const rows: string[] = [];

            for (const plan of plans) {
                const limits = getPlanLimits(plan);
                const maxDailyFromHourly = limits.dmsPerHour * 24;
                const effectiveDaily = Math.min(maxDailyFromHourly, Math.ceil(limits.dmsPerMonth / 30));

                rows.push(
                    `║  ${limits.planName.padEnd(16)} │ ` +
                    `${String(limits.dmsPerHour).padStart(5)} DMs/hr │ ` +
                    `${String(limits.dmsPerMonth).toLocaleString().padStart(10)} DMs/mo │ ` +
                    `${String(limits.automations).padStart(4)} auto ║`
                );

                console.log(rows[rows.length - 1]);
            }

            console.log('╠══════════════════════════════════════════════════════════╣');
            console.log('║  Platform-wide hourly speed limit: 200 DMs/hr/user      ║');
            console.log('╚══════════════════════════════════════════════════════════╝');

            // Verify actual plan values
            const free = getPlanLimits('free');
            expect(free.dmsPerHour).toBe(200);
            expect(free.dmsPerMonth).toBe(1000);
            expect(free.automations).toBe(3);

            const starter = getPlanLimits('starter');
            expect(starter.dmsPerMonth).toBe(50000);
            expect(starter.automations).toBe(10);

            const pro = getPlanLimits('pro');
            expect(pro.dmsPerMonth).toBe(1000000);
            expect(pro.automations).toBe(999);
        });
    });

    // ─── 2. Single User Full Journey ─────────────────────────────────
    describe('🧑 Single User Full Journey', () => {
        it('Free tier: 210 comments → 200 DMs + 10 queued', async () => {
            const mockSupabase = createMockSupabase();
            const commentCount = 210;

            await simulateComments('free_user_1', 'free', commentCount, mockSupabase);

            const counters = getUserCounters('free_user_1');
            const queued = dmsQueuedByUser['free_user_1'] || 0;

            console.log(`\n🧑 FREE USER JOURNEY (${commentCount} comments):`);
            console.log(`   ├─ DMs sent:   ${counters.hourly}`);
            console.log(`   ├─ DMs queued: ${queued}`);
            console.log(`   └─ Total:      ${counters.hourly + queued}`);

            expect(counters.hourly).toBe(200);   // Hourly limit
            expect(queued).toBe(10);              // Overflow queued
        });

        it('Starter tier: 210 comments → 200 DMs + 10 queued (same hourly limit)', async () => {
            const mockSupabase = createMockSupabase();

            await simulateComments('starter_user_1', 'starter', 210, mockSupabase);

            const counters = getUserCounters('starter_user_1');
            const queued = dmsQueuedByUser['starter_user_1'] || 0;

            console.log(`\n🧑 STARTER USER JOURNEY (210 comments):`);
            console.log(`   ├─ DMs sent:   ${counters.hourly}`);
            console.log(`   ├─ DMs queued: ${queued}`);
            console.log(`   └─ Total:      ${counters.hourly + queued}`);

            expect(counters.hourly).toBe(200);
            expect(queued).toBe(10);
        });

        it('Pro tier: 210 comments → 200 DMs + 10 queued (same hourly limit)', async () => {
            const mockSupabase = createMockSupabase();

            await simulateComments('pro_user_1', 'pro', 210, mockSupabase);

            const counters = getUserCounters('pro_user_1');
            const queued = dmsQueuedByUser['pro_user_1'] || 0;

            console.log(`\n🧑 PRO USER JOURNEY (210 comments):`);
            console.log(`   ├─ DMs sent:   ${counters.hourly}`);
            console.log(`   ├─ DMs queued: ${queued}`);
            console.log(`   └─ Total:      ${counters.hourly + queued}`);

            expect(counters.hourly).toBe(200);
            expect(queued).toBe(10);
        });
    });

    // ─── 3. Multi-User Concurrency ───────────────────────────────────
    describe('👥 Multi-User Concurrency', () => {
        it('10 concurrent Free users × 50 comments = 500 DMs', async () => {
            const userCount = 10;
            const commentsPerUser = 50;
            const mockSupabase = createMockSupabase();

            const promises = [];
            for (let i = 0; i < userCount; i++) {
                promises.push(
                    simulateComments(`concurrent_free_${i}`, 'free', commentsPerUser, mockSupabase)
                );
            }
            await Promise.all(promises);

            let totalSent = 0;
            let totalQueued = 0;
            for (let i = 0; i < userCount; i++) {
                const userId = `concurrent_free_${i}`;
                totalSent += getUserCounters(userId).hourly;
                totalQueued += dmsQueuedByUser[userId] || 0;
            }

            console.log(`\n👥 CONCURRENT FREE USERS (${userCount} users × ${commentsPerUser} comments):`);
            console.log(`   ├─ Total DMs sent:   ${totalSent}`);
            console.log(`   ├─ Total DMs queued: ${totalQueued}`);
            console.log(`   └─ Total processed:  ${totalSent + totalQueued}`);

            expect(totalSent).toBe(userCount * commentsPerUser); // All within hourly limit
            expect(totalQueued).toBe(0); // 50 < 200, no queuing
        });

        it('50 concurrent Starter users × 30 comments = 1,500 DMs', async () => {
            const userCount = 50;
            const commentsPerUser = 30;
            const mockSupabase = createMockSupabase();

            const promises = [];
            for (let i = 0; i < userCount; i++) {
                promises.push(
                    simulateComments(`concurrent_starter_${i}`, 'starter', commentsPerUser, mockSupabase)
                );
            }
            await Promise.all(promises);

            let totalSent = 0;
            for (let i = 0; i < userCount; i++) {
                totalSent += getUserCounters(`concurrent_starter_${i}`).hourly;
            }

            console.log(`\n👥 CONCURRENT STARTER USERS (${userCount} users × ${commentsPerUser} comments):`);
            console.log(`   ├─ Total DMs sent: ${totalSent}`);
            console.log(`   └─ Per user avg:   ${totalSent / userCount}`);

            expect(totalSent).toBe(userCount * commentsPerUser);
        });

        it('100 mixed-plan concurrent users', async () => {
            const mockSupabase = createMockSupabase();
            const commentsPerUser = 20;

            const promises = [];
            // 60 free + 30 starter + 10 pro
            for (let i = 0; i < 60; i++) {
                promises.push(simulateComments(`mix_free_${i}`, 'free', commentsPerUser, mockSupabase));
            }
            for (let i = 0; i < 30; i++) {
                promises.push(simulateComments(`mix_starter_${i}`, 'starter', commentsPerUser, mockSupabase));
            }
            for (let i = 0; i < 10; i++) {
                promises.push(simulateComments(`mix_pro_${i}`, 'pro', commentsPerUser, mockSupabase));
            }
            await Promise.all(promises);

            let freeSent = 0, starterSent = 0, proSent = 0;
            for (let i = 0; i < 60; i++) freeSent += getUserCounters(`mix_free_${i}`).hourly;
            for (let i = 0; i < 30; i++) starterSent += getUserCounters(`mix_starter_${i}`).hourly;
            for (let i = 0; i < 10; i++) proSent += getUserCounters(`mix_pro_${i}`).hourly;

            const totalSent = freeSent + starterSent + proSent;

            console.log(`\n👥 MIXED-PLAN CONCURRENCY (100 users × ${commentsPerUser} comments):`);
            console.log(`   ├─ Free (60):    ${freeSent} DMs`);
            console.log(`   ├─ Starter (30): ${starterSent} DMs`);
            console.log(`   ├─ Pro (10):     ${proSent} DMs`);
            console.log(`   └─ Total:        ${totalSent} DMs`);

            expect(totalSent).toBe(100 * commentsPerUser);
        });
    });

    // ─── 4. Viral Post Burst ─────────────────────────────────────────
    describe('🔥 Viral Post Burst', () => {
        it('500 comments on a single Pro users post → 200 sent + 300 queued', async () => {
            const mockSupabase = createMockSupabase();
            const burstSize = 500;

            await simulateComments('viral_pro', 'pro', burstSize, mockSupabase);

            const counters = getUserCounters('viral_pro');
            const queued = dmsQueuedByUser['viral_pro'] || 0;

            console.log(`\n🔥 VIRAL POST SIMULATION (${burstSize} comments, Pro user):`);
            console.log(`   ├─ DMs sent immediately: ${counters.hourly}`);
            console.log(`   ├─ DMs queued:           ${queued}`);
            console.log(`   ├─ Queue drain time:     ~${Math.ceil(queued / 200)}h`);
            console.log(`   └─ No DMs dropped:       ${counters.hourly + queued === burstSize ? '✅' : '❌'}`);

            expect(counters.hourly).toBe(200);             // 200/hr speed limit
            expect(queued).toBe(300);                       // Remaining queued
            expect(counters.hourly + queued).toBe(burstSize); // Nothing dropped
        });

        it('1000 comments on a Free user → 200 sent + 800 queued', async () => {
            const mockSupabase = createMockSupabase();
            const burstSize = 1000;

            await simulateComments('viral_free', 'free', burstSize, mockSupabase);

            const counters = getUserCounters('viral_free');
            const queued = dmsQueuedByUser['viral_free'] || 0;

            console.log(`\n🔥 VIRAL POST (FREE USER) (${burstSize} comments):`);
            console.log(`   ├─ DMs sent:           ${counters.hourly}`);
            console.log(`   ├─ DMs queued:          ${queued}`);
            console.log(`   ├─ Monthly quota used:  ${counters.monthly}/${getPlanLimits('free').dmsPerMonth}`);
            console.log(`   └─ Queue drain:         ~${Math.ceil(queued / 200)}h (${queued > 800 ? 'will hit monthly cap' : 'within limits'})`);

            // Hourly limit is 200, monthly is 1000
            // First 200 sent, remaining 800 queued
            expect(counters.hourly).toBe(200);
            expect(queued).toBe(800);
            expect(counters.hourly + queued).toBe(burstSize);
        });
    });

    // ─── 5. System-Wide Capacity Summary ─────────────────────────────
    describe('📈 System-Wide Capacity Summary', () => {
        it('prints theoretical maximums for different user bases', () => {
            const scenarios = [
                { name: '10 Free users', users: 10, plan: 'free' },
                { name: '50 Free users', users: 50, plan: 'free' },
                { name: '100 Free users', users: 100, plan: 'free' },
                { name: '10 Starter users', users: 10, plan: 'starter' },
                { name: '50 Starter users', users: 50, plan: 'starter' },
                { name: '100 Starter users', users: 100, plan: 'starter' },
                { name: '10 Pro users', users: 10, plan: 'pro' },
                { name: '50 Pro users', users: 50, plan: 'pro' },
                { name: '100 Pro users', users: 100, plan: 'pro' },
                { name: 'Mix: 500F+100S+20P', users: 620, plan: 'mixed' },
            ];

            console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
            console.log('║                 SYSTEM-WIDE CAPACITY SUMMARY                        ║');
            console.log('╠══════════════════════════════════════════════════════════════════════╣');
            console.log('║  Scenario               │  DMs/Hour  │  DMs/Day    │  DMs/Month     ║');
            console.log('╠══════════════════════════════════════════════════════════════════════╣');

            for (const s of scenarios) {
                let dmsPerHour: number, dmsPerMonth: number;

                if (s.plan === 'mixed') {
                    // 500 free + 100 starter + 20 pro
                    const freeL = getPlanLimits('free');
                    const starterL = getPlanLimits('starter');
                    const proL = getPlanLimits('pro');
                    dmsPerHour = 500 * freeL.dmsPerHour + 100 * starterL.dmsPerHour + 20 * proL.dmsPerHour;
                    dmsPerMonth = 500 * freeL.dmsPerMonth + 100 * starterL.dmsPerMonth + 20 * proL.dmsPerMonth;
                } else {
                    const limits = getPlanLimits(s.plan);
                    dmsPerHour = s.users * limits.dmsPerHour;
                    dmsPerMonth = s.users * limits.dmsPerMonth;
                }

                const dmsPerDay = Math.min(dmsPerHour * 24, Math.ceil(dmsPerMonth / 30));
                const hStr = dmsPerHour.toLocaleString().padStart(9);
                const dStr = dmsPerDay.toLocaleString().padStart(10);
                const mStr = dmsPerMonth.toLocaleString().padStart(12);

                console.log(`║  ${s.name.padEnd(22)} │ ${hStr}  │ ${dStr}  │ ${mStr}  ║`);
            }

            console.log('╠══════════════════════════════════════════════════════════════════════╣');
            console.log('║  Notes:                                                             ║');
            console.log('║  • All plans share 200 DMs/hr speed limit (Meta platform limit)     ║');
            console.log('║  • Free: 1K/mo  │  Starter: 50K/mo  │  Pro: 1M/mo (unlimited)      ║');
            console.log('║  • Overflow DMs are queued, never dropped                           ║');
            console.log('║  • Queue processes every hour via cron                              ║');
            console.log('╚══════════════════════════════════════════════════════════════════════╝');

            // Verify the math
            const free = getPlanLimits('free');
            expect(100 * free.dmsPerHour).toBe(20000);    // 100 free users = 20K DMs/hr
            expect(100 * free.dmsPerMonth).toBe(100000);   // 100 free users = 100K DMs/mo

            const pro = getPlanLimits('pro');
            expect(100 * pro.dmsPerHour).toBe(20000);     // 100 pro users = 20K DMs/hr

            // Mixed scenario: 500F + 100S + 20P
            const mixed = 500 * free.dmsPerMonth +
                100 * getPlanLimits('starter').dmsPerMonth +
                20 * pro.dmsPerMonth;
            expect(mixed).toBe(500 * 1000 + 100 * 50000 + 20 * 1000000); // 25.5M DMs/mo
        });
    });

    // ─── 6. Rate Limit Isolation Between Users ───────────────────────
    describe('🔒 Rate Limit Isolation', () => {
        it('one user hitting limit does NOT affect another user', async () => {
            const mockSupabase = createMockSupabase();

            // User A sends 200 DMs (hits hourly limit)
            await simulateComments('isolated_a', 'free', 200, mockSupabase);

            // User B should still be able to send 50 DMs
            await simulateComments('isolated_b', 'free', 50, mockSupabase);

            const userA = getUserCounters('isolated_a');
            const userB = getUserCounters('isolated_b');

            console.log(`\n🔒 ISOLATION TEST:`);
            console.log(`   ├─ User A: ${userA.hourly} sent (at limit)`);
            console.log(`   └─ User B: ${userB.hourly} sent (unaffected)`);

            expect(userA.hourly).toBe(200); // At limit
            expect(userB.hourly).toBe(50);  // Not affected
            expect(dmsQueuedByUser['isolated_b'] || 0).toBe(0); // No queuing for B
        });
    });

    // ─── 7. Monthly Limit Boundary ───────────────────────────────────
    describe('📅 Monthly Limit Boundary', () => {
        it('Free user: monthly limit blocks DMs after 1000', async () => {
            const mockSupabase = createMockSupabase();

            // Pre-fill monthly counter to 990 (10 away from limit)
            const counters = getUserCounters('monthly_test');
            counters.monthly = 990;
            counters.hourly = 0;
            userPlans['monthly_test'] = 'free';

            const user = {
                id: 'monthly_test',
                instagram_access_token: 'token_monthly',
                instagram_user_id: 'monthly_test',
                instagram_username: 'monthly_user',
                plan_type: 'free'
            };

            const automation = {
                id: 'auto_monthly',
                user_id: 'monthly_test',
                media_id: 'media_monthly',
                trigger_type: 'any',
                reply_message: 'Hello!',
                button_text: 'Link',
                link_url: 'https://example.com',
                is_active: true,
                require_follow: false,
                created_at: '2026-01-01T00:00:00Z'
            };

            vi.mocked(getCachedUser).mockResolvedValue(user as any);
            vi.mocked(getCachedAutomation).mockResolvedValue(automation as any);

            // Send 20 comments — should send 10, queue 10
            for (let i = 0; i < 20; i++) {
                mockSupabase._setSingleResponses([{ data: null, error: null }]);
                mockSupabase._setMaybeSingleResponses([{ data: null, error: null }]);

                await handleCommentEvent('monthly_test', {
                    id: `comment_monthly_${i}_${Date.now()}`,
                    text: 'test',
                    from: { id: `commenter_m_${i}`, username: `fan_m_${i}` },
                    media: { id: 'media_monthly' }
                }, mockSupabase);
            }

            const finalCounters = getUserCounters('monthly_test');
            const queued = dmsQueuedByUser['monthly_test'] || 0;

            console.log(`\n📅 MONTHLY LIMIT BOUNDARY (Free tier, started at 990/1000):`);
            console.log(`   ├─ DMs sent:      ${finalCounters.monthly - 990} (of 20 attempted)`);
            console.log(`   ├─ DMs queued:     ${queued}`);
            console.log(`   └─ Monthly used:   ${finalCounters.monthly}/1000`);

            expect(finalCounters.monthly).toBe(1000);  // Hit monthly cap
            expect(queued).toBe(10);                    // Overflow queued
        });
    });
});
