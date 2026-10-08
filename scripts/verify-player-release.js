import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';

const liveOrigin=process.env.PLAYER_RELEASE_ORIGIN;
const origin=liveOrigin||'http://player.game';
const browser=await chromium.launch();
const errors=[];
const names={pen:['ペン','ぺん'],food:['パン','ぱん'],cute:['花','はな'],drink:['お茶','おちゃ'],tree:['木','き'],station:['駅','えき']};
try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
        window.gpsRequests=0;
        navigator.geolocation.watchPosition=()=>{window.gpsRequests++;return 1;};
        navigator.geolocation.getCurrentPosition=()=>{window.gpsRequests++;throw Error('Unexpected GPS request');};
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
        const key=request.contents[0].parts[0].text.match(/Current (?:task|journey) key: (\w+)/)?.[1];
        assert(names[key]);
        const [word,kana]=names[key];
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match:true,object:key,word,kana})}]}}]})});
    });
    async function noTestControls(){
        assert.equal(await page.locator('.courier-test-menu,[data-test-start],[data-letter-action="skip-pen"],[data-letter-action="test-answer"],[data-action="sample"],[data-action="skip-photo"],[data-sample]').count(),0);
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
    await page.locator('[data-letter-action="start-writing"]').waitFor();
    assert.match(await page.locator('.opening-invite').innerText(),/ありがとう.*手紙が書ける/);
    await noTestControls();
    await page.locator('[data-letter-action="start-writing"]').click();
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
    await page.locator('.journey-departure-stage').waitFor();
    assert.equal(await page.evaluate(()=>window.gpsRequests),0);
    await page.locator('[data-action="departure-next"]').click();
    await page.locator('[data-action="departure-next"]').click();
    await page.locator('[data-action="journey-map"]').click();
    await page.locator('.journey-travel').waitFor();
    assert.equal(await page.evaluate(()=>window.gpsRequests),0);
    await noTestControls();
    await page.locator('[data-action="mode"]').click();
    await page.locator('[data-action="field-mode"]').click();
    await page.locator('[data-action="arrive"]').click();
    await page.locator('[data-action="shop-talk"]').click();
    await noTestControls();
    await page.locator('#courier-actions').evaluate(el=>{
        const button=document.createElement('button');button.dataset.action='skip-photo';button.id='injected-test-skip';el.append(button);
    });
    await page.locator('#injected-test-skip').click();
    assert.equal(await page.locator('.journey-item-card').count(),0);
    assert.equal(await page.locator('.journey-quest-ticket').count(),1);
    await page.locator('#injected-test-skip').evaluate(el=>el.remove());
    failPhoto=true;
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.locator('[data-action="retry-photo"]').waitFor();
    await noTestControls();
    await page.locator('#courier-dialog>header [data-action="close"]').click();
    failPhoto=false;
    for(const key of ['drink','tree','station']){
        const chooserPromise=page.waitForEvent('filechooser');await page.locator('[data-action="photo"]').click();
        await(await chooserPromise).setFiles('assets/lumi-avatar.png');
        await page.locator('.journey-item-card').waitFor();assert.match(await page.locator('.journey-item-card').innerText(),new RegExp(names[key][0]));
        await noTestControls();
        if(key==='drink')await page.locator('[data-action="pack"]').click();
        await page.locator('[data-action="next"]').click();
        if(key!=='station')await page.locator('[data-action="arrive"]').click();
    }
    await page.locator('.journey-envelope-button').click();await page.locator('.journey-ending').waitFor();await noTestControls();
    assert.equal(await page.locator('.journey-collected>span').count(),4);assert.equal(await page.evaluate(()=>window.gpsRequests),0);
    assert.deepEqual(errors,[]);
    console.log('PASS: player host ignores test URLs; no test/skip/sample controls; full introduction → photo letter → field map → uploaded drink/tree/station → handoff, with no GPS or location data; mismatch/service failure preserved. Recognition mocked.');
} finally {await browser.close();}
