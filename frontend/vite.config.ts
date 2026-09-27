import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = (process.env.VITE_API_URL && process.env.VITE_API_URL.startsWith('http'))
  ? process.env.VITE_API_URL
  : 'http://backend:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
      },
    },
  },
});
