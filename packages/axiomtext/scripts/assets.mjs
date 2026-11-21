// Writes the stylesheets for npm and the CDN, copies the KaTeX fonts and writes SRI hashes.
//
// Each stylesheet already contains KaTeX's styles, so one import is enough:
//   import 'axiomtext/styles.css';   in the app with the editor
//   import 'axiomtext/content.css';  on pages that only show saved content
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '../dist');
const cdn = join(dist, 'cdn');
const require = createRequire(import.meta.url);
mkdirSync(cdn, { recursive: true });

const banner = '/*! AxiomText. MIT License. https://axiomtext.dev. Includes KaTeX (MIT). */\n';

// Editor UI + content styles (the UI file @imports the content file).
const uiStyles = dirname(require.resolve('@axiomtext/ui/styles.css'));
const contentCss = readFileSync(join(uiStyles, 'content.css'), 'utf8');
const editorCss = readFileSync(join(uiStyles, 'axiomtext.css'), 'utf8').replace(
  "@import './content.css';",
  contentCss,
);

// KaTeX styles, with its fonts served from ./katex/fonts next to the stylesheet.
const katexDist = dirname(require.resolve('katex/dist/katex.min.css'));
const katexCss = readFileSync(join(katexDist, 'katex.min.css'), 'utf8').replace(
  /url\(fonts\//g,
  'url(./katex/fonts/',
);

for (const dir of [dist, cdn]) {
  cpSync(join(katexDist, 'fonts'), join(dir, 'katex/fonts'), { recursive: true });
  const styles = `${banner}${katexCss}\n${editorCss}`;
  const content = `${banner}${katexCss}\n${contentCss}`;
  if (dir === dist) {
    writeFileSync(join(dir, 'styles.css'), styles);
    writeFileSync(join(dir, 'content.css'), content);
  } else {
    writeFileSync(join(dir, 'axiomtext.css'), styles);
    writeFileSync(join(dir, 'content.css'), content);
  }
}

// Empty type files, so TypeScript accepts `import 'axiomtext/styles.css'` without a bundler's types.
for (const name of ['styles.css', 'content.css'])
  writeFileSync(join(dist, `${name}.d.ts`), 'export {};\n');

// Subresource Integrity hashes for the CDN entry files.
const sri = {};
for (const file of [
  'axiomtext.js',
  'axiomtext.iife.js',
  'viewer.js',
  'axiomtext.css',
  'content.css',
]) {
  const hash = createHash('sha384')
    .update(readFileSync(join(cdn, file)))
    .digest('base64');
  sri[file] = `sha384-${hash}`;
}
writeFileSync(join(cdn, 'sri.json'), `${JSON.stringify(sri, null, 2)}\n`);
console.log(
  'Stylesheets written. CDN files:',
  readdirSync(cdn).filter((f) => !f.endsWith('.map')).length,
  'SRI:',
  Object.keys(sri).length,
);
