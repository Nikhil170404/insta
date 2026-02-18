/**
 * Tests for time utility functions
 * @module tests/lib/time-utils.test.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getHourStart,
    getMonthStart,
    getNextHourStart,
    getNextMonthStart,
    msUntilNextHour,
    msUntilNextMonth,
    formatDuration,
    isWithinCurrentHour,
    isWithinCurrentMonth
} from '@/lib/time-utils';

describe('time-utils', () => {
    describe('getHourStart', () => {
        it('returns a Date with minutes/seconds/ms zeroed', () => {
            const result = getHourStart();
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });

        it('preserves the current hour', () => {
            const now = new Date();
            const result = getHourStart();
            expect(result.getHours()).toBe(now.getHours());
        });
    });

    describe('getMonthStart', () => {
        it('returns the 1st of the current month at midnight', () => {
            const result = getMonthStart();
            expect(result.getDate()).toBe(1);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
        });

        it('preserves the current month and year', () => {
            const now = new Date();
            const result = getMonthStart();
            expect(result.getMonth()).toBe(now.getMonth());
            expect(result.getFullYear()).toBe(now.getFullYear());
        });
    });

    describe('getNextHourStart', () => {
        it('returns a date exactly 1 hour after getHourStart', () => {
            const hourStart = getHourStart();
            const nextHour = getNextHourStart();
            expect(nextHour.getTime() - hourStart.getTime()).toBe(3600000);
        });

        it('has zero minutes/seconds/ms', () => {
            const result = getNextHourStart();
            expect(result.getMinutes()).toBe(0);
            expect(result.getSeconds()).toBe(0);
            expect(result.getMilliseconds()).toBe(0);
        });
    });

    describe('getNextMonthStart', () => {
        it('returns first day of next month', () => {
            const result = getNextMonthStart();
            const now = new Date();
            expect(result.getDate()).toBe(1);

            // Next month wraps around December -> January
            const expectedMonth = (now.getMonth() + 1) % 12;
            expect(result.getMonth()).toBe(expectedMonth);
        });
    });

    describe('msUntilNextHour', () => {
        it('returns a positive number', () => {
            const ms = msUntilNextHour();
            expect(ms).toBeGreaterThan(0);
        });

        it('returns at most 3600000ms (1 hour)', () => {
            const ms = msUntilNextHour();
            expect(ms).toBeLessThanOrEqual(3600000);
        });
    });

    describe('msUntilNextMonth', () => {
        it('returns a positive number', () => {
            const ms = msUntilNextMonth();
            expect(ms).toBeGreaterThan(0);
        });
    });

    describe('formatDuration', () => {
        it('formats milliseconds', () => {
            expect(formatDuration(500)).toBe('500ms');
        });

        it('formats seconds', () => {
            expect(formatDuration(5000)).toBe('5s');
        });

        it('formats minutes', () => {
            expect(formatDuration(120000)).toBe('2m');
        });

        it('formats hours', () => {
            expect(formatDuration(7200000)).toBe('2h');
        });

        it('rounds correctly', () => {
            expect(formatDuration(1500)).toBe('2s');
            expect(formatDuration(90000)).toBe('2m');
        });
    });

    describe('isWithinCurrentHour', () => {
        it('returns true for now', () => {
            expect(isWithinCurrentHour(new Date())).toBe(true);
        });

        it('returns false for a date in the previous hour', () => {
            const pastHour = new Date(Date.now() - 3600000);
            expect(isWithinCurrentHour(pastHour)).toBe(false);
        });

        it('returns true for the start of the hour', () => {
            expect(isWithinCurrentHour(getHourStart())).toBe(true);
        });
    });

    describe('isWithinCurrentMonth', () => {
        it('returns true for now', () => {
            expect(isWithinCurrentMonth(new Date())).toBe(true);
        });

        it('returns false for a date in the previous month', () => {
            const now = new Date();
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
            expect(isWithinCurrentMonth(lastMonth)).toBe(false);
        });

        it('returns true for the first day of the month', () => {
            expect(isWithinCurrentMonth(getMonthStart())).toBe(true);
        });
    });
});
