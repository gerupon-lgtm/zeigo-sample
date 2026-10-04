// © 2026 SIKUMI LAB — Regression for tall-card drop and guarded exits.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH??=resolve('.cache/ms-playwright');
const {chromium,webkit}=await import('@playwright/test');const engine=process.argv.includes('--webkit')?'webkit':'chromium';
const browser=await ({chromium,webkit}[engine]).launch();const base=process.env.CHECK_URL??'http://127.0.0.1:5174',key='zeigo-proposal-content-v1',errors=[];
try{
 for(const width of [1440,390,320]){
  const ctx=await browser.newContext({viewport:{width,height:width>700?1200:844},isMobile:width<700,hasTouch:width<700,reducedMotion:'reduce'}),p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await p.getByRole('button',{name:'編集デモを開く'}).click();
  const rows=()=>p.locator('.edit-cards .menu-edit-card'),ids=()=>rows().evaluateAll(a=>a.map(n=>n.dataset.id)),before=await ids();
  const cdp=width<700&&engine==='chromium'?await ctx.newCDPSession(p):null;let target;
  async function touch(type,x,y){if(cdp)return cdp.send('Input.dispatchTouchEvent',{type,touchPoints:['touchEnd','touchCancel'].includes(type)?[]:[{x,y,id:1}]});await p.evaluate(({type,x,y})=>{const node=window.touchStartNode??document.elementFromPoint(x,y);if(type==='touchStart')window.touchStartNode=node;const t={identifier:1,target:node,clientX:x,clientY:y},end=['touchEnd','touchCancel'].includes(type),e=new Event(type.toLowerCase(),{bubbles:true,cancelable:true});Object.entries({touches:end?[]:[t],targetTouches:end?[]:[t],changedTouches:[t]}).forEach(([k,v])=>Object.defineProperty(e,k,{value:v}));node.dispatchEvent(e);if(end)delete window.touchStartNode;},{type,x,y});}
  async function drag(from,to){await rows().nth(from).locator('h4').evaluate(h=>{const d=h.closest('.dialog-scroll');d.scrollTop+=h.getBoundingClientRect().top-(d.getBoundingClientRect().top+150);});const h=await rows().nth(from).locator('h4').boundingBox(),x=h.x+24,y=h.y+12;
   if(width>700){await p.mouse.move(x,y);await p.mouse.down();}else await touch('touchStart',x,y);
   await p.locator('.drag-preview').waitFor();await rows().nth(to).locator('h4').evaluate(h=>{const d=h.closest('.dialog-scroll');d.scrollTop+=h.getBoundingClientRect().top-(d.getBoundingClientRect().top+200);});const dest=await rows().nth(to).boundingBox(),dropY=dest.y+35;
   if(width>700)await p.mouse.move(x,dropY,{steps:10});else await touch('touchMove',x,dropY);
   assert.equal(await p.locator('[data-drop]').count(),1,'heading is a valid drop target');assert.notEqual(await p.locator('[data-drop]').evaluate(n=>getComputedStyle(n).boxShadow),'none','visible drop line');
   if(width>700)await p.mouse.up();else await touch('touchEnd',x,dropY);assert.equal(await p.locator('.drag-preview').count(),0);
  }
  await drag(0,1);assert.deepEqual(await ids(),[before[1],before[0],...before.slice(2)]);assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),null);
  await drag(1,0);assert.deepEqual(await ids(),before);
  await p.getByRole('button',{name:'閉じる',exact:true}).click();assert.equal(await p.locator('dialog[open]').count(),0,'reverted order has no pending change');
  await p.getByRole('button',{name:'編集デモを開く'}).click();await rows().first().locator('input[type=number]').fill('999');await p.keyboard.press('Escape');await p.getByRole('button',{name:'編集を続ける',exact:true}).click();assert.equal(await rows().first().locator('input[type=number]').inputValue(),'999');
  await p.getByRole('button',{name:'閉じる',exact:true}).click();await p.getByRole('button',{name:'反映する',exact:true}).click();await p.locator('.change-review').waitFor();assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),null);await p.getByRole('button',{name:'編集へ戻る',exact:true}).click();
  await p.getByRole('button',{name:'閉じる',exact:true}).click();await p.getByRole('button',{name:'反映せずに終了',exact:true}).click();await p.getByRole('button',{name:'編集デモを開く'}).click();assert.notEqual(await rows().first().locator('input[type=number]').inputValue(),'999');
  await drag(0,1);await p.getByRole('button',{name:'変更を保存',exact:true}).click();await p.getByRole('button',{name:'このブラウザに保存',exact:true}).click();await p.getByRole('button',{name:'閉じる',exact:true}).click();assert.equal(await p.locator('dialog[open]').count(),0);assert.deepEqual((await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key)).menu.filter(i=>i.category==='うどん').map(i=>i.id),[before[1],before[0],...before.slice(2)]);
  await p.getByRole('button',{name:'編集デモを開く'}).click();await rows().first().locator('input[type=number]').fill('123');let warnings=0;p.on('dialog',async d=>{assert.equal(d.type(),'beforeunload');warnings++;await d.accept();});await p.reload();assert.equal(warnings,1,'browser close/reload warning');await ctx.close();
 }
 assert.deepEqual(errors,[]);console.log(`PASS ${engine}: 1440/390/320 heading drops down/up, visible target, pointer/touch, staged/final order, close/Escape/continue/discard/review and native reload guard`);
}finally{await browser.close();}
