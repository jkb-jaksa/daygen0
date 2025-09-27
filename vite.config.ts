import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite automatically exposes VITE_* environment variables
  // No need for manual define configuration
  define: {
    // Set API URL for both development and production to use Cloud Run backend
    'import.meta.env.VITE_API_BASE_URL': JSON.stringify(
      'https://daygen-backend-365299591811.europe-central2.run.app/api'
    ),
  },
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
})
