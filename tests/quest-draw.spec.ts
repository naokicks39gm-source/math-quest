import { test, expect } from '@playwright/test';

test('quest handwriting auto-recognize updates answer field', async ({ page }) => {
  await page.goto('/quest');

  const autoDraw = page.getByTestId('auto-draw-test');
  await expect(autoDraw).toBeVisible();

  const answer = page.getByLabel('recognized-answer');
  await expect(answer).toBeVisible();

  // Random 4-digit patterns can occasionally fail; retry a few times for stability.
  let recognized = '';
  for (let i = 0; i < 5; i++) {
    await autoDraw.click();
    await page.waitForTimeout(1800);
    recognized = ((await answer.textContent()) ?? '').trim();
    if (recognized.length > 0) break;
  }
  expect(recognized.length).toBeGreaterThan(0);
});
