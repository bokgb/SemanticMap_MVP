import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
await fs.mkdir('work',{recursive:true});
const browser=await chromium.launch();
const errors=[];
try {
    for(const viewport of [{width:320,height:568},{width:507,height:1244}]) {
        const page=await browser.newPage({viewport,reducedMotion:'reduce'});
        let requests=0,choosers=0;
        page.on('pageerror',error=>errors.push(error.message));
        page.on('filechooser',()=>choosers++);
        await page.route('**/api/gemini',route=>{requests++;return route.abort();});
        await page.addInitScript(()=>{
            navigator.geolocation.watchPosition=(_,fail)=>{fail({code:1});return 1;};
            navigator.geolocation.clearWatch=()=>{};
        });
        await page.goto('http://127.0.0.1:8000/?test=shop',{waitUntil:'networkidle'});
        await page.locator('[data-action="mode"]').click();await page.locator('[data-action="field-mode"]').click();
        const skip=page.locator('[data-action="skip-photo"]');
        assert.equal(await skip.innerText(),'テスト：撮影をスキップ');
        const before=await skip.boundingBox();
        await page.locator('#courier-story-body').evaluate(el=>el.scrollTop=el.scrollHeight);
        const after=await skip.boundingBox();assert.equal(before.y,after.y);assert(after.y+after.height<=viewport.height);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        await page.screenshot({path:`work/test-skip-${viewport.width}.png`});
        await skip.click();await page.locator('.journey-item-card').waitFor();
        assert.match(await page.locator('.journey-item-card').innerText(),/お茶|テスト/);
        assert.equal(await page.locator('[data-action="skip-photo"]').count(),0);
        assert.equal(await page.locator('[data-action="next"]').count(),0);
        await page.locator('[data-action="pack"]').click();await page.locator('.journey-clear-stamp').waitFor();
        await page.locator('[data-action="next"]').click();await page.locator('[data-action="arrive"]').click();
        await page.locator('[data-action="skip-photo"]').click();await page.locator('.journey-clear-stamp').waitFor();
        assert.match(await page.locator('.journey-item-card').innerText(),/木/);
        await page.locator('[data-action="next"]').click();await page.locator('[data-action="arrive"]').click();
        await page.locator('[data-action="skip-photo"]').click();await page.locator('.journey-clear-stamp').waitFor();
        await page.locator('[data-action="next"]').click();await page.locator('.journey-envelope-button').click();
        await page.locator('.journey-ending').waitFor();assert.equal(await page.locator('.journey-collected>span').count(),4);
        assert.equal(requests,0);assert.equal(choosers,0);
        await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: one-click local test skip in field mode with GPS denied; no camera/API; drink reward/manual packing → park → station → handoff; marked example cards, fixed controls at 320/507px.');
}finally{await browser.close();}
