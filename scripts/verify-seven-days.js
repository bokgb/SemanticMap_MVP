import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch(),errors=[],gameKey='kotoba-hunter-progress-v1',weekKey='kotoba-hunter-seven-days-v1';
await fs.mkdir('work/seven-days',{recursive:true});
const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
try{
  for(let day=3;day<=7;day++){
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto('http://127.0.0.1:8000/?test=day'+day,{waitUntil:'domcontentloaded'});
    await page.locator('.field-letter').waitFor();await page.locator('[data-week="start"]').click();
    const story=await page.evaluate(day=>SemanticMap.fieldStories[day],day);
    assert.equal(story.tasks.length,8);
    for(let index=0;index<story.tasks.length;index++){
      const task=story.tasks[index];
      if(task.kind==='map')await page.locator('[data-field="local-scene"]').click();
      else if(task.kind==='photo'){
        await page.locator('[data-field="sample"]').click();await page.locator('[data-field="use-sample"]').click();
        await page.locator('.field-reward img').evaluate(img=>img.decode());await page.locator('[data-field="next"]').click();
      }else if(task.kind==='place'){
        assert.ok(await page.locator('[data-field="check"]').isDisabled());
        const expected=task.where==='next'?'right':task.where,bad=task.where==='next'?'below':expected==='left'?'below':'left';
        await page.locator('[data-field="zone"][data-zone="'+bad+'"]').click();await page.locator('[data-field="check"]').click();assert.equal(await page.locator('[data-field="next"]').count(),0);
        await page.locator('[data-field="zone"][data-zone="'+expected+'"]').click();
        if(day===3&&index===2){await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.locator('[data-field="zone"][data-zone="'+expected+'"]').getAttribute('aria-pressed'),'true','Reload preserves a chosen position');}
        await page.locator('[data-field="check"]').click();await page.locator('[data-field="next"]').click();
      }else if(task.kind==='talk'){
        await page.locator('[data-field="talk"][data-choice="'+task.answer+'"]').click();await page.locator('[data-field="check"]').click();await page.locator('[data-field="next"]').click();
      }else if(task.kind==='phrase'){
        for(let n=task.tokens.length-1;n>=0;n--)await page.locator('[data-field="token"][data-index="'+n+'"]').click();
        await page.locator('[data-field="check"]').click();await page.locator('[data-field="next"]').click();
      }else{
        for(let n=0;n<3;n++)await page.locator('[data-field="reply"][data-slot="'+n+'"][data-choice="1"]').click();
        await page.locator('[data-field="send"]').click();
      }
    }
    await page.locator('.week-result').waitFor();assert.equal(await page.locator('.field-reply-photos img').count(),2);
    await page.screenshot({path:'work/seven-days/day'+day+'-result.png',animations:'disabled'});
    await page.locator('[data-field="review"]').click();assert.equal(await page.locator('.field-review-scene').count(),2);assert.equal(await page.locator('.field-placed').count(),2);
    await page.locator('[data-week="mailbox"]').click();assert.equal(await page.locator('.week-delivered').count(),day);
    if(day<7)assert.ok(await page.locator('.week-sealed').first().getByRole('button').isDisabled(),'Next chapter remains locked today');
    await page.close();
  }
  // Seed an actual completed day-one checkpoint, then test normal (non-debug) calendar and free-roam paths.
  const seed=await context.newPage();await seed.goto('http://127.0.0.1:8000/?test=ending');
  const letter=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seed.close();
  const normal=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
  await normal.addInitScript(({letter,gameKey})=>{
    if(localStorage.getItem('seven-day-fixture'))return;
    const cards=[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'leaf',word:'葉っぱ',kana:'はっぱ',photo:''},{step:3,object:'station',word:'駅',kana:'えき',photo:''}];
    localStorage.setItem(gameKey,JSON.stringify({version:1,progress:{index:3,cards,done:true,receipt:false,mode:'preview',phase:'encounter'},letter,language:'ja'}));
    localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem('seven-day-fixture','1');
  },{letter,gameKey});
  const page=await normal.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.clock.install({time:new Date('2026-10-22T12:00:00+09:00')});
  await page.goto('http://127.0.0.1:8000/');await page.locator('[data-week="mailbox"]').click();
  assert.equal(await page.locator('[data-week="read-2"]').count(),0,'First return is locked on the day of first delivery');
  const original=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.cards,gameKey);
  for(let index=1;index<=3;index++){
    await page.locator('[data-week="explore"]').click();await page.locator('[data-free="list"]').first().click();await page.locator('[data-free="select"]').nth(index-1).click();await page.locator('[data-free="start"]').click();
    await page.locator('[data-free="sample"]').click();await page.locator('[data-free="use-sample"]').click();
    if(index===1){await page.reload();await page.locator('.free-reward').waitFor();}
    await page.locator('[data-free="complete"]').click();await page.locator('.free-board').waitFor();
    assert.ok((await page.locator('.free-heading p').innerText()).includes(String(index)));
    assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.cards,gameKey),original,'Optional quests preserve the original photo notebook');
    await page.locator('[data-week="mailbox"]').click();
  }
  await page.clock.setSystemTime(new Date('2026-10-23T12:00:00+09:00'));
  await page.reload();await page.locator('[data-week="read-2"]').first().click();await page.locator('.week-letter').waitFor();
  assert.ok((await page.locator('.week-letter').innerText()).includes('はじめての返事'),'The next local calendar date unlocks a reply');
  await page.locator('[data-week="start"]').click();await page.locator('[data-week="mailbox"]').click();
  await page.locator('[data-week="explore"]').click();await page.locator('[data-free="list"]').first().click();await page.locator('[data-free="select"]').first().click();await page.locator('[data-free="start"]').click();await page.locator('[data-free="back"]').click();await page.locator('[data-week="mailbox"]').click();
  await page.locator('[data-week="read-2"]').first().click();await page.locator('.bridge-world').waitFor();
  assert.ok((await page.locator('.bridge-heading').innerText()).includes('橋がない'),'Exploration does not discard main-story progress');
  await page.locator('#courier-story-body').evaluate(e=>e.scrollTop=e.scrollHeight);
  for(const selector of ['.courier-header','.courier-story-header','#courier-actions']){const box=await page.locator(selector).boundingBox();assert.ok(box.y>=0&&box.y+box.height<=569,'Mobile controls stay visible after scrolling');}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'work/seven-days/small-screen.png',animations:'disabled'});
  await page.locator('.courier-header [data-action="journal"]').click();await page.locator('#courier-dialog-footer [data-action="restart"]').click();await page.locator('[data-action="confirm-restart"]').click();
  assert.equal(await page.evaluate(k=>localStorage.getItem(k),weekKey),null,'Explicit restart clears the seven-day campaign too');
  await normal.close();assert.deepEqual(errors,[]);
  console.log('PASS: day 3–7 and 40 stages, 10 photo transfers and 10 spatial placements; retry and refresh; final letter; calendar unlock; three optional quests; preserved notebook and day-two story; 320px fixed controls; explicit reset.');
}finally{await context.close();await browser.close();}
