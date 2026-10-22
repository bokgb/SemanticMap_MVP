import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {chromium} from '@playwright/test';

const source=await fs.readFile('research.js','utf8');
const researchKey='kotoba-hunter-research-v1';
const allowed=['id','client_sequence','started_at','active_ms','mode','stage','completed_tasks','status','survey_opened','is_test','consent_version','app_version'].sort();
const rows=[],store=new Map();
function runtime(){
  let now=1000;const events={},docEvents={},intervals=[];
  const window={SemanticMap:{},addEventListener:(name,fn)=>events[name]=fn};
  const context={window,crypto:webcrypto,URL,location:{hostname:'127.0.0.1'},navigator:{onLine:true},
    performance:{now:()=>now},document:{hidden:false,addEventListener:(name,fn)=>docEvents[name]=fn},
    localStorage:{getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)},
    setInterval:fn=>{intervals.push(fn);return 1;},clearInterval:()=>{},AbortSignal,
    fetch:async(url,options)=>{rows.push({url,body:JSON.parse(options.body),authorization:options.headers.Authorization});return {ok:true,json:async()=>({ok:true})};}};
  vm.runInNewContext(source,context);
  return {api:window.SemanticMap.research,context,events,docEvents,tick:ms=>{now+=ms;intervals.forEach(fn=>fn());},advance:ms=>now+=ms};
}
const settle=async()=>{await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));};
const summary={mode:'preview',stage:'letter',completedTasks:0,done:false};
let rt=runtime();rt.api.init();rt.api.start(false,'preview');rt.api.update(summary);rt.tick(15000);rt.api.surveyOpened();await settle();
assert.equal(rows.length,0,'Declining consent never sends research data');
rt.api.start(true,'field');await settle();rt.tick(15000);await settle();
assert.equal(rows.at(-1).body.active_ms,15000);
rt.advance(1000);rt.context.document.hidden=true;rt.docEvents.visibilitychange();await settle();
const visibleTime=rows.at(-1).body.active_ms;
rt.tick(60000);await settle();assert.equal(rows.at(-1).body.active_ms,visibleTime,'Hidden time is excluded');
rt.context.document.hidden=false;rt.docEvents.visibilitychange();rt.tick(2000);await settle();
assert.equal(rows.at(-1).body.active_ms,visibleTime+2000);
const id=rows.at(-1).body.id,ms=rows.at(-1).body.active_ms;
rt=runtime();rt.api.init({resume:true});rt.tick(1000);await settle();
assert.equal(rows.at(-1).body.id,id,'Reload preserves the same run');assert.equal(rows.at(-1).body.active_ms,ms+1000);
rt.api.update({...summary,stage:'complete',completedTasks:4,done:true});await settle();const finalTime=rows.at(-1).body.active_ms;
rt.tick(15000);await settle();assert.equal(rows.at(-1).body.active_ms,finalTime,'Completed runs stop their timer');
const url=new URL(rt.api.surveyURL('https://docs.google.com/forms/example/viewform'));
assert.equal(url.searchParams.get('entry.955941535'),'KH-'+id.replaceAll('-','').slice(0,12).toUpperCase());
rt.api.surveyOpened();await settle();assert.equal(rows.at(-1).body.survey_opened,true);
rt.context.navigator.onLine=false;rt.api.restart();rt.api.start(true,'preview');const second=JSON.parse(store.get(researchKey)).current.id;
rt.api.update({...summary,stage:'shop',completedTasks:1});rt.api.restart();
assert.notEqual(second,id);assert.equal(JSON.parse(store.get(researchKey)).pending.length,1);
rt.context.navigator.onLine=true;rt.events.online();await settle();
assert.ok(rows.some(row=>row.body.id===second&&row.body.status==='restarted'),'Offline restart data retries later');
assert.equal(JSON.parse(store.get(researchKey)).pending.length,0);
for(const row of rows){assert.deepEqual(Object.keys(row.body).sort(),allowed);assert.ok(!JSON.stringify(row.body).includes('writeKey'));}
const count=rows.length,stored=store.get(researchKey);rt=runtime();rt.api.init({disabled:true});rt.api.start(true,'field');rt.api.update(summary);await settle();
assert.equal(rows.length,count);assert.equal(store.get(researchKey),stored,'Debug previews do not mutate a real run');

