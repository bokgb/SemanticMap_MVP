import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.COURIER_TEST_ORIGIN || 'http://127.0.0.1:8000/';
const browser=await chromium.launch();
const errors=[];
const fixture='assets/lumi-avatar.png';
await fs.mkdir('screenshots',{recursive:true});
async function fresh(viewport={width:1440,height:1000}) {
    const context=await browser.newContext({viewport});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
        window.gpsRequests=0;
        navigator.geolocation.watchPosition=()=>{window.gpsRequests++;return 1;};
        navigator.geolocation.clearWatch=()=>{};
    });
    await page.goto(origin,{waitUntil:'networkidle'});
    return page;
}
function mockPhotos(page) {
    const control={status:200,mismatch:false,wordOverride:null,requests:[]};
    const names={pen:['ペン','ぺん'],food:['りんご','りんご'],cute:['花','はな'],drink:['牛乳','ぎゅうにゅう']};
    page.route('**/api/gemini',async route=>{
        const payload=route.request().postDataJSON();
        const text=payload.contents[0].parts[0].text;
        const key=text.match(/Current task key: (\w+)/)?.[1];
        assert(key&&names[key]);assert(payload.contents[0].parts[1].inline_data.data);
        assert.deepEqual(payload.generationConfig.response_schema.required,['match','object','word','kana']);
        assert(payload.generationConfig.response_schema.properties.object.enum.includes(key));
        control.requests.push(key);
        const [word,kana]=names[key];
        await route.fulfill({status:control.status,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match:!control.mismatch,object:control.mismatch?'other':key,word:control.wordOverride||word,kana})}]}}]})});
    });
    return control;
}
async function meetPoco(page) {
    assert.match(await page.locator('.opening-invite').innerText(),/ぼくはポコ/);
    await page.locator('[data-letter-action="open"]').click();
    assert.equal(await page.locator('.incoming-letter').count(),0);
    assert.match(await page.locator('.opening-invite').innerText(),/写真/);
    await page.reload({waitUntil:'networkidle'});
    assert.match(await page.locator('.opening-invite').innerText(),/写真/);
    await page.locator('[data-letter-action="open"]').click();
    assert.equal(await page.locator('.incoming-letter').count(),0);
    assert.match(await page.locator('.opening-invite').innerText(),/友だち/);
    await page.locator('[data-letter-action="open"]').click();
    await page.locator('.incoming-letter').waitFor();
}
async function openWriting(page) {
    await meetPoco(page);
    await page.locator('[data-letter-action="reply"]').click();
    await page.locator('#courier-file').setInputFiles(fixture);
    await page.locator('[data-letter-slot="food"]').first().waitFor();
}
async function capture(page,key) {
    await page.locator(`[data-letter-slot="${key}"]`).first().click();
    await page.locator('#courier-file').setInputFiles(fixture);
    await page.locator(`[data-letter-slot="${key}"].filled`).waitFor();
}
async function sample(page,key){await page.locator('[data-action="sample"]').click();await page.locator(`[data-sample="${key}"]`).click();}
try {
    const p=await fresh();const mock=mockPhotos(p);
    assert.equal(await p.locator('[data-action="sample"], [data-action="alternate"]').count(),0);
    assert.equal(await p.evaluate(()=>window.gpsRequests),0);
    await p.screenshot({path:'screenshots/letter-opening-desktop.png'});
    await meetPoco(p);
    assert.match(await p.locator('.incoming-letter').innerText(),/ポコへ/);
    await p.locator('[data-letter-action="reply"]').click();
    mock.mismatch=true;await p.locator('#courier-file').setInputFiles(fixture);
    await p.getByRole('heading',{name:/別の写真で試してみよう|再找找这件东西/}).waitFor();
    assert.equal(await p.locator('.reply-letter').count(),0);
    await p.locator('#courier-dialog [data-action="close"]').click();
    mock.mismatch=false;mock.status=503;await p.locator('#courier-file').setInputFiles(fixture);
    await p.getByRole('heading',{name:/写真が届きませんでした|照片暂时没能送达/}).waitFor();
    assert.equal(await p.locator('[data-action="sample"]').count(),0);
    await p.locator('#courier-dialog [data-action="close"]').click();
    mock.status=200;await p.locator('#courier-file').setInputFiles(fixture);
    await p.locator('[data-letter-slot="food"]').waitFor();
    assert.equal(await p.locator('.letter-slot').count(),3);
    assert.equal(await p.locator('[data-letter-action="send"]').count(),0);
    await p.screenshot({path:'screenshots/letter-writing-desktop.png'});
    await capture(p,'drink');await capture(p,'food');
    await p.reload({waitUntil:'networkidle'});
    assert.equal(await p.locator('.letter-slot.filled').count(),2);
    assert.equal(await p.evaluate(()=>window.gpsRequests),0);
    assert.match(await p.locator('[data-letter-slot="food"]').first().innerText(),/りんご/);
    await capture(p,'cute');
    assert.equal(await p.locator('.materialized-item').count(),3);
    assert.match(await p.locator('.reply-letter').innerText(),/今朝は、\s*りんご/);
    mock.wordOverride='パン';await p.locator('[data-letter-slot="food"]').first().click();
    await p.locator('[data-letter-action="retake"]').click();
    await p.locator('#courier-file').setInputFiles(fixture);
    await p.waitForFunction(()=>document.querySelector('[data-letter-slot="food"]').textContent.includes('パン'));
    assert.equal(await p.locator('.letter-slot.filled').count(),3);mock.wordOverride=null;
    await p.screenshot({path:'screenshots/letter-completed-desktop.png'});
    await p.locator('[data-letter-action="send"]').click();
    await p.reload({waitUntil:'networkidle'});
    assert.equal(await p.locator('[data-letter-action="field"]').count(),1);
    assert.equal(await p.evaluate(()=>window.gpsRequests),0);
    await p.locator('[data-letter-action="stay"]').click();
    assert.match(await p.locator('#courier-status').innerText(),/保存/);
    await p.locator('[data-letter-action="field"]').click();
    assert.equal(await p.locator('#courier-app.courier-tutorial').count(),0);
    assert.equal(await p.evaluate(()=>window.gpsRequests),1);
    assert.match(await p.locator('.courier-copy h2').innerText(),/能量/);
    await p.locator('[data-action="photo"]').click();
    assert.match(await p.locator('#courier-status').innerText(),/位置|定位/);
    await p.locator('[data-action="mode"]').click();await p.locator('[data-action="preview-mode"]').click();
    await sample(p,'battery');await p.locator('[data-action="next"]').click();
    await p.screenshot({path:'screenshots/oic-courier-park.png'});
    await sample(p,'leaf');await p.locator('[data-action="next"]').click();
    await sample(p,'station');await p.locator('[data-action="next"]').click();
    await p.locator('[data-answer="letter"]').click();
    assert.equal(await p.locator('.courier-collected>span').count(),4);
    await p.locator('[data-action="restart"]').click();await p.locator('[data-action="confirm-restart"]').click();
    assert.equal(await p.locator('[data-letter-action="open"]').count(),1);
    const mobile=await fresh({width:390,height:844});mockPhotos(mobile);
    await mobile.screenshot({path:'screenshots/letter-opening-mobile.png'});
    await openWriting(mobile);await mobile.screenshot({path:'screenshots/letter-writing-mobile.png'});
    await mobile.setViewportSize({width:320,height:568});
    await mobile.locator('#courier-story-body').evaluate(el=>el.scrollTop=el.scrollHeight);
    let rect=await mobile.locator('[data-letter-action="photo"]').boundingBox();
    assert(rect.y>=0&&rect.y+rect.height<=568);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await mobile.locator('[data-action="journal"]').click();
    await mobile.locator('#courier-dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);
    rect=await mobile.locator('#courier-dialog>header').boundingBox();assert(rect.y>=0);
    rect=await mobile.locator('#courier-dialog-footer').boundingBox();assert(rect.y+rect.height<=568);
    await mobile.locator('#courier-dialog [data-action="close"]').first().click();
    for(const key of ['food','cute','drink'])await capture(mobile,key);
    await mobile.locator('#courier-story-body').evaluate(el=>el.scrollTop=el.scrollHeight);
    rect=await mobile.locator('[data-letter-action="send"]').boundingBox();assert(rect.y+rect.height<=568);
    assert.deepEqual(errors,[]);
    console.log('PASS: POCO introduction before letter with reload persistence; opening/incoming letter; required pen; 3 open photo slots; mismatch/service error; out-of-order fills and retake; persistence; no GPS until explicit field start; route and ending; restart; 320px fixed controls; no runtime errors. Photo recognition mocked.');
} finally {await browser.close();}
