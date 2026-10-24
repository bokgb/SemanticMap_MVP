import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const browser=await chromium.launch(),base=process.env.TEST_ORIGIN||'http://127.0.0.1:8000',key='kotoba-hunter-progress-v1',errors=[];
await fs.mkdir('work/location-fallback',{recursive:true});
try{
 const seed=await browser.newPage();await seed.goto('http://127.0.0.1:8000/?test=ending');const letter=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seed.close();
 for(const mode of ['prompt','denied','unsupported','unknown','timeout','failure','timer']){
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(({letter,key,mode})=>{
   window.locationRequests=0;
   if(mode==='unsupported')Object.defineProperty(navigator,'geolocation',{value:undefined,configurable:true});
   else navigator.geolocation.getCurrentPosition=(_,fail)=>{window.locationRequests++;if(mode==='timer')return;fail({code:mode==='timeout'?3:mode==='failure'?2:1});};
   navigator.permissions.query=async()=>{if(mode==='unknown')throw Error('Permission query unsupported');return {state:['timeout','failure','timer'].includes(mode)?'granted':mode,onchange:null};};
   if(localStorage.getItem('location-fixture'))return;
   localStorage.setItem('location-fixture','1');localStorage.setItem('kotoba-hunter-before-play-v2','seen');
   localStorage.setItem(key,JSON.stringify({version:1,language:'ja',letter,progress:{index:1,cards:[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''}],done:false,receipt:false,mode:'field',phase:'travel'}}));
  },{letter,key,mode});
  const page=await context.newPage();if(mode==='timer')await page.clock.install();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  if(['timeout','failure','timer'].includes(mode))await page.locator('#courier-actions [data-action="location-request"]').click();
  if(mode==='timer')await page.clock.runFor(16010);
  await page.locator('[data-action="arrive"]').waitFor();
  const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress,key);
  assert.equal(saved.route.origin.lat,34.81036015042446);assert.equal(saved.route.origin.lng,135.5610787988949);
  assert.equal(saved.route.stops[2].name,'JR茨木駅');assert.equal(saved.mode,'field');assert.equal(saved.cards.length,1);
  assert.equal(await page.locator('[data-location-map-status]').innerText(),'OICを表示中');
  if(['prompt','denied','unknown','unsupported'].includes(mode))assert.equal(await page.evaluate(()=>locationRequests),0,'No permission prompt needed to continue');
  if(mode==='denied')await page.screenshot({path:'work/location-fallback/denied-oic-map.png'});
  await page.locator('[data-action="arrive"]').click();await page.locator('[data-action="shop-talk"]').click();await page.locator('[data-action="photo"]').waitFor();
  await page.reload();await page.locator('[data-action="photo"]').waitFor();
  assert.equal(await page.locator('[data-location-map-status]').innerText(),'OICを表示中');
  console.log('PASS '+mode+': OIC default route, JR Ibaraki destination, task entry and reload without lost progress');
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
