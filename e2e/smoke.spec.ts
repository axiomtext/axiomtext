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
    await page.getByRole('button', { name: 'Block equation' }).click();
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
