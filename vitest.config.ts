import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.ts?(x)'],
    exclude: ['api/**', 'dist/**', 'node_modules/**', 'src/components/create/__tests__/ControllerGenerate.test.tsx', 'src/components/create/__tests__/GalleryDeepLink.test.tsx'],
    pool: 'vmThreads',
    poolOptions: { vmThreads: { singleThread: true } },
    environmentOptions: { jsdom: { resources: 'usable' } },
    server: {
      deps: {
        inline: ['react-router', 'react-router-dom']
      }
    }
  }
})
