import { test, expect } from '@playwright/test';

test('quest handwriting auto-recognize updates answer field', async ({ page }) => {
  await page.goto('/quest');

  const autoDraw = page.getByTestId('auto-draw-test');
  await expect(autoDraw).toBeVisible();
  await autoDraw.click();

  const answer = page.getByLabel('recognized-answer');
  await expect(answer).toBeVisible();

  // Auto judge delay is fixed at 1500ms. Give a little buffer.
  await expect(answer).not.toHaveText('', { timeout: 5000 });
});
