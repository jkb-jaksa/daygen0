import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: path.resolve(__dirname, './src/test/setup.ts'),
    include: ['src/**/*.{test,spec}.ts?(x)'],
    exclude: ['api/**', 'dist/**', 'node_modules/**', 'src/components/create/__tests__/ControllerGenerate.test.tsx'],
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    environmentOptions: { jsdom: { resources: 'usable' } },
  },
});
