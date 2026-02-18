
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { smartRateLimit, processQueuedDMs, queueDM } from '@/lib/smart-rate-limiter';
import { getPlanLimits } from '@/lib/pricing';

// Mocks
vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    }
}));

// Mock Supabase
let mockRpc = vi.fn();
let mockFrom = vi.fn();

const mockSupabase = {
    rpc: mockRpc,
    from: mockFrom
};

vi.mock('@/lib/supabase/client', () => ({
    getSupabaseAdmin: vi.fn(() => mockSupabase)
}));

// Mock Instagram Service
vi.mock('@/lib/instagram/service', () => ({
    sendInstagramDM: vi.fn().mockResolvedValue(true),
    incrementAutomationCount: vi.fn().mockResolvedValue(true)
}));

describe('Smart Rate Limiter (RPC Version)', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Reset mock implementations
        mockRpc.mockReset();
        mockFrom.mockReset();

        // Default RPC success (returns 10 used)
        mockRpc.mockResolvedValue({ data: 10, error: null });

        // Default 'from' chain
        mockFrom.mockReturnValue({
            select: vi.fn().mockReturnValue({

                // Queue processing chain
                eq: vi.fn().mockReturnValue({ // status=pending OR queue processing chain
                    lte: vi.fn().mockReturnValue({ // scheduled_at
                        order: vi.fn().mockReturnValue({ // priority
                            order: vi.fn().mockReturnValue({ // scheduled_at
                                limit: vi.fn().mockResolvedValue({ data: [], error: null }) // queue fetch
                            })
                        })
                    }),
                    // Single item checks for rate limiter logic
                    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                    gte: vi.fn().mockResolvedValue({ data: [{ dm_count: 50 }], error: null })
                }),
                gte: vi.fn().mockReturnValue({ // monthly check
                    then: (resolve: any) => resolve({ data: [{ dm_count: 50 }], error: null })
                })
            }),
            insert: vi.fn().mockResolvedValue({ error: null }),
            update: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
                in: vi.fn().mockResolvedValue({ error: null })
            })
        });
    });

    describe('smartRateLimit', () => {
        it('should ALLOW request when under limits', async () => {
            // Setup: 50 used monthly, 10 used hourly
            const result = await smartRateLimit('user_123');

            expect(result.allowed).toBe(true);
            expect(result.remaining.hourly).toBe(190); // 200 - 10
            expect(result.remaining.monthly).toBe(950); // 1000 - 50

            // Should call monthly check
            expect(mockFrom).toHaveBeenCalledWith('rate_limits');

            // Should call increment RPC
            expect(mockRpc).toHaveBeenCalledWith('increment_rate_limit', { p_user_id: 'user_123' });
        });

        it('should BLOCK request when over monthly limit', async () => {
            // Setup: 1000 used monthly
            mockFrom.mockReturnValue({
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        gte: vi.fn().mockResolvedValue({ data: [{ dm_count: 1000 }], error: null })
                    })
                })
            });

            const result = await smartRateLimit('user_123');

            expect(result.allowed).toBe(false);
            expect(result.remaining.monthly).toBe(0);

            // Should NOT call increment RPC (optimization)
            expect(mockRpc).not.toHaveBeenCalled();
        });

        it('should BLOCK request when over hourly limit (RPC returns high count)', async () => {
            // Setup: RPC returns 201
            mockRpc.mockResolvedValue({ data: 201, error: null });

            const result = await smartRateLimit('user_123');

            expect(result.allowed).toBe(false);
            expect(result.remaining.hourly).toBe(0);
        });

        it('should call increment_rate_limit RPC correctly', async () => {
            await smartRateLimit('user_xyz');
            expect(mockRpc).toHaveBeenCalledWith('increment_rate_limit', { p_user_id: 'user_xyz' });
        });
    });

    describe('processQueuedDMs', () => {
        it('should check limits via RPC and table before sending', async () => {
            // Mock Queue Fetch (1 pending item)
            const mockQueueItem = {
                id: 'queue_1',
                user_id: 'user_1',
                status: 'pending',
                users: { plan_type: 'free', instagram_user_id: 'igu_1', instagram_access_token: 'tok' },
                automations: { button_text: 'Click' }
            };

            // Complex Mocking for the Queue Fetch Chain
            const mockSelectChain = {
                eq: vi.fn().mockReturnValue({ // status
                    lte: vi.fn().mockReturnValue({ // time
                        order: vi.fn().mockReturnValue({
                            order: vi.fn().mockReturnValue({
                                limit: vi.fn().mockResolvedValue({ data: [mockQueueItem], error: null })
                            })
                        })
                    })
                })
            };

            // Mock Limit Checks within processing
            // Monthly check (table) -> 50 used
            const mockLimitChain = {
                select: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                        gte: vi.fn().mockResolvedValue({ data: [{ dm_count: 50 }] })
                    })
                }),
                // Catch-all for other table ops
                update: vi.fn().mockReturnValue({ eq: vi.fn(), in: vi.fn() }),
                insert: vi.fn()
            };

            mockFrom.mockImplementation((table) => {
                if (table === 'dm_queue') return mockSelectChain;
                if (table === 'rate_limits') return mockLimitChain.select(); // simplified
                return mockLimitChain;
            });

            // Hourly check (RPC) -> 10 used
            mockRpc.mockImplementation((func, args) => {
                if (func === 'get_rate_limit') return Promise.resolve({ data: 10, error: null });
                if (func === 'increment_rate_limit') return Promise.resolve({ data: 11, error: null });
                return Promise.resolve({ data: null });
            });

            await processQueuedDMs();

            // Verification
            // 1. Should fetch queue
            expect(mockFrom).toHaveBeenCalledWith('dm_queue');

            // 2. Should check limits
            expect(mockRpc).toHaveBeenCalledWith('get_rate_limit', { p_user_id: 'user_1' });

            // 3. Should increment after sending
            expect(mockRpc).toHaveBeenCalledWith('increment_rate_limit', { p_user_id: 'user_1' });
        });
    });
});
