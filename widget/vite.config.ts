import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'ClankWidget',
      formats: ['iife'],
      fileName: () => 'clank-widget.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'clank-widget.[ext]',
      },
    },
  },
});
