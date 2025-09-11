import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
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
})
