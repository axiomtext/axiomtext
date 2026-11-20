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
