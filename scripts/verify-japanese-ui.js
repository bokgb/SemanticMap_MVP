import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const origin=process.env.JOURNEY_TEST_ORIGIN||'http://127.0.0.1:8000';
const browser=await chromium.launch();
const chineseUI=/[这们谢张传识测页图邮笔叶见风饮备现让请从过对发]|照片|手帐|旅途|波可|米娜|索拉|关闭|重新|准备|任务|拍照|当前|定位/;
const errors=[];
try {
    const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
    page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
        localStorage.setItem('language','zh');
        localStorage.setItem('semantic-map-lang','zh');
        navigator.geolocation.watchPosition=(_,fail)=>{fail({code:1});return 1;};
        navigator.geolocation.clearWatch=()=>{};
    });
    async function japanese(label) {
        assert.equal(await page.locator('html').getAttribute('lang'),'ja',label);
        assert.equal(await page.evaluate(()=>window.SemanticMap.state.currentLang),'ja',label);
        assert.doesNotMatch(await page.locator('#courier-app').innerText(),chineseUI,label+' visible UI');
        const accessibleNames=await page.locator('#courier-app [aria-label]').evaluateAll(elements=>elements.filter(el=>el.checkVisibility()).map(el=>el.getAttribute('aria-label')).join('\n'));
        assert.doesNotMatch(accessibleNames,chineseUI,label+' accessible UI');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),label+' layout');
    }
    async function fixedDialog(label) {
        const close=page.locator('#courier-dialog>header [data-action="close"]');
        const footer=page.locator('#courier-dialog-footer button').first();
        const before=await close.boundingBox(),beforeFooter=await footer.boundingBox();
        await page.locator('#courier-dialog-body').evaluate(el=>el.scrollTop=el.scrollHeight);
        assert.equal((await close.boundingBox()).y,before.y,label+' fixed close');
        assert.equal((await footer.boundingBox()).y,beforeFooter.y,label+' fixed footer');
        assert(beforeFooter.y+beforeFooter.height<=page.viewportSize().height,label+' visible footer');
    }
    for(const start of ['welcome','reply','missing-pen','photo-world','pen','pen-thanks','letter','cute','drink','ready','sent','departure','route','shop-arrival','shop','shop-receipt','park','station','ending']) {
        await page.goto(origin+'/?test='+start,{waitUntil:'networkidle'});
        await japanese(start);
        const journal=page.locator('[data-action="journal"]').first();
        if(await journal.isVisible()) {
            await journal.click();
            await japanese(start+' journal');
            await fixedDialog(start+' journal');
            await page.locator('#courier-dialog>header [data-action="close"]').click();
        }
        if(['route','shop','park','station'].includes(start)) {
            await page.locator('[data-action="mode"]').click();
            await japanese(start+' mode');
            await page.locator('[data-action="field-mode"]').click();
            await japanese(start+' denied GPS');
        }
        if(start==='ending') {
            await page.locator('[data-action="restart"]').click();
            await japanese('restart dialog');await fixedDialog('restart dialog');
        }
    }
    await page.goto(origin+'/?test=departure',{waitUntil:'networkidle'});
    await page.locator('.courier-test-menu summary').click();
    await japanese('open local test menu');
    await page.locator('[data-action="close-test-menu"]').click();
    await page.locator('[data-action="language"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
    await page.reload({waitUntil:'networkidle'});await japanese('refresh resets Japanese');
    await page.goto(origin+'/?test=shop',{waitUntil:'networkidle'});
    await page.locator('[data-action="sample"]').click();await japanese('sample dialog');
    await page.locator('[data-sample="wrong"]').click();await japanese('wrong sample feedback');
    await page.locator('#courier-dialog>header [data-action="close"]').click();
    await page.route('**/api/gemini',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({match:false,object:'other',word:'コップ',kana:'こっぷ'})}]}}]})}));
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.locator('[data-action="retry-photo"]').waitFor();
    await japanese('recognition mismatch including goal');
    await page.locator('#courier-dialog>header [data-action="close"]').click();
    await page.unroute('**/api/gemini');
    await page.route('**/api/gemini',route=>route.fulfill({status:503,body:'Unavailable'}));
    await page.locator('#courier-file').setInputFiles('assets/lumi-avatar.png');
    await page.locator('[data-action="retry-photo"]').waitFor();await japanese('recognition unavailable');
    await fixedDialog('recognition unavailable');
    await page.locator('#courier-dialog>header [data-action="close"]').click();
    await page.locator('#courier-file').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('test')});
    assert.match(await page.locator('#courier-status').innerText(),/画像ファイル/);await japanese('invalid upload');
    for(const viewport of [{width:320,height:568},{width:507,height:1244}]) {
        await page.setViewportSize(viewport);
        await page.goto(origin+'/?test=departure',{waitUntil:'networkidle'});
        await japanese('mobile '+viewport.width);
        await page.locator('[data-action="journal"]').click();
        await fixedDialog('mobile journal '+viewport.width);await japanese('mobile journal');
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: Japanese default on 19 starting states, header/buttons/dialogs/journal/test menu/accessibility; refresh after Chinese returns to Japanese; GPS/upload/mismatch/service-error copy; fixed dialog controls at 320/390/507px. Recognition mocked.');
} finally {await browser.close();}
