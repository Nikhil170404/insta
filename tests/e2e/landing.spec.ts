import { test, expect, Page, ConsoleMessage } from '@playwright/test';

test.describe('Landing Page', () => {
    test('should display the hero section', async ({ page }) => {
        await page.goto('/');

        // Check for main heading
        await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

        // Check for CTA button
        const ctaButton = page.getByRole('link', { name: /get started|start/i });
        await expect(ctaButton).toBeVisible();
    });

    test('should have navigation links', async ({ page }) => {
        await page.goto('/');

        // Check for navigation
        const nav = page.getByRole('navigation');
        await expect(nav).toBeVisible();
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/');

        // Page should still be accessible
        await expect(page).toHaveTitle(/ReplyKaro/i);
    });
});

test.describe('Authentication Flow', () => {
    test('should redirect to signin when accessing dashboard without auth', async ({ page }) => {
        await page.goto('/dashboard');

        // Should redirect to signin
        await expect(page).toHaveURL(/signin/);
    });

    test('should display Instagram login option', async ({ page }) => {
        await page.goto('/signin');

        // Look for Instagram login button/link
        const instagramButton = page.getByRole('link', { name: /instagram|connect/i });
        await expect(instagramButton).toBeVisible();
    });
});

test.describe('SEO and Accessibility', () => {
    test('should have proper meta tags', async ({ page }) => {
        await page.goto('/');

        // Check title
        await expect(page).toHaveTitle(/ReplyKaro/);

        // Check meta description
        const metaDescription = page.locator('meta[name="description"]');
        await expect(metaDescription).toHaveAttribute('content', /.+/);

        // Check viewport meta
        const viewport = page.locator('meta[name="viewport"]');
        await expect(viewport).toHaveAttribute('content', /width=device-width/);
    });

    test('should have proper heading hierarchy', async ({ page }) => {
        await page.goto('/');

        // Should have exactly one h1
        const h1Elements = page.locator('h1');
        await expect(h1Elements).toHaveCount(1);
    });

    test('should not have broken images', async ({ page }) => {
        await page.goto('/');

        // Wait for images to load
        await page.waitForLoadState('networkidle');

        // Check all images
        const images = page.locator('img');
        const count = await images.count();

        for (let i = 0; i < count; i++) {
            const img = images.nth(i);
            const naturalWidth = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
            expect(naturalWidth).toBeGreaterThan(0);
        }
    });
});

test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
        const startTime = Date.now();
        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');
        const loadTime = Date.now() - startTime;

        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
    });

    test('should have no console errors', async ({ page }) => {
        const errors: string[] = [];

        page.on('console', (msg: ConsoleMessage) => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Filter out known acceptable errors
        const criticalErrors = errors.filter(
            (e) => !e.includes('favicon') && !e.includes('analytics')
        );

        expect(criticalErrors).toHaveLength(0);
    });
});
