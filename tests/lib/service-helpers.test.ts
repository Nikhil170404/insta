/**
 * Tests for Instagram service helper functions
 * @module tests/lib/service-helpers.test.ts
 */
import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
    getSupabaseAdmin: vi.fn()
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        dm: { sent: vi.fn(), failed: vi.fn(), rateLimited: vi.fn() }
    }
}));

vi.mock('@/lib/cache', () => ({
    getCachedUser: vi.fn(),
    setCachedUser: vi.fn()
}));

import { getUniqueMessage } from '@/lib/instagram/service';

describe('Instagram service helpers', () => {
    describe('getUniqueMessage', () => {
        it('appends an emoji variation to the message', () => {
            const result = getUniqueMessage('Hello!');
            expect(result).toMatch(/^Hello! ./);
            expect(result.length).toBeGreaterThan('Hello! '.length);
        });

        it('returns a different variation sometimes (probabilistic)', () => {
            const results = new Set<string>();
            // Run 20 times — with 10 emoji variants, high chance of at least 2 different ones
            for (let i = 0; i < 20; i++) {
                results.add(getUniqueMessage('Test'));
            }
            expect(results.size).toBeGreaterThan(1);
        });

        it('preserves the original message text', () => {
            const original = 'Check your DM for the link!';
            const result = getUniqueMessage(original);
            expect(result.startsWith(original)).toBe(true);
        });

        it('works with empty string', () => {
            const result = getUniqueMessage('');
            expect(result).toBe('');
        });
    });
});
