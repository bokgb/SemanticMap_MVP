import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin=process.env.JOURNEY_TEST_ORIGIN||'http://127.0.0.1:8000';
const browser=await chromium.launch(),errors=[];
await fs.mkdir('work',{recursive:true});
async function fresh(viewport={width:390,height:844},test='sent'){
    const page=await browser.newPage({viewport});page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.gpsRequests=0;navigator.geolocation.watchPosition=()=>{window.gpsRequests++;throw Error('Unexpected GPS request');};navigator.geolocation.getCurrentPosition=()=>{window.gpsRequests++;throw Error('Unexpected GPS request');};navigator.geolocation.clearWatch=()=>{};});
    await page.goto(origin+'/?test='+test,{waitUntil:'networkidle'});return page;
}
async function fixed(page,selector){
    const before=await page.locator(selector).boundingBox();assert(before);
    await page.locator('#courier-story-body').evaluate(el=>el.scrollTop=el.scrollHeight);
    const after=await page.locator(selector).boundingBox();assert.equal(after.y,before.y);assert(after.y>=0&&after.y+after.height<=page.viewportSize().height);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#courier-story-body').evaluate(el=>el.scrollTop=0);
}
async function photo(page){const chooser=page.waitForEvent('filechooser');await page.locator('[data-action="photo"]').click();await(await chooser).setFiles('assets/lumi-avatar.png');}
try{
    const p=await fresh();let match=true,status=200,object='drink';const requests=[];
    await p.route('**/api/gemini',async route=>{
        const payload=route.request().postDataJSON(),prompt=payload.contents[0].parts[0].text;
        const key=prompt.match(/Current journey key: (\w+)/)?.[1];requests.push(key);assert(['drink','tree','station'].includes(key));
        if(key==='drink'){assert.match(prompt,/non-alcoholic drink suitable to drink cold/);assert.match(prompt,/without visible ice or proof of temperature/);assert.match(prompt,/Reject visibly hot\/steaming drinks/);assert.match(prompt,/Name the actual drink/);assert(!payload.generationConfig.response_schema.properties.object.enum.includes('food'));}
        assert(payload.contents[0].parts[1].inline_data.data);assert(payload.generationConfig.response_schema.properties.object.enum.includes(key));
        const selected=key==='drink'?object:key;
        const [word,kana]=selected==='food'?['パン','ぱん']:key==='tree'?['木','き']:key==='station'?['駅','えき']:['お茶','おちゃ'];
        await route.fulfill({status,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match,object:match?selected:'other',word,kana})}]}}]})});
    });
    assert(!/已寄出|投函完了/.test(await p.locator('.completion-postmark').innerText()));
    await p.locator('[data-letter-action="field"]').click();
    await p.locator('.journey-departure-stage').waitFor();assert.equal(await p.evaluate(()=>window.gpsRequests),0);
    assert.match(await p.locator('.journey-destination').innerText(),/JR茨木|JR 茨木/);
    await fixed(p,'[data-action="departure-next"]');await p.waitForTimeout(1100);await p.screenshot({path:'work/journey-departure.png'});
    await p.locator('[data-action="departure-next"]').click();await p.locator('[data-action="departure-next"]').click();
    assert.equal(await p.evaluate(()=>window.gpsRequests),0);await p.locator('[data-action="journey-map"]').click();
    assert.equal(await p.evaluate(()=>window.gpsRequests),0);
    assert.match(await p.locator('.courier-map-heading').innerText(),/ソラ|索拉/);await fixed(p,'[data-action="arrive"]');await p.waitForTimeout(900);await p.screenshot({path:'work/journey-map.png'});
    await p.locator('[data-action="arrive"]').click();
    await p.locator('[data-encounter="greeting"]').waitFor();assert.equal(await p.locator('[data-action="photo"]').count(),0);
    assert.match(await p.locator('.journey-bubble').innerText(),/今日は暑いね.*冷たい飲みもの/);
    assert.equal(await p.locator('[data-action="shop-talk"] span').innerText(),'冷たい飲みものを探す');
    await p.waitForTimeout(1100);await p.screenshot({path:'work/journey-shop-greeting.png'});
    await p.locator('[data-action="shop-talk"]').click();await p.locator('.journey-quest-ticket').waitFor();await fixed(p,'[data-action="photo"]');
    assert.match(await p.locator('.journey-quest-ticket').innerText(),/水・お茶・ジュース/);
    await p.waitForTimeout(1200);await p.screenshot({path:'work/journey-shop-quest.png'});
    match=false;await photo(p);await p.locator('[data-action="retry-photo"]').waitFor();assert.equal(await p.locator('.journey-item-card').count(),0);await p.locator('#courier-dialog [data-action="close"]').click();
    match=true;object='food';await photo(p);await p.locator('[data-action="retry-photo"]').waitFor();assert.equal(await p.locator('.journey-item-card').count(),0);await p.locator('#courier-dialog [data-action="close"]').click();object='drink';
    match=true;status=503;await photo(p);await p.locator('[data-action="retry-photo"]').waitFor();assert.equal(await p.locator('.journey-clear-stamp').count(),0);await p.locator('#courier-dialog [data-action="close"]').click();
    status=200;await photo(p);await p.locator('.journey-item-card').waitFor();assert.match(await p.locator('.journey-item-card').innerText(),/お茶/);assert.match(await p.locator('.journey-item-card img').getAttribute('src'),/^data:image\/jpeg/);
    assert.equal(await p.locator('[data-action="next"]').count(),0);await fixed(p,'[data-action="pack"]');await p.waitForTimeout(800);await p.screenshot({path:'work/journey-photo-reward.png'});
    await p.locator('[data-action="pack"]').click();await p.locator('.supply-packed').waitFor();await p.locator('.journey-clear-stamp').waitFor();await fixed(p,'[data-action="next"]');await p.waitForTimeout(1300);await p.screenshot({path:'work/journey-packed.png'});
    assert.match(await p.locator('.journey-receipt .journey-bubble').innerText(),/のどが渇いても/);
    await p.locator('[data-action="next"]').click();assert.match(await p.locator('.journey-stop-card').innerText(),/岩倉|岩仓/);await p.locator('[data-action="arrive"]').click();
    await photo(p);await p.locator('.journey-item-card').waitFor();assert.match(await p.locator('.journey-item-card').innerText(),/木/);await p.locator('[data-action="next"]').click();
    await p.locator('[data-action="arrive"]').click();await photo(p);await p.locator('.journey-item-card').waitFor();assert.match(await p.locator('.journey-item-card').innerText(),/駅/);await p.locator('[data-action="next"]').click();
    await p.locator('.journey-envelope-button').click();await p.locator('.journey-ending').waitFor();assert.match(await p.locator('.journey-ending').innerText(),/配達完了|送信完成/);assert.equal(await p.locator('.journey-collected>span').count(),4);
    assert.equal(await p.evaluate(()=>window.gpsRequests),0);
    await p.locator('[data-action="restart"]').click();await p.locator('[data-action="confirm-restart"]').click();await p.locator('.opening-invite').waitFor();assert.equal(await p.locator('#courier-app.courier-journey').count(),0);
    await p.close();
    for(const viewport of [{width:320,height:568},{width:602,height:1244},{width:1440,height:900}]){
        const page=await fresh(viewport,'departure');await fixed(page,'[data-action="departure-next"]');
        await page.locator('[data-action="departure-next"]').click();await page.locator('[data-action="departure-next"]').click();await fixed(page,'[data-action="journey-map"]');
        await page.locator('[data-action="journey-map"]').click();await fixed(page,'[data-action="arrive"]');await page.locator('[data-action="arrive"]').click();await page.locator('[data-action="shop-talk"]').click();await fixed(page,'[data-action="photo"]');
        await page.locator('[data-action="language"]').click();assert.match(await page.locator('.journey-quest-ticket').innerText(),/冷饮/);await page.waitForTimeout(1000);await page.screenshot({path:`work/journey-shop-${viewport.width}.png`});
        await page.emulateMedia({reducedMotion:'reduce'});await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('.journey-departure-poco .courier-robot').evaluate(el=>getComputedStyle(el).animationName),'none');await page.close();
    }
    assert.deepEqual(requests,['drink','drink','drink','drink','tree','station']);assert.deepEqual(errors,[]);
    console.log('PASS: full field journey with no position/GPS requests → cold drink quest/errors/uploaded card → packing → uploaded park/station photos → handoff/restart; no test skip or preview switch used; JP/ZH, 320/390/602/1440px fixed controls and reduced motion. Recognition mocked.');
}finally{await browser.close();}
