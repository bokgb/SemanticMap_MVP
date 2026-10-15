import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch(),errors=[],report=[];
const origin='http://127.0.0.1:8000',key='kotoba-hunter-progress-v1';
await fs.mkdir('work/classroom',{recursive:true});
async function setup(init){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
    if(init)await context.addInitScript(init);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin,{waitUntil:'domcontentloaded'});
    return {page,context};
}
async function begin(page){await page.getByRole('button',{name:'はじめる',exact:true}).click();}
async function pen(page){for(let n=0;n<4;n++)await page.locator('[data-letter-action="open"]').click();await page.locator('[data-letter-action="photo"]').waitFor();}
async function sample(page){
    await page.locator('#courier-actions [data-action="sample"]').click();
    await page.locator('[data-action="use-sample"]').click();
}
async function reload(page,selector){await page.reload({waitUntil:'domcontentloaded'});await page.locator(selector).waitFor();}
try{
    const {page,context}=await setup();let requests=0;
    await page.route('**/api/gemini',r=>{
        requests++;const task=r.request().postDataJSON().contents[0].parts[0].text;
        const target=task.match(/Current task key: (\w+)/)[1],word=target==='pen'?'ペン':'花',kana=target==='pen'?'ぺん':'はな';
        return r.fulfill({contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match:true,object:target,word,kana})}]}}]})});
    });
    assert.ok(await page.locator('[name="play-mode"][value="preview"]').isChecked());
    assert.ok((await page.locator('#courier-dialog').innerText()).includes('5〜10分'));
    assert.ok((await page.locator('#courier-dialog').innerText()).includes('GoogleのGemini'));
    await page.screenshot({path:'work/classroom/first-visit.png',animations:'disabled'});
    await begin(page);await pen(page);
    await reload(page,'[data-opening-beat="pen"]');
    const choose=page.waitForEvent('filechooser');
    await page.locator('#courier-actions [data-action="album"]').click();
    await (await choose).setFiles('assets/lumi-avatar.png');
    await page.locator('.letter-word-reward').waitFor();
    await reload(page,'[data-opening-beat="thanks"]');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).letter.state.captures.pen.word,key),'ペン');
    await page.locator('[data-letter-action="start-writing"]').click();
    await sample(page);await page.locator('.letter-word-reward .sample-badge').waitFor();
    await reload(page,'[data-letter-beat="cute"]');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).letter.state.captures.food.sample,key),true);
    await page.locator('#courier-album').setInputFiles('assets/lumi-avatar.png');
    await page.locator('.letter-word-reward').waitFor();await reload(page,'[data-letter-beat="drink"]');
    await sample(page);await page.locator('[data-letter-action="place-word"]').click();
    await reload(page,'[data-letter-action="send"]');
    assert.equal(requests,2,'Samples never call Gemini');
    await page.locator('[data-letter-action="send"]').click();await reload(page,'.letter-completion');
    assert.equal(await page.locator('.completion-card').count(),3);
    assert.equal(await page.locator('#courier-actions .play-feedback-link').getAttribute('href'),'https://docs.google.com/forms/d/e/1FAIpQLSdoqFIAOfLiRgTwnDhFplLxnbVmXA7U2XJGCdOPCK-FTUJjjA/viewform');
    await page.screenshot({path:'work/classroom/completed-letter.png',animations:'disabled'});
    report.push('Refresh restores pen, reward, each writing step, photos, sample markers and completed letter; album opens a separate file picker.');

    await page.locator('[data-letter-action="field"]').click();
    await page.locator('[data-action="departure-next"]').click();await page.locator('[data-action="departure-next"]').click();
    await reload(page,'[data-action="journey-map"]');
    await page.locator('[data-action="journey-map"]').click();await reload(page,'.journey-travel');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.mode,key),'preview','Early choice survives letter → journey');
    await page.locator('[data-action="arrive"]').click();await page.locator('[data-action="shop-talk"]').click();
    await sample(page);await reload(page,'.journey-item-card');
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.cards.at(-1).sample,key),true);
    await page.locator('[data-action="pack"]').click();await reload(page,'.supply-packed');
    for(let i=0;i<2;i++){
        await page.locator('[data-action="next"]').click();await page.locator('[data-action="arrive"]').click();
        await sample(page);await page.locator('.journey-item-card').waitFor();
    }
    await page.locator('[data-action="next"]').click();await page.locator('.journey-handoff').waitFor();
    await reload(page,'.journey-item-card');await page.locator('[data-action="next"]').click();
    await page.locator('#courier-dialog-footer [data-action="deliver-letter"]').click();await reload(page,'.journey-ending');
    assert.equal(requests,2);assert.equal(await page.locator('#courier-actions .play-feedback-link').count(),1);
    await page.locator('.courier-header [data-action="journal"]').click();
    assert.equal(await page.locator('#courier-dialog .wordbook-card').count(),7,'All opening and delivery photographs appear in the notebook');
    assert.equal(await page.locator('#courier-dialog .wordbook-photo img').count(),7);
    await page.locator('#courier-dialog .wordbook-extra').last().locator('summary').click();
    await page.locator('#courier-dialog [data-action="restart"]').click();await page.locator('[data-action="confirm-restart"]').click();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);
    await reload(page,'#courier-dialog.before-play[open]');
    await context.close();
    report.push('Preview mode stays selected through full delivery; reload restores departure, packing, handoff and ending; explicit restart clears only game progress.');

    const field=await setup();await field.page.locator('[name="play-mode"][value="field"]').check();await begin(field.page);
    await reload(field.page,'[data-opening-beat="welcome"]');
    assert.equal(await field.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.mode,key),'field');await field.context.close();

    const offline=await setup();await offline.page.route('**/api/gemini',r=>r.fulfill({status:503,body:'Unavailable'}));
    await begin(offline.page);await pen(offline.page);
    await offline.page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await offline.page.locator('#courier-dialog-footer .photo-backups [data-action="sample"]').click();
    await offline.page.locator('[data-action="use-sample"]').click();await reload(offline.page,'[data-opening-beat="thanks"]');
    await offline.context.close();report.push('Walking mode persists independently; recognition failure offers a sample that continues successfully.');

    const quota=await setup(()=>{
        const set=Storage.prototype.setItem;
        Storage.prototype.setItem=function(k,v){if(k==='kotoba-hunter-progress-v1'&&v.includes('data:image'))throw new DOMException('Full','QuotaExceededError');return set.call(this,k,v);};
    });
    await begin(quota.page);await pen(quota.page);await sample(quota.page);await quota.page.locator('.letter-word-reward').waitFor();
    assert.ok((await quota.page.locator('#courier-save-notice').innerText()).includes('ことばは保存済み'));
    await reload(quota.page,'[data-opening-beat="thanks"]');await quota.context.close();
    const blocked=await setup(()=>{Storage.prototype.getItem=function(){throw new Error('Blocked');};Storage.prototype.setItem=function(){throw new Error('Blocked');};});
    await begin(blocked.page);await blocked.page.locator('[data-opening-beat="welcome"]').waitFor();
    assert.ok(await blocked.page.locator('#courier-save-notice').isVisible());await blocked.context.close();
    const corrupt=await setup(()=>{localStorage.setItem('kotoba-hunter-progress-v1','{broken');});
    await begin(corrupt.page);await corrupt.page.locator('[data-opening-beat="welcome"]').waitFor();await corrupt.context.close();
    report.push('Full storage falls back to steps and words; blocked storage warns without breaking play; damaged checkpoint starts safely.');
    const preview=await setup();await preview.page.goto(origin+'/?test=before-play');
    await begin(preview.page);await preview.page.locator('[data-letter-action="open"]').click();
    await reload(preview.page,'[data-opening-beat="reply"]');await preview.context.close();
    report.push('The before-play preview link also resumes on refresh, using a checkpoint separate from the normal game.');
    assert.deepEqual(errors,[]);
    const output={status:'PASS',report,errors};await fs.writeFile('work/classroom/report.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
}finally{await browser.close();}
