import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite-конфиг для Electron-рендера
export default defineConfig(({ mode }) => ({
  base: mode === 'development' ? '/' : './',
  plugins: [react()],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  }
}));