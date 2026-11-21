// Copies the CSS and KaTeX fonts next to the CDN bundles and writes SRI hashes.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '../dist/cdn');
const require = createRequire(import.meta.url);
mkdirSync(out, { recursive: true });

// One CSS file: content styles + editor UI (resolve the @import).
const uiStyles = dirname(require.resolve('@axiomtext/ui/styles.css'));
const editorCss = readFileSync(join(uiStyles, 'axiomtext.css'), 'utf8').replace(
  "@import './content.css';",
  readFileSync(join(uiStyles, 'content.css'), 'utf8'),
);
writeFileSync(join(out, 'axiomtext.css'), editorCss);
cpSync(join(uiStyles, 'content.css'), join(out, 'content.css'));

// KaTeX CSS + fonts (also used by the visual math editor), served from the same folder.
const katexDist = dirname(require.resolve('katex/dist/katex.min.css'));
cpSync(join(katexDist, 'katex.min.css'), join(out, 'katex/katex.min.css'));
cpSync(join(katexDist, 'fonts'), join(out, 'katex/fonts'), { recursive: true });

// Subresource Integrity hashes for the entry files.
const sri = {};
for (const file of [
  'axiomtext.js',
  'axiomtext.iife.js',
  'axiomtext.css',
  'content.css',
  'katex/katex.min.css',
]) {
  const hash = createHash('sha384')
    .update(readFileSync(join(out, file)))
    .digest('base64');
  sri[file] = `sha384-${hash}`;
}
writeFileSync(join(out, 'sri.json'), `${JSON.stringify(sri, null, 2)}\n`);
console.log(
  'CDN files:',
  readdirSync(out).filter((f) => !f.endsWith('.map')).length,
  'SRI:',
  Object.keys(sri).length,
);
