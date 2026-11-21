import { defineConfig } from 'tsup';

const banner = {
  js: '/*! AxiomText — free rich text & math editor. MIT License. https://axiomtext.dev */',
};

export default defineConfig([
  // npm package
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    target: 'es2022',
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
