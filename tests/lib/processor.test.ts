/**
 * Tests for Instagram comment/message processor
 * @module tests/lib/processor.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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
    hasReceivedFollowGate: vi.fn()
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

// Mock Supabase client - typed as any because it's a test mock
const mockSupabase: any = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    single: vi.fn(() => ({ data: null, error: null })),
    maybeSingle: vi.fn(() => ({ data: null, error: null })),
    order: vi.fn(() => mockSupabase),
    limit: vi.fn(() => mockSupabase)
};

import { handleCommentEvent, handleMessageEvent } from '@/lib/instagram/processor';
import { sendInstagramDM, replyToComment, checkIsFollowing, incrementAutomationCount } from '@/lib/instagram/service';
import { smartRateLimit, queueDM } from '@/lib/smart-rate-limiter';
import { getCachedUser, setCachedUser, getCachedAutomation, setCachedAutomation } from '@/lib/cache';

describe('processor.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock chain
        mockSupabase.from.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.update.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.order.mockReturnValue(mockSupabase);
        mockSupabase.limit.mockReturnValue(mockSupabase);
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

            vi.mocked(getCachedUser).mockResolvedValue(null);
            mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null } as any);

            await handleCommentEvent('owner_123', selfCommentEvent, mockSupabase);

            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should skip duplicate comment IDs (idempotency)', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser);
            // First call is for user, second for dm_logs check
            mockSupabase.single
                .mockResolvedValueOnce({ data: { id: 'existing_log' }, error: null }); // Existing log found

            await handleCommentEvent('owner_123', baseEventData, mockSupabase);

            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should skip if no matching automation found', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser);
            vi.mocked(getCachedAutomation).mockResolvedValue(null);

            // dm_logs check - no existing log
            mockSupabase.single.mockResolvedValueOnce({ data: null, error: null });

            // Return empty automations array
            mockSupabase.select.mockReturnValue({
                ...mockSupabase,
                eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockResolvedValue({ data: [], error: null })
                })
            });

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

            vi.mocked(getCachedUser).mockResolvedValue(mockUser);
            vi.mocked(getCachedAutomation).mockResolvedValue(keywordAutomation);
            mockSupabase.single.mockResolvedValue({ data: null, error: null });

            await handleCommentEvent('owner_123', nonMatchingEvent, mockSupabase);

            // Should not send DM because keyword doesn't match
            expect(sendInstagramDM).not.toHaveBeenCalled();
        });

        it('should queue DM when rate limit is hit', async () => {
            vi.mocked(getCachedUser).mockResolvedValue(mockUser);
            vi.mocked(getCachedAutomation).mockResolvedValue(mockAutomation);
            mockSupabase.single.mockResolvedValue({ data: null, error: null });
            mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
            mockSupabase.insert.mockResolvedValue({ error: null });

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
            vi.mocked(getCachedUser).mockResolvedValue(mockUser);
            vi.mocked(getCachedAutomation).mockResolvedValue(mockAutomation);
            mockSupabase.single.mockResolvedValue({ data: null, error: null });
            mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
            mockSupabase.insert.mockResolvedValue({ error: null });

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
            vi.mocked(getCachedUser).mockResolvedValue(mockUser);
            vi.mocked(getCachedAutomation).mockResolvedValue(mockAutomation);
            mockSupabase.single.mockResolvedValue({ data: null, error: null });
            mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null });
            mockSupabase.insert.mockResolvedValue({ error: null });

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
                    reply_to: { story_id: 'story_456' }
                }
            };

            const mockUser = {
                id: 'user_uuid_123',
                instagram_access_token: 'mock_token',
                instagram_user_id: 'owner_123'
            };

            const storyAutomation = {
                id: 'story_automation_123',
                trigger_type: 'story_reply',
                reply_message: 'Thanks for replying to my story!',
                is_active: true
            };

            vi.mocked(getCachedUser).mockResolvedValue(null);
            mockSupabase.single.mockResolvedValueOnce({ data: mockUser, error: null });
            mockSupabase.maybeSingle.mockResolvedValueOnce({ data: storyAutomation, error: null });

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
                final_button_text: 'Open Now'
            };

            const mockUser = {
                instagram_access_token: 'mock_token'
            };

            mockSupabase.single
                .mockResolvedValueOnce({ data: mockAutomation, error: null })
                .mockResolvedValueOnce({ data: mockUser, error: null });

            vi.mocked(sendInstagramDM).mockResolvedValue(true);

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
                button_text: 'Get Access'
            };

            const mockUser = {
                id: 'user_uuid_123',
                instagram_access_token: 'mock_token',
                instagram_username: 'owner'
            };

            mockSupabase.single
                .mockResolvedValueOnce({ data: mockAutomation, error: null })
                .mockResolvedValueOnce({ data: mockUser, error: null });

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
