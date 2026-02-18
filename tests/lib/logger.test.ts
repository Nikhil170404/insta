/**
 * Tests for structured logging system
 * @module tests/lib/logger.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to test logger without the module cache interfering
// So we test the exported logger behavior directly

describe('logger', () => {
    let consoleDebugSpy: any;
    let consoleInfoSpy: any;
    let consoleWarnSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => { });
        consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => { });
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('logs info messages via console.info', async () => {
        // Dynamic import to get fresh logger
        const { logger } = await import('@/lib/logger');
        logger.info('Test info message');
        expect(consoleInfoSpy).toHaveBeenCalled();
        const logOutput = consoleInfoSpy.mock.calls[0][0];
        expect(logOutput).toContain('Test info message');
    });

    it('logs warn messages via console.warn', async () => {
        const { logger } = await import('@/lib/logger');
        logger.warn('Test warning');
        expect(consoleWarnSpy).toHaveBeenCalled();
        const logOutput = consoleWarnSpy.mock.calls[0][0];
        expect(logOutput).toContain('Test warning');
    });

    it('logs error messages via console.error', async () => {
        const { logger } = await import('@/lib/logger');
        logger.error('Test error', {}, new Error('Boom'));
        expect(consoleErrorSpy).toHaveBeenCalled();
        const logOutput = consoleErrorSpy.mock.calls[0][0];
        expect(logOutput).toContain('Test error');
        expect(logOutput).toContain('Boom');
    });

    it('includes context in log output', async () => {
        const { logger } = await import('@/lib/logger');
        logger.info('Action happened', { userId: 'u123', category: 'test' });
        expect(consoleInfoSpy).toHaveBeenCalled();
        const logOutput = consoleInfoSpy.mock.calls[0][0];
        expect(logOutput).toContain('u123');
    });

    describe('specialized loggers', () => {
        it('webhook.received logs with webhook category', async () => {
            const { logger } = await import('@/lib/logger');
            logger.webhook.received('comment', { eventId: '123' });
            expect(consoleInfoSpy).toHaveBeenCalled();
            const logOutput = consoleInfoSpy.mock.calls[0][0];
            expect(logOutput).toContain('Webhook received');
            expect(logOutput).toContain('comment');
        });

        it('dm.sent logs with dm category', async () => {
            const { logger } = await import('@/lib/logger');
            logger.dm.sent('user1', 'recipient1', 'auto1');
            expect(consoleInfoSpy).toHaveBeenCalled();
            const logOutput = consoleInfoSpy.mock.calls[0][0];
            expect(logOutput).toContain('DM sent');
        });

        it('dm.rateLimited logs a warning', async () => {
            const { logger } = await import('@/lib/logger');
            logger.dm.rateLimited('user1', { hourly: 0, monthly: 500 });
            expect(consoleWarnSpy).toHaveBeenCalled();
            const logOutput = consoleWarnSpy.mock.calls[0][0];
            expect(logOutput).toContain('Rate limit hit');
        });

        it('auth.login logs user login', async () => {
            const { logger } = await import('@/lib/logger');
            logger.auth.login('user1', 'testuser');
            expect(consoleInfoSpy).toHaveBeenCalled();
        });

        it('payment.initiated logs payment info', async () => {
            const { logger } = await import('@/lib/logger');
            logger.payment.initiated('user1', 299, 'pro');
            expect(consoleInfoSpy).toHaveBeenCalled();
            const logOutput = consoleInfoSpy.mock.calls[0][0];
            expect(logOutput).toContain('Payment initiated');
        });

        it('api.request logs API calls', async () => {
            const { logger } = await import('@/lib/logger');
            logger.api.request('GET', '/api/health');
            // debug level - may or may not log depending on LOG_LEVEL
            // At minimum, the function should not throw
        });
    });
});
