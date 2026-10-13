import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch(),errors=[],report=[];
const sequence=[['food','poco-great'],['cute','poco-lovely'],['drink','poco-well-done']];
async function pageAt({reducedMotion='no-preference',state='letter'}={}){
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion});
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
        window.praiseProbe={calls:[],voices:[],success:[]};
        const create=AudioContext.prototype.createBufferSource;
        AudioContext.prototype.createBufferSource=function(){
            const source=create.call(this),start=source.start.bind(source);
            source.start=(...args)=>{
                if(source.buffer?.duration>.31)praiseProbe.voices.push({duration:source.buffer.duration,at:performance.now(),cardVisible:!!document.querySelector('.letter-word-reward')});
                return start(...args);
            };
            return source;
        };
    });
    await page.goto(`http://127.0.0.1:8000/?test=${state}`,{waitUntil:'domcontentloaded'});
    await page.locator(state==='pen'?'[data-letter-action="skip-pen"]':'[data-letter-action="test-answer"]').waitFor();
    await page.evaluate(()=>{
        const dialogue=SemanticMap.audio.dialogue,play=SemanticMap.audio.play;
        SemanticMap.audio.play=name=>{
            if(name==='success')praiseProbe.success.push(performance.now());
            return play(name);
        };
        SemanticMap.audio.dialogue=(key,cue,delayMs)=>{
            const accepted=dialogue(key,cue,delayMs);
            if(key.startsWith('letter:reward:')||key.startsWith('letter:encourage:'))praiseProbe.calls.push({
                key,cue,accepted,delayMs,at:performance.now(),
                cardVisible:!!document.querySelector('.letter-word-reward'),
            });
            return accepted;
        };
    });
    return page;
}
async function fill(page,slot,cue,index=0){
    await page.locator('[data-letter-action="test-answer"]').click();
    await page.locator('.letter-word-reward').waitFor();
    assert.equal(await page.evaluate(()=>praiseProbe.calls.length),index+1,'Word card immediately requests one encouragement');
    const call=await page.evaluate(()=>praiseProbe.calls.at(-1));
    assert.equal(call.cue,cue);
    assert.equal(call.key,`letter:reward:${slot}`);
    assert.equal(call.cardVisible,true);
    assert.equal(call.delayMs,0,'Reward encouragement has no dialogue delay');
    const successAt=await page.evaluate(()=>praiseProbe.success.at(-1));
    assert.ok(Math.abs(call.at-successAt)<40,'Praise is requested together with the success sound');
    return call;
}
try{
    const page=await pageAt();
    const clips=JSON.parse(await fs.readFile('assets/audio/reactions/amitaro-sources.json','utf8')).clips
        .filter(clip=>sequence.some(([,cue])=>cue===clip.cue));
    const decoded=await page.evaluate(async clips=>{
        const context=new OfflineAudioContext(1,44100,44100),result=[];
        for(const clip of clips){
            const response=await fetch(`assets/audio/reactions/${clip.cue}.wav?v=amitaro-card-praise-1`);
            if(!response.ok)throw new Error('Missing encouragement clip');
            const buffer=await context.decodeAudioData(await response.arrayBuffer());
            const samples=buffer.getChannelData(0);let power=0;
            for(const value of samples)power+=value*value;
            result.push({cue:clip.cue,seconds:buffer.duration,rms:Math.sqrt(power/samples.length)});
        }
        return result;
    },clips);
    decoded.forEach(clip=>assert.ok(clip.rms>.01&&clip.rms<.074));
    for(let i=0;i<sequence.length;i++){
        const [slot,cue]=sequence[i];
        const call=await fill(page,slot,cue,i);assert.ok(call.accepted);
        const duration=clips.find(clip=>clip.cue===cue).seconds;
        await page.waitForFunction(duration=>praiseProbe.voices.some(value=>Math.abs(value.duration-duration)<.003),duration);
        const voice=await page.evaluate(()=>praiseProbe.voices.at(-1));
        assert.equal(voice.cardVisible,true,'Voice starts while the word card is displayed');
        assert.ok(voice.at-call.at<250,'Voice promptly accompanies the card reward');
        await page.locator('[data-letter-action="place-word"]').click();
        if(i<2)await page.locator(`[data-letter-beat="${sequence[i+1][0]}"].letter-beat-current`).waitFor();
        else await page.locator('[data-letter-action="send"]').waitFor();
    }
    await page.locator('[data-action="language"]').click();
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>praiseProbe.calls.length),3,'Handwriting and redraws do not repeat praise');
    report.push({mode:'normal',calls:await page.evaluate(()=>praiseProbe.calls),decoded});
    await page.close();

    const reduced=await pageAt({reducedMotion:'reduce'});
    await fill(reduced,'food','poco-great');
    await reduced.locator('[data-letter-action="place-word"]').click();
    await reduced.locator('[data-letter-beat="cute"].letter-beat-current').waitFor();
    report.push({mode:'reduced-motion',calls:await reduced.evaluate(()=>praiseProbe.calls)});
    await reduced.close();

    const muted=await pageAt();
    await muted.locator('[data-action="sound"]').click();
    const call=await fill(muted,'food','poco-great');
    assert.equal(call.accepted,false);
    await muted.locator('[data-letter-action="place-word"]').click();
    await muted.locator('[data-letter-beat="cute"].letter-beat-current').waitFor();
    assert.deepEqual(await muted.evaluate(()=>praiseProbe.voices),[]);
    report.push({mode:'muted',calls:await muted.evaluate(()=>praiseProbe.calls)});
    await muted.close();

    const reset=await pageAt();
    await reset.locator('[data-letter-action="test-answer"]').click();
    await reset.locator('[data-letter-action="place-word"]').click();
    await reset.locator('.letter-word-reward').waitFor({state:'detached'});
    await reset.locator('.courier-test-menu summary').click();
    await reset.locator('[data-test-start="welcome"]').click();
    await reset.locator('[data-opening-beat="welcome"]').waitFor();
    await reset.waitForTimeout(1500);
    assert.equal(await reset.evaluate(()=>praiseProbe.calls.length),1,'Restart does not trigger delayed encouragement');
    await reset.close();
    const pen=await pageAt({state:'pen'});
    await pen.locator('[data-letter-action="skip-pen"]').click();
    await pen.locator('.letter-word-reward').waitFor();
    const penCall=await pen.evaluate(()=>praiseProbe.calls.at(-1));
    assert.equal(penCall.key,'letter:reward:pen');assert.equal(penCall.cue,'poco-great');assert.ok(penCall.cardVisible);
    await pen.close();
    assert.deepEqual(errors,[]);
    await fs.mkdir('work/letter-encouragement',{recursive:true});
    await fs.writeFile('work/letter-encouragement/browser-check.json',JSON.stringify({report,errors},null,2));
    console.log('PASS: correct-photo word cards request immediate human encouragement alongside success; actual voice starts on the card; handwriting never repeats praise; pen, reduced motion, mute and restart work.');
}finally{await browser.close();}
