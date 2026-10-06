import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch();
const origin='http://127.0.0.1:8000/';
const errors=[];
async function fresh(viewport={width:1440,height:1000}) {
 const context=await browser.newContext({viewport});const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));await page.goto(origin,{waitUntil:'networkidle'});return page;
}
async function sample(page,key) {await page.locator('[data-action="sample"]').click();await page.locator(`[data-sample="${key}"]`).click();}
try {
 const p=await fresh();
 await p.screenshot({path:'screenshots/oic-courier-desktop.png'});
 await p.locator('[data-action="sample"]').click();await p.locator('[data-sample="wrong"]').click();assert.equal(await p.locator('.courier-sample-feedback').count(),1);await p.locator('[data-action="close"]').last().click();
 assert.equal(await p.locator('[data-action="photo"]').count(),1);
 await sample(p,'pen');await p.reload({waitUntil:'networkidle'});assert.match(await p.locator('.courier-received').innerText(),/演示/);
 await p.locator('[data-action="next"]').click();assert.match(await p.locator('.courier-copy h2').innerText(),/能量/);
 await sample(p,'battery');await p.locator('[data-action="next"]').click();
 await p.screenshot({path:'screenshots/oic-courier-park.png'});
 await sample(p,'leaf');await p.locator('[data-action="next"]').click();await sample(p,'station');await p.locator('[data-action="next"]').click();
 await p.locator('[data-answer="ticket"]').click();assert.match(await p.locator('#courier-answer-feedback').innerText(),/再选/);
 await p.locator('[data-answer="letter"]').click();assert.equal(await p.locator('.courier-collected>span').count(),4);
 await p.reload({waitUntil:'networkidle'});assert.match(await p.locator('.courier-copy h2').innerText(),/勇气/);
 await p.screenshot({path:'screenshots/oic-courier-ending.png'});
 await p.locator('[data-action="journal"]').first().click();assert.equal(await p.locator('.courier-journal-word').count(),4);await p.locator('[data-action="close"]').first().click();
 await p.locator('[data-action="restart"]').click();await p.locator('[data-action="close"]').last().click();assert.equal(await p.locator('.courier-collected>span').count(),4);
 await p.locator('[data-action="restart"]').click();await p.locator('[data-action="confirm-restart"]').click();assert.equal(await p.locator('[data-action="photo"]').count(),1);
 const mobile=await fresh({width:390,height:844});await mobile.screenshot({path:'screenshots/oic-courier-mobile.png'});
 await mobile.setViewportSize({width:320,height:568});await mobile.locator('#courier-story-body').evaluate(el=>el.scrollTop=el.scrollHeight);
 let rect=await mobile.locator('[data-action="photo"]').boundingBox();assert(rect.y>=0&&rect.y+rect.height<=568);assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await mobile.locator('[data-action="journal"]').first().click();await mobile.locator('#courier-dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);rect=await mobile.locator('#courier-dialog>header').boundingBox();assert(rect.y>=0);rect=await mobile.locator('#courier-dialog-footer').boundingBox();assert(rect.y+rect.height<=568);
 await mobile.locator('#courier-dialog [data-action="close"]').first().click();
 await sample(mobile,'cup');await mobile.locator('[data-action="next"]').click();await mobile.locator('[data-action="mode"]').click();await mobile.locator('[data-action="field-mode"]').click();assert.equal(await mobile.locator('[data-action="sample"]').count(),0);await mobile.locator('[data-action="photo"]').click();assert.match(await mobile.locator('#courier-status').innerText(),/位置|定位/);assert.equal(await mobile.locator('.courier-received').count(),0);
 const photo=await fresh();let response={match:false,object:'other',word:'机',kana:'つくえ'};let status=200;
 await photo.route('**/api/gemini',async route=> {const payload=route.request().postDataJSON();assert(payload.contents[0].parts[1].inline_data.data);await route.fulfill({status,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(response)}]}}]})});});
 await photo.locator('#courier-file').setInputFiles('screenshots/oic-courier-mobile.png');await photo.getByRole('heading',{name:'再找找这件东西'}).waitFor();assert.equal(await photo.locator('.courier-received').count(),0);await photo.locator('#courier-dialog [data-action="close"]').click();
 status=503;await photo.locator('#courier-file').setInputFiles('screenshots/oic-courier-mobile.png');await photo.getByRole('heading',{name:'照片暂时没能送达'}).waitFor();assert.equal(await photo.locator('.courier-received').count(),0);await photo.locator('#courier-dialog [data-action="close"]').click();
 status=200;response={match:true,object:'pen',word:'ペン',kana:'ぺん'};await photo.locator('#courier-file').setInputFiles('screenshots/oic-courier-mobile.png');await photo.locator('.courier-postcard>img').waitFor();assert.match(await photo.locator('.courier-received').innerText(),/照片包裹/);
 assert.deepEqual(errors,[]);console.log('PASS: four chapters, wrong demo object, persistence, final quiz, restart/cancel, 320px fixed controls, field GPS gate, mocked photo match/mismatch/service error; no browser runtime errors.');
} finally {await browser.close();}