const browser=await chromium.launch(),errors=[],captured=[];
await fs.mkdir('work/research',{recursive:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/functions/v1/record-play',route=>{
    captured.push(route.request().postDataJSON());return route.fulfill({contentType:'application/json',body:'{"ok":true}'});
  });
  await page.goto('http://127.0.0.1:8000/');await page.locator('#research-consent').waitFor({state:'attached'});
  assert.equal(captured.length,0,'The notice alone does not send research data');
  assert.ok(!await page.locator('#research-consent').isChecked(),'Consent is optional and off by default');
  await page.locator('#research-consent').check();
  await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
  await page.waitForFunction(()=>!document.querySelector('[data-action="begin-play"]').disabled);
  await page.screenshot({path:'work/research/consent-mobile.png',animations:'disabled'});
  await page.locator('[data-action="begin-play"]').click();await page.waitForFunction(k=>!!JSON.parse(localStorage.getItem(k))?.current?.ackSeq,researchKey);
  const saved=()=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)).current,researchKey);
  const code='KH-'+(await saved()).id.replaceAll('-','').slice(0,12).toUpperCase();
  assert.equal((await saved()).completed_tasks,0);
  for(let i=0;i<4;i++)await page.locator('[data-letter-action="open"]').click();
  async function sample(){await page.locator('#courier-actions [data-action="sample"]').click();await page.locator('[data-action="use-sample"]').click();}
  async function reload(selector){await page.reload();await page.locator(selector).waitFor();}
  await sample();await page.locator('.letter-word-reward').waitFor();await reload('[data-letter-action="start-writing"]');
  assert.equal('KH-'+(await saved()).id.replaceAll('-','').slice(0,12).toUpperCase(),code);
  await page.locator('[data-letter-action="start-writing"]').click();
  for(const selector of ['[data-letter-beat="cute"]','[data-letter-beat="drink"]','[data-letter-action="send"]']){
    await sample();await page.locator('.letter-word-reward').waitFor();await reload(selector);
  }
  await page.locator('[data-letter-action="send"]').click();await page.locator('.letter-completion').waitFor();
  assert.equal((await saved()).completed_tasks,1);assert.equal(await page.locator('[data-research-survey]').count(),0);
  await page.locator('[data-letter-action="field"]').click();
  for(let i=0;i<2;i++)await page.locator('[data-action="departure-next"]').click();
  await page.locator('[data-action="journey-map"]').click();await page.locator('[data-action="arrive"]').click();await page.locator('[data-action="shop-talk"]').click();
  await sample();await page.locator('[data-action="pack"]').waitFor();assert.equal((await saved()).completed_tasks,1,'Store counts only after packing');
  await page.locator('[data-action="pack"]').click();assert.equal((await saved()).completed_tasks,2);
  await page.locator('[data-action="next"]').click();await page.locator('[data-action="arrive"]').click();
  await sample();await page.locator('.journey-item-card').waitFor();assert.equal((await saved()).completed_tasks,3);
  await page.locator('[data-action="next"]').click();await page.locator('[data-action="arrive"]').click();
  await sample();await page.locator('.journey-item-card').waitFor();assert.equal((await saved()).completed_tasks,3,'Station counts only after handoff');
  assert.equal(await page.locator('[data-research-survey]').count(),0);
  await page.locator('[data-action="next"]').click();await page.locator('#courier-dialog-footer [data-action="deliver-letter"]').click();
  assert.equal((await saved()).completed_tasks,4);assert.equal((await saved()).status,'completed');
  const anchor=page.locator('#courier-actions [data-research-survey]');
  assert.equal(new URL(await anchor.getAttribute('href')).searchParams.get('entry.955941535'),code);
  await anchor.evaluate(e=>e.addEventListener('click',event=>event.preventDefault()));await anchor.click();
  assert.equal((await saved()).survey_opened,true);
  await reload('.journey-ending');assert.equal((await saved()).completed_tasks,4);
  await page.locator('.courier-header [data-action="journal"]').click();await page.locator('#courier-dialog-footer [data-action="restart"]').click();await page.locator('[data-action="confirm-restart"]').click();
  assert.equal(await saved(),null);await page.locator('#research-consent').check();await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);await page.locator('[data-action="begin-play"]').click();
  assert.notEqual('KH-'+(await saved()).id.replaceAll('-','').slice(0,12).toUpperCase(),code);
  for(const body of captured)assert.deepEqual(Object.keys(body).sort(),allowed,'Only the approved counters leave the browser');
  assert.ok(captured.some(body=>body.completed_tasks===4));assert.deepEqual(errors,[]);
  await context.close();
  let liveRun;
  if(process.argv.includes('--live')){
    const live=await browser.newContext({viewport:{width:390,height:844}}),lp=await live.newPage();
    lp.on('pageerror',error=>errors.push(error.message));
    await lp.goto('http://127.0.0.1:8000/');await lp.locator('#research-consent').check();
    await lp.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);await lp.locator('[data-action="begin-play"]').click();
    await lp.waitForFunction(k=>JSON.parse(localStorage.getItem(k))?.current?.ackSeq>=1,researchKey,{timeout:20000});
    liveRun=await lp.evaluate(k=>JSON.parse(localStorage.getItem(k)).current.id,researchKey);
    await lp.evaluate(()=>SemanticMap.research.update({mode:'preview',stage:'complete',completedTasks:4,done:true}));
    await lp.waitForFunction(k=>{const run=JSON.parse(localStorage.getItem(k))?.current;return run?.status==='completed'&&run.ackSeq===run.seq;},researchKey,{timeout:20000});
    await live.close();assert.deepEqual(errors,[]);
  }
  const report={status:'PASS',checks:['Optional consent; no uploads before consent','Only progress/time/mode/code, no photo or location fields','Four stages counted at actual completion','Same code after reload and in prefilled survey','Foreground timer excludes hidden and completed time','Restart creates a fresh code; offline updates retry','Debug previews do not affect real records'],browserRequests:captured.length};
  if(liveRun)report.liveTestRun=liveRun;
  await fs.writeFile('work/research/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await browser.close();}
