import { describe, it, expect } from 'vitest';
import {
    createAutomationSchema,
    updateAutomationSchema,
    verifyPaymentSchema,
    leadSchema,
    paginationSchema,
    safeValidate,
    formatZodError,
} from '@/lib/validations';

describe('Validation Schemas', () => {
    describe('createAutomationSchema', () => {
        it('validates a complete automation', () => {
            const validData = {
                media_id: '12345678901234567',
                media_type: 'REELS',
                trigger_type: 'keyword',
                trigger_keyword: 'LINK',
                reply_message: 'Thanks for your interest! Here is your link.',
                button_text: 'Get Link',
                link_url: 'https://example.com/link',
                require_follow: false,
            };

            const result = createAutomationSchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('requires media_id and reply_message', () => {
            const result = createAutomationSchema.safeParse({});
            expect(result.success).toBe(false);

            if (!result.success) {
                const errors = result.error.issues.map(i => i.path[0]);
                expect(errors).toContain('media_id');
                expect(errors).toContain('reply_message');
            }
        });

        it('validates reply_message length', () => {
            const tooLong = createAutomationSchema.safeParse({
                media_id: '123',
                reply_message: 'a'.repeat(1001),
            });
            expect(tooLong.success).toBe(false);

            const valid = createAutomationSchema.safeParse({
                media_id: '123',
                reply_message: 'Valid message',
            });
            expect(valid.success).toBe(true);
        });

        it('validates trigger_type enum', () => {
            const valid = createAutomationSchema.safeParse({
                media_id: '123',
                reply_message: 'Hello',
                trigger_type: 'any',
            });
            expect(valid.success).toBe(true);

            const invalid = createAutomationSchema.safeParse({
                media_id: '123',
                reply_message: 'Hello',
                trigger_type: 'invalid',
            });
            expect(invalid.success).toBe(false);
        });

        it('validates URL format for link_url', () => {
            const valid = createAutomationSchema.safeParse({
                media_id: '123',
                reply_message: 'Hello',
                link_url: 'https://example.com',
            });
            expect(valid.success).toBe(true);

            const invalid = createAutomationSchema.safeParse({
                media_id: '123',
                reply_message: 'Hello',
                link_url: 'not-a-url',
            });
            expect(invalid.success).toBe(false);
        });

        it('validates button_text max length', () => {
            const tooLong = createAutomationSchema.safeParse({
                media_id: '123',
                reply_message: 'Hello',
                button_text: 'This button text is way too long for display',
            });
            expect(tooLong.success).toBe(false);
        });
    });

    describe('updateAutomationSchema', () => {
        it('allows partial updates', () => {
            const result = updateAutomationSchema.safeParse({
                reply_message: 'Updated message',
            });
            expect(result.success).toBe(true);
        });

        it('validates fields that are provided', () => {
            const result = updateAutomationSchema.safeParse({
                reply_message: 'a'.repeat(1001),
            });
            expect(result.success).toBe(false);
        });
    });

    describe('verifyPaymentSchema', () => {
        it('validates complete payment data', () => {
            const result = verifyPaymentSchema.safeParse({
                razorpay_payment_id: 'pay_123456789',
                razorpay_order_id: 'order_123456789',
                razorpay_signature: 'abc123signature',
                planType: 'starter',
            });
            expect(result.success).toBe(true);
        });

        it('requires all payment fields', () => {
            const result = verifyPaymentSchema.safeParse({
                razorpay_payment_id: 'pay_123',
            });
            expect(result.success).toBe(false);
        });

        it('validates planType enum', () => {
            const invalid = verifyPaymentSchema.safeParse({
                razorpay_payment_id: 'pay_123',
                razorpay_order_id: 'order_123',
                razorpay_signature: 'sig_123',
                planType: 'invalid',
            });
            expect(invalid.success).toBe(false);
        });
    });

    describe('leadSchema', () => {
        it('validates lead data', () => {
            const result = leadSchema.safeParse({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+91 9876543210',
                message: 'I need help',
            });
            expect(result.success).toBe(true);
        });

        it('validates email format', () => {
            const result = leadSchema.safeParse({
                name: 'John',
                email: 'invalid-email',
            });
            expect(result.success).toBe(false);
        });

        it('validates phone format', () => {
            const invalid = leadSchema.safeParse({
                name: 'John',
                email: 'john@example.com',
                phone: '123',
            });
            expect(invalid.success).toBe(false);
        });
    });

    describe('paginationSchema', () => {
        it('provides defaults', () => {
            const result = paginationSchema.safeParse({});
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.page).toBe(1);
                expect(result.data.limit).toBe(20);
            }
        });

        it('coerces string values', () => {
            const result = paginationSchema.safeParse({
                page: '5',
                limit: '50',
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.page).toBe(5);
                expect(result.data.limit).toBe(50);
            }
        });

        it('validates limit range', () => {
            const tooHigh = paginationSchema.safeParse({ limit: 200 });
            expect(tooHigh.success).toBe(false);

            const tooLow = paginationSchema.safeParse({ limit: 0 });
            expect(tooLow.success).toBe(false);
        });
    });

    describe('safeValidate helper', () => {
        it('returns success with valid data', () => {
            const result = safeValidate(leadSchema, {
                name: 'John',
                email: 'john@example.com',
            });
            expect(result.success).toBe(true);
        });

        it('returns error with invalid data', () => {
            const result = safeValidate(leadSchema, {
                name: '',
                email: 'invalid',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('formatZodError', () => {
        it('formats errors correctly', () => {
            const result = leadSchema.safeParse({
                name: '',
                email: 'invalid',
            });

            if (!result.success) {
                const formatted = formatZodError(result.error);
                expect(formatted.message).toBe('Validation failed');
                expect(formatted.errors).toHaveProperty('email');
            }
        });
    });
});
