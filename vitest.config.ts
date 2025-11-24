import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.ts?(x)'],
    exclude: ['api/**', 'dist/**', 'node_modules/**', 'src/components/create/__tests__/ControllerGenerate.test.tsx'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    environmentOptions: { jsdom: { resources: 'usable' } },
    testTimeout: 10000,
  },
});
