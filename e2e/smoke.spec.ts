import { expect, test } from '@playwright/test';

const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';

test.describe('playground smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('types text and updates JSON + HTML output', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'Document body' });
    await editor.click();
    await page.keyboard.type('Hello AxiomText');
    await expect(page.getByTestId('html')).toHaveText('<p>Hello AxiomText</p>');
    await expect(page.getByTestId('json')).toContainText('"version": 1');
  });

  test('bold via keyboard shortcut and toolbar', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'Document body' });
    await editor.click();
    await page.keyboard.press(`${modifier}+b`);
    await page.keyboard.type('bold');
    await expect(page.getByTestId('html')).toHaveText('<p><strong>bold</strong></p>');
  });

  test('heading and undo', async ({ page }) => {
    const editor = page.getByRole('textbox', { name: 'Document body' });
    await editor.click();
    await page.keyboard.type('Title');
    await page.getByRole('button', { name: 'H1' }).click();
    await expect(page.getByTestId('html')).toHaveText('<h1>Title</h1>');
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('html')).toHaveText('<p>Title</p>');
  });

  test('toolbar is keyboard reachable', async ({ page }) => {
    await expect(page.getByRole('toolbar', { name: 'Formatting' })).toBeVisible();
    await page.getByRole('button', { name: 'B' }).focus();
    await expect(page.getByRole('button', { name: 'B' })).toBeFocused();
  });
});
