import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const origin='http://127.0.0.1:8000',gameKey='kotoba-hunter-progress-v1',weekKey='kotoba-hunter-seven-days-v1';
const browser=await chromium.launch(),errors=[];
try{
  const seedContext=await browser.newContext(),seed=await seedContext.newPage();await seed.goto(origin+'/?test=ending',{waitUntil:'domcontentloaded'});const letter=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seedContext.close();
  async function setup(denied=false){
    const context=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce',geolocation:{latitude:35.03254,longitude:135.72401,accuracy:10},permissions:denied?[]:['geolocation']});
    await context.addInitScript(({letter,gameKey,weekKey,denied})=>{
      if(denied){navigator.permissions.query=async()=>({state:'denied',onchange:null});navigator.geolocation.getCurrentPosition=(_,fail)=>fail({code:1});}
      if(localStorage.getItem('field-test-seeded'))return;
      const cards=[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'leaf',word:'葉っぱ',kana:'はっぱ',photo:''},{step:3,object:'station',word:'駅',kana:'えき',photo:''}];
      localStorage.setItem(gameKey,JSON.stringify({version:1,progress:{index:3,cards,done:true,receipt:false,mode:'field',phase:'encounter'},letter,language:'ja'}));
      localStorage.setItem(weekKey,JSON.stringify({version:1,completed:{1:{date:'2026-10-21'},2:{date:'2026-10-22'}},entries:{},active:true,scene:'letter',day:3,sideLog:[]}));
      localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem('field-test-seeded','1');
    },{letter,gameKey,weekKey,denied});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-23T12:00:00+09:00')});await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('[data-week="start"]').click();return {context,page};
  }
  const walk=await setup();const p=walk.page;
  assert.ok(await p.locator('[data-field="arrive"]').isDisabled(),'Walking starts by locating and choosing the target');
  await p.locator('[data-field="locate"]').click();await p.locator('[data-field="pick-place"][data-kind="shop"]').waitFor();
  await p.locator('.field-player-marker').waitFor();assert.equal(await p.locator('.field-map-marker-target').count(),1);
  const before=await p.locator('.field-player-marker').getAttribute('style');await walk.context.setGeolocation({latitude:35.03354,longitude:135.72401,accuracy:10});
  await p.waitForFunction(before=>document.querySelector('.field-player-marker')?.getAttribute('style')!==before,before);
  await p.locator('[data-field="pick-place"][data-kind="park"]').click();assert.ok(await p.locator('[data-field="arrive"]').isDisabled());assert.ok((await p.locator('.field-map-status').innerText()).includes('コンビニ'));
  await p.locator('[data-field="pick-place"][data-kind="shop"]').click();assert.ok(await p.locator('[data-field="arrive"]').isEnabled());
  await p.locator('#courier-story-body').evaluate(e=>e.scrollTop=e.scrollHeight);
  for(const selector of ['.courier-header','.courier-story-header','#courier-actions']){const b=await p.locator(selector).boundingBox();assert.ok(b.y>=0&&b.y+b.height<=569);}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.screenshot({path:'work/seven-days/day3-real-map.png'});
  await p.locator('[data-field="arrive"]').click();await p.locator('[data-field="sample"]').waitFor();assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.mode,gameKey),'field');
  let requests=0;
  await p.route('**/api/gemini',route=>{requests++;const req=route.request().postDataJSON();assert.ok(req.contents[0].parts[0].text.includes('FIELD_CAMPAIGN'));assert.deepEqual(req.generationConfig.response_schema.properties.object.enum,['book','other']);return route.fulfill({json:{candidates:[{content:{parts:[{text:JSON.stringify({match:true,object:'book',word:'book',kana:'ほん'})}]}}]}});});
  await p.locator('#courier-album').setInputFiles('assets/sample-photos/book.svg');await p.locator('.field-reward').waitFor();assert.ok((await p.locator('.field-reward').innerText()).includes('本'));assert.equal(requests,1);
  await p.reload({waitUntil:'domcontentloaded'});await p.locator('.field-reward').waitFor();assert.ok((await p.locator('.field-reward img').getAttribute('src')).startsWith('data:image/jpeg'));
  await p.locator('[data-field="next"]').click();await p.locator('[data-field="zone"][data-zone="on"]').click();await p.locator('[data-field="check"]').click();await p.locator('[data-field="next"]').click();await p.locator('[data-week="mailbox"]').click();await p.locator('[data-week="read-3"]').first().click();assert.ok((await p.locator('.field-heading').innerText()).includes('4 / 8'),'The next stage survives leaving the story');
  await p.locator('.courier-header [data-action="journal"]').click();await p.locator('#courier-dialog-footer [data-action="restart"]').click();await p.locator('[data-action="confirm-restart"]').click();assert.equal(await p.evaluate(()=>localStorage.getItem('kotoba-hunter-field-days-v1:3')),null);
  await walk.context.close();
  const denied=await setup(true);await denied.page.locator('[data-field="locate"]').click();await denied.page.waitForFunction(()=>document.querySelector('.field-map-status')?.innerText.includes('確認できません'));
  await denied.page.locator('[data-field="local-scene"]').click();await denied.page.locator('[data-field="sample"]').waitFor();assert.equal(await denied.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.mode,gameKey),'field','The one-stage indoor fallback never silently changes the chosen mode');await denied.context.close();
  assert.deepEqual(errors,[]);console.log('PASS: real bundled nearby data, current-position marker, correct target focus, wrong-place guidance, explicit arrival, 320px fixed controls, upload/schema/restore, leaving and resuming, scoped reset and permission-denied fallback.');
}finally{await browser.close();}
