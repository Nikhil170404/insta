import { describe, it, expect } from 'vitest';
import {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    RateLimitError,
    InstagramAPIError,
    DatabaseError,
    PaymentError,
    formatErrorResponse,
    getErrorStatusCode,
    isAppError,
} from '@/lib/errors';

describe('Error Classes', () => {
    describe('AppError', () => {
        it('creates error with all properties', () => {
            const error = new AppError('Test error', 'TEST_ERROR', 400, true, { key: 'value' });

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_ERROR');
            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
            expect(error.context).toEqual({ key: 'value' });
        });

        it('defaults to 500 status code', () => {
            const error = new AppError('Test', 'TEST');
            expect(error.statusCode).toBe(500);
        });

        it('is instance of Error', () => {
            const error = new AppError('Test', 'TEST');
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(AppError);
        });
    });

    describe('ValidationError', () => {
        it('has correct code and status', () => {
            const error = new ValidationError('Invalid input', { field: 'email' });

            expect(error.code).toBe('VALIDATION_ERROR');
            expect(error.statusCode).toBe(400);
            expect(error.context).toEqual({ field: 'email' });
        });
    });

    describe('AuthenticationError', () => {
        it('has correct code and status', () => {
            const error = new AuthenticationError();

            expect(error.code).toBe('AUTHENTICATION_ERROR');
            expect(error.statusCode).toBe(401);
            expect(error.message).toBe('Authentication required');
        });

        it('accepts custom message', () => {
            const error = new AuthenticationError('Token expired');
            expect(error.message).toBe('Token expired');
        });
    });

    describe('AuthorizationError', () => {
        it('has correct code and status', () => {
            const error = new AuthorizationError();

            expect(error.code).toBe('AUTHORIZATION_ERROR');
            expect(error.statusCode).toBe(403);
        });
    });

    describe('NotFoundError', () => {
        it('includes resource in message', () => {
            const error = new NotFoundError('Automation');

            expect(error.message).toBe('Automation not found');
            expect(error.statusCode).toBe(404);
            expect(error.context).toEqual({ resource: 'Automation' });
        });
    });

    describe('RateLimitError', () => {
        it('has correct code and status', () => {
            const error = new RateLimitError('Too many requests', 60);

            expect(error.code).toBe('RATE_LIMIT_ERROR');
            expect(error.statusCode).toBe(429);
            expect(error.retryAfter).toBe(60);
        });
    });

    describe('InstagramAPIError', () => {
        it('includes Instagram error codes', () => {
            const error = new InstagramAPIError('Rate limited by Instagram', 32, 2);

            expect(error.code).toBe('INSTAGRAM_API_ERROR');
            expect(error.statusCode).toBe(502);
            expect(error.igErrorCode).toBe(32);
            expect(error.igErrorSubcode).toBe(2);
        });
    });

    describe('DatabaseError', () => {
        it('has correct code and status', () => {
            const error = new DatabaseError('Connection failed');

            expect(error.code).toBe('DATABASE_ERROR');
            expect(error.statusCode).toBe(500);
        });
    });

    describe('PaymentError', () => {
        it('has correct code and status', () => {
            const error = new PaymentError('Payment declined');

            expect(error.code).toBe('PAYMENT_ERROR');
            expect(error.statusCode).toBe(402);
        });
    });
});

describe('Error Helpers', () => {
    describe('formatErrorResponse', () => {
        it('formats AppError correctly', () => {
            const error = new ValidationError('Invalid email', { field: 'email' });
            const response = formatErrorResponse(error);

            expect(response.success).toBe(false);
            expect(response.error.code).toBe('VALIDATION_ERROR');
            expect(response.error.message).toBe('Invalid email');
            expect(response.error.details).toEqual({ field: 'email' });
        });

        it('handles unknown errors', () => {
            const response = formatErrorResponse(new Error('Unknown'));

            expect(response.success).toBe(false);
            expect(response.error.code).toBe('INTERNAL_ERROR');
            expect(response.error.message).toBe('An unexpected error occurred');
        });

        it('handles Zod-like errors', () => {
            const zodError = { issues: [{ path: ['email'], message: 'Invalid' }] };
            const response = formatErrorResponse(zodError);

            expect(response.error.code).toBe('VALIDATION_ERROR');
            expect(response.error.details).toHaveProperty('issues');
        });
    });

    describe('getErrorStatusCode', () => {
        it('returns status code from AppError', () => {
            expect(getErrorStatusCode(new ValidationError('Test'))).toBe(400);
            expect(getErrorStatusCode(new AuthenticationError())).toBe(401);
            expect(getErrorStatusCode(new NotFoundError('Item'))).toBe(404);
        });

        it('returns 400 for Zod errors', () => {
            const zodError = { issues: [] };
            expect(getErrorStatusCode(zodError)).toBe(400);
        });

        it('returns 500 for unknown errors', () => {
            expect(getErrorStatusCode(new Error('Unknown'))).toBe(500);
            expect(getErrorStatusCode('string error')).toBe(500);
        });
    });

    describe('isAppError', () => {
        it('returns true for AppError instances', () => {
            expect(isAppError(new AppError('Test', 'TEST'))).toBe(true);
            expect(isAppError(new ValidationError('Test'))).toBe(true);
        });

        it('returns false for other errors', () => {
            expect(isAppError(new Error('Test'))).toBe(false);
            expect(isAppError({ message: 'Test' })).toBe(false);
            expect(isAppError(null)).toBe(false);
        });
    });
});
