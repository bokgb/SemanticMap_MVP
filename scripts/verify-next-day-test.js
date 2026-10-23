import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin='http://127.0.0.1:8000',publicOrigin=process.env.NEXT_DAY_RELEASE_ORIGIN||'http://player.game',gameKey='kotoba-hunter-progress-v1',weekKey='kotoba-hunter-seven-days-v1';
const browser=await chromium.launch(),errors=[];
await fs.mkdir('work/seven-days',{recursive:true});
try {
    const seed=await browser.newPage();await seed.goto(origin+'/?test=ending');const snapshot=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seed.close();
    async function context(seedProgress){
        const c=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
        if(seedProgress)await c.addInitScript(({snapshot,gameKey,weekKey})=>{
            if(localStorage.getItem('advance-fixture'))return;
            localStorage.setItem(gameKey,JSON.stringify({version:1,progress:{index:3,cards:[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'tree',word:'木',kana:'き',photo:''},{step:3,object:'station',word:'駅',kana:'えき',photo:''}],done:true,receipt:false,mode:'preview',phase:'encounter'},letter:snapshot,language:'ja'}));
            localStorage.setItem(weekKey,JSON.stringify({version:1,completed:{1:{date:'2026-10-23'}},entries:{},active:true,scene:'mailbox',day:2,sideLog:[]}));
            localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem('advance-fixture','1');localStorage.setItem('unrelated-preference','keep');
        },{snapshot,gameKey,weekKey});
        const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
        if(!process.env.NEXT_DAY_RELEASE_ORIGIN)await p.route(publicOrigin+'/**',async r=>{const u=new URL(r.request().url());await r.fulfill({response:await r.fetch({url:origin+u.pathname+u.search})});});
        await p.route('**/api/gemini',r=>r.fulfill({status:503,json:{error:'test fallback'}}));
        await p.clock.install({time:new Date('2026-10-23T12:00:00+09:00')});await p.goto(publicOrigin,{waitUntil:'domcontentloaded'});return {p,c};
    }
    const first=await context(false);await first.p.locator('#courier-app').waitFor();assert.equal(await first.p.locator('[data-week="advance-day"]').count(),0,'No advance button before completing the first delivery');assert.equal(await first.p.locator('[data-action="next-day-test"]').count(),0);await first.c.close();
    const {p,c}=await context(true);await p.locator('.week-mail-list').waitFor();assert.equal(await p.locator('[data-week="advance-day"]').count(),0,'No advance button in the mailbox');assert.equal(await p.locator('.courier-test-menu').count(),0,'Public users see no local testing menu');
    const original=await p.evaluate(k=>localStorage.getItem(k),gameKey);
    await p.locator('[data-week="explore"]').click();await p.locator('[data-week="advance-day"]').waitFor();
    await p.locator('[data-free="list"]').first().click();await p.locator('[data-free="select"]').first().click();await p.locator('[data-free="start"]').click();assert.equal(await p.locator('[data-week="advance-day"]').count(),0,'The button is absent during a free mission');
    await p.locator('[data-free="sample"]').click();await p.locator('[data-free="use-sample"]').click();assert.equal(await p.locator('[data-week="advance-day"]').count(),0,'The button is absent on the photo reward');await p.locator('[data-free="complete"]').click();
    for(let day=2;day<=7;day++){
        const button=p.locator('[data-week="advance-day"]');assert.ok(await button.isVisible());const b=await button.boundingBox();assert.ok(b.x>=0&&b.x+b.width<=320&&b.y>=0&&b.y+b.height<=568);
        if(day===2)await p.screenshot({path:'work/seven-days/next-day-in-exploration.png'});
        await button.click();await p.locator(day===2?'.bridge-incoming':'.field-letter').waitFor();assert.equal(await p.locator('[data-week="advance-day"]').count(),0);
        assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).manualUnlock,weekKey),day);assert.equal(await p.evaluate(k=>Object.keys(JSON.parse(localStorage.getItem(k)).completed).length,weekKey),day-1,'Opening a day never marks it completed');
        if(day===3){await p.reload({waitUntil:'domcontentloaded'});await p.locator('.field-letter').waitFor();}
        await p.evaluate(()=>{const b=document.createElement('button');b.dataset.week='advance-day';document.querySelector('#courier-app').append(b);b.click();b.remove();});assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).day,weekKey),day,'Advancing outside exploration is rejected');
        await p.locator('[data-week="start"]').click();
        if(day===2){await p.locator('[data-bridge="samples"]').click();await p.locator('[data-bridge="sample-book"]').click();await p.locator('[data-bridge="send"]').click();await p.locator('[data-bridge="write"]').click();await p.locator('[data-bridge="finish"]').click();await p.locator('.bridge-result').waitFor();}
        else {
            const tasks=await p.evaluate(d=>SemanticMap.fieldStories[d].tasks,day);
            for(const task of tasks){
                if(task.kind==='map')await p.locator('[data-field="local-scene"]').click();
                else if(task.kind==='photo'){await p.locator('[data-field="sample"]').click();await p.locator('[data-field="use-sample"]').click();await p.locator('[data-field="next"]').click();}
                else if(task.kind==='place'){await p.locator('[data-field="zone"][data-zone="'+(task.where==='next'?'right':task.where)+'"]').click();await p.locator('[data-field="check"]').click();await p.locator('[data-field="next"]').click();}
                else if(task.kind==='talk'){await p.locator('[data-field="talk"][data-choice="'+task.answer+'"]').click();await p.locator('[data-field="check"]').click();await p.locator('[data-field="next"]').click();}
                else if(task.kind==='phrase'){for(let i=task.tokens.length-1;i>=0;i--)await p.locator('[data-field="token"][data-index="'+i+'"]').click();await p.locator('[data-field="check"]').click();await p.locator('[data-field="next"]').click();}
                else {for(let i=0;i<3;i++)await p.locator('[data-field="reply"][data-slot="'+i+'"][data-choice="0"]').click();await p.locator('[data-field="send"]').click();}
            }
        }
        assert.equal(await p.locator('[data-week="advance-day"]').count(),0,'No advance button on a daily ending');await p.locator('[data-week="explore"]').click();await p.locator('.free-board').waitFor();
        assert.equal(await p.evaluate(k=>localStorage.getItem(k),gameKey),original,'First-day photos and progress are preserved');
    }
    assert.equal(await p.locator('[data-week="advance-day"]').count(),0,'No eighth day');assert.equal(await p.evaluate(k=>Object.keys(JSON.parse(localStorage.getItem(k)).completed).length,weekKey),7);assert.equal(await p.evaluate(()=>localStorage.getItem('unrelated-preference')),'keep');assert.deepEqual(errors,[]);await c.close();
    console.log('PASS: public button only after first delivery and on the free-exploration map; absent during missions/rewards/mailbox/story/endings; same-day progression through all seven chapters; resume after reload; no fake completions; original photos preserved; 320px controls; seventh-day limit.');
} finally {await browser.close();}
