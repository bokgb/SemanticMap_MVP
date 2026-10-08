import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch();
const errors=[];
const words={pen:['ペン','ぺん'],food:['りんご','りんご'],cute:['花','はな'],drink:['牛乳','ぎゅうにゅう']};
await fs.mkdir('work',{recursive:true});
async function pageAt(test,options={}){
    const page=await browser.newPage({viewport:{width:390,height:844},...options});
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`http://127.0.0.1:8000/?test=${test}`,{waitUntil:'networkidle'});
    return page;
}
async function reward(page,word){
    await page.locator('.letter-word-reward').waitFor();
    assert.equal(await page.locator('#letter-reward-word').innerText(),word);
    assert.equal(await page.locator('.letter-word-reward').count(),1);
    assert(await page.locator('.letter-reward-photo').evaluate(el=>el.querySelector('img').clientHeight<=el.clientHeight));
    assert.equal(await page.locator('.courier-story').evaluate(el=>el.inert),true);
    assert.equal(await page.locator('.letter-reward-actions button').evaluate(el=>document.activeElement===el),true);
}
async function land(page,key){
    await page.locator(`[data-letter-slot="${key}"].filled`).waitFor();
    await page.waitForFunction(()=>!document.querySelector('#courier-app').classList.contains('letter-receiving'));
    assert.equal(await page.locator('.letter-word-reward').count(),0);
    assert.equal(await page.locator('.courier-story').evaluate(el=>el.inert),false);
}
try {
    const page=await pageAt('pen');
    let mismatch=false,failed=false,longWord=false;
    await page.route('**/api/gemini',async route=>{
        if(failed){await route.fulfill({status:503,body:'Unavailable'});return;}
        const key=route.request().postDataJSON().contents[0].parts[0].text.match(/Current task key: (\w+)/)[1];
        const [word,kana]=longWord?['チョコレートチップクッキー','ちょこれーとちっぷくっきー']:words[key];
        await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match:!mismatch,object:key,word,kana})}]}}]})});
    });
    mismatch=true;await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.locator('[data-action="retry-photo"]').waitFor();assert.equal(await page.locator('.letter-word-reward').count(),0);
    await page.locator('[data-action="close"]').click();mismatch=false;failed=true;
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.locator('[data-action="retry-photo"]').waitFor();assert.equal(await page.locator('.letter-word-reward').count(),0);
    await page.locator('[data-action="close"]').click();failed=false;
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await reward(page,'ペン');assert.equal(await page.locator('.reply-letter').count(),0);
    await page.locator('[data-letter-action="place-word"]').click();
    await page.locator('[data-opening-beat="thanks"]').waitFor();
    assert.match(await page.locator('.opening-invite').innerText(),/ありがとう.*手紙が書ける/);
    assert.equal(await page.locator('.courier-robot:visible').count(),1);
    assert.equal(await page.locator('[data-expression="happy"]').count(),1);
    assert.equal(await page.locator('.tutorial-desk-pen').count(),1);
    assert.equal(await page.locator('.reply-letter').count(),0);
    assert.equal(await page.evaluate(()=>window.SemanticMap.letterTutorial.target()),null);
    await page.waitForTimeout(1000);
    await page.screenshot({path:'work/pen-thanks-390.png'});
    await page.locator('[data-letter-action="start-writing"]').click();
    await page.locator('[data-letter-slot="food"]').waitFor();
    for(const key of ['food','cute','drink']){
        const chooserPromise=page.waitForEvent('filechooser');
        await page.locator(`[data-letter-slot="${key}"] .letter-slot-empty`).click();
        await (await chooserPromise).setFiles('assets/lumi-avatar.png');
        await reward(page,words[key][0]);
        assert.equal(await page.locator(`[data-letter-slot="${key}"].filled`).count(),0);
        assert.equal(await page.locator('.letter-reward-reading').innerText(),words[key][1]);
        if(key==='food'){
            assert.equal(await page.locator('[data-letter-slot="cute"]').count(),0);
            await page.locator(`[data-letter-slot="${key}"].filled`).waitFor();
        }else await page.locator('[data-letter-action="place-word"]').evaluate(el=>{el.click();el.click();});
        await land(page,key);
    }
    assert.equal(await page.locator('.letter-slot.filled').count(),3);
    await page.locator('[data-letter-slot="food"]').click();
    const chooserPromise=page.waitForEvent('filechooser');await page.locator('[data-letter-action="retake"]').click();
    longWord=true;await (await chooserPromise).setFiles('assets/lumi-avatar.png');
    await reward(page,'チョコレートチップクッキー');
    await page.setViewportSize({width:320,height:568});
    await page.waitForTimeout(550);
    await page.screenshot({path:'work/word-reward-long-mobile.png'});
    const action=await page.locator('.letter-reward-actions button').boundingBox();assert(action.y>=0&&action.y+action.height<=568);
    await page.locator('.letter-reward-card').evaluate(el=>el.scrollTop=el.scrollHeight);
    assert.equal(await page.locator('.letter-reward-actions button').isVisible(),true);
    await page.keyboard.press('Escape');await land(page,'food');
    assert.equal(await page.locator('.letter-slot.filled').count(),3);
    assert.match(await page.locator('[data-letter-slot="food"]').innerText(),/チョコレートチップクッキー/);
    await page.close();
    for(const viewport of [{width:342,height:1244},{width:320,height:568},{width:1440,height:900}]){
        const p=await pageAt('letter',{viewport});
        await p.locator('[data-letter-action="test-answer"]').click();await reward(p,'パン');
        await p.waitForTimeout(550);
        const panel=await p.locator('.letter-reward-panel').boundingBox(),button=await p.locator('.letter-reward-actions button').boundingBox();
        assert(panel.x>=0&&panel.x+panel.width<=viewport.width&&button.y+button.height<=viewport.height);
        assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await p.screenshot({path:`work/word-reward-${viewport.width}.png`});
        await p.locator('.courier-test-menu summary').click();await p.locator('[data-test-start="welcome"]').click();
        assert.equal(await p.locator('.letter-word-reward').count(),0);
        await p.waitForTimeout(3100);assert.equal(await p.locator('.letter-slot').count(),0);
        assert.equal(await p.locator('.courier-header').evaluate(el=>el.inert),false);
        await p.close();
    }
    const reduced=await pageAt('letter',{reducedMotion:'reduce',viewport:{width:320,height:568}});
    await reduced.locator('[data-letter-action="test-answer"]').click();await reward(reduced,'パン');
    assert.equal(await reduced.locator('.letter-word-reward').evaluate(el=>el.getAnimations({subtree:true}).length),0);
    await reduced.locator('[data-letter-action="place-word"]').click();await land(reduced,'food');await reduced.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: only successful photos reveal a photo/word/kana close-up; pen and all three questions; automatic landing and early/double confirm; retake updates its original slot; next question waits; reset cancels pending reward; small/large screens, fixed action under long content, keyboard focus/Escape and reduced motion. Recognition mocked.');
} finally {await browser.close();}
