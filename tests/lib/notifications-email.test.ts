/**
 * Tests for email notification functions
 * @module tests/lib/notifications-email.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define the mock fn before vi.mock factory executes
const mockSend = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'email_123' }));

// Mock Resend as a proper class constructor
vi.mock('resend', () => ({
    Resend: class MockResend {
        emails = { send: mockSend };
    }
}));

import {
    sendReceiptEmail,
    sendWelcomeEmail,
    sendExpiryWarningEmail,
    sendPaymentFailedEmail
} from '@/lib/notifications/email';

describe('email notifications', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.RESEND_API_KEY = 're_test_key';
    });

    describe('sendReceiptEmail', () => {
        it('sends receipt email with correct fields', async () => {
            await sendReceiptEmail('test@example.com', 'Pro Pack', '299', '2026-02-18');

            expect(mockSend).toHaveBeenCalledTimes(1);
            const call = mockSend.mock.calls[0][0];
            expect(call.to).toBe('test@example.com');
            expect(call.subject).toContain('Payment Receipt');
            expect(call.subject).toContain('Pro Pack');
            expect(call.html).toContain('₹299');
            expect(call.html).toContain('2026-02-18');
            expect(call.from).toContain('replykaro1704@gmail.com');
        });

        it('skips email when RESEND_API_KEY is missing', async () => {
            delete process.env.RESEND_API_KEY;
            await sendReceiptEmail('test@example.com', 'Pro Pack', '299', '2026-02-18');
            expect(mockSend).not.toHaveBeenCalled();
        });

        it('does not throw on Resend failure', async () => {
            mockSend.mockRejectedValueOnce(new Error('API Error'));
            await expect(
                sendReceiptEmail('test@example.com', 'Pro Pack', '299', '2026-02-18')
            ).resolves.not.toThrow();
        });
    });

    describe('sendWelcomeEmail', () => {
        it('sends welcome email with user name', async () => {
            await sendWelcomeEmail('user@example.com', 'Prashant');

            expect(mockSend).toHaveBeenCalledTimes(1);
            const call = mockSend.mock.calls[0][0];
            expect(call.to).toBe('user@example.com');
            expect(call.subject).toContain('Welcome');
            expect(call.html).toContain('Prashant');
        });

        it('skips when no API key', async () => {
            delete process.env.RESEND_API_KEY;
            await sendWelcomeEmail('user@example.com', 'Test');
            expect(mockSend).not.toHaveBeenCalled();
        });
    });

    describe('sendExpiryWarningEmail', () => {
        it('sends expiry warning with date', async () => {
            await sendExpiryWarningEmail('user@example.com', '2026-03-15');

            expect(mockSend).toHaveBeenCalledTimes(1);
            const call = mockSend.mock.calls[0][0];
            expect(call.subject).toContain('Expiring');
            expect(call.html).toContain('2026-03-15');
        });
    });

    describe('sendPaymentFailedEmail', () => {
        it('sends payment failure email with retry link', async () => {
            const retryLink = 'https://replykaro.vercel.app/settings?tab=billing';
            await sendPaymentFailedEmail('user@example.com', 'Starter Pack', retryLink);

            expect(mockSend).toHaveBeenCalledTimes(1);
            const call = mockSend.mock.calls[0][0];
            expect(call.subject).toContain('Payment Failed');
            expect(call.html).toContain('Starter Pack');
            expect(call.html).toContain(retryLink);
        });
    });
});
