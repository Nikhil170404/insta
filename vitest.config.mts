/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./tests/setup.ts'],
        include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['**/node_modules/**', '**/dist/**', '**/.next/**', 'tests/e2e/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                '.next/',
                'tests/',
                '**/*.d.ts',
                '**/*.config.*',
            ],
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './'),
        },
    },
});
