/**
 * axiomtext/pdf: mark up an existing PDF (pdf.js) with marks, highlights and selection actions.
 */
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { makePdf } from './helpers/pdf';

const ORIGIN = 'https://pdf.test';
const DIST = join(process.cwd(), 'packages/axiomtext/dist');
const PDFJS = join(process.cwd(), 'packages/pdf/node_modules/pdfjs-dist');
const TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
};

async function openPdf(page: Page, mode: 'read' | 'mark'): Promise<void> {
  const pdf = makePdf([
    ['Plants make food by photosynthesis.', 'Chlorophyll is green.', 'Roots take up water.'],
    ['Page two text here.'],
  ]);
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/index.html') {
      await route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><link rel="stylesheet" href="/dist/styles.css"><link rel="stylesheet" href="/dist/content.css">
          <script type="importmap">{ "imports": { "pdfjs-dist": "/pdfjs/build/pdf.mjs" } }</script>
          <div id="book" style="width:700px;margin:20px auto"></div>
          <script type="module">
            import { createPdfAnnotator } from '/dist/pdf.js';
            window.saved = []; window.taps = []; window.actions = [];
            window.pdf = await createPdfAnnotator(document.getElementById('book'), {
              source: '/chapter.pdf',
              workerSrc: '/pdfjs/build/pdf.worker.min.mjs',
              mode: '${mode}',
              markTypes: [
                { id: 'important', label: 'Important', color: '#16a34a', style: 'fill' },
                { id: 'pyq', label: 'Past exam', color: '#b45309', style: 'box' },
              ],
              onChange: (items) => (window.saved = items),
              onMarkClick: (e) => window.taps.push(e.annotation),
              selectionActions: [{ id: 'ask', label: 'Ask AI' }],
              onSelectionAction: (e) => window.actions.push(e),
            });
            window.ready = true;
          </script>`,
      });
      return;
    }
    if (path === '/chapter.pdf') {
      await route.fulfill({ body: pdf, contentType: 'application/pdf' });
      return;
    }
    const file = path.startsWith('/pdfjs/')
      ? join(PDFJS, path.slice('/pdfjs/'.length))
      : path.startsWith('/dist/')
        ? join(DIST, path.slice('/dist/'.length))
        : '';
    try {
      await route.fulfill({
        body: readFileSync(file),
        contentType: TYPES[extname(file)] ?? 'application/octet-stream',
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  await page.goto(`${ORIGIN}/index.html`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  await expect(page.locator('.ax-pdf__page.is-rendered').first()).toBeVisible();
}

async function selectInPdf(page: Page, needle: string): Promise<void> {
  await page.evaluate((text) => {
    const spans = [...document.querySelectorAll('.ax-pdf__page[data-page="1"] .textLayer span')];
    const span = spans.find((s) => s.textContent?.includes(text));
    const node = span?.firstChild as Text | undefined;
    if (!node) throw new Error(`"${text}" not in the text layer`);
    const i = node.data.indexOf(text);
    const range = document.createRange();
    range.setStart(node, i);
    range.setEnd(node, i + text.length);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  }, needle);
  await page.locator('.ax-pdf').dispatchEvent('pointerup');
}

const saved = (page: Page) =>
  page.evaluate(() => (window as unknown as { saved: Record<string, unknown>[] }).saved);

test('teachers mark a PDF; taps report the mark', async ({ page }) => {
  await openPdf(page, 'mark');
  await expect(page.locator('.ax-pdf__page')).toHaveCount(2);
  await selectInPdf(page, 'photosynthesis');
  await page
    .getByRole('group', { name: 'Mark' })
    .getByRole('button', { name: 'Important' })
    .click();
  await expect.poll(async () => (await saved(page)).length).toBe(1);
  const [mark] = await saved(page);
  expect(mark).toMatchObject({
    kind: 'mark',
    type: 'important',
    page: 1,
    anchor: { exact: 'photosynthesis' },
  });
  expect((mark?.['rects'] as unknown[]).length).toBe(1);
  await expect(page.locator('.ax-pdf__hl.is-mark')).toHaveCount(1);

  // Tap it.
  const box = await page.locator('.ax-pdf__hl.is-mark').boundingBox();
  if (!box) throw new Error('no mark drawn');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { taps: unknown[] }).taps.length))
    .toBe(1);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/pdf-mark.png' });
});

test('readers highlight and send text to the app', async ({ page }) => {
  await openPdf(page, 'read');
  await selectInPdf(page, 'Chlorophyll');
  const menu = page.getByRole('dialog', { name: 'Highlight' });
  await menu.getByRole('radio', { name: 'Blue' }).click();
  await expect.poll(async () => (await saved(page))[0]?.['color']).toBe('blue');
  await selectInPdf(page, 'Roots');
  await page.getByRole('button', { name: 'Ask AI' }).click();
  const action = await page.evaluate(
    () => (window as unknown as { actions: Record<string, unknown>[] }).actions[0],
  );
  expect(action).toMatchObject({ actionId: 'ask', text: 'Roots', page: 1 });
});
