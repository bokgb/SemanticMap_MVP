import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {nearestSpots} from '../lib/nearby-places.js';

const browser=await chromium.launch(),base='http://127.0.0.1:8000',key='kotoba-hunter-progress-v1',errors=[];
await fs.mkdir('work/exploration-sheet',{recursive:true});
const data=JSON.parse(await fs.readFile('spotsData.json','utf8')),origin={lat:34.711,lng:135.511};
const route={version:2,source:'spotsData',origin,stops:nearestSpots(data,origin,3000).stops,radius:3000,createdAt:42};
assert.equal(route.stops[2].name,'天神橋筋六丁目');
try{
  const fixture=await browser.newPage();await fixture.goto(base+'/?test=route');
  const letter=await fixture.evaluate(()=>window.SemanticMap.letterTutorial.snapshot());await fixture.close();
  const inside=async(page,selector)=>{const b=await page.locator(selector).boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=page.viewportSize().height+1&&b.x>=0&&b.x+b.width<=page.viewportSize().width+1,selector+' must remain visible');};
  for(const [width,height] of [[390,844],[320,568],[1280,900]]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',hasTouch:width<760,isMobile:width<760});
    await context.addInitScript(({key,letter,route})=>{localStorage.setItem('kotoba-hunter-before-play-v2','seen');localStorage.setItem(key,JSON.stringify({version:1,language:'ja',letter,progress:{index:1,cards:[{step:0,object:'letter',word:'手紙',kana:'てがみ',photo:''}],done:false,receipt:false,mode:'field',phase:'travel',route}}));},{key,letter,route});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.addStyleTag({content:'.courier-test-menu{display:none!important}'});
    const toggle=page.locator('.courier-sheet-toggle');await toggle.waitFor();
    await page.waitForFunction(()=>document.querySelectorAll('.courier-map-pin').length===3);
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.ok(await page.locator('#courier-story-body').isHidden());
    assert.ok((await page.locator('.courier-map-heading').innerText()).includes('天神橋筋六丁目駅'));
    assert.ok(!(await page.locator('.courier-world').innerText()).match(/ソラ|最初の手紙/));
    assert.equal(await page.locator('.courier-map-pin.destination').getAttribute('aria-label'),'天神橋筋六丁目駅');
    const visible=await page.evaluate(()=>{const m=document.querySelector('#courier-map').getBoundingClientRect(),s=document.querySelector('.courier-story').getBoundingClientRect();return(s.top-m.top)/m.height;});
    assert.ok(visible>.6,'Collapsed panel leaves most of the map visible');
    await page.waitForFunction(()=>!document.querySelector('#courier-status').textContent);
    await page.waitForFunction(()=>[...document.querySelectorAll('#courier-map .leaflet-tile')].every(image=>image.complete),null,{timeout:10000}).catch(()=>{});
    await inside(page,'#courier-actions [data-action="arrive"]');
    await page.screenshot({path:`work/exploration-sheet/collapsed-${width}.png`,animations:'disabled'});
    await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.ok(await page.locator('#courier-story-body').isVisible());assert.equal(await page.locator('#courier-story-body').evaluate(e=>e.inert),false);
    await page.screenshot({path:`work/exploration-sheet/expanded-${width}.png`,animations:'disabled'});
    await page.locator('#courier-story-body').evaluate(e=>{e.insertAdjacentHTML('beforeend','<p>メモ</p>'.repeat(80));e.scrollTop=e.scrollHeight;});
    assert.ok(await page.locator('#courier-story-body').evaluate(e=>e.scrollTop)>0);
    await inside(page,'.courier-sheet-toggle');await inside(page,'[data-sheet-location]');await inside(page,'#courier-actions [data-action="arrive"]');
    await toggle.focus();await page.keyboard.press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
    let box=await toggle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+20);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y-80,{steps:8});await page.mouse.up();assert.equal(await toggle.getAttribute('aria-expanded'),'true','Dragging up expands');
    box=await toggle.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+20);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+110,{steps:8});await page.mouse.up();assert.equal(await toggle.getAttribute('aria-expanded'),'false','Dragging down collapses');
    if(width===390){
      const cdp=await context.newCDPSession(page);box=await toggle.boundingBox();const x=box.x+box.width/2,y=box.y+20;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-90}]});
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.equal(await toggle.getAttribute('aria-expanded'),'true','Touch drag expands');
      await page.keyboard.press('Escape');
    }
    await page.locator('#courier-actions [data-action="arrive"]').click();await page.locator('.journey-shop-stage').waitFor();
    assert.equal(await page.locator('.courier-map-explore').count(),0);assert.ok(await page.locator('.courier-sheet-header').isHidden());assert.equal(await page.locator('#courier-story-body').evaluate(e=>e.inert),false);
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: real place names; collapsed map space; tap, mouse/touch drag and Escape; fixed header/footer with long scrolling content at 320/390/1280px; normal encounter restored.');
}finally{await browser.close();}
