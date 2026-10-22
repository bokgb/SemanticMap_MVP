import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

const browser=await chromium.launch(),key='kotoba-hunter-progress-v1',errors=[];
await fs.mkdir('work/play-modes',{recursive:true});
try{
  for(const choice of ['field','preview']){
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await context.addInitScript(()=>{
      window.locationRequests=0;
      navigator.permissions.query=async()=>({state:'prompt',onchange:null});
      navigator.geolocation.getCurrentPosition=success=>{locationRequests++;success({coords:{latitude:35.0325428,longitude:135.7240146,accuracy:12}});};
      navigator.geolocation.watchPosition=()=>1;navigator.geolocation.clearWatch=()=>{};
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8000/');
    await page.locator('#courier-dialog.before-play[open]').waitFor();
    // A mobile browser may restore checked controls without firing change.
    await page.locator(`[name="play-mode"][value="${choice}"]`).evaluate(e=>e.checked=true);
    await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    await page.locator('[data-action="begin-play"]').click();
    const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
    const mode=async()=>assert.equal((await saved()).progress.mode,choice);
    await mode();
    for(let n=0;n<4;n++)await page.locator('[data-letter-action="open"]').click();
    const sample=async()=>{
      await page.locator('#courier-actions [data-action="sample"]').click();
      await page.locator('[data-action="use-sample"]').click();
      await page.locator('.letter-word-reward').waitFor();
      await page.reload();await mode();
    };
    await sample();await page.locator('[data-letter-action="start-writing"]').click();
    for(let n=0;n<3;n++)await sample();
    await page.locator('[data-letter-action="send"]').click();await page.locator('.letter-completion').waitFor();await mode();
    assert.ok(await page.locator('.courier-mode-btn').isHidden(),'Letter pages do not show a mode switch');
    await page.locator('[data-letter-action="field"]').click();await mode();
    await page.locator('[data-action="departure-next"]').click();await page.locator('[data-action="departure-next"]').click();
    await page.locator('[data-action="journey-map"]').click();await mode();
    if(choice==='field'){
      await page.locator('.courier-map-explore .courier-sheet-toggle').waitFor();
      assert.equal((await saved()).progress.route.stops[2].name,'等持院・立命館大学衣笠キャンパス前');
    }else{
      assert.equal(await page.evaluate(()=>locationRequests),0,'Stationary map never asks for GPS');
      assert.equal(await page.locator('.journey-player-marker').count(),0,'No fabricated player marker');
      assert.equal(await page.locator('.courier-map-pin').count(),0,'No fabricated nearby destinations');
      assert.ok((await page.locator('#courier-actions [data-action="arrive"]').innerText()).includes('場面へ'));
    }
    assert.ok(await page.locator('#courier-map.leaflet-container').isVisible());
    await page.locator('.courier-sheet-toggle').click();assert.equal(await page.locator('.courier-sheet-toggle').getAttribute('aria-expanded'),'true');
    await page.keyboard.press('Escape');
    await page.screenshot({path:`work/play-modes/${choice}.png`,animations:'disabled'});
    await page.reload();await page.locator('.courier-map-explore .courier-sheet-toggle').waitFor();await mode();
    assert.ok(await page.locator('#courier-map.leaflet-container').isVisible());
    if(choice==='field'){
      const route=(await saved()).progress.route;
      await page.locator('.courier-sheet-toggle').click();await page.locator('.courier-mode-btn').click();
      await page.locator('[data-action="preview-mode"]').click();
      assert.deepEqual((await saved()).progress.route,route,'Explicit stationary switch keeps the known map route');
      assert.ok(await page.locator('#courier-map').isVisible());assert.equal(await page.locator('.courier-map-pin').count(),2);
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: restored radio choice; walking/stationary selection survives complete letter, samples, departure and reload; stationary map without GPS or fabricated places; known route retained on explicit mode switch.');
}finally{await browser.close();}
