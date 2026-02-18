/**
 * Tests for Instagram comment/message processor
 * @module tests/lib/processor.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Create a robust chainable Supabase mock ---
// Each call to .from() returns a fresh chain, with responses controlled per-test.
let singleResponses: any[] = [];
let maybeSingleResponses: any[] = [];
let selectAllResponses: any[] = [];
let insertResponses: any[] = [];

function createChainableMock() {
    const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        insert: vi.fn((data: any) => {
            const resp = insertResponses.shift() || { error: null };
            // Return a thenable so `await supabase.from(...).insert(...)` works
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
        // Support `await supabase.from().select().eq().eq()` (returns array data)
        then: function (resolve: any) {
            const resp = selectAllResponses.shift() || { data: [], error: null };
            return resolve(resp);
        }
    };
    return chain;
}

const mockSupabase: any = {
    from: vi.fn(() => createChainableMock()),
};

// Mock all dependencies BEFORE importing processor
vi.mock('@/lib/supabase/client', () => ({
    getSupabaseAdmin: vi.fn(() => mockSupabase)
}));

vi.mock('@/lib/instagram/service', () => ({
    sendInstagramDM: vi.fn(),
    replyToComment: vi.fn(),
    checkFollowStatus: vi.fn(),
    checkIsFollowing: vi.fn(),
    getUniqueMessage: vi.fn((msg: string) => msg),
    incrementAutomationCount: vi.fn(),
    sendFollowGateCard: vi.fn(),
    hasReceivedFollowGate: vi.fn(),
    getMediaDetails: vi.fn()
}));

vi.mock('@/lib/smart-rate-limiter', () => ({
    smartRateLimit: vi.fn(),
    queueDM: vi.fn()
}));

vi.mock('@/lib/cache', () => ({
    getCachedUser: vi.fn(),
    setCachedUser: vi.fn(),
    getCachedAutomation: vi.fn(),
    setCachedAutomation: vi.fn()
}));

vi.mock('@/lib/pricing', () => ({
    getPlanLimits: vi.fn(() => ({
        dmsPerHour: 50,
        dmsPerMonth: 1000
    }))
}));

vi.mock('@/lib/notifications/push', () => ({
    notifyUser: vi.fn()
}));

import { handleCommentEvent, handleMessageEvent } from '@/lib/instagram/processor';
import { sendInstagramDM, replyToComment, checkIsFollowing, incrementAutomationCount } from '@/lib/instagram/service';
import { smartRateLimit, queueDM } from '@/lib/smart-rate-limiter';
import { getCachedUser, setCachedUser, getCachedAutomation, setCachedAutomation } from '@/lib/cache';

describe('processor.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        singleResponses = [];
        maybeSingleResponses = [];
        selectAllResponses = [];
        insertResponses = [];
    });

    describe('handleCommentEvent', () => {
        const baseEventData = {
            id: 'comment_123',
            text: 'interested',
            from: { id: 'commenter_456', username: 'testuser' },
            media: { id: 'media_789' }
        };

        const mockUser = {
            id: 'user_uuid_123',
            instagram_access_token: 'mock_token',
            instagram_user_id: 'owner_123',
            instagram_username: 'owner_user',
            plan_type: 'starter'
        };

        const mockAutomation = {
            id: 'automation_uuid_123',
            user_id: 'user_uuid_123',
            media_id: 'media_789',
            trigger_type: 'any',
            trigger_keyword: undefined,
            reply_message: 'Thanks for your interest!',
            comment_reply: 'Check your DM!',
            button_text: 'Get Link',
            link_url: 'https://example.com',
            is_active: true,
            require_follow: false,
            created_at: '2026-01-01T00:00:00Z'
        };

        it('should skip self-comments', async () => {
            const selfCommentEvent = {
                ...baseEventData,
                from: { id: 'owner_123', username: 'owner' }
            };

            // User found from cache
            vi.mocked(getCachedUser).mockResolvedValue(mockUser as any);

            await handleCommentEvent('owner_123', selfCommentEvent, mockSupabase);

            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should skip duplicate comment IDs (idempotency)', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser as any);

            // Idempotency check: dm_logs query returns existing log
            singleResponses.push({ data: { id: 'existing_log' }, error: null });

            await handleCommentEvent('owner_123', baseEventData, mockSupabase);

            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should skip if no matching automation found', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser as any);
            vi.mocked(getCachedAutomation).mockResolvedValue(null);

            // Idempotency check: no existing log
            singleResponses.push({ data: null, error: null });

            // Automations query: no active automations
            selectAllResponses.push({ data: [], error: null });

            await handleCommentEvent('owner_123', baseEventData, mockSupabase);

            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should skip reply comments (parent_id present)', async () => {
            const replyEvent = {
                ...baseEventData,
                parent_id: 'parent_comment_123'
            };

            await handleCommentEvent('owner_123', replyEvent, mockSupabase);

            expect(getCachedUser).not.toHaveBeenCalled();
            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should check keyword match for keyword trigger type', async () => {
            const keywordAutomation = {
                ...mockAutomation,
                trigger_type: 'keyword',
                trigger_keyword: 'interested',
                created_at: '2026-01-01T00:00:00Z'
            };

            const nonMatchingEvent = {
                ...baseEventData,
                text: 'hello world'
            };

            vi.mocked(getCachedUser).mockResolvedValue(mockUser as any);
            vi.mocked(getCachedAutomation).mockResolvedValue(keywordAutomation as any);

            // Idempotency check
            singleResponses.push({ data: null, error: null });

            await handleCommentEvent('owner_123', nonMatchingEvent, mockSupabase);

            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should queue DM when rate limit is hit', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser as any);
            vi.mocked(getCachedAutomation).mockResolvedValue(mockAutomation as any);

            // Idempotency check - no existing log
            singleResponses.push({ data: null, error: null });

            // One-DM-per-user check
            maybeSingleResponses.push({ data: null, error: null });

            // Insert placeholder
            insertResponses.push({ error: null });

            vi.mocked(smartRateLimit).mockResolvedValue({
                allowed: false,
                remaining: { hourly: 0, monthly: 500 },
                estimatedSendTime: new Date(Date.now() + 60000)
            });

            await handleCommentEvent('owner_123', baseEventData, mockSupabase);

            expect(queueDM).toHaveBeenCalled();
            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should send DM successfully when all checks pass', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser as any);
            vi.mocked(getCachedAutomation).mockResolvedValue(mockAutomation as any);

            // Idempotency check
            singleResponses.push({ data: null, error: null });

            // One-DM-per-user check
            maybeSingleResponses.push({ data: null, error: null });

            // Insert placeholder
            insertResponses.push({ error: null });

            vi.mocked(smartRateLimit).mockResolvedValue({
                allowed: true,
                remaining: { hourly: 49, monthly: 999 }
            });

            vi.mocked(sendInstagramDM).mockResolvedValue(true);

            await handleCommentEvent('owner_123', baseEventData, mockSupabase);

            expect(sendInstagramDM).toHaveBeenCalledWith(
                mockUser.instagram_access_token,
                'owner_123',
                'comment_123',
                'commenter_456',
                mockAutomation.reply_message,
                mockAutomation.id,
                mockAutomation.button_text,
                mockAutomation.link_url,
                undefined
            );
            expect(incrementAutomationCount).toHaveBeenCalled();
        });

        it('should send public comment reply if configured', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser as any);
            vi.mocked(getCachedAutomation).mockResolvedValue(mockAutomation as any);

            // Idempotency check
            singleResponses.push({ data: null, error: null });

            // One-DM-per-user check
            maybeSingleResponses.push({ data: null, error: null });

            // Insert placeholder
            insertResponses.push({ error: null });

            vi.mocked(smartRateLimit).mockResolvedValue({
                allowed: true,
                remaining: { hourly: 49, monthly: 999 }
            });

            vi.mocked(sendInstagramDM).mockResolvedValue(true);

            await handleCommentEvent('owner_123', baseEventData, mockSupabase);

            expect(replyToComment).toHaveBeenCalledWith(
                mockUser.instagram_access_token,
                'comment_123',
                mockAutomation.comment_reply
            );
        });
    });

    describe('handleMessageEvent', () => {
        it('should handle story reply trigger', async () => {
            const storyReplyMessaging = {
                sender: { id: 'sender_123' },
                message: {
                    text: 'Great story!',
                    reply_to: { story: { id: 'story_456' } }
                }
            };

            const mockUser = {
                id: 'user_uuid_123',
                instagram_access_token: 'mock_token',
                instagram_user_id: 'owner_123',
                instagram_username: 'owner_user',
                plan_type: 'free'
            };

            const storyAutomation = {
                id: 'story_automation_123',
                trigger_type: 'story_reply',
                reply_message: 'Thanks for replying to my story!',
                is_active: true
            };

            vi.mocked(getCachedUser).mockResolvedValue(null);

            // User lookup
            singleResponses.push({ data: mockUser, error: null });

            // Story automation lookup
            maybeSingleResponses.push({ data: storyAutomation, error: null });

            // Idempotency check for story
            maybeSingleResponses.push({ data: null, error: null });

            vi.mocked(smartRateLimit).mockResolvedValue({
                allowed: true,
                remaining: { hourly: 199, monthly: 999 }
            });

            vi.mocked(sendInstagramDM).mockResolvedValue(true);

            await handleMessageEvent('owner_123', storyReplyMessaging, mockSupabase);

            expect(sendInstagramDM).toHaveBeenCalled();
            expect(incrementAutomationCount).toHaveBeenCalled();
        });

        it('should handle CLICK_LINK_ postback', async () => {
            const clickLinkMessaging = {
                sender: { id: 'sender_123' },
                postback: { payload: 'CLICK_LINK_automation_uuid_123' }
            };

            const mockAutomation = {
                id: 'automation_uuid_123',
                user_id: 'user_uuid_123',
                link_url: 'https://example.com/resource',
                final_message: 'Here is your link!',
                final_button_text: 'Open Now',
                require_follow: false,
                media_thumbnail_url: undefined
            };

            const mockUser = {
                id: 'user_uuid_123',
                instagram_access_token: 'mock_token',
                instagram_username: 'owner_user'
            };

            // Automation lookup
            singleResponses.push({ data: mockAutomation, error: null });
            // User lookup
            singleResponses.push({ data: mockUser, error: null });

            vi.mocked(sendInstagramDM).mockResolvedValue(true);

            // For the dm_logs update query (latestLog)
            singleResponses.push({ data: { id: 'log_123' }, error: null });

            await handleMessageEvent('owner_123', clickLinkMessaging, mockSupabase);

            expect(sendInstagramDM).toHaveBeenCalledWith(
                mockUser.instagram_access_token,
                'owner_123',
                null,
                'sender_123',
                mockAutomation.final_message,
                mockAutomation.id,
                mockAutomation.final_button_text,
                mockAutomation.link_url,
                undefined
            );
        });

        it('should handle VERIFY_FOLLOW_ postback - user is following', async () => {
            const verifyFollowMessaging = {
                sender: { id: 'sender_123' },
                postback: { payload: 'VERIFY_FOLLOW_automation_uuid_123' }
            };

            const mockAutomation = {
                id: 'automation_uuid_123',
                user_id: 'user_uuid_123',
                reply_message: 'Thanks for following!',
                button_text: 'Get Access',
                link_url: 'https://example.com',
                final_message: 'Here is the link!',
                final_button_text: 'Open Link',
                media_thumbnail_url: undefined
            };

            const mockUser = {
                id: 'user_uuid_123',
                instagram_access_token: 'mock_token',
                instagram_username: 'owner'
            };

            // Automation lookup
            singleResponses.push({ data: mockAutomation, error: null });
            // User lookup
            singleResponses.push({ data: mockUser, error: null });

            vi.mocked(checkIsFollowing).mockResolvedValue(true);
            vi.mocked(sendInstagramDM).mockResolvedValue(true);

            await handleMessageEvent('owner_123', verifyFollowMessaging, mockSupabase);

            expect(checkIsFollowing).toHaveBeenCalledWith(
                mockUser.instagram_access_token,
                'sender_123'
            );
            expect(sendInstagramDM).toHaveBeenCalled();
        });
    });
});
