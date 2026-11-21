/**
 * Several inline editors on one page: an overlay one of them opens (math bar, popover) must not
 * make the others show their toolbars.
 */
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { expect, test } from '@playwright/test';

const CDN = join(process.cwd(), 'packages/axiomtext/dist/cdn');
const ORIGIN = 'https://overlays.test';

test('opening the math bar in one inline editor leaves the others closed', async ({ page }) => {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '');
    if (path === 'index.html') {
      await route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><link rel="stylesheet" href="/axiomtext.css">
          <div id="a" style="margin:120px 40px 0"><p>Question</p></div>
          <div id="b" style="margin:60px 40px 0"><p>Option one</p></div>
          <div id="c" style="margin:60px 40px 0"><p>Option two</p></div>
          <script src="/axiomtext.iife.js"></script>
          <script>
            window.editors = ['a', 'b', 'c'].map((id) =>
              AxiomText.createInlineEditor({ element: document.getElementById(id) }),
            );
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
  const toolbars = page.locator('.ax-floating-toolbar.is-visible');

  await page.locator('#a .ProseMirror').click();
  await expect(toolbars).toHaveCount(1);

  // Open an equation in editor A, then move focus into its math bar.
  await page.evaluate(() =>
    (
      window as unknown as { editors: { editor: { execute(c: string): void } }[] }
    ).editors[0]?.editor.execute('insertMath'),
  );
  await expect(page.locator('.ax-math-bar')).toBeVisible();
  await page.locator('.ax-math-bar').getByRole('button').first().focus();
  await page.waitForTimeout(150);
  // Only A's toolbar may be showing, never B's or C's.
  expect(await toolbars.count()).toBeLessThanOrEqual(1);

  // The math bar is drawn above any floating toolbar.
  const z = await page.evaluate(() => ({
    bar: Number(getComputedStyle(document.querySelector('.ax-math-bar') as Element).zIndex),
    toolbar: Number(
      getComputedStyle(document.querySelector('.ax-floating-toolbar') as Element).zIndex,
    ),
  }));
  expect(z.bar).toBeGreaterThan(z.toolbar);

  // Moving to editor B hands the toolbar over.
  await page.keyboard.press('Escape');
  await page.locator('#b .ProseMirror').click();
  await expect(toolbars).toHaveCount(1);
});
