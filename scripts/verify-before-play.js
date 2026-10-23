import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch();
const errors=[],report=[];
const key='kotoba-hunter-before-play-v2';
await fs.mkdir('work/before-play',{recursive:true});
async function setup({width=390,height=844,storageBlocked=false,noAudio=false}={}){
    const context=await browser.newContext({viewport:{width,height}});
    await context.addInitScript(({key,storageBlocked,noAudio})=>{
        window.permissionProbe=[];
        window.audioProbe={contexts:0,bufferStarts:0};
        const Real=window.AudioContext;
        if(Real&&!noAudio)window.AudioContext=class extends Real{
            constructor(options){
                super(options);audioProbe.contexts++;
                const create=this.createBufferSource.bind(this);
                this.createBufferSource=()=>{const source=create(),start=source.start.bind(source);source.start=(...args)=>{audioProbe.bufferStarts++;return start(...args);};return source;};
            }
        };
        navigator.geolocation.getCurrentPosition=()=>permissionProbe.push('location');
        navigator.geolocation.watchPosition=()=>permissionProbe.push('watch');
        if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=async()=>{permissionProbe.push('camera');throw new Error('Unexpected permission request');};
        if(storageBlocked){
            const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
            Storage.prototype.getItem=function(k){if(k===key)throw new Error('Storage unavailable');return get.call(this,k);};
            Storage.prototype.setItem=function(k,v){if(k===key)throw new Error('Storage unavailable');return set.call(this,k,v);};
        }
        if(noAudio){window.AudioContext=undefined;window.webkitAudioContext=undefined;}
    },{key,storageBlocked,noAudio});
    const page=await context.newPage();
    page.on('pageerror',error=>errors.push(error.message));
    return {context,page};
}
try{
    const {context,page}=await setup();
    await page.goto('http://127.0.0.1:8000/');
    const dialog=page.locator('#courier-dialog.before-play[open]');
    await dialog.waitFor();
    assert.equal(await page.getByRole('heading',{name:'はじめる前に'}).count(),1);
    const start=page.locator('[data-action="begin-play"]');
    assert.ok(await start.isDisabled(),'Start is disabled until the notice bottom is reached');
    assert.equal(await start.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(217, 220, 213)','Disabled start is grey');
    await start.evaluate(e=>e.click());
    assert.ok(await dialog.isVisible(),'Disabled start cannot dismiss the notice');
    await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=(e.scrollHeight-e.clientHeight)/2);
    assert.ok(await start.isDisabled(),'Scrolling halfway is not enough');
    await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=0);
    assert.ok((await dialog.innerText()).includes('位置情報を許可してね'));
    assert.equal(await page.locator('[name="play-mode"]').count(),0,'Public onboarding only offers walking exploration');
    assert.equal(await page.locator('.tutorial-room').count(),0,'Opening waits for the start button');
    assert.deepEqual(await page.evaluate(()=>permissionProbe),[]);
    assert.equal(await page.evaluate(()=>audioProbe.contexts),0,'No audio context before a gesture');
    assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'true');
    await page.keyboard.press('Escape');
    assert.ok(await dialog.isVisible());
    await page.screenshot({path:'work/before-play/first-visit-mobile.png',animations:'disabled'});
    await page.getByRole('switch').click();
    assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'false');
    assert.equal(await page.evaluate(()=>audioProbe.bufferStarts),0,'Changing the setting does not start the opening greeting');
    await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    await page.getByRole('button',{name:'はじめる',exact:true}).click();
    await page.locator('[data-opening-beat="welcome"]').waitFor();
    assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),'seen');
    assert.equal(await page.evaluate(()=>localStorage.getItem('kotoba-hunter-sound-v1')),'off');
    assert.equal(await page.locator('#courier-dialog').getAttribute('open'),null);
    assert.deepEqual(await page.evaluate(()=>permissionProbe),[]);
    assert.equal(await page.evaluate(()=>audioProbe.bufferStarts),0,'Muted start stays silent');
    await page.reload();
    await page.locator('[data-opening-beat="welcome"]').waitFor();
    assert.equal(await page.locator('#courier-dialog').getAttribute('open'),null,'Seen notice stays dismissed on reload');
    assert.equal(await page.locator('[data-action="sound"]').getAttribute('aria-pressed'),'false');
    await page.goto('http://127.0.0.1:8000/?test=before-play');
    await dialog.waitFor();
    assert.ok(await start.isDisabled(),'Reopening the notice resets the scroll requirement');
    assert.equal(await page.getByRole('switch').getAttribute('aria-checked'),'false');
    await page.getByRole('switch').click();
    assert.equal(await page.evaluate(()=>audioProbe.bufferStarts),0,'Turning audio on does not play the greeting early');
    await page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    await page.getByRole('button',{name:'はじめる',exact:true}).click();
    await page.locator('[data-opening-beat="welcome"]').waitFor();
    await page.waitForFunction(()=>audioProbe.bufferStarts>0);
    report.push('First visit, mute, saved dismissal, reload, and explicit notice test route work; greeting waits for start.');
    await context.close();

    const small=await setup({width:320,height:568});
    await small.page.goto('http://127.0.0.1:8000/');
    await small.page.locator('#courier-dialog.before-play[open]').waitFor();
    await small.page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    await small.page.waitForFunction(()=>!document.querySelector('[data-action="begin-play"]').disabled);
    await small.page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=0);
    assert.ok(await small.page.locator('[data-action="begin-play"]').isEnabled(),'Start stays enabled after scrolling back up');
    await small.page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    for(const selector of ['#courier-dialog-title','[data-action="begin-play"]']){
        const box=await small.page.locator(selector).boundingBox();
        assert.ok(box&&box.y>=0&&box.y+box.height<=568,'Title and start stay inside the viewport');
    }
    assert.ok(await small.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await small.page.screenshot({path:'work/before-play/first-visit-small.png',animations:'disabled'});
    await small.context.close();
    report.push('Fresh browser shows notice; 320×568 scroll keeps title and start accessible.');

    const tall=await setup();
    await tall.page.goto('http://127.0.0.1:8000/');
    await tall.page.locator('#courier-dialog.before-play[open]').waitFor();
    assert.ok(await tall.page.locator('[data-action="begin-play"]').isDisabled());
    await tall.page.setViewportSize({width:717,height:2200});
    await tall.page.waitForFunction(()=>!document.querySelector('[data-action="begin-play"]').disabled);
    assert.ok(await tall.page.locator('#courier-dialog-body').evaluate(e=>e.scrollHeight<=e.clientHeight+2),'All visible content needs no extra scroll');
    await tall.context.close();
    report.push('Grey start blocks early clicks and halfway scrolling; reaching the bottom unlocks it, reopening resets it, and fully visible notices unlock on resize.');

    for(const options of [{storageBlocked:true},{noAudio:true}]){
        const test=await setup(options);
        await test.page.goto('http://127.0.0.1:8000/');
        await test.page.locator('#courier-dialog.before-play[open]').waitFor();
        if(options.noAudio)assert.ok(await test.page.getByRole('switch').isDisabled());
        await test.page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
        await test.page.getByRole('button',{name:'はじめる',exact:true}).click();
        await test.page.locator('[data-opening-beat="welcome"]').waitFor();
        assert.deepEqual(await test.page.evaluate(()=>permissionProbe),[]);
        await test.context.close();
    }
    report.push('Unavailable storage and unsupported audio do not block playing.');

    const local=await setup();
    await local.page.goto('http://127.0.0.1:8000/?test=letter');
    await local.page.locator('[data-letter-slot="food"]').waitFor();
    assert.equal(await local.page.locator('#courier-dialog').getAttribute('open'),null);
    await local.context.close();
    report.push('Existing local test starts still open directly.');
    assert.deepEqual(errors,[]);
    await fs.writeFile('work/before-play/report.json',JSON.stringify({status:'PASS',report,errors},null,2));
    console.log(JSON.stringify({status:'PASS',report,errors},null,2));
}finally{await browser.close();}
