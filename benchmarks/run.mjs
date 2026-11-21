// Performance benchmarks (M1 gate: typing p95 < 16 ms).
// Usage: pnpm build && pnpm bench   (starts the playground preview itself)
// Env: CHROME_PATH=/path/to/chrome to use an installed browser.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 4180;
const server = spawn(
  'pnpm',
  [
    '--filter',
    '@axiomtext/playground',
    'exec',
    'vite',
    'preview',
    '--port',
    String(PORT),
    '--strictPort',
  ],
  {
    stdio: 'ignore',
  },
);
const stop = () => server.kill();
process.on('exit', stop);
await new Promise((r) => setTimeout(r, 3000));

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await page.goto(`http://localhost:${PORT}/?empty`);
await page.waitForFunction(() => 'axiomEditor' in window);

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

/** A document with `paragraphs` paragraphs of ~50 words, every 10th with bold, a link and an equation. */
const bigDoc = (paragraphs) => ({
  version: 1,
  doc: {
    type: 'doc',
    content: Array.from({ length: paragraphs }, (_, i) => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text:
            `Paragraph ${i + 1}. `.padEnd(20) +
            'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ',
        },
        ...(i % 10 === 0
          ? [
              { type: 'text', text: 'bold text', marks: [{ type: 'bold' }] },
              { type: 'text', text: ' and ' },
              { type: 'math_inline', attrs: { latex: 'x^2 + y^2 = r^2' } },
            ]
          : []),
      ],
    })),
  },
});

const results = {};

// 1. Loading a large document (setJSON → rendered and idle).
for (const paragraphs of [200, 1000]) {
  const doc = bigDoc(paragraphs);
  const ms = await page.evaluate(async (d) => {
    const start = performance.now();
    window.axiomEditor.setJSON(d);
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r)));
    return performance.now() - start;
  }, doc);
  results[`load ${paragraphs} paragraphs (~${paragraphs * 50} words), ms`] = Math.round(ms);
}

// 2. Typing in the 1000-paragraph document.
//    processing: time the editor spends handling a keystroke — from keydown until the text is
//    inserted and the editor (incl. its DOM observer) is done. Excludes the browser's painting.
await page.evaluate(() => {
  window.__processing = [];
  let t0 = 0;
  window.addEventListener('keydown', () => (t0 = performance.now()), true);
  window.addEventListener('input', () =>
    queueMicrotask(() => queueMicrotask(() => window.__processing.push(performance.now() - t0))),
  );
  window.axiomEditor.focus('end');
});
for (const ch of 'The quick brown fox jumps over the lazy dog. '.repeat(5)) {
  await page.keyboard.type(ch);
  await page.waitForTimeout(30);
}
await page.waitForTimeout(500);
const processing = await page.evaluate(() => window.__processing);
results['typing: processing per key p50 (1000 paragraphs), ms'] = +percentile(
  processing,
  50,
).toFixed(1);
results['typing: processing per key p95 (1000 paragraphs), ms'] = +percentile(
  processing,
  95,
).toFixed(1);
results['typing samples'] = processing.length;

// 3. Export.
results['getHTML (1000 paragraphs), ms'] = Math.round(
  await page.evaluate(() => {
    const s = performance.now();
    window.axiomEditor.getHTML();
    return performance.now() - s;
  }),
);

await browser.close();
stop();

console.table(results);
const pass = results['typing: processing per key p95 (1000 paragraphs), ms'] < 16;
writeFileSync(
  new URL('./results.json', import.meta.url),
  `${JSON.stringify({ date: new Date().toISOString(), results, gate: { typingP95Under16ms: pass } }, null, 2)}\n`,
);
if (!pass) {
  console.error('Typing p95 is over 16 ms');
  process.exit(1);
}
