import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await mkdir('docs/previews', { recursive: true });
const base = (process.env.CHECK_URL ?? 'http://127.0.0.1:5173').replace(/\/+$/, '');
try {
  for (const design of ['shiro', 'ai', 'komorebi']) {
    await page.goto(`${base}/?design=${design}`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.hero img').first().waitFor();
    await page.evaluate(() => { for (const img of document.images) img.loading = 'eager'; return Promise.all(Array.from(document.images).map(img => img.decode().catch(() => {}))); });
    assert.equal(await page.locator('img').evaluateAll(images => images.filter(img => !img.complete || img.naturalWidth === 0).length), 0, `${design}: image loading`);
    assert.equal(await page.locator('h1').count(), 1);
    assert.match(await page.locator('.founding-note').innerText(), /昭和54年（1979年）創業。\s*鈴鹿の地で、今年で\d+年。/);
    assert.equal(await page.locator(`.theme-${design}`).count(), 1);
    assert.equal(await page.locator('.menu-row').count(), 6);
    await page.screenshot({ path: `public/images/preview-${design}.jpg`, type: 'jpeg', quality: 85 });
    await page.screenshot({ path: `docs/previews/${design}-desktop.png`, fullPage: true });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: width < 680 ? 844 : 1050 });
      const metrics = await page.evaluate(() => ({ view: innerWidth, body: document.documentElement.scrollWidth }));
      assert.ok(metrics.body <= metrics.view, `${design}: horizontal overflow at ${width}: ${metrics.body}`);
      const bodySize = await page.locator('.about-body').evaluate(node => parseFloat(getComputedStyle(node).fontSize));
      const menuSize = await page.locator('.menu-row').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize));
      assert.ok(bodySize >= 16 && menuSize >= 16, `${design}: readable body and menu text at ${width}`);
      if (width > 900) {
        await page.evaluate(() => scrollTo(0, 1200));
        const header = await page.locator('.site-header').boundingBox();
        const toolbar = await page.locator('.proposal-bar').boundingBox();
        assert.ok(Math.abs(header.y - (toolbar.y + toolbar.height)) < 2, `${design}: desktop header remains visible at ${width}`);
        for (const id of ['about', 'menu', 'news', 'access']) {
          await page.locator(`.desktop-nav a[href="#${id}"]`).click();
          const target = await page.locator(`#${id}`).boundingBox();
          const fixedHeader = await page.locator('.site-header').boundingBox();
          assert.ok(target.y >= fixedHeader.y + fixedHeader.height, `${design}: ${id} is not hidden behind the header at ${width}`);
        }
      } else {
        for (const top of [1200, Number.MAX_SAFE_INTEGER]) {
          await page.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), top);
          const header = await page.locator('.site-header').boundingBox();
          const toolbar = await page.locator('.proposal-bar').boundingBox();
          const menuButton = await page.locator('.mobile-menu-button').boundingBox();
          assert.ok(Math.abs(header.y - (toolbar.y + toolbar.height)) < 2, `${design}: mobile header remains visible after scrolling at ${width}`);
          assert.ok(menuButton.y >= 0 && menuButton.y + menuButton.height <= page.viewportSize().height, `${design}: hamburger remains in the viewport at ${width}`);
          await page.getByRole('button', { name: 'メニューを開く', exact: true }).click();
          await page.locator('.mobile-nav').waitFor({ state: 'visible' });
          await page.getByRole('button', { name: 'メニューを閉じる', exact: true }).click();
        }
        for (const id of ['about', 'menu', 'news', 'access']) {
          await page.getByRole('button', { name: 'メニューを開く', exact: true }).click();
          await page.locator(`.mobile-nav a[href="#${id}"]`).click();
          assert.equal(await page.locator('.mobile-nav').count(), 0);
          const target = await page.locator(`#${id}`).boundingBox();
          const header = await page.locator('.site-header').boundingBox();
          assert.ok(target.y >= header.y + header.height - 1, `${design}: ${id} is not hidden behind the mobile header at ${width}`);
        }
      }
      const links = await page.locator('a[href^="tel:"]').count();
      assert.ok(links > 0);
      await page.evaluate(() => scrollTo(0, 0));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: `docs/previews/${design}-mobile.png`, fullPage: true });
    await page.evaluate(() => scrollTo({ top: 1200, behavior: 'instant' }));
    await page.screenshot({ path: `docs/previews/${design}-mobile-scrolled.png` });
    await page.getByRole('button', { name: 'メニューを開く', exact: true }).click();
    await page.locator('.mobile-nav').getByRole('link', { name: 'お品書き' }).click();
    assert.equal(await page.locator('.mobile-nav').count(), 0);
    assert.equal(new URL(page.url()).hash, '#menu');
    await page.getByRole('button', { name: 'そば', exact: true }).click();
    assert.ok(await page.locator('.menu-rows').innerText().then(text => text.includes('天ざるそば') && text.includes('¥1,300')));
    await page.getByRole('button', { name: '会席', exact: true }).click();
    assert.equal(await page.locator('.menu-row').count(), 2);
    await page.getByRole('button', { name: 'お品書き原本を見る' }).click();
    await page.locator('dialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.menu-sheet-grid a').count(), 6);
    await page.getByRole('button', { name: '閉じる', exact: true }).click();
    await page.getByRole('button', { name: '安心してご利用いただくために', exact: false }).click();
    assert.ok(await page.locator('.article-body').innerText().then(text => text.includes('スタッフ')));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('dialog').count(), 0);
    await page.setViewportSize({ width: 1440, height: 1050 });
    for (const viewport of [{ width: 844, height: 390 }, { width: 390, height: 320 }]) {
      await page.setViewportSize(viewport);
      await page.evaluate(() => scrollTo({ top: 1200, behavior: 'instant' }));
      await page.getByRole('button', { name: 'メニューを開く', exact: true }).click();
      const navigation = page.locator('.mobile-nav');
      const bounds = await navigation.boundingBox();
      const bottomBar = page.locator('.mobile-bottom');
      const bottomBounds = await bottomBar.isVisible() ? await bottomBar.boundingBox() : null;
      assert.ok(bounds.y + bounds.height <= (bottomBounds?.y ?? viewport.height) + 1, `${design}: open menu fits above the bottom controls at ${viewport.width}x${viewport.height}`);
      await navigation.evaluate(node => { node.scrollTop = node.scrollHeight; });
      const phone = navigation.locator('a[href^="tel:"]');
      const phoneBounds = await phone.boundingBox();
      assert.ok(phoneBounds.y >= bounds.y && phoneBounds.y + phoneBounds.height <= bounds.y + bounds.height + 1, `${design}: final menu item remains accessible in a short viewport`);
      await page.getByRole('button', { name: 'メニューを閉じる', exact: true }).click();
    }
    await page.setViewportSize({ width: 1440, height: 1050 });
    console.log(`PASS ${design}: 5 responsive widths, readable text, fixed desktop/mobile headers, section jumps, short-screen menus, categories, menu sheets, news.`);
  }
  await page.goto(`${base}/`);
  await page.getByRole('button', { name: '3案を比較する', exact: true }).click();
  assert.equal(await page.locator('.compare-card').count(), 3);
  await page.evaluate(() => Promise.all(Array.from(document.querySelectorAll('dialog img')).map(img => img.decode().catch(() => {}))));
  await page.screenshot({ path: 'docs/previews/comparison.png' });
  await page.getByRole('button', { name: 'B案を開く' }).click();
  assert.equal(new URL(page.url()).searchParams.get('design'), 'ai');
  await page.goBack();
  assert.equal(await page.locator('.theme-shiro').count(), 1);
  await page.getByRole('button', { name: '写真・価格の編集デモを開く', exact: true }).click();
  await page.screenshot({ path: 'docs/previews/editor.png' });
  await page.getByRole('spinbutton', { name: 'かけうどんの価格', exact: true }).fill('700');
  await page.getByRole('button', { name: '変更を保存', exact: true }).click();
  await page.getByRole('status').filter({ hasText: '保存し' }).waitFor();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  assert.ok(await page.locator('.menu-rows').innerText().then(text => text.includes('¥700')));
  await page.reload();
  assert.ok(await page.locator('.menu-rows').innerText().then(text => text.includes('¥700')));
  await page.getByRole('button', { name: 'B 藍と余韻', exact: true }).click();
  assert.ok(await page.locator('.menu-rows').innerText().then(text => text.includes('¥700')));
  await page.getByRole('button', { name: '写真・価格の編集デモを開く', exact: true }).click();
  // A tiny valid image verifies actual FileReader upload and persisted photo state.
  const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1l8AAAAASUVORK5CYII=', 'base64');
  await page.locator('.photo-edit input[type=file]').first().setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: tinyPng });
  await page.getByRole('status').filter({ hasText: '写真を読み込みました' }).waitFor();
  await page.getByRole('button', { name: '変更を保存', exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('zeigo-proposal-content-v1')));
  assert.ok(saved.photos.hero.startsWith('data:image/png;base64,'));
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSONを書き出す' }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), 'zeigo-content.json');
  await page.locator('input[accept="application/json,.json"]').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"invalid":true}') });
  await page.getByRole('status').filter({ hasText: '読み込めるJSONではありません' }).waitFor();
  await page.getByRole('button', { name: '初期内容に戻す', exact: true }).first().click();
  await page.locator('.reset-confirm').getByRole('button', { name: '初期内容に戻す', exact: true }).click();
  await page.getByRole('button', { name: '閉じる', exact: true }).click();
  assert.ok(await page.locator('.menu-rows').innerText().then(text => text.includes('¥640')));
  await page.evaluate(() => localStorage.clear());
  assert.deepEqual(errors, [], 'Browser console errors');
  console.log('PASS shared editing: price save, reload persistence, cross-design sync, photo upload, JSON export, invalid import, reset; zero browser errors.');
} finally { await browser.close(); }
