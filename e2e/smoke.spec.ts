import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

async function openEmpty(page: Page): Promise<void> {
  await page.goto('/?empty&panel');
  await page.getByRole('tab', { name: 'HTML' }).click();
}

const editorBox = (page: Page) => page.getByRole('textbox', { name: 'Document body' });

test.describe('editor', () => {
  test('types text and updates JSON + HTML output', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Hello AxiomText');
    await expect(page.getByTestId('html')).toHaveText('<p>Hello AxiomText</p>');
    await page.getByRole('tab', { name: 'JSON' }).click();
    await expect(page.getByTestId('json')).toContainText('"version": 1');
    await expect(page.locator('[data-stat="words"]')).toHaveText('2 words');
  });

  test('bold via shortcut updates the toolbar state', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.press(`${modifier}+b`);
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await page.keyboard.type('bold');
    await expect(page.getByTestId('html')).toHaveText('<p><strong>bold</strong></p>');
  });

  test('text style dropdown and undo', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Title');
    await page.getByRole('button', { name: 'Text style' }).click();
    await page.getByRole('option', { name: /Heading 1/ }).click();
    await expect(page.getByTestId('html')).toHaveText('<h1>Title</h1>');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('html')).toHaveText('<p>Title</p>');
  });
});

test.describe('keyboard accessibility', () => {
  test('Alt+F10 moves to the toolbar, arrows navigate, Escape returns', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.press('Alt+F10');
    const toolbar = page.getByRole('toolbar', { name: 'Formatting' });
    await expect(toolbar.locator(':focus')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Text style' })).toBeFocused();
    await page.keyboard.press('ArrowRight'); // Font
    await page.keyboard.press('ArrowRight'); // Font size
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('button', { name: 'Bold' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(editorBox(page)).toBeFocused();
  });

  test('dropdown works with the keyboard', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Keyboard');
    await page.getByRole('button', { name: 'Text style' }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('listbox', { name: 'Text style' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('html')).toHaveText('<h2>Keyboard</h2>');
  });
});

test('theme toggle switches to dark mode', async ({ page }) => {
  await page.goto('/');
  await page.emulateMedia({ colorScheme: 'light' });
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to (dark|light) mode/ }).click();
  await expect(html).not.toHaveAttribute('data-theme', before ?? '');
});

test.describe('M1 features', () => {
  test('markdown shortcuts create lists and quotes', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('- first');
    await page.keyboard.press('Enter');
    await page.keyboard.type('second');
    await expect(page.getByTestId('html')).toHaveText(
      '<ul><li><p>first</p></li><li><p>second</p></li></ul>',
    );
    await expect(page.getByRole('button', { name: 'Bulleted list' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('to-do checkbox can be ticked', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('[ ] ship M1');
    const box = page.getByRole('checkbox', { name: 'Done' });
    await box.click();
    await expect(box).toBeChecked();
    await expect(page.getByTestId('html')).toContainText('data-checked="true"');
  });

  test('Ctrl/Cmd+K adds a link and rejects javascript: URLs', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('AxiomText');
    await page.keyboard.press(`${modifier}+a`);
    await page.keyboard.press(`${modifier}+k`);
    const url = page.getByRole('textbox', { name: 'Link URL' });
    await url.fill('javascript:alert(1)');
    await page.keyboard.press('Enter');
    await expect(page.getByText("This link isn't allowed")).toBeVisible();
    await url.fill('axiomtext.dev');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('html')).toContainText('href="https://axiomtext.dev"');
  });

  test('typing $...$ creates an equation', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Area $\\pi r^2$ ');
    await expect(page.locator('.axiomtext-content .ax-math .katex').first()).toBeVisible();
    await expect(page.getByTestId('html')).toContainText('data-latex="\\pi r^2"');
  });

  test('click on part of an equation and edit it visually (no LaTeX)', async ({ page }) => {
    await page.goto('/?panel');
    await page.getByRole('tab', { name: 'HTML' }).click();
    const formula = page.locator('.ax-math--block').first();
    // Click on the "4" in √(b²−4ac): the caret must land right there.
    const four = formula.locator('.katex-html .mord', { hasText: /^4$/ }).first();
    const box = await four.boundingBox();
    if (!box) throw new Error('4 not found');
    await page.mouse.click(box.x + box.width * 0.75, box.y + box.height / 2);
    const field = page.locator('math-field');
    await expect(field).toBeVisible();
    await expect(page.getByRole('toolbar', { name: 'Equation tools' })).toBeVisible();
    await expect(field).toBeFocused();
    await page.keyboard.type('9');
    await expect
      .poll(() => field.evaluate((el) => (el as unknown as { value: string }).value))
      .toMatch(/49ac/);
    await page.keyboard.press('Enter');
    await expect(field).toHaveCount(0);
    await expect(page.getByTestId('html')).toContainText('49ac');
  });

  test('build an equation with visual templates', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.getByRole('button', { name: 'More' }).click();
    await page.getByRole('menuitemcheckbox', { name: /Block equation/ }).click();
    await expect(page.locator('math-field')).toBeFocused();
    await page.getByRole('button', { name: 'Fraction', exact: true }).click();
    await page.keyboard.type('1');
    await page.keyboard.press('Tab');
    await page.keyboard.type('2');
    await page.getByRole('button', { name: 'Done (Enter)' }).click();
    await expect(page.locator('.ax-math--block .katex-display')).toBeVisible();
    // MathLive writes the compact (valid) form \frac12 for single digits.
    await expect(page.getByTestId('html')).toContainText(/\\frac\{?1\}?\{?2\}?/);
  });

  test('advanced users can still edit LaTeX', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.getByRole('button', { name: 'Equation', exact: true }).click();
    await expect(page.locator('math-field')).toBeVisible();
    await page.getByRole('button', { name: 'Edit as LaTeX' }).click();
    const latex = page.getByRole('textbox', { name: 'LaTeX' });
    await latex.fill('a^2+b^2=c^2');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('html')).toContainText('data-latex="a^2+b^2=c^2"');
  });
});

