import { expect, test } from '@playwright/test';

const pressButton = '[data-role="press"]';
const unlockedBears = '[data-bear][data-locked="false"]';
const result = '[data-role="result"]';

// Steps the game clock until the counter shows `value` and presses the button in the
// same script, so no animation frame can move the counter in between.
const stopOn = (page, value) => page.evaluate(([n, selector]) => {
  window.__thousandPaws.runTo(n);
  document.querySelector(selector).click();
}, [value, pressButton]);

test.beforeEach(async ({ page }) => {
  await page.goto('/?seed=7');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__thousandPaws);
});

test('stopping on exactly 1000 unlocks a bear that survives a reload', async ({ page }) => {
  await expect(page.locator(unlockedBears)).toHaveCount(0);
  await page.click(pressButton);
  await stopOn(page, 1000);
  await expect(page.locator(result)).toContainText('joins your shelf');
  await expect(page.locator(unlockedBears)).toHaveCount(1);

  await page.reload();
  await expect(page.locator(unlockedBears)).toHaveCount(1);
});

test('stopping on 997 is a miss that says how far off it was', async ({ page }) => {
  await page.click(pressButton);
  await stopOn(page, 997);
  await expect(page.locator(result)).toHaveText('997. 3 short.');
  await expect(page.locator(unlockedBears)).toHaveCount(0);
});

test('the red button on the cabinet and the Space key both work', async ({ page }) => {
  const spot = await page.evaluate(() => window.__thousandPaws.where());
  await page.mouse.click(spot.x, spot.y);
  expect(await page.evaluate(() => window.__thousandPaws.state().phase)).toBe('running');

  await page.evaluate(() => window.__thousandPaws.runTo(1002));
  await page.keyboard.press('Space');
  await expect(page.locator(result)).toContainText('over.');
});
