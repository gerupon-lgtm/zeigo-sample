import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {readFile,mkdir} from 'node:fs/promises';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.cache/ms-playwright');
const {chromium,webkit}=await import('@playwright/test');
const engine=process.argv.includes('--webkit')?'webkit':'chromium';
const browser=await ({chromium,webkit}[engine]).launch({headless:true});
const base=process.env.CHECK_URL??'http://127.0.0.1:5173';
const key='zeigo-proposal-content-v1',clockKey='zeigo-proposal-clock-v1';
const original=JSON.parse(await readFile('src/content.json','utf8'));
const errors=[],posts=[];
const context=await browser.newContext({viewport:{width:1440,height:1050},timezoneId:'Asia/Tokyo',reducedMotion:'reduce'});
const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.method()==='POST')posts.push(r.url());});
const open=()=>page.getByRole('button',{name:'編集デモを開く',exact:true}).click();
const close=async()=>{await page.getByRole('button',{name:'閉じる',exact:true}).click();if(await page.getByRole('button',{name:'反映せずに終了',exact:true}).count())await page.getByRole('button',{name:'反映せずに終了',exact:true}).click();};
const tab=name=>page.getByRole('tab',{name,exact:true}).click();
const save=async()=>{await page.getByRole('button',{name:'変更を保存',exact:true}).click();await page.getByRole('button',{name:'このブラウザに保存',exact:true}).click();};
const stored=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
const datetime=time=>page.evaluate(time=>new Date(time-new Date(time).getTimezoneOffset()*60000).toISOString().slice(0,16),time);
async function settings(card){await card.locator('summary').click();}
const standard=['おすすめ','期間限定','キャンペーン','数量限定','売り切れ','受付停止','終了'];
try{
 await mkdir('.cache/site-base-integration',{recursive:true});
 await page.goto(base);await open();
 const card=page.locator('.menu-edit-card[data-id="u1"]');await settings(card);
 for(const label of standard)await card.getByLabel(label,{exact:true}).check();
 await card.getByLabel('自由入力を付ける',{exact:true}).check();
 await card.getByLabel('自由入力（全角6文字まで・1つ）',{exact:true}).fill('数量限定販売中');
 await page.getByRole('button',{name:'変更を保存',exact:true}).click();
 assert.equal(await page.locator('.change-review').count(),0);assert.match(await page.locator('.editor-status').innerText(),/6文字/);
 await card.getByLabel('自由入力（全角6文字まで・1つ）',{exact:true}).fill('数量限定販売');
 await card.getByLabel('NEWを付ける',{exact:true}).check();await card.getByLabel('NEWの消し方',{exact:true}).selectOption('manual');
 await save();const first=(await stored()).menu.find(i=>i.id==='u1'),firstNew=first.newStartedAt;assert.equal(first.badges.length,7);assert.equal(first.customBadge,'数量限定販売');await close();
 await open();await page.locator('.menu-edit-card[data-id="u1"]').getByRole('spinbutton').fill('880');await save();assert.equal((await stored()).menu.find(i=>i.id==='u1').newStartedAt,firstNew);await close();
 await open();await tab('お知らせ');const news=page.locator('.news-edit-card[data-id="n1"]');await settings(news);
 for(const label of standard)await news.getByLabel(label,{exact:true}).check();await news.getByLabel('自由入力を付ける',{exact:true}).check();await news.getByLabel('自由入力（全角6文字まで・1つ）',{exact:true}).fill('<割引>');
 await news.getByLabel('NEWを付ける',{exact:true}).check();await news.getByLabel('NEWの消し方',{exact:true}).selectOption('manual');await news.getByLabel('本文',{exact:true}).fill('お知らせ本文の表示確認です。\n'.repeat(150));await save();await close();
 for(const design of ['shiro','ai','komorebi']){
  await page.goto(`${base}/?design=${design}`);await page.locator('.menu-list').waitFor();
  for(const width of [1440,768,390,320]){
   await page.setViewportSize({width,height:900});
   assert.equal(await page.locator('.menu-row').filter({hasText:'かけうどん'}).locator('.content-badge').count(),9);
   const trigger=page.locator('[data-news-id="n1"]');assert.equal(await trigger.locator('.content-badge').count(),9);
   assert.equal(await trigger.locator('img,p,time').count(),0);await trigger.click();const panel=page.locator('.news-detail');assert.equal(await panel.isVisible(),true);
   assert.match(await panel.innerText(),/<割引>/);assert.equal(await panel.locator('割引').count(),0);
   const box=await panel.boundingBox();assert.ok(box.x>=-1&&box.x+box.width<=width+1&&box.y>=0&&box.y+box.height<=901,`${design}/${width} tooltip viewport`);
   assert.ok(await panel.locator('.news-detail-content').evaluate(n=>n.scrollHeight>n.clientHeight));if(width<=700)assert.ok(Math.abs(box.y+box.height-900)<=1);
   await close();assert.equal(await trigger.getAttribute('aria-expanded'),'false');await trigger.click();await page.keyboard.press('Escape');assert.equal(await panel.count(),0);
   await trigger.click();await page.mouse.click(width-5,5);assert.equal(await panel.count(),0);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${design}/${width} public overflow`);
   await open();await settings(page.locator('.menu-edit-card[data-id="u1"]'));assert.ok(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth),`${design}/${width} editor overflow`);await tab('お問い合わせ');assert.ok(await page.locator('dialog').evaluate(el=>el.scrollWidth<=el.clientWidth));await close();
  }
 }
 // Reservation/end are independent of the literal '終了' badge and article date.
 await page.setViewportSize({width:1440,height:1050});await open();const schedule=page.locator('.menu-edit-card[data-id="u1"]');await settings(schedule);
 const future=Date.now()+7*86400000,end=future+2*86400000;
 await schedule.getByLabel('公開日時（空欄なら今すぐ）',{exact:true}).fill(await datetime(future));await schedule.getByLabel('終了日時（空欄なら終了なし）',{exact:true}).fill(await datetime(end));await save();await close();
 assert.equal(await page.locator('.menu-row').filter({hasText:'かけうどん'}).count(),0);
 await page.evaluate(({clockKey,time})=>localStorage.setItem(clockKey,String(time)),{clockKey,time:future+60000});await page.reload();await page.locator(".menu-list").waitFor();assert.equal(await page.locator('.menu-row').filter({hasText:'かけうどん'}).count(),1);
 await page.evaluate(({clockKey,time})=>localStorage.setItem(clockKey,String(time)),{clockKey,time:end+60000});await page.reload();await page.locator(".menu-list").waitFor();assert.equal(await page.locator('.menu-row').filter({hasText:'かけうどん'}).count(),0);
 await page.evaluate(clockKey=>localStorage.removeItem(clockKey),clockKey);await page.reload();await page.locator(".menu-list").waitFor();
 // Match the original site's email confirmation; never send an actual message.
 const beforeInquiry=await stored(),form=page.locator('.contact-form');await form.locator('[name=name]').fill('架空の問い合わせ');await form.locator('[name=email]').fill('sample@example.com');await form.locator('[name=email2]').fill('wrong@example.com');await form.locator('[name=body]').fill('架空の相談内容です。');await form.locator('[type=submit]').click();assert.match(await form.innerText(),/一致していません/);assert.equal((await stored()).inquiries.length,0);
 await form.locator('[name=email]').fill('sample@localhost');await form.locator('[name=email2]').fill('sample@localhost');await form.locator('[type=submit]').click();assert.match(await form.innerText(),/受信できるメール/);assert.equal((await stored()).inquiries.length,0);await form.locator('[name=email]').fill('sample@example.com');await form.locator('[name=email2]').fill('sample@example.com');await form.locator('[type=submit]').click();assert.equal((await stored()).inquiries.length,1);assert.equal((await stored()).lastUpdated,beforeInquiry.lastUpdated);
 await open();await tab('お問い合わせ');const inquiry=page.locator('.inquiry-card');await inquiry.getByLabel('対応状況',{exact:true}).selectOption('対応済み');await inquiry.getByLabel('内部メモ',{exact:true}).fill('確認しました');await save();assert.equal((await stored()).lastUpdated,beforeInquiry.lastUpdated);await close();await page.reload();await page.locator(".menu-list").waitFor();await open();await tab('お問い合わせ');assert.equal(await page.locator('.inquiry-card').getByLabel('対応状況').inputValue(),'対応済み');assert.equal(await page.locator('.inquiry-card').getByLabel('内部メモ').inputValue(),'確認しました');await close();assert.deepEqual(posts,[]);
 // Drag stages its order; only the final save opens a review.
 await page.setViewportSize({width:1440,height:1800});await open();const beforeDrag=(await stored()).menu.map(i=>i.id);
 const heading=page.locator('.menu-edit-card .edit-card-heading').first();await heading.scrollIntoViewIfNeeded();const origin=await heading.boundingBox(),target=await page.locator('.menu-edit-card').nth(1).boundingBox();
 await page.mouse.move(origin.x+30,origin.y+15);await page.mouse.down();await page.waitForTimeout(550);assert.equal(await page.locator('.drag-preview').count(),1);await page.mouse.move(target.x+30,target.y+target.height/2+30,{steps:8});await page.mouse.up();assert.equal(await page.locator('.change-review').count(),0);assert.deepEqual((await stored()).menu.map(i=>i.id),beforeDrag);assert.notDeepEqual(await page.locator('.menu-edit-card').evaluateAll(cards=>cards.map(c=>c.dataset.id)),beforeDrag.slice(0,6));await page.getByRole('button',{name:'変更を保存',exact:true}).click();await page.locator('.change-review').waitFor();assert.match(await page.locator('.change-list').innerText(),/表示順/);await close();assert.deepEqual((await stored()).menu.map(i=>i.id),beforeDrag);
 await open();await page.locator('.menu-edit-card').first().getByRole('button',{name:'下へ',exact:true}).click();await save();const reordered=await stored();assert.notDeepEqual(reordered.menu.map(i=>i.id),beforeDrag);assert.equal(reordered.menu.find(i=>i.id==='u1').newStartedAt,firstNew);await close();
 await page.getByRole('button',{name:'提案ヘッダを隠す'}).click();assert.equal(await page.locator('.proposal-bar').count(),0);await open();await close();await page.getByRole('button',{name:'提案ヘッダを表示'}).click();assert.equal(await page.locator('.proposal-bar').count(),1);
 // Old edited data, including a full news collection, retains its values.
 const legacy=structuredClone(original);legacy.menu.reverse();legacy.menu[0].price=777;legacy.photos.hero='/images/udon.png';legacy.news=Array.from({length:20},(_,i)=>({...original.news[0],id:`legacy-${i}`,title:`保持する記事${i}`,label:i===0?'キャンペーン':'お店から',visible:i!==19}));
 await page.evaluate(({key,legacy})=>localStorage.setItem(key,JSON.stringify(legacy)),{key,legacy});await page.reload();await page.locator(".menu-list").waitFor();await open();await tab('お知らせ');assert.equal(await page.locator('.news-edit-card').count(),20);await settings(page.locator('.news-edit-card').first());assert.equal(await page.locator('.news-edit-card').first().getByLabel('キャンペーン',{exact:true}).isChecked(),true);await page.locator('.news-edit-card').first().getByLabel('キャンペーン',{exact:true}).uncheck();await save();await close();await page.reload();await page.locator(".menu-list").waitFor();const migrated=await stored();assert.equal(migrated.menu[0].price,777);assert.equal(migrated.photos.hero,legacy.photos.hero);assert.equal(migrated.news.length,20);assert.deepEqual(migrated.news[0].badges,[]);assert.equal(migrated.news[19].visible,false);
 assert.deepEqual(errors,[]);console.log(`PASS ${engine}: 3 designs / 4 widths, shared badges/custom limit/NEW, scheduling, tooltip, inquiry confirmation/status/history/no mail, drag/cancel/arrows, hidden proposal bar, legacy migration`);
}finally{await browser.close();}
