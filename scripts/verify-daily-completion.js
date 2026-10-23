import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.TEST_ORIGIN||'http://127.0.0.1:8000',gameKey='kotoba-hunter-progress-v1',weekKey='kotoba-hunter-seven-days-v1';
const browser=await chromium.launch(),errors=[];
await fs.mkdir('work/daily-completion',{recursive:true});
try{
    const seed=await browser.newPage();await seed.goto('http://127.0.0.1:8000/?test=ending');const letter=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seed.close();
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:['geolocation'],geolocation:{latitude:34.81036,longitude:135.56108,accuracy:20}});
    await context.addInitScript(({letter,gameKey,weekKey})=>{
        if(localStorage.getItem('daily-completion-fixture'))return;
        const d=new Date(),date=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
        localStorage.setItem(gameKey,JSON.stringify({version:1,language:'ja',letter,progress:{index:3,cards:[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'tree',word:'木',kana:'き',photo:''},{step:3,object:'station',word:'駅',kana:'えき',photo:''}],done:true,receipt:false,mode:'field',phase:'encounter'}}));
        localStorage.setItem(weekKey,JSON.stringify({version:1,completed:{1:{date}},entries:{},active:true,scene:'letter',day:2,sideLog:[],manualUnlock:2}));
        localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem('daily-completion-fixture','1');
    },{letter,gameKey,weekKey});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/gemini',r=>r.fulfill({status:503,body:'Use local reply fallback; no paid API calls'}));
    await page.goto(base);await page.locator('.bridge-incoming').waitFor();
    for(let day=2;day<=7;day++){
        await page.locator('[data-week="start"]').click();
        if(day===2){
            await page.locator('[data-bridge="samples"]').click();await page.locator('[data-bridge="sample-leaf"]').click();
            await page.locator('[data-bridge="send"]').click();await page.locator('[data-bridge="write"]').click();await page.locator('[data-bridge="finish"]').click();
        }else{
            const story=await page.evaluate(day=>SemanticMap.fieldStories[day],day);
            for(const task of story.tasks){
                if(task.kind==='map'){
                    await page.locator('[data-field="locate"]').click();await page.locator('[data-field="pick-place"][data-kind="'+task.place+'"]').click();await page.locator('[data-field="arrive"]').click();
                }else if(task.kind==='photo'){
                    await page.locator('[data-field="sample"]').click();await page.locator('[data-field="use-sample"]').click();await page.locator('[data-field="next"]').click();
                }else if(task.kind==='place'){
                    await page.locator('[data-field="zone"][data-zone="'+(task.where==='next'?'right':task.where)+'"]').click();await page.locator('[data-field="check"]').click();await page.locator('[data-field="next"]').click();
                }else if(task.kind==='talk'){
                    await page.locator('[data-field="talk"][data-choice="'+task.answer+'"]').click();await page.locator('[data-field="check"]').click();await page.locator('[data-field="next"]').click();
                }else if(task.kind==='phrase'){
                    for(let i=task.tokens.length-1;i>=0;i--)await page.locator('[data-field="token"][data-index="'+i+'"]').click();await page.locator('[data-field="check"]').click();await page.locator('[data-field="next"]').click();
                }else{
                    for(let i=0;i<3;i++)await page.locator('[data-field="reply"][data-slot="'+i+'"][data-choice="1"]').click();await page.locator('[data-field="send"]').click();
                }
            }
        }
        await page.locator('.week-result').waitFor();
        const footer=page.locator('#courier-actions');
        assert.equal(await footer.locator('a.courier-primary').innerText(),'アンケートに答える');
        assert.equal(await footer.locator('a,button').count(),day===7?1:2);
        assert.equal(await footer.locator('[data-week="explore"], [data-week="mailbox"], [data-field="review"], [data-bridge="scene"]').count(),0);
        assert.ok(!(await page.locator('.week-result').innerText()).includes('自由探索'));
        if(day===2||day===7)await page.screenshot({path:`work/daily-completion/day-${day}.png`});
        await page.reload();await page.locator('.week-result').waitFor();
        const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),weekKey);assert.ok(saved.completed[day]);
        if(day<7){
            await footer.locator('[data-week="completed-next"]').click();await page.locator('.week-letter').waitFor();
            const next=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),weekKey);assert.equal(next.day,day+1);assert.equal(next.manualUnlock,day+1);
            await page.reload();await page.locator('.week-letter').waitFor();
        }
        console.log('PASS day '+day+': questionnaire first, '+(day<7?'next chapter opens immediately':'no day eight')+', completion and reload preserved');
    }
    assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.cards.length,gameKey),4);
    assert.deepEqual(errors,[]);await context.close();
}finally{await browser.close();}
