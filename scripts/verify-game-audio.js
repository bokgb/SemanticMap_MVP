import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser = await chromium.launch();
const errors = [], origin = 'http://127.0.0.1:8000';
await fs.mkdir('work/audio-verification', {recursive:true});
async function pageAt(state='welcome', width=390, setup) {
    const page = await browser.newPage({viewport:{width,height:844}});
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
        window.audioProbe = {contexts:[],starts:0,played:[]};
        const Real = window.AudioContext;
        window.AudioContext = class extends Real {
            constructor(options) {
                super(options); window.audioProbe.contexts.push(this);
                const makeVoice = this.createOscillator.bind(this);
                this.createOscillator = () => {
                    const voice = makeVoice(), start = voice.start.bind(voice);
                    voice.start = (...args) => { window.audioProbe.starts++; start(...args); };
                    return voice;
                };
            }
        };
    });
    if(setup)await page.addInitScript(setup);
    await page.goto(`${origin}/?test=${state}`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-action="sound"]').waitFor();
    await page.evaluate(() => {
        const play = SemanticMap.audio.play;
        SemanticMap.audio.play = name => {window.audioProbe.played.push(name); return play(name);};
    });
    return page;
}
async function checkHeader(page) {
    assert(await page.evaluate(() => {
        const logo=document.querySelector('.courier-logo').getBoundingClientRect();
        const actions=document.querySelector('.courier-header-actions').getBoundingClientRect();
        return logo.right <= actions.left && actions.right <= innerWidth && document.documentElement.scrollWidth <= innerWidth;
    }), 'Header controls must fit beside the logo');
}
try {
    if(!process.argv.includes('--remaining')) {
    const page = await pageAt();
    assert.equal(await page.evaluate(()=>audioProbe.contexts.length),0,'No audio context on page load');
    await page.locator('[data-letter-action="open"]').click();
    await page.waitForFunction(()=>audioProbe.starts>0);
    assert.equal(await page.evaluate(()=>audioProbe.contexts.length),1);
    assert.equal(await page.evaluate(()=>audioProbe.contexts[0].state),'running');
    assert.equal(await page.locator('[data-action="sound"]').getAttribute('aria-label'),'音をオフにする');
    await page.locator('[data-action="sound"]').click();
    const before=await page.evaluate(()=>audioProbe.starts);
    await page.locator('[data-letter-action="open"]').click();
    assert.equal(await page.evaluate(()=>audioProbe.starts),before,'Muted clicks must not create voices');
    await page.reload();
    await page.locator('[data-action="sound"][aria-pressed="false"]').waitFor();
    assert.equal(await page.evaluate(()=>audioProbe.contexts.length),0,'Saved mute does not start audio');
    await page.locator('[data-action="sound"]').click();
    await page.waitForFunction(()=>audioProbe.starts>0);
    await page.locator('[data-action="language"]').click();
    assert.equal(await page.locator('[data-action="sound"]').getAttribute('aria-label'),'关闭音效');
    await page.locator('[data-action="language"]').click();
    await checkHeader(page);
    await page.close();

    const pen=await pageAt('pen');
    await pen.locator('[data-action="sound"]').click(); // Off
    await pen.locator('[data-action="sound"]').click(); // On / trusted unlock
    await pen.route('**/api/gemini',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match:true,object:'pen',word:'ペン',kana:'ぺん'})}]}}]})}));
    await pen.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await pen.locator('.letter-word-reward').waitFor();
    assert(await pen.evaluate(()=>audioProbe.played.includes('camera') && audioProbe.played.includes('success')));
    await pen.locator('[data-letter-action="place-word"]').click();
    await pen.locator('[data-opening-beat="thanks"]').waitFor();
    assert(await pen.evaluate(()=>audioProbe.played.includes('paper')));
    await pen.close();

    const ready=await pageAt('ready');
    await ready.locator('[data-letter-action="send"]').click();
    await ready.locator('.letter-completion').waitFor();
    assert(await ready.evaluate(()=>audioProbe.played.includes('complete')));
    await ready.close();
    const shop=await pageAt('shop');
    await shop.locator('[data-action="skip-photo"]').click();
    await shop.locator('.journey-item-card').waitFor();
    assert(await shop.evaluate(()=>audioProbe.played.includes('success')));
    await shop.locator('[data-action="pack"]').click();
    assert(await shop.evaluate(()=>audioProbe.played.includes('stamp')));
    await shop.close();

    for(const width of [320,342,390,507,1280]) {
        const layout=await pageAt('letter',width);
        await checkHeader(layout);
        if(width===390)await layout.screenshot({path:'work/audio-verification/letter-mobile.png'});
        await layout.close();
    }
    const unsupported=await pageAt('welcome',390,()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});
    assert(await unsupported.locator('[data-action="sound"]').isDisabled());
    await unsupported.locator('[data-letter-action="open"]').click();
    await unsupported.locator('[data-opening-beat="reply"]').waitFor();
    await unsupported.close();
    }
    const privateMode=await pageAt('welcome',390,()=>{
        const get=Storage.prototype.getItem, set=Storage.prototype.setItem;
        Storage.prototype.getItem=function(key){if(key==='kotoba-hunter-sound-v1')throw new Error('Storage disabled');return get.call(this,key);};
        Storage.prototype.setItem=function(key,value){if(key==='kotoba-hunter-sound-v1')throw new Error('Storage disabled');return set.call(this,key,value);};
    });
    await privateMode.locator('[data-letter-action="open"]').click();
    await privateMode.waitForFunction(()=>audioProbe.starts>0);
    await privateMode.locator('[data-action="sound"]').click();
    assert.equal(await privateMode.locator('[data-action="sound"]').getAttribute('aria-pressed'),'false');
    await privateMode.close();

    // Render the actual synth with OfflineAudioContext: nonempty, no clipping, and a silent tail.
    const source=await fs.readFile('game-audio.js','utf8'), levels=[];
    for(const cue of ['tap','camera','success','mismatch','paper','stamp','complete']){
        const offline=await browser.newPage();
        await offline.setContent('<button data-action="sound">sound</button>');
        await offline.evaluate(()=>{
            window.renderContext=new OfflineAudioContext(1,44100*2,44100);
            Object.defineProperty(renderContext,'state',{get:()=> 'running'});
            window.AudioContext=function(){return renderContext;};
        });
        await offline.addScriptTag({content:source});
        await offline.evaluate(()=>SemanticMap.audio.init());
        await offline.locator('button').click();
        const result=await offline.evaluate(async name=>{
            SemanticMap.audio.play(name);
            const buffer=await renderContext.startRendering(), samples=buffer.getChannelData(0);
            let peak=0,energy=0,tail=0;
            for(const x of samples){peak=Math.max(peak,Math.abs(x));energy+=x*x;}
            for(const x of samples.slice(-2205))tail=Math.max(tail,Math.abs(x));
            return {peak,energy,tail};
        },cue);
        assert(result.peak>.005 && result.peak<.4 && result.energy>0 && result.tail===0,`${cue} waveform`);
        levels.push({cue,...result});await offline.close();
    }
    assert.deepEqual(errors,[]);
    await fs.writeFile('work/audio-verification/results.json',JSON.stringify({levels,errors},null,2));
    console.log(process.argv.includes('--remaining')
        ? 'PASS: sound preference storage failure and seven actual synth waveforms; sound is nonempty, unclipped, and ends in silence.'
        : 'PASS: first gesture, mute persistence, Japanese/Chinese labels, camera → wordcard → paper, completion/stamp, 320–1280px layout, unavailable audio/storage, seven unclipped waveforms.');
} finally {await browser.close();}
