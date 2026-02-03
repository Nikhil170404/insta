import { describe, it, expect } from 'vitest';
import {
    getPlanLimits,
    canCreateAutomation,
    canSendDM,
    hasFeature,
    getUpgradeSuggestion,
    getPlanByType,
    PRICING_PLANS,
} from '@/lib/pricing';

describe('Pricing Module', () => {
    describe('getPlanLimits', () => {
        it('returns correct limits for free tier', () => {
            const limits = getPlanLimits('free');
            expect(limits.automations).toBe(3);
            expect(limits.dmsPerMonth).toBe(1000);
            expect(limits.dmsPerHour).toBe(200);
            expect(limits.accounts).toBe(1);
            expect(limits.planName).toBe('Free Starter');
        });

        it('returns correct limits for starter tier', () => {
            const limits = getPlanLimits('starter');
            expect(limits.automations).toBe(10);
            expect(limits.dmsPerMonth).toBe(50000);
            expect(limits.dmsPerHour).toBe(200);
            expect(limits.planName).toBe('Starter Pack');
        });

        it('returns correct limits for pro tier', () => {
            const limits = getPlanLimits('pro');
            expect(limits.automations).toBe(999);
            expect(limits.dmsPerMonth).toBe(1000000);
            expect(limits.priorityQueue).toBe(true);
            expect(limits.planName).toBe('Pro Pack');
        });

        it('defaults to free tier for unknown plan types', () => {
            const limits = getPlanLimits('unknown');
            expect(limits.automations).toBe(3);
            expect(limits.planName).toBe('Free Starter');
        });

        it('handles null/undefined plan types', () => {
            const limits = getPlanLimits(null as any);
            expect(limits.automations).toBe(3);
        });
    });

    describe('canCreateAutomation', () => {
        it('returns true when under limit', () => {
            expect(canCreateAutomation('free', 0)).toBe(true);
            expect(canCreateAutomation('free', 2)).toBe(true);
        });

        it('returns false when at or over limit', () => {
            expect(canCreateAutomation('free', 3)).toBe(false);
            expect(canCreateAutomation('free', 5)).toBe(false);
        });

        it('handles pro tier with high limits', () => {
            expect(canCreateAutomation('pro', 100)).toBe(true);
            expect(canCreateAutomation('pro', 998)).toBe(true);
        });
    });

    describe('canSendDM', () => {
        it('returns true when under monthly limit', () => {
            expect(canSendDM('free', 0)).toBe(true);
            expect(canSendDM('free', 999)).toBe(true);
        });

        it('returns false when at or over limit', () => {
            expect(canSendDM('free', 1000)).toBe(false);
            expect(canSendDM('free', 2000)).toBe(false);
        });

        it('handles starter tier with higher limits', () => {
            expect(canSendDM('starter', 49999)).toBe(true);
            expect(canSendDM('starter', 50000)).toBe(false);
        });
    });

    describe('hasFeature', () => {
        it('free tier has basic features', () => {
            expect(hasFeature('free', 'follow_gate')).toBe(true);
            expect(hasFeature('free', 'basic_automation')).toBe(true);
            expect(hasFeature('free', 'queue')).toBe(true);
        });

        it('free tier lacks advanced features', () => {
            expect(hasFeature('free', 'story_automation')).toBe(false);
            expect(hasFeature('free', 'priority_queue')).toBe(false);
        });

        it('pro tier has all features', () => {
            expect(hasFeature('pro', 'follow_gate')).toBe(true);
            expect(hasFeature('pro', 'story_automation')).toBe(true);
            expect(hasFeature('pro', 'priority_queue')).toBe(true);
            expect(hasFeature('pro', 'detailed_analytics')).toBe(true);
        });
    });

    describe('getUpgradeSuggestion', () => {
        it('suggests Starter for free users', () => {
            const suggestion = getUpgradeSuggestion('free');
            expect(suggestion?.nextPlan).toBe('Starter Pack');
            expect(suggestion?.nextPlanPrice).toBe('₹99/month');
        });

        it('suggests Pro for starter users', () => {
            const suggestion = getUpgradeSuggestion('starter');
            expect(suggestion?.nextPlan).toBe('Pro Pack');
            expect(suggestion?.nextPlanPrice).toBe('₹299/month');
        });
    });

    describe('getPlanByType', () => {
        it('returns correct plan object', () => {
            const freePlan = getPlanByType('free');
            expect(freePlan.name).toBe('Free Starter');
            expect(freePlan.price).toBe('0');

            const proPlan = getPlanByType('pro');
            expect(proPlan.name).toBe('Pro Pack');
            expect(proPlan.price).toBe('299');
        });
    });

    describe('PRICING_PLANS structure', () => {
        it('has all required plans', () => {
            expect(PRICING_PLANS.FREE).toBeDefined();
            expect(PRICING_PLANS.STARTER).toBeDefined();
            expect(PRICING_PLANS.PRO).toBeDefined();
        });

        it('each plan has required properties', () => {
            const requiredProps = ['name', 'price', 'features', 'limits', 'cta'];

            Object.values(PRICING_PLANS).forEach(plan => {
                requiredProps.forEach(prop => {
                    expect(plan).toHaveProperty(prop);
                });
            });
        });
    });
});
