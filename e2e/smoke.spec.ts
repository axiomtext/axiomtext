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

  test('typing $...$ creates an equation that can be edited', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.keyboard.type('Area $\\pi r^2$ ');
    const eq = page.locator('.axiomtext-content .ax-math').first();
    await expect(eq.locator('.katex')).toBeVisible();
    await eq.click();
    const latex = page.getByRole('textbox', { name: 'LaTeX' });
    await expect(latex).toHaveValue('\\pi r^2');
    await latex.fill('\\pi r^2 h');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('html')).toContainText('data-latex="\\pi r^2 h"');
  });

  test('toolbar inserts a block equation', async ({ page }) => {
    await openEmpty(page);
    await editorBox(page).click();
    await page.getByRole('button', { name: 'Block equation' }).click();
    const latex = page.getByRole('textbox', { name: 'LaTeX' });
    await latex.fill('\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}');
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('.ax-math--block .katex-display')).toBeVisible();
  });
});
