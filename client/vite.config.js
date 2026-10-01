import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In development the API is proxied so the client can use relative /api URLs.
  const apiTarget = env.VITE_DEV_API_PROXY || 'http://localhost:4000';
  const proxy = Object.fromEntries(['/api', '/sitemap.xml', '/robots.txt', '/share'].map((p) => [p, { target: apiTarget, changeOrigin: true }]));

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5173, proxy },
    preview: { port: 4173, proxy },
    build: {
      target: 'es2020',
      sourcemap: false,
      rollupOptions: {
        output: {
          // Long-cached vendor chunk; app code changes don't invalidate it.
          manualChunks(id) {
            if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|axios)[\\/]/.test(id)) return 'vendor';
          },
        },
      },
    },
  };
});
