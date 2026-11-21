/**
 * Marked books: mark types in the editor (menu, shortcuts, pages) and on a website (taps,
 * badges, legend filter, selection actions) with axiomtext/viewer.
 */
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const editorBox = (page: Page) => page.getByRole('textbox', { name: 'Document body' });

async function selectText(page: Page, text: string): Promise<void> {
  await page.evaluate((needle) => {
    const root = document.querySelector('.ProseMirror') as HTMLElement;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const i = node.textContent?.indexOf(needle) ?? -1;
      if (i >= 0) {
        const range = document.createRange();
        range.setStart(node, i);
        range.setEnd(node, i + needle.length);
        getSelection()?.removeAllRanges();
        getSelection()?.addRange(range);
        return;
      }
    }
    throw new Error(`"${needle}" not found`);
  }, text);
}

const json = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { axiomEditor: { getJSON(): unknown } }).axiomEditor.getJSON(),
  );

test('writers mark text from the Mark menu and with Alt+1/2/3, and add pages', async ({ page }) => {
  await page.goto('/?empty');
  await editorBox(page).click();
  await page.keyboard.type('Water boils at 100 degrees. Ice melts at 0 degrees.');

  await selectText(page, 'boils');
  await page.getByRole('button', { name: 'Mark', exact: true }).click();
  await page.getByRole('menuitemcheckbox', { name: /Important/ }).click();
  const important = page.locator('mark.ax-mark[data-mark-type="important"]');
  await expect(important).toHaveText('boils');
  await expect(important).toHaveAttribute('data-mark-style', 'fill');

  await selectText(page, 'melts');
  await page.keyboard.press('Alt+3');
  await expect(page.locator('mark.ax-mark[data-mark-type="pyq"]')).toHaveText('melts');

  // Remove with Alt+0 (cursor inside the mark).
  await selectText(page, 'melts');
  await page.keyboard.press('Alt+0');
  await expect(page.locator('mark.ax-mark[data-mark-type="pyq"]')).toHaveCount(0);

  // A page block from the More menu, numbered 1; the label isn't text.
  await editorBox(page).press('Control+Home');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('menuitem', { name: 'Page number' }).click();
  const pageBlock = page.locator('.ax-page');
  await expect(pageBlock).toHaveAttribute('data-page', '1');
  await expect(pageBlock).toHaveAttribute('data-label', 'Page 1');
  // Renumber it from its balloon.
  await page.getByRole('spinbutton', { name: 'Page number' }).fill('23');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(pageBlock).toHaveAttribute('data-page', '23');

  const doc = JSON.stringify(await json(page));
  expect(doc).toContain('"type":"marker"');
  expect(doc).toContain('"type":"page"');
  await page.screenshot({ path: 'test-results/marks-editor.png' });
});

// ── On a website ────────────────────────────────────────────────

const CDN = join(process.cwd(), 'packages/axiomtext/dist/cdn');
const ORIGIN = 'https://viewer.test';
const mark = (id: string, type: string, text: string, extra = '') =>
  `<mark class="ax-mark" data-mark-id="${id}" data-mark-type="${type}" ${extra}>${text}</mark>`;

const chapter = `
  <div class="ax-page" data-page="23" data-label="Page 23"></div>
  <p>Plants make food by ${mark('m1', 'important', 'photosynthesis', `data-badge="3" data-mark='{"questionIds":["q1","q2","q3"]}'`)} in their leaves.</p>
  <p>The sky is blue.</p>
  <p>Chlorophyll is ${mark('m2', 'marked', 'green')}.</p>
  <p>Roots take up water.</p>
  <p>Grass is short.</p>`;

async function openChapter(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '');
    if (path === 'index.html') {
      await route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><link rel="stylesheet" href="/content.css">
          <article class="axiomtext-content" style="max-width:640px;margin:60px auto;font-size:18px">${chapter}</article>
          <script src="/viewer.js"></script>
          <script>
            window.taps = []; window.actions = [];
            window.viewer = AxiomViewer.createViewer(document.querySelector('article'), {
              marks: {
                types: [
                  { id: 'important', label: 'Important', color: '#16a34a', style: 'fill' },
                  { id: 'marked', label: 'Marked', color: '#2563eb', style: 'underline' },
                ],
                onClick: (e) => window.taps.push(e),
              },
              selectionActions: [{ id: 'ask', label: 'Ask AI' }],
              onSelectionAction: (e) => window.actions.push(e),
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

test('readers tap marks, see badges and filter with the legend', async ({ page }) => {
  await openChapter(page);
  const photosynthesis = page.locator('mark[data-mark-id="m1"]');
  await expect(photosynthesis).toHaveCSS('--ax-mark', '#16a34a');
  await expect(page.locator('.ax-mark-badge')).toHaveText('3');

  await photosynthesis.click();
  const tap = await page.evaluate(() => (window as unknown as { taps: unknown[] }).taps[0]);
  expect(tap).toMatchObject({
    id: 'm1',
    type: 'important',
    text: 'photosynthesis',
    data: { questionIds: ['q1', 'q2', 'q3'] },
    badge: '3',
    page: 23,
  });

  // Legend: counts, then "Only marked" folds paragraphs without marks.
  const legend = page.getByRole('group', { name: 'Marks' });
  await expect(legend.getByRole('button', { name: /Important/ })).toContainText('1');
  await legend.getByRole('button', { name: 'Only marked' }).click();
  await expect(page.locator('article > p:not(.ax-folded)')).toHaveCount(2);
  await expect(page.getByRole('button', { name: '… 1 paragraph' })).toBeVisible();
  await expect(page.getByRole('button', { name: '… 2 paragraphs' })).toBeVisible();
  // Only "Marked": the Important paragraph folds too.
  await legend.getByRole('button', { name: /Important/ }).click();
  await expect(page.locator('article > p:not(.ax-folded)')).toHaveCount(1);
  await page.getByRole('button', { name: '… 2 paragraphs' }).first().click();
  await page.screenshot({ path: 'test-results/marks-viewer.png' });
});

test('readers send selected text to the app (Ask AI)', async ({ page }) => {
  await openChapter(page);
  await page.evaluate(() => {
    const p = document.querySelectorAll('article p')[3] as HTMLElement;
    const text = p.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);
    getSelection()?.removeAllRanges();
    getSelection()?.addRange(range);
  });
  await page.locator('article').dispatchEvent('mouseup');
  await page.getByRole('button', { name: 'Ask AI' }).click();
  const action = await page.evaluate(
    () => (window as unknown as { actions: unknown[] }).actions[0],
  );
  expect(action).toMatchObject({
    actionId: 'ask',
    text: 'Roots',
    anchor: { exact: 'Roots' },
    page: 23,
  });
});
