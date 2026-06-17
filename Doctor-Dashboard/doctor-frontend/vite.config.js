import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Doctor Dashboard runs on port 5176 (admin:5173, nurse:5174, pharma:5175, doctor:5176, patient:5177)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5176,
      proxy: {
        '/api': {
          target: env.VITE_SOCKET_URL || 'http://localhost:5051',
          changeOrigin: true,
          secure: false,
        }
      }
    }
  };
})
