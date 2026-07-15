import fs from 'node:fs';
import path from 'node:path';

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { imagetools } from 'vite-imagetools';

const generatedContent = path.resolve(process.cwd(), '.context/generated-content-release.ts');
const emptyContent = path.resolve(process.cwd(), 'src/content/empty-release.ts');

function contentVersionAsset(): Plugin {
  return {
    name: 'idcibidci-content-version',
    generateBundle() {
      const metadata = path.resolve(process.cwd(), '.context/content-version.json');
      this.emitFile({
        type: 'asset',
        fileName: 'content-version.json',
        source: fs.existsSync(metadata)
          ? fs.readFileSync(metadata, 'utf8')
          : JSON.stringify({ releaseId: null, releaseNumber: null }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), imagetools(), contentVersionAsset()],
  resolve: {
    alias: {
      '@': '/src',
      '@admin-content-release': fs.existsSync(generatedContent)
        ? generatedContent
        : emptyContent,
    },
  },
  ssr: {
    noExternal: ['react-helmet-async'],
  },
  build: {
    rollupOptions: {
      output: {
        // Keep the heavy 3D vendors in their own cacheable chunks, loaded
        // only when a lazy 3D scene actually activates (see src/three/**).
        // React itself must split out FIRST: without this branch, Rollup
        // co-locates react/react-dom/scheduler inside the r3f chunk (their
        // shared consumer), welding ~1.2MB of 3D code into the boot path of
        // every route. Path-boundary regex so `@react-three/*` and
        // `react-markdown` are NOT captured here.
        manualChunks(id) {
          // Vite's preload helper is a virtual module used by every lazy
          // import — left unassigned, Rollup co-locates it into whichever
          // chunk it likes (it picked r3f), re-welding 3D into every page.
          if (id.includes('vite/preload-helper')) return 'react-vendor';
          // Region outlines are shared by the maps AND the home intro —
          // isolate them so the intro doesn't drag in the 290KB map artwork
          // that lives in the walkthrough chunk.
          if (id.includes('data/map-regions.json')) return 'map-geometry';
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(?:react-dom|react-router-dom|react-router|react-helmet-async|react|scheduler)\//.test(id)) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/three/')) return 'three';
          if (id.includes('@react-three/') || id.includes('three-stdlib') || id.includes('/maath/')) {
            return 'r3f';
          }
        },
      },
    },
  },
});
