import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch(),base=process.env.TEST_ORIGIN||'http://127.0.0.1:8000',gameKey='kotoba-hunter-progress-v1',weekKey='kotoba-hunter-seven-days-v1';
await fs.mkdir('work/ending-day-two',{recursive:true});
const errors=[];
try{
    const fixture=await browser.newPage();await fixture.goto('http://127.0.0.1:8000/?test=ending');
    const letter=await fixture.evaluate(()=>SemanticMap.letterTutorial.snapshot());await fixture.close();
    for(const width of [320,390]){
        const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});
        await context.addInitScript(({letter,gameKey,weekKey})=>{
            if(localStorage.getItem('ending-fixture'))return;
            const completed=new Date(),date=[completed.getFullYear(),String(completed.getMonth()+1).padStart(2,'0'),String(completed.getDate()).padStart(2,'0')].join('-');
            localStorage.setItem(gameKey,JSON.stringify({version:1,language:'ja',letter,progress:{index:3,cards:[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'tree',word:'木',kana:'き',photo:''},{step:3,object:'station',word:'駅',kana:'えき',photo:''}],done:true,receipt:false,mode:'field',phase:'encounter'}}));
            // First-day completion exists, but the player has not opened the next chapter.
            localStorage.setItem(weekKey,JSON.stringify({version:1,completed:{1:{date}},entries:{},active:false,scene:'mailbox',day:2,sideLog:[]}));
            localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem('ending-fixture','1');
        },{letter,gameKey,weekKey});
        const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
        // A completed-game reload opens the mailbox; use its first-journey archive.
        await page.goto(base);await page.locator('[data-week="first"]').click();await page.locator('.journey-ending').waitFor();
        const footer=page.locator('#courier-actions');
        assert.equal(await footer.locator('a.courier-primary').innerText(),'アンケートに答える');
        assert.ok((await footer.locator('a.courier-primary').getAttribute('href')).includes('docs.google.com/forms/'));
        assert.equal(await footer.locator('[data-action="restart"], [data-week="mailbox"], [data-week="explore"]').count(),0);
        assert.equal(await footer.locator('[data-week="ending-day-two"]').innerText(),'次の日へ');
        assert.equal(await footer.locator('a,button').count(),2);
        const box=await footer.boundingBox();assert.ok(box.y>=0&&box.y+box.height<=845);
        await page.screenshot({path:`work/ending-day-two/ending-${width}.png`});
        await footer.locator('[data-week="ending-day-two"]').click();await page.locator('.week-letter').waitFor();
        const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),weekKey);
        assert.equal(saved.day,2);assert.equal(saved.manualUnlock,2);assert.equal(saved.scene,'letter');
        assert.ok(saved.completed[1]);assert.ok(!saved.completed[2]);
        await page.reload();await page.locator('.week-letter').waitFor();
        assert.equal(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.cards.length,gameKey),4);
        await context.close();
    }
    assert.deepEqual(errors,[]);console.log('PASS: ending has questionnaire first, next-day second and no restart/explore; same-day day-two letter opens directly, reload and photo cards preserved at 320/390px.');
}finally{await browser.close();}
