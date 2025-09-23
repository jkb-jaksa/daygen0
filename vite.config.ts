import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
type ViteConfigWithTest = import('vite').UserConfig & {
  test?: {
    environment?: string
    globals?: boolean
    setupFiles?: string | string[]
  }
}

const config: ViteConfigWithTest = {
  plugins: [react()],
  // Vite automatically exposes VITE_* environment variables
  // No need for manual define configuration
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // keep path as-is (no rewrite) so /api/* maps directly
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
}

export default defineConfig(config)
