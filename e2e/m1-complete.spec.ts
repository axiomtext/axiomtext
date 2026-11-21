import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
const editorBox = (page: Page) => page.getByRole('textbox', { name: 'Document body' });

async function openEmpty(page: Page, extra = ''): Promise<void> {
  await page.goto(`/?empty&panel${extra}`);
  await page.getByRole('tab', { name: 'HTML' }).click();
}

/** Calls the editor API exposed by the playground (window.axiomEditor). */
const api = <T>(page: Page, fn: string): Promise<T> =>
  page.evaluate(`window.axiomEditor.${fn}`) as Promise<T>;

test.describe('M1 batch 3 — math input', () => {
  test('LaTeX autocomplete and AsciiMath input', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.getByRole('button', { name: 'Equation', exact: true }).click();
    await expect(page.locator('math-field')).toBeVisible();
    await page.getByRole('button', { name: 'Edit as LaTeX' }).click();
    const latex = page.getByRole('textbox', { name: 'LaTeX' });
    await latex.fill('');
    await latex.pressSequentially('\\fr');
    await expect(page.getByRole('option', { name: /\\frac/ })).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(latex).toHaveValue('\\frac{}{}');

    // Switch to AsciiMath: what you type is converted to LaTeX.
    await page.getByRole('radio', { name: 'AsciiMath' }).click();
    const ascii = page.getByRole('textbox', { name: 'AsciiMath' });
    await ascii.fill('sqrt(a+b)/2');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('html')).toContainText('\\sqrt{a+b}');
  });

  test('typing \\(x\\) makes an equation; pasting $…$ text and MathML too', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Area \\(\\pi r^2\\) ');
    await expect(page.getByTestId('html')).toContainText('data-latex="\\pi r^2"');
    await api(page, `insertText('then $E=mc^2$')`);
    await expect(page.getByTestId('html')).toContainText('data-latex="E=mc^2"');
    await api(
      page,
      `insertHTML('<p><math><semantics><mi>y</mi><annotation encoding="application/x-tex">y^3</annotation></semantics></math></p>')`,
    );
    await expect(page.getByTestId('html')).toContainText('data-latex="y^3"');
  });
});

test.describe('pasting maths written with delimiters', () => {
  /** Pastes like the browser does when copying from ChatGPT: HTML plus plain text. */
  const pasteRich = (page: Page, html: string, text: string) =>
    page.evaluate(
      ([h, t]) => {
        const data = new DataTransfer();
        data.setData('text/html', h);
        data.setData('text/plain', t);
        document
          .querySelector('.ProseMirror')
          ?.dispatchEvent(
            new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
          );
      },
      [html, text],
    );

  test('\\(…\\) and \\[…\\] inside pasted HTML become equations; code is left alone', async ({
    page,
  }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await pasteRich(
      page,
      '<p>Einstein wrote \\(E = mc^2\\) in 1905.</p><p>\\[\\int_0^1 x\\,dx = \\tfrac12\\]</p><p>Keep <code>\\(x\\)</code> as code.</p>',
      'Einstein wrote \\(E = mc^2\\) in 1905.',
    );
    const json = await api<{
      doc: {
        content: {
          type: string;
          content?: { type: string; attrs?: { latex: string }; text?: string; marks?: unknown[] }[];
          attrs?: { latex: string };
        }[];
      };
    }>(page, 'getJSON()');
    const [first, second, third] = json.doc.content;
    expect(first?.content?.map((n) => n.type)).toEqual(['text', 'math_inline', 'text']);
    expect(first?.content?.[1]?.attrs?.latex).toBe('E = mc^2');
    expect(second?.type).toBe('math_block');
    expect(second?.attrs?.latex).toBe('\\int_0^1 x\\,dx = \\tfrac12');
    expect(third?.content?.some((n) => n.text === '\\(x\\)' && n.marks)).toBe(true);
    await expect(page.locator('.ax-math .katex').first()).toBeVisible();
  });
});

