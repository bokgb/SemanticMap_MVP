import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin='http://127.0.0.1:8000',weekKey='kotoba-hunter-seven-days-v1',bridgeKey='kotoba-hunter-day-two-v1';
const browser=await chromium.launch(),errors=[];
await fs.mkdir('work/seven-days',{recursive:true});
const fixture={version:1,completed:{1:{date:'2026-10-22'}},entries:{},active:true,scene:'letter',day:2,sideLog:[]};
async function mocks(page){
  const stats={reply:0,vision:0,mode:'good'};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/gemini',async route=>{
    const request=route.request().postDataJSON(),parts=request.contents[0].parts,prompt=parts[0].text;
    if(prompt.startsWith('Day 2 friend reply')){
      stats.reply++;
      return route.fulfill({json:{candidates:[{content:{parts:[{text:JSON.stringify({ja:['手紙、ありがとう！','パンの写真、うれしかったよ。','またポコとの話を聞かせてね。'],zh:['谢谢你的信！','收到面包的照片，我很开心。','下次再讲讲和波可的故事吧。']})}]}}]}});
    }
    stats.vision++;
    assert.ok(prompt.includes('DAY_TWO_CROSSING'));
    assert.deepEqual(request.generationConfig.response_schema.properties.object.enum,['flat_bridge','balance_bridge','leaf_boat','other']);
    assert.equal(parts[1].inline_data.mime_type,'image/jpeg');
    assert.ok(parts[1].inline_data.data.length>100);
    if(stats.mode==='cancel'){await new Promise(r=>setTimeout(r,300));try{await route.fulfill({json:{candidates:[{content:{parts:[{text:JSON.stringify({match:true,object:'balance_bridge',word:'ペン',kana:'ぺん'})}]}}]}});}catch{}return;}
    if(stats.mode==='offline')return route.fulfill({status:503,body:'Unavailable'});
    const result=stats.mode==='wrong'?{match:false,object:'other',word:'飲みもの',kana:'のみもの'}:stats.mode==='invalid'?{match:true,object:'unplanned-solution',word:'ペン',kana:'ぺん'}:{match:true,object:'balance_bridge',word:'pen',kana:'ぺん'};
    return route.fulfill({json:{candidates:[{content:{parts:[{text:JSON.stringify(result)}]}}]}});
  });
  return stats;
}
async function sample(page,key){await page.locator('[data-bridge="samples"]').click();await page.locator(`[data-bridge="sample-${key}"]`).click();await page.locator('[data-bridge="send"]').click();}
try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage(),stats=await mocks(page);
  await page.goto(origin+'/?test=day2',{waitUntil:'domcontentloaded'});await page.locator('.bridge-incoming').waitFor();
  await page.waitForFunction(()=>document.querySelector('.bridge-incoming')?.innerText.includes('またポコとの話'));
  assert.ok((await page.locator('.bridge-incoming').innerText()).includes('パン'));
  await page.locator('[data-week="start"]').click();await page.locator('.bridge-world[data-solution="empty"]').waitFor();
  assert.equal(await page.locator('[data-week="check"]').count(),0,'The story uses photography instead of a new quiz');
  for(const [id,solution] of [['book','flat_bridge'],['pen','balance_bridge'],['leaf','leaf_boat']]){
    await sample(page,id);await page.locator(`.bridge-world[data-solution="${solution}"]`).waitFor();
    await page.locator('.bridge-object img').evaluate(img=>img.decode());
    assert.equal(await page.evaluate(k=>Boolean(JSON.parse(sessionStorage.getItem(k)).completed[2]),weekKey+':test:day2'),false,'Crossing alone does not send the letter');
    await page.screenshot({path:`work/seven-days/day2-${id}-crossed.png`,animations:'disabled'});
    if(id!=='leaf')await page.locator('[data-bridge="another"]').click();
  }
  assert.equal(stats.vision,0,'Samples are never sent for recognition');
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('.bridge-world[data-solution="leaf_boat"]').waitFor();
  assert.equal(stats.reply,1,'The generated incoming letter is cached');
  await page.locator('[data-bridge="write"]').click();await page.locator('.bridge-outgoing').waitFor();
  assert.ok((await page.locator('.bridge-outgoing').innerText()).includes('葉っぱの船'));
  await page.locator('[data-bridge="finish"]').click();await page.locator('.bridge-result').waitFor();
  await page.locator('.courier-header [data-action="journal"]').click();assert.equal(await page.locator('#courier-dialog .wordbook-card').count(),8);
  await page.locator('#courier-dialog-footer [data-action="close"]').click();
  await page.locator('[data-bridge="scene"]').click();await page.locator('.bridge-world[data-solution="leaf_boat"]').waitFor();
  assert.equal(await page.locator('[data-bridge="another"]').count(),0,'Reviewing a completed scene preserves the original solution');
  await page.locator('[data-week="mailbox"]').click();assert.equal(await page.locator('.week-delivered').count(),2);
  assert.ok(await page.locator('.week-sealed').first().getByRole('button').isDisabled(),'The third day still unlocks tomorrow');
  await context.close();

  const upload=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),camera=await upload.newPage(),api=await mocks(camera);
  await camera.goto(origin+'/?test=day2',{waitUntil:'domcontentloaded'});await camera.locator('[data-week="start"]').click();
  api.mode='wrong';await camera.locator('#courier-album').setInputFiles('assets/sample-photos/cola.png');await camera.locator('#courier-dialog[open]').getByText('ほかのものを探そう').waitFor();
  assert.equal(await camera.locator('[data-bridge="send"]').count(),0);
  await camera.locator('#courier-dialog [data-action="close"]').click();
  api.mode='invalid';await camera.locator('#courier-file').setInputFiles('assets/sample-photos/pen.jpg');await camera.locator('#courier-dialog[open]').getByText('ほかのものを探そう').waitFor();await camera.locator('#courier-dialog [data-action="close"]').click();
  api.mode='cancel';await camera.locator('#courier-file').setInputFiles('assets/sample-photos/pen.jpg');await camera.locator('[data-action="cancel-scan"]').click();await camera.waitForTimeout(400);assert.equal(await camera.locator('[data-bridge="send"]').count(),0,'A late AI result after cancel cannot create a card');
  api.mode='offline';await camera.locator('#courier-file').setInputFiles('assets/sample-photos/pen.jpg');await camera.locator('#courier-dialog-footer [data-action="sample"]').click();await camera.locator('[data-bridge="sample-book"]').click();await camera.locator('[data-bridge="retake"]').click();
  api.mode='good';await camera.locator('#courier-album').setInputFiles('assets/sample-photos/pen.jpg');await camera.locator('.bridge-item-card').waitFor();
  await camera.reload({waitUntil:'domcontentloaded'});await camera.locator('.bridge-item-card').waitFor();
  assert.ok((await camera.locator('.bridge-item-card figcaption').innerText()).includes('ペン'),'Common English recognition names are displayed in Japanese');
  assert.ok((await camera.locator('.bridge-item-card img').getAttribute('src')).startsWith('data:image/jpeg'));
  assert.equal(await camera.locator('.bridge-item-card figcaption>small').count(),0,'A real upload is not labelled as a sample');
  await upload.close();

  const seedContext=await browser.newContext(),seed=await seedContext.newPage();await seed.goto(origin+'/?test=ending',{waitUntil:'domcontentloaded'});const letter=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seedContext.close();
  const normal=await browser.newContext({viewport:{width:320,height:568},reducedMotion:'reduce'});
  await normal.addInitScript(({letter,fixture,weekKey})=>{
    if(localStorage.getItem('bridge-fixture'))return;
    const cards=[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'leaf',word:'葉っぱ',kana:'はっぱ',photo:''},{step:3,object:'station',word:'駅',kana:'えき',photo:''}];
    localStorage.setItem('kotoba-hunter-progress-v1',JSON.stringify({version:1,progress:{index:3,cards,done:true,receipt:false,mode:'preview',phase:'encounter'},letter,language:'ja'}));
    localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem(weekKey,JSON.stringify(fixture));localStorage.setItem('bridge-fixture','1');localStorage.setItem('unrelated-storage','preserve');
  },{letter,fixture,weekKey});
  const small=await normal.newPage();await small.clock.install({time:new Date('2026-10-23T12:00:00+09:00')});await mocks(small);await small.goto(origin,{waitUntil:'domcontentloaded'});
  await small.locator('[data-week="start"]').click();await sample(small,'pen');await small.reload({waitUntil:'domcontentloaded'});await small.locator('.bridge-world[data-solution="balance_bridge"]').waitFor();
  await small.locator('#courier-story-body').evaluate(e=>e.scrollTop=e.scrollHeight);
  for(const selector of ['.courier-header','.courier-story-header','#courier-actions']){const box=await small.locator(selector).boundingBox();assert.ok(box.y>=0&&box.y+box.height<=569,'Controls stay visible on a small phone after scrolling');}
  assert.ok(await small.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await small.locator('[data-bridge="write"]').click();await small.locator('[data-bridge="finish"]').click();
  const date=await small.evaluate(k=>JSON.parse(localStorage.getItem(k)).completed[2].date,weekKey);assert.equal(date,'2026-10-23');
  await small.reload({waitUntil:'domcontentloaded'});await small.locator('.bridge-result').waitFor();await small.locator('[data-bridge="scene"]').click();await small.locator('[data-bridge="write"]').click();await small.locator('[data-bridge="finish"]').click();assert.equal(await small.evaluate(k=>JSON.parse(localStorage.getItem(k)).completed[2].date,weekKey),date);
  await small.locator('.courier-header [data-action="journal"]').click();await small.locator('#courier-dialog-footer [data-action="restart"]').click();await small.locator('[data-action="confirm-restart"]').click();assert.equal(await small.evaluate(k=>localStorage.getItem(k),bridgeKey),null);assert.equal(await small.evaluate(()=>localStorage.getItem('unrelated-storage')),'preserve');
  await normal.close();assert.deepEqual(errors,[]);
  console.log('PASS: all three solutions, cached reply, samples, photo upload, invalid classification, cancellation, service-error fallback, photo restore, persistent world/notebook, send-only completion, date lock, 320px fixed controls, and scoped restart.');
}finally{await browser.close();}
