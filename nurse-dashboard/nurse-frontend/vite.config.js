import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || env.VITE_API_BASE_URL?.replace(/\/api$/, '') || env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5002';
  return {
    plugins: [react()],
    server: {
      port: 5174,
      host: true,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: proxyTarget,
          ws: true,
        },
      },
    },
  };
});
