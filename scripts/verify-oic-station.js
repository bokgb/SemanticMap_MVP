import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {chromium} from '@playwright/test';
import {nearestSpots} from '../lib/nearby-places.js';
const origin={lat:34.8085,lng:135.559},spots=JSON.parse(await fs.readFile('spotsData.json','utf8'));
const route={version:2,source:'spotsData',origin,stops:nearestSpots(spots,origin,3000).stops,radius:3000,createdAt:123};
assert.equal(route.stops[2].name,'宇野辺','Reproduce the station selected from the south-west side of campus');
const box={window:{},location:{hostname:'semantic-map-mvp.vercel.app',search:''},URLSearchParams};vm.runInNewContext(await fs.readFile('play-rules.js','utf8'),box);
const fixed=box.window.SemanticMap.playRules.firstDayRoute(route);
assert.equal(fixed.stops[2].name,'JR茨木駅');assert.equal(fixed.stops[2].lat,34.8152025);
assert.equal(fixed.stops[0],route.stops[0]);assert.equal(fixed.stops[1],route.stops[1]);
const elsewhere={...route,origin:{lat:34.71,lng:135.51}};assert.equal(box.window.SemanticMap.playRules.firstDayRoute(elsewhere),elsewhere);
const browser=await chromium.launch(),base=process.env.TEST_ORIGIN||'http://127.0.0.1:8000',key='kotoba-hunter-progress-v1';
try{
 const seed=await browser.newPage();await seed.goto('http://127.0.0.1:8000/?test=ending');const letter=await seed.evaluate(()=>SemanticMap.letterTutorial.snapshot());await seed.close();
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await context.addInitScript(({key,route,letter})=>{
  if(localStorage.getItem('station-fixture'))return;
  localStorage.setItem('station-fixture','1');localStorage.setItem('kotoba-hunter-before-play-v2','seen');
  localStorage.setItem(key,JSON.stringify({version:1,language:'ja',letter,progress:{index:3,cards:[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''},{step:1,object:'drink',word:'お茶',kana:'おちゃ',photo:''},{step:2,object:'tree',word:'木',kana:'き',photo:''},{step:3,object:'station',word:'茨木駅',kana:'いばらきえき',photo:''}],done:false,receipt:true,mode:'field',phase:'encounter',route}}));
 },{key,route,letter});
 const page=await context.newPage();await page.goto(base);await page.locator('.journey-item-card').waitFor();
 assert.ok((await page.locator('.courier-map-heading h1').innerText()).includes('JR茨木駅'));
 const progress=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).progress,key);
 assert.equal(progress.route.stops[2].name,'JR茨木駅');assert.equal(progress.cards.length,4);assert.equal(progress.receipt,true);assert.equal(progress.index,3);
 await page.reload();await page.locator('.journey-item-card').waitFor();assert.ok((await page.locator('.courier-map-heading h1').innerText()).includes('JR茨木駅'));
 await context.close();console.log('PASS: reproduced Unobe selection; OIC route now ends at JR Ibaraki; restored route, photos and station handoff progress preserved; other cities unchanged.');
}finally{await browser.close();}
