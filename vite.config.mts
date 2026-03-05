import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Adjust base so that assets load correctly under /carbonfootprint/
export default defineConfig({
  plugins: [react()],
  base: '/carbonfootprint/',
});

