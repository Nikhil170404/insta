import '@testing-library/jest-dom';

// Mock environment variables for testing
process.env.SESSION_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID = '123456789';
process.env.INSTAGRAM_APP_SECRET = 'test-instagram-secret';
process.env.WEBHOOK_VERIFY_TOKEN = 'test-webhook-token';
process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = 'rzp_test_123';
process.env.RAZORPAY_KEY_SECRET = 'test-razorpay-secret';
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
