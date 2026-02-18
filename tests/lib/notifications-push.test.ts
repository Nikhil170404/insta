/**
 * Tests for push notification service
 * @module tests/lib/notifications-push.test.ts
 */

// IMPORTANT: Set env vars BEFORE any imports, because push.ts captures
// VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY at module scope
process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = 'BPvlO0awtlrWKrD9test';
process.env.VAPID_PRIVATE_KEY = 'test-private-key';

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so mock fns are available before vi.mock factories
const mockSendNotification = vi.hoisted(() => vi.fn().mockResolvedValue({ statusCode: 201 }));
const mockSetVapidDetails = vi.hoisted(() => vi.fn());

// Mock web-push
vi.mock('web-push', () => ({
    default: {
        setVapidDetails: mockSetVapidDetails,
        sendNotification: mockSendNotification
    }
}));

// Chainable Supabase mock
const mockChain = vi.hoisted(() => {
    const chain: any = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.update = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.single = vi.fn();
    return chain;
});

vi.mock('@/lib/supabase/client', () => ({
    getSupabaseAdmin: () => mockChain
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    }
}));

import { notifyUser } from '@/lib/notifications/push';

describe('push notifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const defaultUserData = {
        email: 'test@example.com',
        instagram_username: 'testuser',
        notification_settings: {
            dm_sent: true,
            billing: true,
            security: true,
            web_push_token: JSON.stringify({
                endpoint: 'https://fcm.googleapis.com/test',
                keys: { p256dh: 'test-key', auth: 'test-auth' }
            })
        }
    };

    describe('notifyUser', () => {
        it('sends web push notification for dm_sent type', async () => {
            mockChain.single.mockResolvedValue({ data: defaultUserData, error: null });

            await notifyUser('user_123', 'dm_sent', {
                title: 'DM Sent!',
                body: 'Automated reply sent to @testuser'
            });

            expect(mockSendNotification).toHaveBeenCalledTimes(1);
            const [subscription, payload] = mockSendNotification.mock.calls[0];
            expect(subscription.endpoint).toBe('https://fcm.googleapis.com/test');

            const parsedPayload = JSON.parse(payload);
            expect(parsedPayload.title).toBe('DM Sent!');
            expect(parsedPayload.body).toContain('@testuser');
        });

        it('sends notification for billing type', async () => {
            mockChain.single.mockResolvedValue({ data: defaultUserData, error: null });

            await notifyUser('user_123', 'billing', {
                title: 'Payment Received',
                body: 'Your Pro Pack subscription is active'
            });

            expect(mockSendNotification).toHaveBeenCalled();
        });

        it('sends notification for security type', async () => {
            mockChain.single.mockResolvedValue({ data: defaultUserData, error: null });

            await notifyUser('user_123', 'security', {
                title: 'New Sign-In',
                body: 'New sign-in detected from Chrome on Windows'
            });

            expect(mockSendNotification).toHaveBeenCalled();
        });

        it('does not throw on push failure', async () => {
            mockChain.single.mockResolvedValue({ data: defaultUserData, error: null });
            mockSendNotification.mockRejectedValueOnce(new Error('Network Error'));

            await expect(
                notifyUser('user_123', 'dm_sent', {
                    title: 'Test',
                    body: 'Test'
                })
            ).resolves.not.toThrow();
        });

        it('skips when user not found', async () => {
            mockChain.single.mockResolvedValue({
                data: null,
                error: { message: 'Not found' }
            });

            await notifyUser('missing_user', 'dm_sent', {
                title: 'Test',
                body: 'Test'
            });

            expect(mockSendNotification).not.toHaveBeenCalled();
        });

        it('skips when notification type is disabled', async () => {
            mockChain.single.mockResolvedValue({
                data: {
                    notification_settings: {
                        dm_sent: false,
                        web_push_token: JSON.stringify({
                            endpoint: 'https://test.com',
                            keys: { p256dh: 'k', auth: 'a' }
                        })
                    }
                },
                error: null
            });

            await notifyUser('user_123', 'dm_sent', {
                title: 'Test',
                body: 'Test'
            });

            expect(mockSendNotification).not.toHaveBeenCalled();
        });

        it('skips when no notification settings exist', async () => {
            mockChain.single.mockResolvedValue({
                data: {
                    notification_settings: null
                },
                error: null
            });

            await notifyUser('user_123', 'dm_sent', {
                title: 'Test',
                body: 'Test'
            });

            expect(mockSendNotification).not.toHaveBeenCalled();
        });
    });
});
