import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// All /api requests are proxied to the Express server — no CORS pain in dev
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});
