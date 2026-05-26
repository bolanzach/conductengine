import { defineConfig } from 'vite';
import { conductVitePlugin } from '@conduct/ecs/vite';

export default defineConfig({
  root: 'src/client',
  plugins: [
    // @ts-ignore
    conductVitePlugin(),
  ],
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
    target: 'esnext',
  },
});