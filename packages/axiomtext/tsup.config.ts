import { defineConfig } from 'tsup';

const banner = {
  js: '/*! AxiomText — free rich text & math editor. MIT License. https://axiomtext.dev */',
};

export default defineConfig([
  // npm package. The internal @axiomtext/* workspace packages are bundled in, so users install
  // one package; ProseMirror, KaTeX, MathLive, markdown-it and Lucide stay normal dependencies.
  // Splitting keeps the lazily loaded parts (visual math editor, languages) as separate chunks.
  {
    entry: ['src/index.ts', 'src/locales/*.ts'],
    format: ['esm'],
    dts: { resolve: [/^@axiomtext\//] },
    noExternal: [/^@axiomtext\//],
    splitting: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    platform: 'browser',
    target: 'es2022',
    banner,
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
  },
]);
