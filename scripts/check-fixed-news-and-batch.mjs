// © 2026 SIKUMI LAB — Regression checks for fixed details and batched ordering.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ??= resolve('.cache/ms-playwright');
const {chromium,webkit}=await import('@playwright/test');
const engine=process.argv.includes('--webkit')?'webkit':'chromium';
const browser=await ({chromium,webkit}[engine]).launch();
const base=(process.env.CHECK_URL??'http://127.0.0.1:5174').replace(/\/+$/,'');
const key='zeigo-proposal-content-v1';
const original=JSON.parse(await readFile('src/content.json','utf8'));
const content=structuredClone(original);
content.news=[0,1,2].map(i=>({...original.news[0],id:`fixed-${i}`,title:`位置確認の記事${i+1}`,body:i===1?'長い本文です。\n'.repeat(200):`短い本文${i}`,image:i===2?original.photos.udon:'',visible:true}));
const errors=[];
try {
 const page=await browser.newPage({reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.evaluate(({key,content})=>localStorage.setItem(key,JSON.stringify(content)),{key,content});
 for(const design of ['shiro','ai','komorebi']) {
  for(const width of [701,768,1024,1440]) for(const height of [480,900]) {
   await page.setViewportSize({width,height});await page.goto(`${base}/?design=${design}`);
   let fixed;
   for(const i of [0,1,2]) {
    await page.locator(`[data-news-id="fixed-${i}"]`).click();
    const panel=page.locator('.news-detail');await panel.waitFor();
    const box=await panel.boundingBox(),header=await page.locator('.site-header').boundingBox();
    assert.ok(box.y>=header.y+header.height&&box.height>60,`${design}/${width}/${height}: below header`);
    assert.ok(box.x>=0&&box.x+box.width<=width+1&&box.y+box.height<=height-15, 'fits viewport');
    assert.ok(Math.abs(box.x+box.width/2-width/2)<=1,'centered horizontally');
    if(fixed) {assert.ok(Math.abs(box.x-fixed.x)<=1&&Math.abs(box.y-fixed.y)<=1,'same position across articles and content lengths');}
    fixed=box;
    if(i===1) {await panel.locator('.news-detail-content').evaluate(n=>n.scrollTop=100);assert.ok(Math.abs((await panel.boundingBox()).y-box.y)<=1,'body scrolling preserves position');}
    await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));
    assert.ok(await panel.isVisible(),'scrolling away from title keeps panel open');
    assert.ok(Math.abs((await panel.boundingBox()).y-box.y)<=1,'page scrolling preserves position');
    await panel.getByRole('button',{name:'閉じる',exact:true}).click();if(await panel.getByRole('button',{name:'反映せずに終了',exact:true}).count())await panel.getByRole('button',{name:'反映せずに終了',exact:true}).click();
   }
  }
  for(const width of [320,390,700]) {
   await page.setViewportSize({width,height:844});await page.goto(`${base}/?design=${design}`);await page.locator('[data-news-id="fixed-1"]').click();
   const panel=page.locator('.news-detail'),box=await panel.boundingBox();assert.ok(Math.abs(box.y+box.height-844)<=1,'mobile bottom panel');
   await page.keyboard.press('Escape');assert.equal(await panel.count(),0);
  }
 }
 await page.setViewportSize({width:1440,height:1800});await page.goto(base);
 await page.getByRole('button',{name:'編集デモを開く',exact:true}).click();
 const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
 const before=await stored(),ids=()=>page.locator('.menu-edit-card').evaluateAll(cards=>cards.map(c=>c.dataset.id));
 const initial=await ids();
 async function dragFirst() {
  const heading=page.locator('.menu-edit-card .edit-card-heading').first();await heading.scrollIntoViewIfNeeded();
  const from=await heading.boundingBox(),to=await page.locator('.menu-edit-card').nth(1).boundingBox();
  await page.mouse.move(from.x+25,from.y+15);await page.mouse.down();await page.locator('.drag-preview').waitFor();await page.mouse.move(to.x+25,to.y+to.height/2+30,{steps:8});await page.mouse.up();
  assert.equal(await page.locator('.change-review').count(),0,'no per-drag confirmation');assert.deepEqual(await stored(),before,'draft does not affect stored publication');
 }
 await dragFirst();await dragFirst();assert.deepEqual(await ids(),initial,'can continue dragging');
 await page.locator('.menu-edit-card').first().getByRole('button',{name:'下へ',exact:true}).click();
 await page.locator('.menu-edit-card[data-id="u1"]').getByLabel('かけうどんの価格',{exact:true}).fill('999');
 await page.locator('.menu-edit-card[data-id="u2"]').getByRole('button',{name:'非表示にする',exact:true}).click();
 assert.deepEqual(await stored(),before);
 const expected=await ids();await page.getByRole('button',{name:'変更を保存',exact:true}).click();
 assert.match(await page.locator('.change-list').innerText(),/表示順/);assert.match(await page.locator('.change-list').innerText(),/999/);
 await page.getByRole('button',{name:'編集へ戻る',exact:true}).click();assert.deepEqual(await ids(),expected);assert.deepEqual(await stored(),before);
 await page.getByRole('button',{name:'変更を保存',exact:true}).click();await page.getByRole('button',{name:'このブラウザに保存',exact:true}).click();
 const saved=await stored();assert.deepEqual(saved.menu.filter(i=>i.category==='うどん').map(i=>i.id),expected);assert.equal(saved.menu.find(i=>i.id==='u1').price,999);assert.equal(saved.menu.find(i=>i.id==='u2').visible,false);
 await page.getByRole('button',{name:'閉じる',exact:true}).click();if(await page.getByRole('button',{name:'反映せずに終了',exact:true}).count())await page.getByRole('button',{name:'反映せずに終了',exact:true}).click();await page.reload();await page.locator('.menu-list').waitFor();assert.equal(await page.locator('.menu-row').filter({hasText:'きつねうどん'}).count(),0);
 assert.deepEqual(errors,[]);console.log(`PASS ${engine}: fixed desktop detail across 3 articles/3 designs/4 widths/2 heights, scroll/mobile close, consecutive reorder and one final confirmation`);
} finally {await browser.close();}
