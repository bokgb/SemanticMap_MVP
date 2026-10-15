import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch(),errors=[],report=[];
await fs.mkdir('work/photo-mismatch',{recursive:true});
async function setup(state='letter',muted=false){
    const page=await browser.newPage({viewport:{width:390,height:844}});
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
        window.mismatchProbe=[];
        window.mismatchReactions=[];
        localStorage.removeItem('kotoba-hunter-sound-v1');
    });
    await page.goto(`http://127.0.0.1:8000/?test=${state}`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-action="sound"]').waitFor();
    if(!muted){await page.locator('[data-action="sound"]').click();await page.locator('[data-action="sound"]').click();}
    else await page.locator('[data-action="sound"]').click();
    await page.evaluate(()=>{
        const play=SemanticMap.audio.play;
        SemanticMap.audio.play=name=>{const played=play(name);mismatchProbe.push({name,played});return played;};
        const dialogue=SemanticMap.audio.dialogue;
        SemanticMap.audio.dialogue=(key,cue,delay)=>{const played=dialogue(key,cue,delay);mismatchReactions.push({key,cue,played});return played;};
    });
    return page;
}
function response(route,match=false){
    const task=route.request().postDataJSON().contents[0].parts[0].text;
    const key=task.match(/Current (?:task|journey) key: (\w+)/)[1];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match,object:key,word:match?'パン':'ロボット',kana:match?'ぱん':'ろぼっと'})}]}}]})});
}
try{
    const page=await setup();let match=false;
    await page.route('**/api/gemini',route=>response(route,match));
    const before=await page.evaluate(()=>SemanticMap.letterTutorial.target());
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.getByRole('heading',{name:'もう一度',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>SemanticMap.letterTutorial.target()),before,'Wrong photo does not complete the slot');
    assert.equal(await page.locator('.letter-word-reward').count(),0);
    assert.equal(await page.evaluate(()=>mismatchProbe.filter(p=>p.name==='mismatch'&&p.played).length),1);
    assert.equal(await page.evaluate(()=>mismatchProbe.filter(p=>p.name==='success').length),0);
    assert.ok(await page.locator('.courier-photo-review').isVisible());
    assert.equal(await page.locator('#courier-dialog').getAttribute('data-mismatch-first'),'true');
    assert.equal(await page.locator('#courier-dialog .poco-face[data-expression="sad"]').count(),1);
    assert.equal(await page.locator('.courier-robot:visible').count(),1,'Only the feedback Poco remains visible');
    assert.equal(await page.locator('.mismatch-target strong').innerText(),'食べもの');
    assert.ok(await page.evaluate(()=>mismatchReactions.some(p=>p.cue==='poco-confused'&&p.played)));
    await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    assert.ok(await page.locator('#courier-dialog [data-action="close"]').isVisible());
    assert.ok(await page.locator('#courier-dialog [data-action="retry-photo"]').isVisible());
    const rect=await page.locator('#courier-dialog [data-action="retry-photo"]').boundingBox();
    assert.ok(rect.y>=0&&rect.y+rect.height<=844);
    await page.screenshot({path:'work/photo-mismatch/letter-mismatch-mobile.png',animations:'disabled'});
    // Repeated mistakes keep a compact reminder rather than replaying the first encounter.
    const retryWrong=page.waitForEvent('filechooser');
    await page.locator('[data-action="retry-photo"]').click();
    await (await retryWrong).setFiles('assets/lumi-avatar.png');
    await page.locator('#courier-dialog[data-mismatch-first="false"]').waitFor();
    assert.equal(await page.locator('#courier-dialog .courier-robot').count(),0);
    assert.equal(await page.evaluate(()=>mismatchReactions.filter(p=>p.cue==='poco-confused').length),1);
    assert.equal(await page.evaluate(()=>SemanticMap.letterTutorial.target()),before);
    await page.screenshot({path:'work/photo-mismatch/repeat-mismatch-mobile.png',animations:'disabled'});
    // Reusing the same file after retry still enters the real upload handler.
    match=true;
    const chooserPromise=page.waitForEvent('filechooser');
    await page.locator('[data-action="retry-photo"]').click();
    await (await chooserPromise).setFiles('assets/lumi-avatar.png');
    await page.locator('.letter-word-reward').waitFor();
    assert.equal(await page.evaluate(()=>mismatchProbe.filter(p=>p.name==='mismatch').length),2);
    assert.ok(await page.evaluate(()=>mismatchProbe.some(p=>p.name==='success'&&p.played)));
    assert.ok(!(await page.locator('#courier-app').getAttribute('class')).includes('photo-mismatch-active'));
    report.push({flow:'wrong photo → retry same file → successful card',audio:await page.evaluate(()=>mismatchProbe)});
    await page.close();

    const shop=await setup('shop');
    await shop.route('**/api/gemini',route=>response(route));
    await shop.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await shop.getByRole('heading',{name:'もう一度',exact:true}).waitFor();
    assert.ok(await shop.evaluate(()=>mismatchProbe.some(p=>p.name==='mismatch'&&p.played)));
    assert.equal(await shop.locator('.journey-item-card').count(),0);
    assert.equal((await shop.locator('.mismatch-target strong').innerText()).replaceAll('\n',''),'冷たい飲みもの');
    await shop.setViewportSize({width:320,height:568});
    await shop.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    for(const selector of ['#courier-dialog [data-action="close"]','#courier-dialog [data-action="retry-photo"]']){
        const box=await shop.locator(selector).boundingBox();
        assert.ok(box&&box.y>=0&&box.y+box.height<=568,'Small-screen controls stay inside the viewport');
    }
    assert.ok(await shop.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await shop.screenshot({path:'work/photo-mismatch/shop-mismatch-small.png',animations:'disabled'});
    await shop.locator('#courier-dialog [data-action="close"]').click();
    await shop.waitForFunction(()=>!document.querySelector('#courier-app').classList.contains('photo-mismatch-active'));
    await shop.close();

    const unavailable=await setup();
    await unavailable.route('**/api/gemini',route=>route.fulfill({status:503,body:'Unavailable'}));
    await unavailable.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await unavailable.getByRole('heading',{name:'写真が届きませんでした',exact:true}).waitFor();
    assert.ok(await unavailable.evaluate(()=>!mismatchProbe.some(p=>p.name==='mismatch')),'Network failures are not object mismatches');
    await unavailable.close();

    const muted=await setup('letter',true);
    await muted.route('**/api/gemini',route=>response(route));
    await muted.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await muted.getByRole('heading',{name:'もう一度',exact:true}).waitFor();
    assert.ok(await muted.evaluate(()=>mismatchProbe.some(p=>p.name==='mismatch'&&!p.played)));
    assert.ok(await muted.evaluate(()=>mismatchProbe.every(p=>!p.played)),'Mute prevents all synth playback');
    await muted.close();
    assert.deepEqual(errors,[]);
    await fs.writeFile('work/photo-mismatch/results.json',JSON.stringify({report,errors},null,2));
    console.log('PASS: first error has one sad Poco and one reaction; repeat error is compact; retry → success; target hints; mute; network failure distinct; dialog controls visible at 320×568.');
}finally{await browser.close();}
