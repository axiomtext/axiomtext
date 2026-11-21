// Builds the offline editor engine into the Flutter package (FLT-013):
//   packages/flutter/assets/editor/{index.html, engine.js, editor.css, mathlive.js, fonts/}
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '../src');
const out = join(here, '../../flutter/assets/editor');
const require = createRequire(import.meta.url);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'fonts'), { recursive: true });

await build({
  entryPoints: [join(src, 'engine.ts')],
  outfile: join(out, 'engine.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
  alias: { mathlive: join(src, 'mathlive-stub.js') },
  // pdf.js is a separate script (pdf.js below), loaded when a PDF is opened.
  external: ['pdfjs-dist'],
  banner: { js: '/*! AxiomText editor engine for Flutter. MIT License. https://axiomtext.dev */' },
  logLevel: 'warning',
  // Shared chunks are also imported by name; their extra bare imports can be dropped safely.
  logOverride: { 'ignored-bare-import': 'silent' },
});

// MathLive's own script build (global `MathLive`), loaded when an equation is first edited.
// (resolve the package folder; its exports map doesn't list the script build)
const mathliveDir = dirname(require.resolve('mathlive'));
cpSync(join(mathliveDir, 'mathlive.min.js'), join(out, 'mathlive.js'));

// One stylesheet: KaTeX + editor UI + content + host tweaks. Only woff2 fonts are shipped
// (every WebView the SDK supports reads woff2).
const axiomDist = dirname(require.resolve('axiomtext/styles.css'));
const css = readFileSync(join(axiomDist, 'styles.css'), 'utf8').replaceAll(
  './katex/fonts/',
  './fonts/',
);
writeFileSync(join(out, 'editor.css'), `${css}\n${readFileSync(join(src, 'host.css'), 'utf8')}`);
const fonts = join(axiomDist, 'katex/fonts');
for (const file of readdirSync(fonts).filter((f) => f.endsWith('.woff2')))
  cpSync(join(fonts, file), join(out, 'fonts', file));

// pdf.js with its worker code in one classic script (global `AxiomPdfJs`), loaded on demand.
await build({
  entryPoints: [join(src, 'pdf-entry.js')],
  outfile: join(out, 'pdf.js'),
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  minify: true,
  legalComments: 'eof',
  banner: {
    js: '/*! pdf.js (Mozilla, Apache-2.0) for AxiomText. https://mozilla.github.io/pdf.js/ */',
  },
  logLevel: 'error',
});

cpSync(join(src, 'index.html'), join(out, 'index.html'));

const size = (file) => `${(readFileSync(join(out, file)).length / 1024).toFixed(0)} KB`;
console.log(
  `Flutter engine: engine.js ${size('engine.js')}, mathlive.js ${size('mathlive.js')}, pdf.js ${size('pdf.js')}, editor.css ${size('editor.css')}`,
);
