import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Patient Dashboard runs on port 5177 (admin:5173, nurse:5174, pharma:5175, doctor:5176, patient:5177)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5177,
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL?.replace(/\/api$/, '') || env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5050',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
})
