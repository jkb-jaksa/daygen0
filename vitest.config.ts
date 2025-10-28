import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,  // Run tests sequentially to prevent OOM
      }
    },
    // Keep the 8GB heap from package.json NODE_OPTIONS for safety margin
  }
})
