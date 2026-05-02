import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [react(), ...(process.env.DEV_SSL ? [basicSsl()] : [])],
  preview: {
    allowedHosts: ['touchgrass-production-0dc2.up.railway.app'],
  },
});
