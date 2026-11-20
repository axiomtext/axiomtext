import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 5173 },
  build: {
    target: 'es2022',
    sourcemap: true,
    // Never inline assets as data: URIs, so the strict CSP (no `data:` fonts) keeps working.
    assetsInlineLimit: 0,
  },
});
