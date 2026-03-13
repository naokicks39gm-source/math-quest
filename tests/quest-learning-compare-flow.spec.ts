import { test, expect, type Page } from '@playwright/test';

const getComparePair = async (page: Page) => {
  await page.waitForFunction(() => /(\d+)\s*と\s*(\d+)\s*どちらが小さい？/u.test(document.body.innerText));
  const text = await page.locator('body').innerText();
  const match = text.match(/(\d+)\s*と\s*(\d+)\s*どちらが小さい？/u);
  if (!match) {
    throw new Error('compare prompt not found');
  }
  return { a: Number(match[1]), b: Number(match[2]) };
};

const clickDigits = async (page: Page, value: number) => {
  for (const digit of String(value)) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
};

const judge = async (page: Page) => {
  const judgeButton =
    page.getByRole('button', { name: 'はんてい', exact: true }).or(
      page.getByRole('button', { name: '判定', exact: true })
    );
  await judgeButton.click();
};

test('compare learning flow shows numeric compare prompt, hint/explanation, clear history, and retry', async ({ page }) => {
  await page.goto(`/quest?skillId=E1_NUMBER_COMPARE&retry=${Date.now()}`);

  const firstPair = await getComparePair(page);
  await expect(page.getByText(`${firstPair.a} と ${firstPair.b}`, { exact: true })).toBeVisible();
  await expect(page.getByText('どちらが小さい？', { exact: true })).toBeVisible();

  await clickDigits(page, Math.max(firstPair.a, firstPair.b));
  await judge(page);
  await expect(page.getByText('ヒント', { exact: true })).toBeVisible();

  const secondPair = await getComparePair(page);
  await clickDigits(page, Math.max(secondPair.a, secondPair.b));
  await judge(page);
  await expect(page.getByText('つぎの もんだいへ', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'つぎの もんだいへ', exact: true }).click();

  for (let solved = 0; solved < 4; solved += 1) {
    const pair = await getComparePair(page);
    await clickDigits(page, Math.min(pair.a, pair.b));
    await judge(page);
    const cleared = await page.getByText('クリア！', { exact: true }).isVisible().catch(() => false);
    if (cleared) break;
    await page.waitForTimeout(500);
  }

  await expect(page.getByText('クリア！', { exact: true })).toBeVisible();
  await expect(page.getByText('せいかい：', { exact: false })).toBeVisible();
  await expect(page.getByText('×', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'もういちど', exact: true }).click();
  await page.waitForURL(/\/quest\?skillId=E1_NUMBER_COMPARE&retry=/);
  await expect(page.getByText('どちらが小さい？', { exact: true })).toBeVisible();
});
