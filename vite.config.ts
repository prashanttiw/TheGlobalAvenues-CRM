import { defineConfig } from 'vite';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '');
        return path.resolve(__dirname, 'src/assets', filename);
      }
    },
  };
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation
          'vendor-motion': ['motion'],
          // UI primitives
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
          ],
          // Charts
          'vendor-charts': ['recharts'],
          // Icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 2000, // globe.gl is large by nature (3D engine)
  },

  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'motion', 'lucide-react', 'globe.gl'],
  },

  server: {
    port: 5173,
    open: false,
    cors: true,
  },
});
