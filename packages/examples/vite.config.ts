import { defineConfig } from 'vite';
import { conductVitePlugin } from '@conduct/ecs/vite';

export default defineConfig({
  root: 'src',
  plugins: [
    conductVitePlugin(),
  ],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});