test.describe('M1 batch 2', () => {
  test('insert a 3×2 table from the grid and add a row from the table bar', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.getByRole('button', { name: 'Insert table' }).click();
    await page.locator('.ax-table-grid__cell[data-r="2"][data-c="3"]').click();
    await expect(page.locator('.axiomtext-content table tr')).toHaveCount(2);
    await page.keyboard.type('Name');
    await page.keyboard.press('Tab');
    await page.keyboard.type('Score');
    await page
      .getByRole('toolbar', { name: 'Table' })
      .getByRole('button', { name: 'Insert row below' })
      .click();
    await expect(page.locator('.axiomtext-content table tr')).toHaveCount(3);
    await expect(page.getByTestId('html')).toContainText('<th');
  });

  test('upload an image, set alt text and alignment', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    const png = readFileSync(
      new URL('../apps/playground/public/sample-image.png', import.meta.url),
    );
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: 'pixel.png', mimeType: 'image/png', buffer: png });
    const img = page.locator('.axiomtext-content .ax-image img');
    await expect(img).toBeVisible();
    await img.click();
    const bar = page.getByRole('toolbar', { name: 'Image' });
    await bar.getByRole('button', { name: 'Wrap text, image right' }).click();
    await expect(page.locator('.axiomtext-content .ax-image')).toHaveAttribute(
      'data-wrap',
      'right',
    );
    await bar.getByRole('button', { name: 'Alternative text' }).click();
    await page.getByRole('textbox', { name: 'Alternative text' }).fill('A tiny pixel');
    await page.keyboard.press('Enter');
    await expect(img).toHaveAttribute('alt', 'A tiny pixel');
  });

  test('insert an image from a URL and reject unsafe ones', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    const url = page.getByRole('textbox', { name: 'Image URL' });
    await url.fill('javascript:alert(1)');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await expect(page.getByText("This image address isn't allowed")).toBeVisible();
    await url.fill('/sample-image.png');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await expect(page.locator('.axiomtext-content .ax-image img')).toHaveAttribute(
      'src',
      '/sample-image.png',
    );
  });

  test('font size, text color and alignment', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Styled text');
    await page.keyboard.press(`${modifier}+a`);
    await page.getByRole('button', { name: 'Font size' }).click();
    await page.getByRole('menuitemcheckbox', { name: '24' }).click();
    await page.keyboard.press(`${modifier}+a`);
    await page.getByRole('button', { name: 'Text color' }).click();
    await page.getByRole('button', { name: 'Blue' }).click();
    await page.getByRole('button', { name: 'Text alignment' }).click();
    await page.getByRole('menuitemcheckbox', { name: /Align center/ }).click();
    const html = page.getByTestId('html');
    await expect(html).toContainText('font-size: 24px;');
    // Browsers write colors as rgb() in HTML; the saved JSON keeps the hex value.
    await expect(html).toContainText(/color: (#2563eb|rgb\(37, 99, 235\));/);
    await expect(html).toContainText('text-align: center;');
  });

  test('type before and after an image on the same line, then wrap text around it', async ({
    page,
  }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Before ');
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    await page.getByRole('textbox', { name: 'Image URL' }).fill('/sample-image.png');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await page.keyboard.type(' after');
    const html = page.getByTestId('html');
    await expect(html).toContainText(
      /<p>Before <span class="ax-image" data-wrap="inline">.*<\/span> after<\/p>/,
    );
    await page.locator('.axiomtext-content .ax-image img').click();
    await page
      .getByRole('toolbar', { name: 'Image' })
      .getByRole('button', { name: 'Wrap text, image left' })
      .click();
    await expect(html).toContainText('data-wrap="left"');
    await page
      .getByRole('toolbar', { name: 'Image' })
      .getByRole('button', { name: 'Caption' })
      .click();
    await page.getByRole('textbox', { name: 'Caption' }).fill('Figure 1');
    await page.keyboard.press('Enter');
    await expect(html).toContainText('<span class="ax-image__caption">Figure 1</span>');
  });

  test('click an image and move it with the arrow keys; typing keeps the image', async ({
    page,
  }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('ab ');
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    await page.getByRole('textbox', { name: 'Image URL' }).fill('/sample-image.png');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await page.keyboard.type(' cd');
    const html = page.getByTestId('html');
    await page.locator('.axiomtext-content .ax-image img').click();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(html).toContainText(/<p>ab {2}c<span class="ax-image"/);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.type('!');
    await expect(html).toContainText(/<p>ab {2}<span class="ax-image".*<\/span>!cd<\/p>/);
  });

  test('text on both sides of a centered image, the same on a plain web page', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Left text ');
    await page.getByRole('button', { name: 'Image', exact: true }).click();
    await page.getByRole('textbox', { name: 'Image URL' }).fill('/sample-image.png');
    await page.getByRole('button', { name: 'Insert', exact: true }).click();
    await page.keyboard.type(' right text');
    await page.locator('.axiomtext-content .ax-image img').click();
    await page
      .getByRole('toolbar', { name: 'Image' })
      .getByRole('button', { name: 'Text on both sides' })
      .click();
    const columns = page.locator('.axiomtext-content .ax-columns .ax-column');
    await expect(columns).toHaveCount(3);
    await columns.nth(0).click();
    await page.keyboard.press('End');
    await page.keyboard.type(' more');
    await expect(columns.nth(0)).toHaveText('Left text more');
    await expect(columns.nth(2)).toHaveText('right text');
    // Side by side: left column, image, right column on one row.
    const [a, b, c] = await Promise.all([0, 1, 2].map((i) => columns.nth(i).boundingBox()));
    expect(a && b && c && a.x < b.x && b.x < c.x && Math.abs(a.y - c.y) < 2).toBe(true);
    await expect(page.getByTestId('html')).toContainText(
      '<div class="ax-columns" data-layout="image-center"',
    );
  });
});
