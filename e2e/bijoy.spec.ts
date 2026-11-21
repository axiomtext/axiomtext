/** Pasting Bijoy (SutonnyMJ) Bangla: converted to Unicode, with "Keep original". */
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

const editorBox = (page: Page) => page.getByRole('textbox', { name: 'Document body' });

async function paste(page: Page, data: Record<string, string>): Promise<void> {
  await page.evaluate((items) => {
    const dt = new DataTransfer();
    for (const [type, value] of Object.entries(items)) dt.setData(type, value);
    const target = document.querySelector('.ProseMirror') as HTMLElement;
    target.dispatchEvent(
      new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
    );
  }, data);
}

test('pasted Bijoy text becomes Unicode; Keep original pastes it as it was', async ({ page }) => {
  await page.goto('/?empty');
  await editorBox(page).click();
  await paste(page, { 'text/plain': 'Avgvi †mvbvi evsjv, Avwg †Zvgvq fvjevwm|' });
  await expect(editorBox(page)).toContainText('আমার সোনার বাংলা, আমি তোমায় ভালবাসি।');
  const notice = page.getByRole('status').filter({ hasText: 'Bijoy text converted to Unicode' });
  await expect(notice).toBeVisible();
  await page.screenshot({ path: 'test-results/bijoy-notice.png' });
  await notice.getByRole('button', { name: 'Keep original' }).click();
  await expect(editorBox(page)).toContainText('Avgvi †mvbvi evsjv');
  await expect(editorBox(page)).not.toContainText('আমার');
});

test('Word HTML: only the SutonnyMJ parts are converted', async ({ page }) => {
  await page.goto('/?empty');
  await editorBox(page).click();
  await paste(page, {
    'text/html':
      '<p><span style="font-family:SutonnyMJ">evsjv‡`k</span> <span style="font-family:Calibri">is in South Asia.</span></p>',
    'text/plain': 'evsjv‡`k is in South Asia.',
  });
  await expect(editorBox(page)).toContainText('বাংলাদেশ is in South Asia.');
});

test('English is never converted', async ({ page }) => {
  await page.goto('/?empty');
  await editorBox(page).click();
  await paste(page, { 'text/plain': 'The quick brown fox jumps over the lazy dog.' });
  await expect(editorBox(page)).toContainText('The quick brown fox jumps over the lazy dog.');
  await expect(page.getByText('Bijoy text converted to Unicode')).toHaveCount(0);
});
