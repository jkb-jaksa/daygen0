import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
type ViteConfigWithTest = import('vite').UserConfig & {
  test?: {
    environment?: string
    globals?: boolean
    setupFiles?: string | string[]
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Only use proxy if no VITE_API_BASE_URL is set (for local backend development)
  const useProxy = !env.VITE_API_BASE_URL && !env.VITE_BASE_URL;

  const config: ViteConfigWithTest = {
    plugins: [react()],
    // Vite automatically exposes VITE_* environment variables

    build: {
      sourcemap: false, // Disable source maps for production to speed up build
      rollupOptions: {
        output: {
          manualChunks: {
            // Split large dependencies into separate chunks
            vendor: ['react', 'react-dom', 'react-router-dom'],
            framer: ['framer-motion'],
            aws: ['@aws-sdk/client-s3'],
            ui: ['lucide-react', 'clsx'],
          },
        },
      },
    },

    server: {
      proxy: useProxy ? {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          // keep path as-is (no rewrite) so /api/* maps directly
        },
        '/health': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      } : undefined,
    },
  }

  return config;
})
