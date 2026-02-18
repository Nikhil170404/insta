/**
 * Tests for cache module (memory fallback path)
 * @module tests/lib/cache.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Redis as unavailable so memory fallback is used
vi.mock('@upstash/redis', () => ({
    Redis: vi.fn()
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
    logger: {
        warn: vi.fn(),
        error: vi.fn(),
        info: vi.fn(),
        debug: vi.fn()
    }
}));

import {
    getCachedUser,
    setCachedUser,
    clearUserCache,
    getCachedAutomation,
    setCachedAutomation,
    clearAutomationCache
} from '@/lib/cache';

// We need to access the lower-level functions for thorough testing
import { getCached, setCached, deleteCached } from '@/lib/cache';

describe('cache.ts (memory fallback)', () => {
    beforeEach(async () => {
        // Clear memory cache by deleting known keys
        // Since we can't clear the Map directly, we test behavior via the API
    });

    describe('getCached / setCached / deleteCached', () => {
        it('returns null for non-existent keys', async () => {
            const result = await getCached<string>(`test_missing_${Date.now()}`);
            expect(result).toBeNull();
        });

        it('stores and retrieves data correctly', async () => {
            const key = `test_store_${Date.now()}`;
            await setCached(key, { name: 'test', value: 42 }, 60);
            const result = await getCached<{ name: string; value: number }>(key);
            expect(result).toEqual({ name: 'test', value: 42 });

            // Cleanup
            await deleteCached(key);
        });

        it('deletes cached items', async () => {
            const key = `test_delete_${Date.now()}`;
            await setCached(key, 'hello', 60);
            await deleteCached(key);
            const result = await getCached<string>(key);
            expect(result).toBeNull();
        });

        it('expires items after TTL', async () => {
            const key = `test_ttl_${Date.now()}`;
            // Use 0 second TTL (immediate expiry)
            await setCached(key, 'expires_fast', 0);

            // Wait a tiny bit for the expiration to take effect
            await new Promise(r => setTimeout(r, 10));

            const result = await getCached<string>(key);
            expect(result).toBeNull();
        });
    });

    describe('user cache helpers', () => {
        const testUser = {
            id: 'user_123',
            instagram_access_token: 'token_abc',
            instagram_user_id: 'ig_456',
            instagram_username: 'testuser',
            plan_type: 'free'
        };

        it('stores and retrieves user data', async () => {
            await setCachedUser('ig_456', testUser);
            const result = await getCachedUser('ig_456');
            expect(result).toEqual(testUser);

            // Cleanup
            await clearUserCache('ig_456');
        });

        it('clears user cache', async () => {
            await setCachedUser('ig_clear', testUser);
            await clearUserCache('ig_clear');
            const result = await getCachedUser('ig_clear');
            expect(result).toBeNull();
        });
    });

    describe('automation cache helpers', () => {
        const testAutomation = {
            id: 'auto_123',
            user_id: 'user_123',
            media_id: 'media_789',
            trigger_type: 'any',
            reply_message: 'Hello!',
            require_follow: false,
            is_active: true,
            created_at: '2026-01-01T00:00:00Z'
        };

        it('stores and retrieves automation data', async () => {
            const key = `automation:user_123:media_789`;
            await setCachedAutomation(key, testAutomation as any);
            const result = await getCachedAutomation(key);
            expect(result).toEqual(testAutomation);

            // Cleanup
            await clearAutomationCache(key);
        });

        it('clears automation cache', async () => {
            const key = `automation:clear_test`;
            await setCachedAutomation(key, testAutomation as any);
            await clearAutomationCache(key);
            const result = await getCachedAutomation(key);
            expect(result).toBeNull();
        });
    });
});
