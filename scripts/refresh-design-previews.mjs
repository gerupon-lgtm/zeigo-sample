// © 2026 SIKUMI LAB — Refresh selection thumbnails from the current sample.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const version = (await readFile(new URL('../src/version.ts', import.meta.url), 'utf8')).match(/SAMPLE_VERSION = '([^']+)'/)[1];
const base = (process.env.CHECK_URL ?? 'http://127.0.0.1:5174').replace(/\/+$/, '');
const output = new URL('../public/images/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  for (const design of ['shiro', 'ai', 'komorebi']) {
    // Fresh storage keeps someone's edited sample out of the comparison images.
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    try {
      const page = await context.newPage();
      await page.goto(`${base}/?design=${design}`);
      await page.locator(`.theme-${design} .hero img`).first().waitFor();
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, image => {
          image.loading = 'eager';
          return image.decode();
        }));
      });
      assert.ok((await page.locator('body').innerText()).includes(version), 'Capture the current sample version');
      assert.equal(await page.locator('dialog[open]').count(), 0);
      assert.equal(await page.evaluate(() => scrollY), 0);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: resolve('public/images', `preview-${design}.jpg`), type: 'jpeg', quality: 85 });
      console.log(`Updated ${design} comparison image from ${version}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
