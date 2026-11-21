import { defineConfig } from 'tsup';

/** ASCII-only output (non-ASCII as \u escapes): works on pages served in any charset. */
const esbuildOptions = (options: { charset?: string }): void => {
  options.charset = 'ascii';
};

const banner = {
  js: '/*! AxiomText — free rich text & math editor. MIT License. https://axiomtext.dev */',
};

export default defineConfig([
  // npm package. The internal @axiomtext/* workspace packages are bundled in, so users install
  // one package; ProseMirror, KaTeX, MathLive, markdown-it and Lucide stay normal dependencies.
  // Splitting keeps the lazily loaded parts (visual math editor, languages) as separate chunks.
  {
    entry: ['src/index.ts', 'src/viewer.ts', 'src/server.ts', 'src/pdf.ts', 'src/locales/*.ts'],
    format: ['esm'],
    dts: { resolve: [/^@axiomtext\//] },
    noExternal: [/^@axiomtext\//],
    external: ['pdfjs-dist'],
    splitting: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'browser',
    target: 'es2022',
    banner,
    esbuildOptions,
  },
  // CDN, ES module: math (KaTeX, MathLive) and languages load as separate chunks on demand.
  {
    entry: { axiomtext: 'src/cdn.ts' },
    outDir: 'dist/cdn',
    format: ['esm'],
    splitting: true,
    noExternal: [/.*/],
    platform: 'browser',
    minify: true,
    treeshake: true,
    sourcemap: true,
    target: 'es2022',
    banner,
    esbuildOptions,
  },
  // CDN, website viewer only: global `AxiomViewer` (comment bubbles, readers' highlights).
  {
    entry: { viewer: 'src/viewer.ts' },
    outDir: 'dist/cdn',
    format: ['iife'],
    globalName: 'AxiomViewer',
    outExtension: () => ({ js: '.js' }),
    noExternal: [/.*/],
    platform: 'browser',
    minify: true,
    treeshake: true,
    sourcemap: true,
    target: 'es2020',
    banner,
    esbuildOptions,
  },
  // CDN, classic script: one file, global `AxiomText`.
  {
    entry: { 'axiomtext.iife': 'src/cdn.ts' },
    outDir: 'dist/cdn',
    format: ['iife'],
    globalName: 'AxiomText',
    outExtension: () => ({ js: '.js' }),
    noExternal: [/.*/],
    platform: 'browser',
    minify: true,
    treeshake: true,
    sourcemap: true,
    target: 'es2020',
    banner,
    esbuildOptions,
  },
]);
