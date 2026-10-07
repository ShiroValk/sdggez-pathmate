import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import config from './scripts/config.cjs';

export default defineConfig(() => {
  // Use the same process > .env.local > .env boundary as Node and DB commands.
  config.loadEnvironment(__dirname);
  const env = config.readConfig(process.env);
  const hostname = env.SERVER_HOST === '::1' ? '[::1]' : env.SERVER_HOST;
  const backend = `http://${hostname}:${env.SERVER_PORT}`;
  return {
  plugins: [react()],
  // Serve the application's HTML at / and emit dist/client/index.html.
  root: path.resolve(__dirname, 'client'),
  envDir: false,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@client': path.resolve(__dirname, 'client'),
      '@shared': path.resolve(__dirname, 'shared'),
    },
  },
  server: {
    host: '127.0.0.1', port: 5173, strictPort: true,
    proxy: { '/api': { target: backend } },
  },
  preview: { proxy: { '/api': { target: backend } } },
  build: { outDir: path.resolve(__dirname, 'dist/client'), emptyOutDir: true },
  };
});
