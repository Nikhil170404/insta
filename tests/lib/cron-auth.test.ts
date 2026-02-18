/**
 * Tests for cron authentication
 * @module tests/lib/cron-auth.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn()
    }
}));

import { verifyCronRequest } from '@/lib/cron-auth';

describe('cron-auth', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('verifyCronRequest', () => {
        it('returns unauthorized when no secrets are configured', () => {
            delete process.env.CRON_SECRET;
            delete process.env.EXTERNAL_CRON_SECRET;

            const request = new Request('https://localhost/api/cron', {
                headers: { authorization: 'Bearer some-token' },
            });

            const result = verifyCronRequest(request);
            expect(result.authorized).toBe(false);
            if (!result.authorized) {
                expect(result.status).toBe(500);
            }
        });

        it('returns unauthorized for missing auth header', () => {
            process.env.CRON_SECRET = 'test-cron-secret-123';

            const request = new Request('https://localhost/api/cron');

            const result = verifyCronRequest(request);
            expect(result.authorized).toBe(false);
            if (!result.authorized) {
                expect(result.status).toBe(401);
            }
        });

        it('returns unauthorized for invalid token', () => {
            process.env.CRON_SECRET = 'test-cron-secret-123';

            const request = new Request('https://localhost/api/cron', {
                headers: { authorization: 'Bearer wrong-token' },
            });

            const result = verifyCronRequest(request);
            expect(result.authorized).toBe(false);
            if (!result.authorized) {
                expect(result.status).toBe(401);
            }
        });

        it('returns authorized for valid CRON_SECRET', () => {
            process.env.CRON_SECRET = 'test-cron-secret-123';

            const request = new Request('https://localhost/api/cron', {
                headers: { authorization: 'Bearer test-cron-secret-123' },
            });

            const result = verifyCronRequest(request);
            expect(result.authorized).toBe(true);
        });

        it('returns authorized for valid EXTERNAL_CRON_SECRET', () => {
            delete process.env.CRON_SECRET;
            process.env.EXTERNAL_CRON_SECRET = 'external-secret-456';

            const request = new Request('https://localhost/api/cron', {
                headers: { authorization: 'Bearer external-secret-456' },
            });

            const result = verifyCronRequest(request);
            expect(result.authorized).toBe(true);
        });

        it('accepts either cron secret when both are configured', () => {
            process.env.CRON_SECRET = 'secret-1';
            process.env.EXTERNAL_CRON_SECRET = 'secret-2';

            const req1 = new Request('https://localhost/api/cron', {
                headers: { authorization: 'Bearer secret-1' },
            });
            expect(verifyCronRequest(req1).authorized).toBe(true);

            const req2 = new Request('https://localhost/api/cron', {
                headers: { authorization: 'Bearer secret-2' },
            });
            expect(verifyCronRequest(req2).authorized).toBe(true);
        });

        it('rejects non-Bearer authorization schemes', () => {
            process.env.CRON_SECRET = 'test-secret';

            const request = new Request('https://localhost/api/cron', {
                headers: { authorization: 'Basic test-secret' },
            });

            const result = verifyCronRequest(request);
            expect(result.authorized).toBe(false);
        });
    });
});
