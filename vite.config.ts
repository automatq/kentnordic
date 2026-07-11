import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the heavy 3D vendors in their own cacheable chunks, loaded
        // only when a lazy 3D scene actually activates (see src/three/**).
        manualChunks(id) {
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three/') || id.includes('three-stdlib') || id.includes('/maath/')) {
            return 'r3f';
          }
        },
      },
    },
  },
});
