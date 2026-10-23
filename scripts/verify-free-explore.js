import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {nearbyCandidates} from '../lib/nearby-places.js';
const origin='http://127.0.0.1:8000',gameKey='kotoba-hunter-progress-v1',weekKey='kotoba-hunter-seven-days-v1',freeKey='kotoba-hunter-free-map-v1';
const browser=await chromium.launch(),errors=[];
await fs.mkdir('work/free-explore',{recursive:true});
const data=JSON.parse(await fs.readFile('spotsData.json','utf8'));
const candidates=nearbyCandidates(data,{lat:35.03254,lng:135.72401},3000);
assert.equal(new Set(candidates.map(p=>p.kind)).size,3);assert.ok(candidates.length>6);assert.equal(new Set(candidates.map(p=>p.spotId)).size,candidates.length);
assert.deepEqual(nearbyCandidates([{type:'park',lat:0,lng:0,access:'private'}],{lat:0,lng:0},3000),[]);
try {
  const seed=await browser.newPage();await seed.goto(origin+'/?test=ending');const letter=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seed.close();
  async function setup({denied=false,empty=false}={}){
    const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',permissions:denied?[]:['geolocation'],geolocation:{latitude:35.03254,longitude:135.72401,accuracy:10}});
    await context.addInitScript(({letter,gameKey,weekKey,denied})=>{
      const watch=navigator.geolocation.watchPosition.bind(navigator.geolocation);navigator.geolocation.watchPosition=(success,...args)=>watch(p=>{if(!window.__freezeGeo)success(p);},...args);
      if(denied){navigator.permissions.query=async()=>({state:'denied',onchange:null});navigator.geolocation.getCurrentPosition=(_,fail)=>fail({code:1});}
      if(localStorage.getItem('free-map-fixture'))return;
      localStorage.setItem(gameKey,JSON.stringify({version:1,progress:{index:3,cards:[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'tree',word:'木',kana:'き',photo:''},{step:3,object:'station',word:'駅',kana:'えき',photo:''}],done:true,receipt:false,mode:'field',phase:'encounter'},letter,language:'ja'}));
      localStorage.setItem(weekKey,JSON.stringify({version:1,completed:{1:{date:'2026-10-23'}},entries:{},active:true,scene:'explore',day:2,sideLog:[]}));
      localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem('free-map-fixture','1');localStorage.setItem('unrelated-preference','keep');
    },{letter,gameKey,weekKey,denied});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    if(empty)await page.route('**/spotsData.json',r=>r.fulfill({json:[{type:'station',lat:0,lng:0,name:'Far away'}]}));
    await page.clock.install({time:new Date('2026-10-23T12:00:00+09:00')});await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.free-board').waitFor();return {page,context};
  }
  const walk=await setup(),p=walk.page;
  const original=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),gameKey);
  assert.ok(await p.locator('[data-free="start"]').isDisabled());
  await p.locator('[data-free="locate"]').click();await p.waitForFunction(()=>document.querySelectorAll('.free-map-marker').length===6);
  const board=await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),freeKey);assert.equal(board.missions.length,6);
  assert.equal(new Set(board.missions.map(m=>m.spot.kind)).size,3);assert.equal(new Set(board.missions.map(m=>m.spot.spotId)).size,6);
  const target=board.missions.find(m=>m.spot.kind==='station');
  await p.locator('[data-free="list"]').first().click();await p.locator('[data-free="select"]').filter({hasText:target.spot.name}).first().click();
  assert.ok(await p.locator('[data-free="start"]').isDisabled(),'A distant mission cannot be started by tapping its marker');
  await walk.context.setGeolocation({latitude:target.spot.lat,longitude:target.spot.lng,accuracy:20});
  await p.waitForFunction(()=>!document.querySelector('[data-free="start"]').disabled);
  await walk.context.setGeolocation({latitude:target.spot.lat+.01,longitude:target.spot.lng,accuracy:20});await p.waitForFunction(()=>document.querySelector('[data-free="start"]').disabled);
  await walk.context.setGeolocation({latitude:target.spot.lat,longitude:target.spot.lng,accuracy:900});await p.waitForFunction(()=>document.querySelector('.free-location-status').textContent.includes('あいまい'));assert.ok(await p.locator('[data-free="start"]').isDisabled());
  await walk.context.setGeolocation({latitude:target.spot.lat,longitude:target.spot.lng,accuracy:20});await p.waitForFunction(()=>!document.querySelector('[data-free="start"]').disabled);
  await p.evaluate(()=>window.__freezeGeo=true);await p.clock.runFor(66000);assert.ok(await p.locator('[data-free="start"]').isDisabled(),'An expired position cannot unlock a task');await p.evaluate(()=>window.__freezeGeo=false);
  await walk.context.setGeolocation({latitude:target.spot.lat+.000001,longitude:target.spot.lng,accuracy:20});await p.waitForFunction(()=>!document.querySelector('[data-free="start"]').disabled);
  await p.reload({waitUntil:'domcontentloaded'});assert.ok(await p.locator('[data-free="start"]').isDisabled(),'Reload requires a fresh location');
  assert.deepEqual(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).missions,freeKey),board.missions,'Reload preserves random tasks');
  await p.locator('[data-free="locate"]').click();await p.waitForFunction(()=>!document.querySelector('[data-free="start"]').disabled);
  assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).selected,freeKey),target.id,'Location refresh preserves the chosen mission');
  await p.addStyleTag({content:'.courier-test-menu,#courier-status{display:none!important}'});
  await p.waitForFunction(()=>[...document.querySelectorAll('#free-map img.leaflet-tile')].some(i=>i.complete&&i.naturalWidth>0));
  await p.screenshot({path:'work/free-explore/map-arrived.png'});
  await p.setViewportSize({width:320,height:568});
  for(const selector of ['.courier-header','.courier-story-header','#courier-actions']){const b=await p.locator(selector).boundingBox();assert.ok(b.y>=0&&b.y+b.height<=569,'Fixed mobile controls remain visible');}
  assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await p.locator('[data-free="list"]').first().click();await p.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);assert.ok(await p.locator('#courier-dialog-footer [data-free="close"]').isVisible());await p.locator('[data-free="close"]').click();
  await p.locator('[data-free="start"]').click();await p.locator('[data-free="sample"]').waitFor();
  const photoSpec=await p.evaluate(()=>{const task=SemanticMap.freeExplore.captureTask();return {...task,sample:SemanticMap.fieldPhotoGroups[task.keys[0]].sample};});
  let requests=0;
  await p.route('**/api/gemini',r=>{requests++;const req=r.request().postDataJSON();assert.ok(req.contents[0].parts[0].text.includes('FREE_EXPLORATION'));assert.deepEqual(req.generationConfig.response_schema.properties.object.enum,[photoSpec.keys[0],'other']);assert.equal(req.contents[0].parts[1].inline_data.mime_type,'image/jpeg');return r.fulfill({json:{candidates:[{content:{parts:[{text:JSON.stringify({match:true,object:photoSpec.keys[0],word:photoSpec.sample.word,kana:photoSpec.sample.kana})}]}}]}});});
  await p.locator('#courier-album').setInputFiles(photoSpec.sample.photo);await p.locator('.free-reward').waitFor();assert.equal(requests,1);
  await p.reload({waitUntil:'domcontentloaded'});await p.locator('.free-reward img').waitFor();assert.ok((await p.locator('.free-reward img').getAttribute('src')).startsWith('data:image/jpeg'));
  await p.locator('[data-free="complete"]').click();await p.locator('.free-board').waitFor();
  assert.ok(await p.locator('[data-free="start"]').isDisabled());assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).history.length,freeKey),1);
  assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).sideLog.length,weekKey),1);
  assert.deepEqual((await p.evaluate(k=>JSON.parse(localStorage.getItem(k)),gameKey)).progress.cards,original.progress.cards,'Free missions preserve the first journey');
  assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.mode,gameKey),'field');
  await p.locator('[data-free="mode"]').click();assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).mode,freeKey),'indoor');assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.mode,gameKey),'field','Only the free-exploration mode changes');
  await p.locator('[data-free="list"]').first().click();const other=board.missions.find(m=>m.id!==target.id);await p.locator('[data-free="select"]').filter({hasText:other.spot.name}).first().click();await p.locator('[data-free="start"]').click();
  await p.locator('[data-free="sample"]').click();await p.locator('[data-free="use-sample"]').click();await p.locator('[data-free="complete"]').click();assert.equal(requests,1,'Samples make no AI request');
  await p.reload({waitUntil:'domcontentloaded'});assert.ok((await p.locator('.free-heading p').innerText()).includes('2'),'Daily total survives a fresh page');
  await p.locator('.courier-header [data-action="journal"]').click();assert.ok((await p.locator('#courier-dialog-body').innerText()).includes('町の小さな委託'));await p.locator('[data-action="close"]').last().click();
  await p.clock.setSystemTime(new Date('2026-10-24T12:00:00+09:00'));await p.reload({waitUntil:'domcontentloaded'});assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).history.length,freeKey),2);assert.ok((await p.locator('.free-heading p').innerText()).includes('0'));
  await p.locator('.courier-header [data-action="journal"]').click();await p.locator('[data-action="restart"]').click();await p.locator('[data-action="confirm-restart"]').click();assert.equal(await p.evaluate(k=>localStorage.getItem(k),freeKey),null);assert.equal(await p.evaluate(()=>localStorage.getItem('unrelated-preference')),'keep');await walk.context.close();
  const denied=await setup({denied:true});await denied.page.locator('[data-free="locate"]').click();await denied.page.waitForFunction(()=>document.querySelector('.free-location-status').textContent.includes('許可'));await denied.page.locator('[data-free="mode"]').click();await denied.page.locator('[data-free="list"]').first().click();assert.equal(await denied.page.locator('[data-free="select"]').count(),3);assert.ok((await denied.page.locator('#courier-dialog-body').innerText()).includes('練習'));await denied.page.locator('[data-free="select"]').first().click();await denied.page.locator('[data-free="start"]').click();await denied.page.locator('[data-free="sample"]').waitFor();assert.equal(await denied.page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress.mode,gameKey),'field');await denied.context.close();
  const empty=await setup({empty:true});await empty.page.locator('[data-free="locate"]').click();await empty.page.locator('[data-free="wider"]').waitFor();assert.equal(await empty.page.locator('.free-map-marker').count(),0);await empty.page.locator('[data-free="indoor"]').click();await empty.page.locator('[data-free="list"]').first().click();assert.equal(await empty.page.locator('[data-free="select"]').count(),3);await empty.context.close();
  assert.deepEqual(errors,[]);console.log('PASS: six real-place random missions; GPS arrival, leaving range and coarse accuracy; stable reload/selection; photo API/schema/reward; sample without API; completion/map/wordbook; original journey preserved; daily refresh; 320px fixed controls; denied/missing-data fallback; scoped reset.');
} finally {await browser.close();}
