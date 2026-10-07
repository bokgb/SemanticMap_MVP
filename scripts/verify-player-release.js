import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const liveOrigin=process.env.PLAYER_RELEASE_ORIGIN;
const origin=liveOrigin||'http://player.game';
const browser=await chromium.launch();
const errors=[];
const names={pen:['ペン','ぺん'],food:['パン','ぱん'],cute:['花','はな'],drink:['お茶','おちゃ']};
try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
        window.gpsRequests=0;
        navigator.geolocation.watchPosition=()=>{window.gpsRequests++;return 1;};
        navigator.geolocation.clearWatch=()=>{};
    });
    if(!liveOrigin)await page.route('http://player.game/**',async route=>{
        const response=await route.fetch({url:route.request().url().replace('http://player.game','http://127.0.0.1:8000')});
        await route.fulfill({response});
    });
    let failPhoto=false;
    await page.route('**/api/gemini',async route=>{
        if(failPhoto){await route.fulfill({status:503,body:'Service unavailable'});return;}
        const request=route.request().postDataJSON();
        const key=request.contents[0].parts[0].text.match(/Current task key: (\w+)/)?.[1];
        assert(names[key]);
        const [word,kana]=names[key];
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match:true,object:key,word,kana})}]}}]})});
    });
    async function noTestControls(){
        assert.equal(await page.locator('.courier-test-menu,[data-test-start],[data-letter-action="skip-pen"],[data-letter-action="test-answer"],[data-action="sample"],[data-sample]').count(),0);
        assert(!/テスト|测试|TEST|DEMO/.test(await page.locator('#courier-app').innerText()));
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.goto(origin+'/?test=drink',{waitUntil:'networkidle'});
    assert.match(await page.locator('.opening-invite').innerText(),/ぼくはポコ/);
    assert.equal(await page.evaluate(()=>window.SemanticMap.letterTutorial.testStart('drink')),false);
    await noTestControls();
    for(let n=0;n<4;n++){await page.locator('[data-letter-action="open"]').click();await noTestControls();}
    assert.equal(await page.evaluate(()=>window.gpsRequests),0);
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.locator('[data-letter-slot="food"]').waitFor();
    assert.match(await page.locator('.letter-photo-hint').innerText(),/パンや果物/);
    assert.equal(await page.locator('[data-letter-slot]').count(),1);
    for(const key of ['food','cute','drink']){
        await noTestControls();
        const chooserPromise=page.waitForEvent('filechooser');
        await page.locator(`[data-letter-slot="${key}"] .letter-slot-empty`).click();
        const chooser=await chooserPromise;
        assert.equal(await chooser.element().getAttribute('id'),'courier-file');
        await chooser.setFiles('assets/lumi-avatar.png');
        await page.locator(`[data-letter-slot="${key}"].filled`).waitFor();
        await page.waitForFunction(()=>!document.querySelector('#courier-app').classList.contains('letter-receiving'));
    }
    await noTestControls();
    await page.locator('[data-letter-action="send"]').click();
    await noTestControls();
    await page.locator('[data-letter-action="field"]').click();
    await page.locator('.courier-copy').waitFor();
    assert.equal(await page.evaluate(()=>window.gpsRequests),1);
    await noTestControls();
    await page.locator('[data-action="mode"]').click();
    await page.locator('[data-action="preview-mode"]').click();
    await noTestControls();
    failPhoto=true;
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.locator('[data-action="retry-photo"]').waitFor();
    await noTestControls();
    assert.deepEqual(errors,[]);
    console.log('PASS: player host ignores test URLs; no debug, skip, auto-answer or demo buttons across introduction, photo letter, sent letter, field map, desktop mode and recognition failure; hint and mobile layout work; GPS starts only on explicit field entry. Recognition mocked.');
} finally {await browser.close();}
