import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const browser=await chromium.launch();
const errors=[],report=[],origin='http://127.0.0.1:8000';
await fs.mkdir('work/location-access',{recursive:true});
async function setup({mock=true,permission='prompt',outcome='success',queryUnsupported=false,noGeo=false,insecure=false,width=390,height=844,inApp=false,route='before-play',stubMap=false}={}){
    const context=await browser.newContext({viewport:{width,height},geolocation:{latitude:35.6812,longitude:139.7671,accuracy:20},...(mock?{}:{permissions:['geolocation']}),...(inApp?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) MicroMessenger/8.0'}:{})});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(({mock,permission,outcome,queryUnsupported,noGeo,insecure})=>{
        window.locationProbe={gets:0,watches:0,clears:0,views:[]};
        const get=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation),watch=navigator.geolocation.watchPosition.bind(navigator.geolocation),clear=navigator.geolocation.clearWatch.bind(navigator.geolocation);
        const state={state:permission,onchange:null};
        window.geoHarness={outcome,setPermission(value){state.state=value;state.onchange?.();}};
        if(mock||queryUnsupported)navigator.permissions.query=async()=>{if(queryUnsupported)throw new TypeError('Permission query unsupported');return state;};
        navigator.geolocation.getCurrentPosition=(success,error,options)=>{
            locationProbe.gets++;
            if(!mock)return get(success,error,options);
            if(geoHarness.outcome==='pending'){geoHarness.success=success;geoHarness.error=error;return;}
            setTimeout(()=>{const result=geoHarness.outcome;
                if(result==='success'||result==='approximate')success({coords:{latitude:35.6812,longitude:139.7671,accuracy:result==='approximate'?650:20}});
                else error({code:result==='denied'?1:result==='timeout'?3:2});
            },30);
        };
        navigator.geolocation.watchPosition=(...args)=>{locationProbe.watches++;return mock?123:watch(...args);};
        navigator.geolocation.clearWatch=(id)=>{locationProbe.clears++;if(!mock)clear(id);};
        if(noGeo)Object.defineProperty(navigator,'geolocation',{value:undefined,configurable:true});
        if(insecure)Object.defineProperty(window,'isSecureContext',{value:false,configurable:true});
    },{mock,permission,outcome,queryUnsupported,noGeo,insecure});
    if(stubMap){
        await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',r=>r.fulfill({contentType:'application/javascript',body:`
            const layer=()=>({addTo(){return this;},clearLayers(){},on(){return this;}});
            window.L={map:()=>({setView(center,zoom){locationProbe.views.push({center,zoom});return this;},fitBounds(){return this;},invalidateSize(){return this;},removeLayer(){return this;}}),tileLayer:layer,polyline:layer,layerGroup:layer,divIcon:o=>o,marker:(coords,options)=>{const node=document.createElement('div');node.className=options.icon.className;node.innerHTML=options.icon.html;node.dataset.coordinates=JSON.stringify(coords);return {addTo(){if(node.className==='journey-player-marker')document.querySelector('#courier-map').append(node);return this;},on(){return this;},setLatLng(c){node.dataset.coordinates=JSON.stringify(c);},setIcon(i){node.innerHTML=i.html;},remove(){node.remove();}};}};
        `}));
        await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',r=>r.fulfill({body:'',contentType:'text/css'}));
    }
    await page.goto(origin+'/?test='+route,{waitUntil:'domcontentloaded'});
    await page.locator('#courier-app').waitFor();
    return {page,context};
}
async function state(page,value){await page.locator(`[data-location-state][data-state="${value}"]`).waitFor();}
try{
    const initial=await setup();
    await state(initial.page,'prompt');
    assert.equal(await initial.page.evaluate(()=>locationProbe.gets),0,'Checking permission does not request location');
    await initial.page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    await initial.page.screenshot({path:'work/location-access/permission-prompt-mobile.png',animations:'disabled'});
    await initial.page.locator('[data-action="location-request"]').click();await state(initial.page,'located');
    assert.equal(await initial.page.evaluate(()=>locationProbe.gets),1);
    await initial.page.locator('[data-action="begin-play"]').click();
    await initial.page.locator('[data-opening-beat="welcome"]').waitFor();
    await initial.context.close();
    report.push('First visit detects permission without requesting it; explicit button obtains coordinates and game starts.');

    const native=await setup({mock:false,route:'route',stubMap:true});
    assert.equal(await native.page.evaluate(()=>locationProbe.gets),0);
    assert.equal(await native.page.locator('.journey-player-marker').count(),0,'No OIC fallback player marker');
    assert.ok((await native.page.locator('.courier-location-map').innerText()).includes('配達エリア：OIC'));
    await native.page.locator('[data-action="location-settings"]').click();await state(native.page,'granted');
    await native.page.locator('[data-action="location-request"]').click();await state(native.page,'located');
    assert.deepEqual(JSON.parse(await native.page.locator('.journey-player-marker').getAttribute('data-coordinates')),[35.6812,139.7671]);
    assert.deepEqual(await native.page.evaluate(()=>locationProbe.views.at(-1).center),[35.6812,139.7671]);
    await native.page.locator('#courier-dialog [data-action="close"]').first().click();
    await native.page.locator('[data-action="language"]').click();
    assert.deepEqual(await native.page.evaluate(()=>locationProbe.views.at(-1).center),[35.6812,139.7671],'Rendering does not snap the camera back to OIC');
    await native.page.locator('.courier-mode-btn').click();
    await native.page.locator('[data-action="field-mode"]').click();
    assert.equal(await native.page.evaluate(()=>locationProbe.watches),1,'Walking mode watches only after explicit location use');
    await native.context.clearPermissions();
    await native.page.waitForFunction(()=>!document.querySelector('.journey-player-marker'));
    assert.ok(await native.page.evaluate(()=>locationProbe.clears>0),'Revoking permission stops watching');
    assert.ok((await native.page.locator('[data-location-map-status]').innerText()).includes('尚未获取'));
    await native.context.close();
    report.push('Native browser geolocation uses actual Tokyo coordinates, keeps the view after rendering, and removes marker when permission is revoked.');

    const denied=await setup({outcome:'denied',width:320,height:568,inApp:true});
    await state(denied.page,'prompt');
    await denied.page.locator('[data-action="location-request"]').click();await state(denied.page,'denied');
    assert.ok(await denied.page.locator('[data-location-help]').getAttribute('open')!==null);
    assert.ok(await denied.page.locator('[data-action="location-request"]').isDisabled());
    assert.ok(await denied.page.locator('.permission-browser-in-app').count());
    await denied.page.locator('#courier-dialog-body').evaluate(e=>e.scrollTop=e.scrollHeight);
    for(const selector of ['#courier-dialog-title','[data-action="begin-play"]']){
        const box=await denied.page.locator(selector).boundingBox();assert.ok(box&&box.y>=0&&box.y+box.height<=568);
    }
    assert.ok(await denied.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await denied.page.screenshot({path:'work/location-access/permission-denied-small.png',animations:'disabled'});
    await denied.page.setViewportSize({width:390,height:844});
    await denied.page.locator('[data-location-state]').scrollIntoViewIfNeeded();
    await denied.page.screenshot({path:'work/location-access/permission-help-mobile.png',animations:'disabled'});
    await denied.page.evaluate(()=>{geoHarness.outcome='success';geoHarness.setPermission('granted');});
    await state(denied.page,'granted');
    await denied.page.locator('[data-action="location-request"]').click();await state(denied.page,'located');
    await denied.page.locator('[data-action="begin-play"]').click();
    await denied.page.locator('[data-opening-beat="welcome"]').waitFor();
    await denied.context.close();
    report.push('Denied permission expands settings help, in-app browser advice appears, settings changes recover without reload, controls stay visible at 320×568.');

    for(const result of ['timeout','unavailable','approximate']){
        const test=await setup({outcome:result});await state(test.page,'prompt');
        await test.page.locator('[data-action="location-request"]').click();await state(test.page,result);
        await test.page.evaluate(()=>{geoHarness.outcome='success';});
        await test.page.locator('[data-action="location-request"]').click();await state(test.page,'located');
        await test.context.close();
    }
    const unknown=await setup({queryUnsupported:true});await state(unknown.page,'unknown');
    await unknown.page.evaluate(()=>{geoHarness.outcome='denied';});
    await unknown.page.locator('[data-action="location-request"]').click();await state(unknown.page,'denied');
    await unknown.page.evaluate(()=>{geoHarness.outcome='success';});
    await unknown.page.locator('[data-action="location-recheck"]').click();await state(unknown.page,'unknown');
    await unknown.page.locator('[data-action="location-request"]').click();await state(unknown.page,'located');await unknown.context.close();
    for(const options of [{noGeo:true,status:'unsupported'},{insecure:true,status:'insecure'}]){
        const test=await setup(options);await state(test.page,options.status);
        assert.ok(await test.page.locator('[data-action="location-request"]').isDisabled());
        await test.page.locator('[data-action="begin-play"]').click();await test.page.locator('[data-opening-beat="welcome"]').waitFor();
        assert.equal(await test.page.evaluate(()=>locationProbe.gets),0);await test.context.close();
    }
    report.push('Timeout, unavailable, low-accuracy and unsupported permission query recover; missing geolocation and insecure connection never block playing.');

    const late=await setup({outcome:'pending'});await state(late.page,'prompt');
    await late.page.clock.install();
    await late.page.locator('[data-action="location-request"]').click();await state(late.page,'locating');
    await late.page.clock.runFor(16001);await state(late.page,'timeout');
    await late.page.evaluate(()=>geoHarness.success({coords:{latitude:34.81,longitude:135.56,accuracy:20}}));
    await state(late.page,'timeout');await late.context.close();
    report.push('No-response watchdog ends loading; late stale GPS result cannot override timeout.');

    const expired=await setup({route:'route',stubMap:true});
    await expired.page.clock.install();
    await expired.page.locator('[data-action="location-settings"]').click();await state(expired.page,'prompt');
    await expired.page.locator('[data-action="location-request"]').click();
    await expired.page.clock.runFor(40);await state(expired.page,'located');
    await expired.page.clock.runFor(120002);await state(expired.page,'granted');
    assert.equal(await expired.page.locator('.journey-player-marker').count(),0);
    await expired.context.close();
    report.push('A stale location expires and is no longer presented as the current position.');

    const journal=await setup({route:'letter'});
    await journal.page.locator('[data-action="journal"]').click();
    await journal.page.locator('.permission-journal-link').click();await state(journal.page,'prompt');
    await journal.page.locator('#courier-dialog [data-action="close"]').first().click();
    await journal.page.locator('[data-letter-slot="food"]').waitFor();await journal.context.close();
    report.push('Permission help is reachable from the journal without losing the current game.');
    assert.deepEqual(errors,[]);
    const output={status:'PASS',report,errors};
    await fs.writeFile('work/location-access/report.json',JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));
}finally{await browser.close();}
