/**
 * The Flutter engine (packages/flutter/assets/editor) driven the way Dart drives it:
 * messages in through window.axiomReceive, out through the AxiomBridge channel.
 */
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { makePdf } from './helpers/pdf';

const ASSETS = join(process.cwd(), 'packages/flutter/assets/editor');
const ORIGIN = 'https://engine.test';
const TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.woff2': 'font/woff2',
};

type Message = {
  kind: string;
  id?: number;
  ok?: boolean;
  value?: unknown;
  error?: string;
  name?: string;
  data?: Record<string, unknown>;
};

async function openEngine(page: Page): Promise<void> {
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\//, '') || 'index.html';
    try {
      await route.fulfill({
        body: readFileSync(join(ASSETS, path)),
        contentType: TYPES[extname(path)] ?? 'application/octet-stream',
      });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  // What webview_flutter's JavaScript channel provides.
  await page.addInitScript(() => {
    const w = window as unknown as { __out: unknown[]; AxiomBridge: unknown };
    w.__out = [];
    w.AxiomBridge = { postMessage: (m: string) => w.__out.push(JSON.parse(m)) };
  });
  await page.goto(`${ORIGIN}/index.html`);
}

let nextId = 1;
/** Sends a call like Dart does and waits for its result. */
async function call(page: Page, method: string, params?: object): Promise<Message> {
  const id = nextId++;
  await page.evaluate(
    (json) => (window as unknown as { axiomReceive(m: string): void }).axiomReceive(json),
    JSON.stringify({ v: 1, kind: 'call', id, method, ...(params ? { params } : {}) }),
  );
  await expect.poll(() => outbox(page).then((m) => m.some((x) => x.id === id))).toBe(true);
  return (await outbox(page)).find((m) => m.kind === 'result' && m.id === id) as Message;
}
const outbox = (page: Page): Promise<Message[]> =>
  page.evaluate(() => (window as unknown as { __out: Message[] }).__out);
const events = async (page: Page, name: string): Promise<Message[]> =>
  (await outbox(page)).filter((m) => m.kind === 'event' && m.name === name);

test.describe('Flutter engine', () => {
  test('starts, edits and reports state through the bridge', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openEngine(page);

    const ready = await call(page, 'init', {
      markdown: 'Hello *world* and $x^2$',
      placeholder: 'Write…',
      toolbar: 'none',
      theme: { dark: true, vars: { accent: '#ff0066', bad: 'red; background: url(x)' } },
    });
    expect(ready.ok).toBe(true);
    expect((ready.value as { commands: string[] }).commands).toContain('toggleBold');
    expect(await events(page, 'ready')).toHaveLength(1);

    // Native toolbar mode hides the web toolbar; the theme is applied, unsafe values are not.
    await expect(page.locator('.ax-toolbar')).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.dataset['theme'])).toBe('dark');
    expect(
      await page.evaluate(() => document.documentElement.style.getPropertyValue('--ax-accent')),
    ).toBe('#ff0066');
    expect(
      await page.evaluate(() => document.documentElement.style.getPropertyValue('--ax-bad')),
    ).toBe('');
    await expect(page.locator('.ax-math .katex')).toBeVisible();

    // Formatting commands and the state event a native toolbar listens to.
    await call(page, 'focus', { position: 'end' });
    await page.keyboard.type(' ');
    expect((await call(page, 'execute', { command: 'toggleBold' })).value).toBe(true);
    await page.keyboard.type('bold');
    await expect
      .poll(async () => (await events(page, 'state')).at(-1)?.data?.['marks'])
      .toMatchObject({ bold: true });
    expect((await call(page, 'getHtml')).value).toContain('<strong>bold</strong>');
    expect((await call(page, 'getMarkdown')).value).toContain('**bold**');
    await expect.poll(async () => (await events(page, 'change')).length).toBeGreaterThan(0);

    // Unknown commands and methods are refused, never run.
    const bad = await call(page, 'execute', { command: 'constructor' });
    expect(bad.ok).toBe(false);
    await page.evaluate(() =>
      (window as unknown as { axiomReceive(m: string): void }).axiomReceive(
        JSON.stringify({ v: 1, kind: 'call', id: 999, method: 'eval', params: {} }),
      ),
    );
    await page.waitForTimeout(100);
    expect((await outbox(page)).some((m) => m.id === 999)).toBe(false);

    // Content in and out, all three formats.
    await call(page, 'setHtml', { html: '<h2>Title</h2><p>Body</p>' });
    expect(
      ((await call(page, 'getJson')).value as { doc: { content: { type: string }[] } }).doc
        .content[0]?.type,
    ).toBe('heading');
    await call(page, 'setMarkdown', { markdown: '- one\n- two' });
    expect((await call(page, 'getText')).value).toContain('two');

    // Images from Dart, and an unsafe image address refused.
    expect(
      (await call(page, 'insertImage', { src: 'https://example.com/a.png', alt: 'A' })).value,
    ).toBe(true);
    expect((await call(page, 'insertImage', { src: 'javascript:alert(1)' })).value).toBe(false);
    expect(errors).toEqual([]);
  });

  test('language switch keeps the content and flips right-to-left', async ({ page }) => {
    await openEngine(page);
    await call(page, 'init', { markdown: 'Keep me', language: 'en' });
    const switched = await call(page, 'setLanguage', { language: 'ar' });
    expect(switched.value).toEqual({ language: 'ar', dir: 'rtl' });
    expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');
    expect((await call(page, 'getText')).value).toContain('Keep me');
    const texts = (await call(page, 'translate', { texts: ['Bold', 'Unknown text'] }))
      .value as Record<string, string>;
    expect(texts['Bold']).not.toBe('Bold');
    expect(texts['Unknown text']).toBe('Unknown text');
  });

  test('image button asks Dart to pick; pasted images upload through Dart', async ({ page }) => {
    await openEngine(page);
    await call(page, 'init', { hostImagePicker: true, hostUploads: true });
    await page.getByRole('button', { name: 'Image' }).click();
    await page.getByRole('button', { name: 'Upload from computer' }).click();
    await expect.poll(async () => (await events(page, 'pickImage')).length).toBe(1);

    // Paste a tiny PNG: the engine sends it to Dart and waits for the URL.
    await page.locator('.ProseMirror').click();
    await page.evaluate(() => {
      const bytes = Uint8Array.from(
        atob(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
        ),
        (c) => c.charCodeAt(0),
      );
      const data = new DataTransfer();
      data.items.add(new File([bytes], 'dot.png', { type: 'image/png' }));
      document
        .querySelector('.ProseMirror')
        ?.dispatchEvent(
          new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
        );
    });
    await expect.poll(async () => (await events(page, 'uploadImage')).length).toBe(1);
    const upload = (await events(page, 'uploadImage'))[0]?.data ?? {};
    expect(upload['mime']).toBe('image/png');
    expect(typeof upload['base64']).toBe('string');
    await call(page, 'resolveUpload', {
      requestId: upload['requestId'],
      url: 'https://cdn.example.com/dot.png',
    });
    await expect(
      page.locator('.ProseMirror img[src="https://cdn.example.com/dot.png"]'),
    ).toBeVisible();
  });

  test('native math keyboard drives the equation editor', async ({ page }) => {
    await openEngine(page);
    await call(page, 'init', { hostMathKeyboard: true, toolbar: 'none' });
    await call(page, 'focus');
    await call(page, 'insertMath', { latex: '' });
    await expect
      .poll(async () => (await events(page, 'mathEditStart')).length, { timeout: 15000 })
      .toBe(1);
    await call(page, 'mathInsert', { latex: '\\frac{#0}{#?}' });
    await call(page, 'mathInsert', { latex: '1' });
    await call(page, 'mathCommand', { command: 'moveToNextPlaceholder' });
    await call(page, 'mathInsert', { latex: '2' });
    expect((await call(page, 'mathCommand', { command: 'evil' })).ok).toBe(false);
    await call(page, 'mathCommit');
    await expect.poll(async () => (await events(page, 'mathEditEnd')).length).toBe(1);
    const json = (await call(page, 'getJson')).value as {
      doc: { content: { content?: { type: string; attrs?: { latex: string } }[] }[] };
    };
    const math = json.doc.content[0]?.content?.find((n) => n.type === 'math_inline');
    expect(math?.attrs?.latex.replace(/\s/g, '')).toMatch(/^\\frac(\{1\}\{2\}|12)$/);
    // MathLive was loaded from the separate file, on demand.
    expect(
      await page.evaluate(() => typeof (window as unknown as { MathLive?: unknown }).MathLive),
    ).toBe('object');
  });

  test('Flutter Web: works in an iframe over postMessage, same origin only', async ({ page }) => {
    await page.route(`${ORIGIN}/**`, async (route) => {
      const path = new URL(route.request().url()).pathname.replace(/^\//, '');
      if (path === 'host.html') {
        await route.fulfill({
          contentType: 'text/html',
          body: `<!doctype html><iframe id="f" src="/index.html" style="width:600px;height:400px"></iframe>
            <script>
              window.__out = [];
              addEventListener('message', (e) => {
                if (e.source === document.getElementById('f').contentWindow) window.__out.push(JSON.parse(e.data));
              });
            </script>`,
        });
        return;
      }
      try {
        await route.fulfill({
          body: readFileSync(join(ASSETS, path)),
          contentType: TYPES[extname(path)] ?? 'application/octet-stream',
        });
      } catch {
        await route.fulfill({ status: 404 });
      }
    });
    await page.goto(`${ORIGIN}/host.html`);
    const frame = page.frameLocator('#f');
    await expect(frame.locator('#editor')).toBeAttached();
    const send = (message: object) =>
      page.evaluate((m) => {
        const f = document.getElementById('f') as HTMLIFrameElement;
        f.contentWindow?.postMessage(JSON.stringify(m), location.origin);
      }, message);
    await send({ v: 1, kind: 'call', id: 1, method: 'init', params: { markdown: '# Web' } });
    await expect.poll(async () => (await outbox(page)).some((m) => m.name === 'ready')).toBe(true);
    await send({ v: 1, kind: 'call', id: 2, method: 'getText' });
    await expect.poll(async () => (await outbox(page)).find((m) => m.id === 2)?.value).toBe('Web');
    await expect(frame.locator('.ax-toolbar')).toBeVisible();
  });

  test("comments and readers' highlights through the bridge", async ({ page }) => {
    await openEngine(page);
    await call(page, 'init', {
      markdown: 'Water boils at 100 degrees.',
      toolbar: 'none',
      comments: { author: { name: 'Ana', id: 'a1' } },
    });
    // Select "100 degrees" (as the user would) and comment from Dart.
    await call(page, 'focus');
    await page.evaluate(() => {
      const text = document.querySelector('.ProseMirror p')?.firstChild as Text;
      const start = text.data.indexOf('100 degrees');
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, start + '100 degrees'.length);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
    await expect
      .poll(async () => (await events(page, 'state')).at(-1)?.data?.['empty'])
      .toBe(false);
    expect((await call(page, 'addComment', { text: 'At sea level', color: 'blue' })).value).toBe(
      true,
    );
    await expect.poll(async () => (await events(page, 'commentsChange')).length).toBeGreaterThan(0);
    const threads = (await call(page, 'getComments')).value as {
      id: string;
      quote: string;
      color: string;
      comments: { author: string }[];
    }[];
    expect(threads[0]).toMatchObject({ quote: '100 degrees', color: 'blue' });
    expect(threads[0]?.comments[0]?.author).toBe('Ana');
    const id = threads[0]?.id ?? '';
    expect((await call(page, 'replyToComment', { id, text: 'Yes' })).value).toBe(true);
    expect((await call(page, 'resolveComment', { id })).value).toBe(true);
    const after = (await call(page, 'getComments')).value as {
      resolved: boolean;
      comments: unknown[];
    }[];
    expect(after[0]).toMatchObject({ resolved: true });
    expect(after[0]?.comments).toHaveLength(2);
    await call(page, 'toggleCommentsPanel', { open: true });
    await expect(page.getByRole('complementary', { name: 'Comments' })).toBeVisible();
  });

  test("read-only reading view keeps a reader's highlights", async ({ page }) => {
    await openEngine(page);
    const saved = {
      id: 'h1',
      color: 'pink',
      note: 'Remember',
      anchor: { exact: 'boils', prefix: 'Water ', suffix: ' at 100', start: 6, end: 11 },
      created: 1,
    };
    await call(page, 'init', {
      markdown: 'Water boils at 100 degrees.',
      editable: false,
      toolbar: 'none',
      highlights: { items: [saved] },
    });
    await expect
      .poll(async () =>
        ((await call(page, 'getHighlights')).value as { id: string }[]).map((h) => h.id),
      )
      .toEqual(['h1']);
    expect(
      await page.evaluate(() =>
        (CSS as unknown as { highlights: Map<string, unknown> }).highlights.has('ax-hl-pink'),
      ),
    ).toBe(true);
    await call(page, 'setHighlights', { items: [] });
    expect((await call(page, 'getHighlights')).value).toEqual([]);
  });

  test('marked books: marks, data, pages and taps through the bridge', async ({ page }) => {
    await openEngine(page);
    const types = [
      { id: 'important', label: 'Important', color: '#16a34a', style: 'fill' },
      { id: 'pyq', label: 'Past exam', color: '#b45309', style: 'box' },
    ];
    const ready = await call(page, 'init', {
      markdown: 'Plants make food by photosynthesis.',
      toolbar: 'none',
      marks: { types },
    });
    expect((ready.value as { marks: boolean }).marks).toBe(true);

    // Select "photosynthesis" and mark it.
    await call(page, 'focus');
    await page.evaluate(() => {
      const text = document.querySelector('.ProseMirror p')?.firstChild as Text;
      const i = text.data.indexOf('photosynthesis');
      const range = document.createRange();
      range.setStart(text, i);
      range.setEnd(text, i + 'photosynthesis'.length);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
    await page.waitForTimeout(50);
    const set = await call(page, 'setMark', { type: 'important', data: { questionIds: ['q1'] } });
    expect(typeof set.value).toBe('string');
    const id = set.value as string;
    await call(page, 'setMarkBadge', { id, badge: '1' });
    await call(page, 'insertPage', { number: 23 });
    const marks = (await call(page, 'getMarks')).value as Record<string, unknown>[];
    expect(marks[0]).toMatchObject({
      id,
      type: 'important',
      text: 'photosynthesis',
      data: { questionIds: ['q1'] },
      badge: '1',
      page: 23,
    });
    expect((await call(page, 'getPages')).value).toEqual([{ number: 23, index: 0 }]);

    // Read-only: a tap sends markTap.
    await call(page, 'setEditable', { editable: false });
    await page.locator('mark.ax-mark').click();
    await expect.poll(async () => (await events(page, 'markTap')).length).toBe(1);
    expect((await events(page, 'markTap'))[0]?.data).toMatchObject({
      id,
      type: 'important',
      page: 23,
    });
  });

  test('long chapters: equations render near the screen; reported height also shrinks', async ({
    page,
  }) => {
    await openEngine(page);
    const blocks = Array.from({ length: 300 }, (_, i) =>
      i % 3 === 0 ? `Equation ${i}: $x^${i % 9} + y_${i}$` : `Paragraph ${i} of a long chapter.`,
    ).join('\n\n');
    await call(page, 'init', { markdown: blocks, toolbar: 'none', editable: false });
    await expect(page.locator('.axiomtext-content.ax-large')).toHaveCount(1);
    // Only equations near the screen are rendered; the rest wait.
    await expect.poll(() => page.locator('.ax-math .katex').count()).toBeGreaterThan(0);
    const pending = await page.locator('.ax-math.is-pending').count();
    expect(pending).toBeGreaterThan(20);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect.poll(() => page.locator('.ax-math.is-pending').count()).toBeLessThan(pending);
  });

  test('shrinkWrap: the reported height follows the content both ways', async ({ page }) => {
    await openEngine(page);
    await call(page, 'init', { markdown: 'Short.', toolbar: 'none', reportHeight: true });
    const heights = async (): Promise<number[]> =>
      (await events(page, 'height')).map((e) => Number(e.data?.['height']));
    await expect.poll(async () => (await heights()).length).toBeGreaterThan(0);
    const first = (await heights()).at(-1) ?? 0;
    await call(page, 'setMarkdown', {
      markdown: Array.from({ length: 40 }, (_, i) => `Line ${i}`).join('\n\n'),
    });
    await expect.poll(async () => (await heights()).at(-1) ?? 0).toBeGreaterThan(first + 300);
    await call(page, 'setMarkdown', { markdown: 'Short again.' });
    await expect.poll(async () => (await heights()).at(-1) ?? 0).toBeLessThan(first + 60);
  });

  test('PDF mode: teachers mark a PDF from Flutter, offline', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await openEngine(page);
    await call(page, 'init', { toolbar: 'none', editable: false });
    const bytes = makePdf([['Plants make food by photosynthesis.'], ['Second page.']]);
    const opened = await call(page, 'openPdf', {
      data: bytes.toString('base64'),
      mode: 'mark',
      markTypes: [{ id: 'important', label: 'Important', color: '#16a34a', style: 'fill' }],
    });
    expect(opened.ok).toBe(true);
    expect(opened.value).toEqual({ pageCount: 2 });
    await expect(page.locator('.ax-pdf__page.is-rendered').first()).toBeVisible();
    await page.evaluate(() => {
      const span = [
        ...document.querySelectorAll('.ax-pdf__page[data-page="1"] .textLayer span'),
      ].find((s) => s.textContent?.includes('photosynthesis'));
      const node = span?.firstChild as Text;
      const i = node.data.indexOf('photosynthesis');
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 'photosynthesis'.length);
      getSelection()?.removeAllRanges();
      getSelection()?.addRange(range);
    });
    await page.locator('.ax-pdf').dispatchEvent('pointerup');
    await page.getByRole('button', { name: 'Important' }).click();
    await expect.poll(async () => (await events(page, 'pdfChange')).length).toBe(1);
    const saved = ((await events(page, 'pdfChange'))[0]?.data?.['annotations'] ?? []) as Record<
      string,
      unknown
    >[];
    expect(saved[0]).toMatchObject({ kind: 'mark', type: 'important', page: 1 });
    expect(((await call(page, 'getPdfAnnotations')).value as unknown[]).length).toBe(1);
    // Nothing tried to use the network or eval (the engine's policy forbids both).
    expect(errors).toEqual([]);
  });
});
