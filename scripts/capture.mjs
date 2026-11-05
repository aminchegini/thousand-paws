// Screenshots the frozen game in every cabinet finish, for pixel comparison.
//   node scripts/capture.mjs <output folder> [base URL]

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const [out, base = 'http://localhost:5183'] = process.argv.slice(2);
if (!out) throw new Error('Usage: capture.mjs <output folder> [base URL]');
const SKINS = ['candy', 'neon', 'diner', 'walnut'];
// Two bears unlocked, so both the locked and the unlocked look are in the picture.
const PROGRESS = JSON.stringify({ unlocked: ['bo', 'grand'], attempts: 3, wins: 2, closest: 3 });

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
for (const skin of SKINS) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await context.addInitScript(([s, p]) => {
    localStorage.setItem('thousandpaws-skin', s);
    localStorage.setItem('thousandpaws-progress', p);
  }, [skin, PROGRESS]);
  const page = await context.newPage();
  await page.goto(`${base}/?seed=7`);
  await page.waitForFunction(() => window.__thousandPaws);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(['64px VT323', '400 40px Bungee', '800 20px Nunito'].map((f) => document.fonts.load(f)));
    await new Promise((resolve) => setTimeout(resolve, 300));   // labels redraw once fonts arrive
    window.__thousandPaws.freeze();
  });
  await page.screenshot({ path: join(out, `${skin}.png`), animations: 'disabled', caret: 'hide' });
  await context.close();
}
await browser.close();
console.log(`Captured ${SKINS.length} finishes in ${out}`);