test.describe('M1 batch 4 — everyday editing', () => {
  test('keyboard shortcuts dialog: Ctrl/⌘ + / and the More menu', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.press(`${modifier}+/`);
    const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Block equation').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(editorBox(page)).toBeFocused();
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitem', { name: /Keyboard shortcuts/ }).click();
    await expect(dialog).toBeVisible();
  });

  test('Markdown output in the developer panel', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('# Title');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Some **bold** text');
    await page.getByRole('tab', { name: 'Markdown' }).click();
    await expect(page.getByTestId('markdown')).toHaveText('# Title\n\nSome **bold** text\n');
  });

  test('autosave keeps a draft between visits', async ({ page }) => {
    await page.goto('/?empty&autosave');
    await editorBox(page).click();
    await page.keyboard.type('Draft that survives a reload');
    await expect(page.locator('[data-stat="save"]')).toHaveText('Saved', { timeout: 5000 });
    await page.reload();
    await expect(editorBox(page)).toContainText('Draft that survives a reload');
  });

  test('Arabic UI is right-to-left, equations stay left-to-right', async ({ page }) => {
    await page.goto('/?lang=ar');
    await expect(page.locator('.ax-editor')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('button', { name: 'غامق' })).toBeVisible(); // Bold
    const direction = await page
      .locator('.ax-math .katex')
      .first()
      .evaluate((el) => getComputedStyle(el).direction);
    expect(direction).toBe('ltr');
  });

  test('Bangla UI and word count', async ({ page }) => {
    await page.goto('/?lang=bn&empty');
    await editorBox(page).click();
    await page.keyboard.type('আমি বাংলায় লিখি');
    await expect(page.locator('[data-stat="words"]')).toHaveText('3টি শব্দ');
  });

  test('balloon editor: formatting appears next to selected text', async ({ page }) => {
    await page.goto('/?mode=balloon&empty');
    await editorBox(page).click();
    await page.keyboard.type('Make this bold');
    const balloon = page.locator('.ax-floating-toolbar[data-kind="balloon"]');
    await expect(balloon).not.toHaveClass(/is-visible/);
    await page.keyboard.press('Shift+Home');
    await expect(balloon).toHaveClass(/is-visible/);
    await balloon.getByRole('button', { name: 'Bold' }).click();
    expect(await api<string>(page, 'getHTML()')).toBe('<p><strong>Make this bold</strong></p>');
    // "+" on an empty line inserts blocks.
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await page
      .locator('.ax-inserter-panel')
      .getByRole('button', { name: 'Horizontal line' })
      .click();
    expect(await api<string>(page, 'getHTML()')).toContain('<hr>');
  });

  test('inline editor: toolbar floats above the text while editing', async ({ page }) => {
    await page.goto('/?mode=inline');
    const bar = page.locator('.ax-floating-toolbar[data-kind="inline"]');
    await page.locator('h1').first().click(); // focus leaves the editor
    await expect(bar).not.toHaveClass(/is-visible/);
    await editorBox(page).locator('p').first().click();
    await expect(bar).toHaveClass(/is-visible/);
    const [barBox, editorRect] = await Promise.all([
      bar.boundingBox(),
      editorBox(page).boundingBox(),
    ]);
    expect(barBox && editorRect && barBox.y + barBox.height <= editorRect.y + 1).toBe(true);
  });
});

test.describe('quality gates', () => {
  test('accessibility: no WCAG 2.2 A/AA violations in the editor and dialogs', async ({ page }) => {
    // No fade-in animations, so contrast is measured on the final colors.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('.ax-math .katex').first()).toBeVisible();
    const scan = async (): Promise<string[]> =>
      (
        await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
          .include('.ax-editor')
          .include('.ax-shortcuts-backdrop')
          // KaTeX output is hidden from screen readers in favour of its MathML.
          .exclude('.katex-html')
          .analyze()
      ).violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`);
    expect(await scan()).toEqual([]);
    await editorBox(page).click();
    await page.keyboard.press(`${modifier}+/`);
    await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
    expect(await scan()).toEqual([]);
  });

  test('IME composition (Japanese, Bangla) commits text once', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'Uses the Chrome DevTools Protocol');
    await openEmpty(page);
    await editorBox(page).click();
    const cdp = await page.context().newCDPSession(page);
    const compose = async (steps: string[], commit: string): Promise<void> => {
      for (const text of steps)
        await cdp.send('Input.imeSetComposition', {
          text,
          selectionStart: text.length,
          selectionEnd: text.length,
        });
      await cdp.send('Input.insertText', { text: commit });
    };
    await compose(['n', 'に', 'にほ', 'にほん'], '日本');
    await page.keyboard.type(' ');
    await compose(['ক', 'কি'], 'কি');
    await expect(page.getByTestId('html')).toHaveText('<p>日本 কি</p>');
  });

  test('works on pages that enforce Trusted Types', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route(
      (url) => url.pathname === '/',
      async (route) => {
        const response = await route.fetch();
        const body = (await response.text()).replace(
          /(http-equiv="Content-Security-Policy"\s+content="[^"]*)"/,
          `$1; require-trusted-types-for 'script'; trusted-types axiomtext ProseMirrorClipboard"`,
        );
        await route.fulfill({ response, body });
      },
    );
    await page.goto('/?empty&panel');
    test.skip(
      !(await page.evaluate(() => 'trustedTypes' in window)),
      'This browser does not support Trusted Types',
    );
    await page.getByRole('tab', { name: 'HTML' }).click();
    await editorBox(page).click();
    await page.keyboard.type('Inline $x^2$ ');
    await expect(page.locator('.ax-math .katex')).toBeVisible();
    await api(page, `insertHTML('<p>pasted <b>bold</b></p>')`);
    // Visual editing needs MathLive (no Trusted Types support): LaTeX editing is used instead.
    await page.locator('.ax-math').first().click();
    await expect(page.getByRole('textbox', { name: 'LaTeX' })).toBeVisible();
    expect(errors).toEqual([]);
  });
});
