import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const editorBox = (page: Page) => page.getByRole('textbox', { name: 'Document body' });

/** Selects the first occurrence of `text` inside the editor. */
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
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
        return;
      }
    }
    throw new Error(`"${needle}" not found`);
  }, text);
}

test.describe('comments', () => {
  test('comment, reply, resolve and list threads', async ({ page }) => {
    await page.goto('/?empty');
    await editorBox(page).click();
    await page.keyboard.type('The quick brown fox jumps over the lazy dog.');
    await selectText(page, 'brown fox');

    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    const composer = page.getByRole('dialog', { name: 'Add a comment' });
    await expect(composer).toBeVisible();
    await composer.getByRole('button', { name: 'Highlight color' }).click();
    await composer.getByRole('radio', { name: 'Green' }).click();
    await composer.getByRole('textbox', { name: 'Comment' }).fill('Which fox?');
    await composer.getByRole('button', { name: 'Comment' }).click();

    const mark = page.locator('mark.ax-comment');
    await expect(mark).toHaveText('brown fox');
    await expect(mark).toHaveAttribute('data-color', 'green');

    // Click the highlight: the thread opens; reply.
    await mark.click();
    const thread = page.getByRole('dialog', { name: 'Comments' });
    await expect(thread.getByText('Which fox?')).toBeVisible();
    await expect(thread.getByText('You').first()).toBeVisible();
    await thread.getByRole('textbox', { name: 'Reply' }).fill('The quick one.');
    await thread.getByRole('button', { name: 'Reply' }).click();
    await expect(thread.getByText('The quick one.')).toBeVisible();

    // Edit my reply.
    await thread.getByRole('button', { name: 'Edit' }).nth(1).click();
    await thread.getByRole('textbox', { name: 'Edit comment' }).fill('The quick brown one.');
    await thread.getByRole('button', { name: 'Save' }).click();
    await expect(thread.getByText('The quick brown one.')).toBeVisible();
    await expect(thread.getByText('edited')).toBeVisible();

    // The thread is in the saved JSON and HTML.
    const html = await page.evaluate(() =>
      (window as unknown as { axiomEditor: { getHTML(): string } }).axiomEditor.getHTML(),
    );
    expect(html).toContain('data-comment-id=');
    expect(html).toContain('Which fox?');

    // Resolve: the highlight goes away; the panel lists it under Resolved.
    await thread.getByRole('button', { name: 'Resolve' }).click();
    await expect(mark).toHaveAttribute('data-resolved', 'true');
    await page.keyboard.press('Escape');
    const panelButton = page.getByRole('button', { name: 'Comments', exact: true });
    if (await panelButton.isVisible()) await panelButton.click();
    else {
      await page.getByRole('button', { name: 'More' }).click();
      await page.getByRole('menuitem', { name: 'Comments' }).click();
    }
    const panel = page.getByRole('complementary', { name: 'Comments' });
    await expect(panel.getByRole('tab', { name: 'Open (0)' })).toBeVisible();
    await panel.getByRole('tab', { name: 'Resolved (1)' }).click();
    await panel.getByRole('button', { name: /brown fox/ }).click();
    // Opening a resolved thread from the panel reopens it.
    await expect(mark).not.toHaveAttribute('data-resolved', 'true');
    await expect(panel.getByRole('tab', { name: 'Open (1)' })).toBeVisible();
    await page.screenshot({ path: 'test-results/comments.png' });
  });

  test('comment-only mode: the text cannot change, comments can', async ({ page }) => {
    await page.goto('/?comments=only');
    await selectText(page, 'AxiomText');
    await expect(page.getByRole('button', { name: 'Bold' })).toHaveCount(0);
    const before = await page.evaluate(() =>
      (window as unknown as { axiomEditor: { getText(): string } }).axiomEditor.getText(),
    );
    await page.keyboard.type('xyz');
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    await page.getByRole('textbox', { name: 'Comment' }).fill('Nice name');
    await page
      .getByRole('dialog', { name: 'Add a comment' })
      .getByRole('button', { name: 'Comment' })
      .click();
    await expect(page.locator('mark.ax-comment').first()).toBeVisible();
    const after = await page.evaluate(() =>
      (window as unknown as { axiomEditor: { getText(): string } }).axiomEditor.getText(),
    );
    expect(after).toBe(before);
  });

  test('any colour, and underline only when "Highlight background" is off', async ({ page }) => {
    await page.goto('/?empty');
    await editorBox(page).click();
    await page.keyboard.type('Pick any colour you like.');
    await selectText(page, 'any colour');
    await page.getByRole('button', { name: 'Comment', exact: true }).click();
    const composer = page.getByRole('dialog', { name: 'Add a comment' });
    await composer.getByRole('button', { name: 'Highlight color' }).click();
    // On by default.
    await expect(composer.getByRole('switch', { name: 'Highlight background' })).toBeChecked();
    await composer.getByRole('radio', { name: 'Custom color' }).click();
    await composer.getByRole('textbox', { name: 'Hex color' }).fill('#ff5722');
    await composer.getByText('Highlight background').click();
    await composer.getByRole('textbox', { name: 'Comment' }).fill('Orange-red underline');
    await composer.getByRole('button', { name: 'Comment' }).click();

    const mark = page.locator('mark.ax-comment');
    await expect(mark).toHaveAttribute('data-color', 'custom');
    await expect(mark).toHaveAttribute('data-color-value', '#ff5722');
    await expect(mark).toHaveAttribute('data-fill', 'false');
    expect(await mark.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
      'rgba(0, 0, 0, 0)',
    );
    expect(await mark.evaluate((el) => getComputedStyle(el).borderBottomColor)).toBe(
      'rgb(255, 87, 34)',
    );

    // Change it from the thread: a preset, background back on.
    await mark.click();
    const thread = page.getByRole('dialog', { name: 'Comments' });
    await thread.getByRole('button', { name: 'Highlight color' }).click();
    await thread.getByRole('radio', { name: 'Blue' }).click();
    await thread.getByText('Highlight background').click();
    await expect(mark).toHaveAttribute('data-color', 'blue');
    await expect(mark).not.toHaveAttribute('data-fill', 'false');
    await page.waitForTimeout(400); // let the animations finish
    await page.screenshot({ path: 'test-results/comment-colors.png' });
  });
});
