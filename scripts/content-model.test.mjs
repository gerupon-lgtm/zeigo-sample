import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const dataUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })).toString('base64');
const founding = dataUrl(await readFile(new URL('../src/founding.ts', import.meta.url), 'utf8'));
const source = (await readFile(new URL('../src/content-model.ts', import.meta.url), 'utf8')).replace("'./founding'", JSON.stringify(founding));
const { validateContent, displayedNews, contentChanges, MAX_IMPORT_BYTES } = await import(dataUrl(source));
const original = JSON.parse(await readFile(new URL('../src/content.json', import.meta.url), 'utf8'));
const article = i => ({ id: `n${i}`, date: `2026-10-${String(i + 1).padStart(2, '0')}`, label: '検証', title: `記事${i}`, body: '検証用の本文', visible: true });

test('a full photo backup fits the JSON import size limit', () => {
  const c = structuredClone(original);
  const photo = 'data:image/jpeg;base64,' + 'A'.repeat(1398104);
  for (const key of Object.keys(c.photos)) c.photos[key] = photo;
  c.news = Array.from({ length: 20 }, (_, i) => ({ ...article(i), image: photo, body: '文'.repeat(5000) }));
  assert.equal(validateContent(c), true);
  assert.ok(Buffer.byteLength(JSON.stringify(c)) < MAX_IMPORT_BYTES);
});

test('old sample JSON remains readable without new fields', () => {
  const legacy = structuredClone(original); delete legacy.newsMaxItems; delete legacy.newsDisplayLimit;
  assert.equal(validateContent(legacy), true);
  assert.equal(displayedNews(legacy).length, 1);
});
test('20 stored articles including hidden; reject 21 and invalid display limits', () => {
  const c = structuredClone(original); c.news = Array.from({ length: 20 }, (_, i) => article(i)); c.news[0].visible = false;
  assert.equal(validateContent(c), true);
  assert.equal(displayedNews(c).length, 10);
  c.news.push(article(20)); assert.equal(validateContent(c), false);
  c.news.pop(); c.newsDisplayLimit = 11; assert.equal(validateContent(c), false);
  c.newsDisplayLimit = 10; c.newsMaxItems = 21; assert.equal(validateContent(c), false);
});
test('pickups consume the same ten slots, order by date, and hidden pickups never appear', () => {
  const c = structuredClone(original); c.news = Array.from({ length: 20 }, (_, i) => article(i));
  c.news[0].featured = true; c.news[1].featured = true; c.news[1].visible = false;
  const rows = displayedNews(c);
  assert.equal(rows.length, 10); assert.equal(new Set(rows.map(n => n.id)).size, 10);
  assert.equal(rows[0].id, 'n0'); assert.equal(rows[1].id, 'n19'); assert.ok(!rows.some(n => n.id === 'n1'));
  assert.equal(c.news[0].id, 'n0');
});
test('malformed data does not throw; reject duplicate IDs, invalid dates, flags and unsafe images', () => {
  for (const bad of [null, [], { schemaVersion: 1, shop: null }]) assert.equal(validateContent(bad), false);
  for (const patch of [{ date: '2026-02-30' }, { featured: 'yes' }, { visible: 1 }, { image: 'https://unknown.example/photo.jpg' }, { title: '' }]) {
    const c = structuredClone(original); Object.assign(c.news[0], patch); assert.equal(validateContent(c), false);
  }
  const c = structuredClone(original); c.news.push({ ...c.news[0] }); assert.equal(validateContent(c), false);
  c.news = [null]; assert.equal(validateContent(c), false);
  for (const patch of [{ price: -1 }, { price: 1.5 }, { name: '' }, { category: '不明なカテゴリ' }, { visible: 'false' }]) {
    const menu = structuredClone(original); Object.assign(menu.menu[0], patch); assert.equal(validateContent(menu), false);
  }
});
test('review records add, edit, hide, order, pictures and deletion', () => {
  const c = structuredClone(original);
  c.menu[0].name = '変更した品'; c.menu[0].price = 900; c.menu[0].visible = false;
  [c.menu[0], c.menu[1]] = [c.menu[1], c.menu[0]];
  c.news = [{ ...article(2), featured: true, image: '/images/udon.png' }];
  const changes = contentChanges(original, c);
  for (const name of ['品名', '価格', '掲載', '表示順', 'お知らせの追加', 'お知らせの削除']) assert.ok(changes.some(change => change.label.includes(name)));
  assert.equal(changes.find(change => change.label === 'お知らせの追加').afterImage, '/images/udon.png');
  assert.deepEqual(contentChanges(original, original), []);
});
