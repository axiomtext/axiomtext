/**
 * axiomtext/viewer on a plain website page (CDN build): comment threads saved in the HTML, and
 * readers' own highlights and notes that survive later edits.
 */
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const CDN = join(process.cwd(), 'packages/axiomtext/dist/cdn');
const ORIGIN = 'https://viewer.test';
const thread = JSON.stringify([
  { id: 'm1', author: 'Teacher', text: 'Remember this one!', time: Date.now() - 3_600_000 },
]).replace(/"/g, '&quot;');

const article = (before = '') => `
  <p>${before}The quick brown fox jumps over the lazy dog.</p>
  <p>Euler wrote <mark class="ax-comment" data-comment-id="t1" data-color="green" data-thread="${thread}">the most beautiful equation</mark> in mathematics.</p>`;

async function openPage(page: Page, html: string, items = '[]'): Promise<void> {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '');
    if (path === 'index.html') {
      await route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><link rel="stylesheet" href="/content.css">
          <article class="axiomtext-content" style="max-width:640px;margin:80px auto;font-size:18px">${html}</article>
          <script src="/viewer.js"></script>
          <script>
            window.saved = [];
            window.viewer = AxiomViewer.createViewer(document.querySelector('article'), {
              highlights: { items: ${items}, onChange: (items) => (window.saved = items) },
            });
          </script>`,
      });
      return;
    }
    try {
      await route.fulfill({
        body: readFileSync(join(CDN, path)),
        contentType: extname(path) === '.css' ? 'text/css' : 'text/javascript',
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  await page.goto(`${ORIGIN}/index.html`);
}

async function select(page: Page, text: string): Promise<void> {
  await page.evaluate((needle) => {
    const walker = document.createTreeWalker(
      document.querySelector('article') as HTMLElement,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const i = (node.textContent ?? '').indexOf(needle);
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + needle.length);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
      return;
    }
  }, text);
  // What a mouse release does after selecting.
  await page.locator('article').dispatchEvent('mouseup');
}

const saved = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as {
          saved: { color: string; fill?: boolean; note?: string; anchor: { exact: string } }[];
        }
      ).saved,
  );

test('comment threads saved in the HTML open on click', async ({ page }) => {
  await openPage(page, article());
  await page.locator('mark.ax-comment').click();
  const bubble = page.getByRole('dialog', { name: 'Comments' });
  await expect(bubble.getByText('Remember this one!')).toBeVisible();
  await expect(bubble.getByText('Teacher')).toBeVisible();
  await expect(bubble.getByText('1 hour ago')).toBeVisible();
});

test('readers highlight, add notes, and keep them after the text changes', async ({ page }) => {
  await openPage(page, article());

  await select(page, 'lazy dog');
  const menu = page.getByRole('dialog', { name: 'Highlight' });
  await menu.getByRole('radio', { name: 'Pink' }).click();
  await expect
    .poll(async () => (await saved(page)).map((h) => [h.anchor.exact, h.color]))
    .toEqual([['lazy dog', 'pink']]);
  // Drawn with the CSS Highlight API: the page itself is untouched.
  expect(
    await page.evaluate(() =>
      (CSS as unknown as { highlights: Map<string, unknown> }).highlights.has('ax-hl-pink'),
    ),
  ).toBe(true);
  expect(await page.locator('article span').count()).toBe(0);

  // Click the highlight: add a note.
  const box = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.querySelector('article') as HTMLElement,
      NodeFilter.SHOW_TEXT,
    );
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const i = (node.textContent ?? '').indexOf('lazy');
      if (i < 0) continue;
      const range = document.createRange();
      range.setStart(node, i + 1);
      range.setEnd(node, i + 2);
      const r = range.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return null;
  });
  if (!box) throw new Error('highlight not found');
  await page.mouse.click(box.x, box.y);
  const note = page.getByRole('dialog', { name: 'Note' });
  await note.getByRole('textbox', { name: 'Note' }).fill('Classic pangram');
  await note.getByRole('button', { name: 'Save' }).click();
  await expect.poll(async () => (await saved(page))[0]?.note).toBe('Classic pangram');

  // Highlight with a note straight from the selection menu.
  await select(page, 'brown fox');
  await page
    .getByRole('dialog', { name: 'Highlight' })
    .getByRole('button', { name: 'Add note' })
    .click();
  await page
    .getByRole('dialog', { name: 'Note' })
    .getByRole('textbox', { name: 'Note' })
    .fill('Colour!');
  await page.getByRole('dialog', { name: 'Note' }).getByRole('button', { name: 'Save' }).click();
  await expect.poll(async () => (await saved(page)).length).toBe(2);
  if (!box) throw new Error('highlight not found');
  await page.mouse.click(box.x, box.y);
  await page.waitForTimeout(300);
  await page.screenshot({
    path: 'test-results/viewer.png',
    clip: { x: 300, y: 40, width: 860, height: 420 },
  });
  await page.keyboard.press('Escape');

  // The notebook lists them in reading order.
  const notebook = await page.evaluate(() =>
    (
      window as unknown as {
        viewer: { notebook(): { text: string; highlight: { note?: string } }[] };
      }
    ).viewer
      .notebook()
      .map((e) => [e.text, e.highlight.note]),
  );
  expect(notebook).toEqual([
    ['brown fox', 'Colour!'],
    ['lazy dog', 'Classic pangram'],
  ]);

  // The author edits the article later: highlights stay on the same words.
  const items = JSON.stringify(await saved(page));
  const fresh = await page.context().newPage();
  await openPage(fresh, article('A new opening sentence. '), items);
  const after = await fresh.evaluate(() =>
    (window as unknown as { viewer: { notebook(): { text: string; orphaned: boolean }[] } }).viewer
      .notebook()
      .map((e) => [e.text, e.orphaned]),
  );
  expect(after).toEqual([
    ['brown fox', false],
    ['lazy dog', false],
  ]);
});

test('readers pick any colour and can underline instead of filling', async ({ page }) => {
  await openPage(page, article());
  await select(page, 'quick brown');
  const menu = page.getByRole('dialog', { name: 'Highlight' });
  await expect(menu.getByRole('switch', { name: 'Highlight background' })).toBeChecked();
  await menu.getByRole('radio', { name: 'Custom color' }).click();
  await menu.getByRole('textbox', { name: 'Hex color' }).fill('#1e88e5');
  await menu.getByText('Highlight background').click();
  await expect
    .poll(async () => (await saved(page)).map((h) => [h.anchor.exact, h.color, h.fill]))
    .toEqual([['quick brown', '#1e88e5', false]]);
  expect(
    await page.evaluate(() =>
      (CSS as unknown as { highlights: Map<string, unknown> }).highlights.has('ax-hl-c1e88e5-line'),
    ),
  ).toBe(true);
  await page.waitForTimeout(400); // let the animations finish
  await page.screenshot({
    path: 'test-results/viewer-colors.png',
    clip: { x: 300, y: 40, width: 860, height: 520 },
  });
});

test('a read-only editor: readers highlight without changing the document', async ({ page }) => {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '');
    if (path === 'reader.html') {
      await route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><link rel="stylesheet" href="/axiomtext.css"><div id="e" style="max-width:700px;margin:40px auto"></div>
          <script src="/axiomtext.iife.js"></script>
          <script>
            window.saved = [];
            const { editor, reader } = AxiomText.createClassicEditor({
              element: document.getElementById('e'),
              editable: false,
              statusBar: false,
              highlights: { onChange: (items) => (window.saved = items) },
            });
            window.editor = editor;
            window.readerReady = reader.then(() => true);
          </script>`,
      });
      return;
    }
    try {
      await route.fulfill({
        body: readFileSync(join(CDN, path)),
        contentType: extname(path) === '.css' ? 'text/css' : 'text/javascript',
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  await page.goto(`${ORIGIN}/reader.html`);
  await page.evaluate(() => {
    const w = window as unknown as { editor: { setJSON(d: unknown): void } };
    w.editor.setJSON({
      version: 1,
      doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Read-only chapter text to mark up.' }],
          },
        ],
      },
    });
  });
  await page.evaluate(() => (window as unknown as { readerReady: Promise<boolean> }).readerReady);
  await page.waitForTimeout(200);
  const before = await page.evaluate(() =>
    JSON.stringify((window as unknown as { editor: { getJSON(): unknown } }).editor.getJSON()),
  );
  await page.evaluate(() => {
    const p = document.querySelector('.ProseMirror p')?.firstChild as Text;
    const range = document.createRange();
    range.setStart(p, 10);
    range.setEnd(p, 22);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await page.locator('.ProseMirror').dispatchEvent('mouseup');
  await page
    .getByRole('dialog', { name: 'Highlight' })
    .getByRole('radio', { name: 'Blue' })
    .click();
  await expect
    .poll(async () => (await saved(page)).map((h) => h.anchor.exact))
    .toEqual(['chapter text']);
  const after = await page.evaluate(() =>
    JSON.stringify((window as unknown as { editor: { getJSON(): unknown } }).editor.getJSON()),
  );
  expect(after).toBe(before);
});
