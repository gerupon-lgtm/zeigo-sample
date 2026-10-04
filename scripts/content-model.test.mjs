import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const dataUrl = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpile(source, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext })).toString('base64');
const founding = dataUrl(await readFile(new URL('../src/founding.ts', import.meta.url), 'utf8'));
const features=dataUrl(await readFile(new URL('../src/site-features.ts',import.meta.url),'utf8'));
const source = (await readFile(new URL('../src/content-model.ts', import.meta.url), 'utf8')).replace("'./founding'", JSON.stringify(founding)).replace("'./site-features'",JSON.stringify(features));
const { validateContent, displayedNews, contentChanges, MAX_IMPORT_BYTES } = await import(dataUrl(source));
const {normalizeContent,prepareContent,publicationState,hasNew,badgeLabels,validCustomBadge,publishedContentChanged}=await import(features);
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

test('SITE BASE migration preserves legacy fields, gives three samples once and respects twenty',()=>{
 const old=structuredClone(original);old.menu.reverse();old.menu[0].price=777;old.news[0].body='編集した本文';old.photos.hero='/images/udon.png';
 const next=normalizeContent(old);assert.equal(next.news.length,3);assert.equal(next.menu[0].price,777);assert.equal(next.news[0].body,'編集した本文');assert.equal(next.photos.hero,old.photos.hero);
 assert.equal(next.menu[0].newEnabled,false);next.news=next.news.filter(n=>n.id!=='demo-news-photo');assert.equal(normalizeContent(next).news.length,2);
 old.news=Array.from({length:20},(_,i)=>({...article(i),label:i===0?'キャンペーン':'検証'}));const full=normalizeContent(old);assert.equal(full.news.length,20);assert.deepEqual(full.news[0].badges,['campaign']);full.news[0].badges=[];assert.deepEqual(normalizeContent(full).news[0].badges,[]);
 assert.equal(validateContent(full),true);
});
test('badges support multiple choices and a single six-character custom label',()=>{
 assert.equal(validCustomBadge('キャンペーン'),true);assert.equal(validCustomBadge('数量限定販売中'),false);assert.equal(validCustomBadge('は\u3099っじ'),true);
 const item={badges:['limited-quantity','ended'],customBadge:'予約限定',customBadgeEnabled:true};assert.deepEqual(badgeLabels(item),['数量限定','終了','予約限定']);
 for(const patch of [{badges:['unknown']},{badges:['ended','ended']},{customBadge:'数量限定販売中'},{customBadgeEnabled:true,customBadge:''},{newMode:'unknown'},{startAt:100,endAt:100}]){const c=normalizeContent(original);Object.assign(c.menu[0],patch);assert.equal(validateContent(c),false);}
});
test('publication boundaries, NEW origin and draft/hidden controls remain separate',()=>{
 const now=Date.UTC(2026,9,4),day=86400000;
 const before=normalizeContent(original),draft=structuredClone(before);const item=draft.menu[0];item.startAt=now+day;item.endAt=now+4*day;item.newEnabled=true;
 const next=prepareContent(before,draft,now),saved=next.menu[0];assert.equal(saved.newStartedAt,now+day);assert.equal(publicationState(saved,now),'公開待ち');assert.equal(hasNew(saved,now,14),false);assert.equal(hasNew(saved,now+day,14),true);assert.equal(publicationState(saved,now+4*day),'終了');
 const change=structuredClone(next);change.menu[0].price=999;assert.equal(prepareContent(next,change,now+2*day).menu[0].newStartedAt,saved.newStartedAt);
 change.menu[0].reapplyNew=true;assert.equal(prepareContent(next,change,now+2*day).menu[0].newStartedAt,now+2*day);
 assert.equal(hasNew({...saved,visible:false},now+day,14),false);assert.equal(hasNew({...saved,published:false},now+day,14),false);
 assert.equal(hasNew({...saved,newMode:'manual',endAt:null},now+100*day,14),true);
 const invalid=structuredClone(before);invalid.menu[0].endAt=now-1;assert.throws(()=>prepareContent(before,invalid,now),/終了日時/);
});
test('internal inquiry edits and unpublished drafts do not update the public timestamp',()=>{
 const c=normalizeContent(original);c.inquiries=[{id:'q1',name:'デモ',email:'sample@example.com',kind:'その他',body:'架空の相談',receivedAt:Date.now(),status:'未対応',memo:'',notification:'未送信（サンプル）'}];
 const next=structuredClone(c);next.inquiries[0].status='対応済み';next.inquiries[0].memo='確認済み';const prepared=prepareContent(c,next);
 assert.equal(publishedContentChanged(c,prepared),false);assert.equal(prepared.lastUpdated,c.lastUpdated);assert.equal(validateContent(prepared),true);
 next.menu.push({...next.menu[0],id:'draft',published:false,name:'下書き'});assert.equal(publishedContentChanged(c,prepareContent(c,next)),false);
 assert.ok(contentChanges(c,prepared).some(change=>change.label.includes('対応状況')));
});
