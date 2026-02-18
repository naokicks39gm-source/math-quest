import { test, expect, type Page } from '@playwright/test';

const setMemoOcrOverride = async (page: Page, value: string) => {
  await page.evaluate((text) => {
    (window as Window & { __memoOcrOverride?: string }).__memoOcrOverride = text;
  }, value);
};

const getCurrentAnswer = async (page: Page) => {
  const prompts = await page.getByText(/^\d+[+-]\d+$/).allTextContents();
  const current = prompts[Math.floor(prompts.length / 2)] ?? prompts[0] ?? '';
  const match = current.match(/^(\d+)([+-])(\d+)$/);
  if (!match) return '0';
  const left = Number(match[1]);
  const op = match[2];
  const right = Number(match[3]);
  const answer = op === '+' ? left + right : left - right;
  return String(answer);
};

test('quest memo analyze button judges OK/要確認', async ({ page }) => {
  await page.goto('/quest');

  const analyzeButton = page.getByRole('button', { name: 'メモ解析' });
  await expect(analyzeButton).toBeVisible();

  const answer = await getCurrentAnswer(page);
  await setMemoOcrOverride(page, `12+8=${answer}`);
  await analyzeButton.click();
  await expect(page.getByText('計算メモ: OK')).toBeVisible();

  await setMemoOcrOverride(page, `12+8=${Number(answer) + 1}`);
  await analyzeButton.click();
  await expect(page.getByText('計算メモ: 要確認')).toBeVisible();
});
