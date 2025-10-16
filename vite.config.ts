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
    // No need for manual define configuration
    server: {
      proxy: useProxy ? {
        '/api': {
          target: 'https://daygen-backend-365299591811.europe-central2.run.app',
          changeOrigin: true,
          secure: false,
          // keep path as-is (no rewrite) so /api/* maps directly
        },
        '/health': {
          target: 'https://daygen-backend-365299591811.europe-central2.run.app',
          changeOrigin: true,
          secure: false,
        },
      } : undefined,
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  }
  
  return config;
})
