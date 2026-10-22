import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {nearestSpots} from '../lib/nearby-places.js';

const data = JSON.parse(await fs.readFile(new URL('../spotsData.json', import.meta.url), 'utf8'));
const kinugasa = {lat: 35.0325428, lng: 135.7240146};
const kyoto = nearestSpots(data, kinugasa, 3000);
assert.deepEqual(kyoto.missing, []);
assert.deepEqual(kyoto.stops.map(s => s.name), ['至徳館購買部', '小松原児童公園', '等持院・立命館大学衣笠キャンパス前']);
assert.deepEqual(kyoto.stops.map(s => s.distance), [111, 416, 523]);
assert.deepEqual(nearestSpots(data, {lat: 35.681, lng: 139.767}, 10000).missing, ['shop', 'park', 'station']);
const fixture = [
  {type: 'convenience', lat: 0.000453, lng: 0, name: 'Farther'},
  {type: 'convenience', lat: 0.000451, lng: 0, name: 'Closer'},
  {type: 'convenience', lat: 0, lng: 0, name: 'Private', access: 'private'},
  {type: 'park', lat: 0.001, lng: 0, name: '未知地点'},
  {type: 'station', lat: 0.002, lng: 0, name: 'Station'},
  {type: 'pharmacy', lat: 0, lng: 0, name: 'Not a task'},
  {type: 'park', lat: NaN, lng: 0}, null
];
const ranked = nearestSpots(fixture, {lat: 0, lng: 0}, 3000);
assert.deepEqual(ranked.stops.map(s => s.name), ['Closer', '公園', 'Station'], 'Unrounded distance wins; unknown names use Japanese');
assert.deepEqual(nearestSpots(fixture, {lat: 91, lng: 0}, 3000).missing, ['shop', 'park', 'station']);

const browser = await chromium.launch();
const origin = 'http://127.0.0.1:8000', saveKey = 'kotoba-hunter-progress-v1', errors = [], forbidden = [];
await fs.mkdir('work/nearby', {recursive: true});
try {
  const seed = await browser.newPage();
  await seed.goto(origin + '/?test=route');
  const checkpoint = await seed.evaluate(() => ({
    version: 1, letter: window.SemanticMap.letterTutorial.snapshot(), language: 'ja',
    progress: {index: 1, cards: [{step: 0, object: 'letter', word: '手紙', kana: 'てがみ', photo: ''}], done: false, receipt: false, mode: 'field', phase: 'travel', encounterStep: 0}
  }));
  await seed.close();

  async function setup({lat = kinugasa.lat, lng = kinugasa.lng, geo = 'success', serveData} = {}) {
    const context = await browser.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', permissions: ['geolocation'], geolocation: {latitude: lat, longitude: lng, accuracy: geo === 'coarse' ? 1800 : 12}});
    await context.addInitScript(({checkpoint, saveKey, geo}) => {
      if (!localStorage.getItem(saveKey)) localStorage.setItem(saveKey, JSON.stringify(checkpoint));
      localStorage.setItem('kotoba-hunter-before-play-v2', 'seen');
      if (geo === 'denied' || geo === 'timeout') navigator.geolocation.getCurrentPosition = (_success, fail) => setTimeout(() => fail({code: geo === 'denied' ? 1 : 3}), 0);
    }, {checkpoint, saveKey, geo});
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    let calls = 0;
    page.on('request', request => {
      if (/overpass|geoapify|places\.googleapis|\/api\/nearby/.test(request.url())) forbidden.push(request.url());
      if (new URL(request.url()).pathname === '/spotsData.json') calls++;
    });
    if (serveData) await page.route('**/spotsData.json', route => serveData(route, calls));
    await page.goto(origin, {waitUntil: 'domcontentloaded'});
    return {page, context, calls: () => calls};
  }
  const start = page => page.locator('#courier-actions [data-action="location-request"]').click();
  const savedRoute = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)).progress.route, saveKey);

  const ok = await setup();
  assert.equal(ok.calls(), 0, 'No dataset download or location search before the user requests it');
  await start(ok.page);
  await ok.page.locator('.journey-stop-card').waitFor();
  assert.equal(ok.calls(), 1);
  assert.deepEqual((await savedRoute(ok.page)).stops, kyoto.stops, 'Browser uses the actual existing file');
  assert.ok(!(await ok.page.locator('#courier-app').innerText()).match(/OIC|茨木|岩倉|未知地点/));
  assert.equal(await ok.page.locator('#courier-actions .play-feedback-link').count(), 0);
  await ok.page.screenshot({path: 'work/nearby/route-kinugasa.png', animations: 'disabled'});
  await ok.page.setViewportSize({width: 320, height: 568});
  await ok.page.waitForFunction(() => {
    const map = document.querySelector('#courier-map').getBoundingClientRect();
    return [...document.querySelectorAll('.courier-map-pin')].every(node => {
      const p = node.getBoundingClientRect();
      return p.left >= map.left && p.right <= map.right && p.top >= map.top && p.bottom <= map.bottom;
    });
  });
  const action = await ok.page.locator('#courier-actions .courier-primary').boundingBox();
  assert.ok(action.y >= 0 && action.y + action.height <= 569 && action.x >= 0 && action.x + action.width <= 321, 'Travel action fits a small phone');
  await ok.page.screenshot({path: 'work/nearby/route-kinugasa-small.png', animations: 'disabled'});
  const firstRoute = await savedRoute(ok.page);
  await ok.context.setGeolocation({latitude: 34.69, longitude: 135.5, accuracy: 10});
  await ok.page.reload();
  await ok.page.locator('.journey-stop-card').waitFor();
  assert.deepEqual(await savedRoute(ok.page), firstRoute, 'Moving or reloading never rerolls an in-progress route');
  assert.equal(ok.calls(), 1, 'Restoring a route needs no new dataset download');
  await ok.page.setViewportSize({width: 390, height: 844});
  await ok.page.locator('[data-action="arrive"]').click();
  await ok.page.locator('[data-action="shop-talk"]').click();
  async function sample(page) {
    await page.locator('#courier-actions [data-action="sample"]').click();
    await page.locator('[data-action="use-sample"]').click();
    await page.locator('.journey-item-card').waitFor();
  }
  await sample(ok.page);
  await ok.page.locator('[data-action="pack"]').click();
  await ok.page.locator('[data-action="next"]').click();
  await ok.page.locator('[data-action="arrive"]').click();
  await sample(ok.page);
  await ok.page.locator('[data-action="next"]').click();
  await ok.page.locator('[data-action="arrive"]').click();
  await ok.page.route('**/api/gemini', async route => {
    const prompt = route.request().postDataJSON().contents[0].parts[0].text;
    assert.ok(!prompt.includes('Ibaraki') && prompt.includes('Any real station name'));
    await route.fulfill({json: {candidates: [{content: {parts: [{text: JSON.stringify({match: true, object: 'station', word: '等持院駅', kana: 'とうじいんえき'})}]}}]}});
  });
  await ok.page.locator('#courier-album').setInputFiles('assets/lumi-avatar.png');
  await ok.page.locator('.journey-item-card').waitFor();
  await ok.page.locator('[data-action="next"]').click();
  await ok.page.locator('#courier-dialog-footer [data-action="deliver-letter"]').click();
  await ok.page.locator('.journey-ending .wordbook-card').first().waitFor();
  assert.equal(await ok.page.locator('.wordbook-card').count(), 7);
  assert.equal(await ok.page.locator('#courier-actions .play-feedback-link').count(), 1);
  await ok.page.screenshot({path: 'work/nearby/ending-kinugasa.png', animations: 'disabled'});
  await ok.context.close();

  const osaka = await setup({lat: 34.69, lng: 135.5});
  await start(osaka.page);
  await osaka.page.locator('.journey-stop-card').waitFor();
  assert.deepEqual((await savedRoute(osaka.page)).stops.map(s => s.name), ['ファミリーマート', '京町堀公園', '淀屋橋']);
  await osaka.context.close();

  const wider = await setup({lat: 35.1, lng: 135.75});
  await start(wider.page);
  await wider.page.locator('[data-action="nearby-wider"]').click();
  await wider.page.locator('.journey-stop-card').waitFor();
  assert.equal((await savedRoute(wider.page)).radius, 10000);
  assert.equal(wider.calls(), 1, 'Widening reuses downloaded data');
  await wider.context.close();

  for (const coordinates of [{lat: 35.681, lng: 139.767}, {lat: 0, lng: 0}]) {
    const outside = await setup(coordinates);
    await start(outside.page);
    await outside.page.locator('[data-action="nearby-wider"]').click();
    await outside.page.locator('#courier-actions [data-action="nearby-search"]').waitFor();
    assert.equal(await outside.page.locator('.journey-stop-card').count(), 0);
    assert.equal(await savedRoute(outside.page), undefined, 'No distant OIC or invented fallback');
    await outside.page.screenshot({path: `work/nearby/outside-${coordinates.lat}.png`, animations: 'disabled'});
    await outside.page.locator('#courier-actions [data-action="preview-mode"]').click();
    await outside.page.locator('.journey-stop-card').waitFor();
    assert.equal(outside.calls(), 1);
    assert.ok(await outside.page.locator('#courier-map').isHidden());
    await outside.context.close();
  }
  for (const geo of ['denied', 'timeout', 'coarse']) {
    const test = await setup({geo});
    await start(test.page);
    await test.page.waitForTimeout(200);
    assert.equal(test.calls(), 0);
    assert.equal(await test.page.locator('.journey-stop-card').count(), 0);
    await test.page.locator('#courier-actions [data-action="preview-mode"]').click();
    await test.page.locator('.journey-stop-card').waitFor();
    await test.context.close();
  }
  const failure = await setup({serveData: (route, calls) => calls === 1 ? route.fulfill({status: 503, body: 'Unavailable'}) : route.continue()});
  await start(failure.page);
  await failure.page.locator('#courier-actions [data-action="nearby-search"]').waitFor();
  assert.equal(await failure.page.locator('.journey-stop-card').count(), 0);
  await failure.page.locator('#courier-actions [data-action="nearby-search"]').click();
  await failure.page.locator('.journey-stop-card').waitFor();
  assert.equal(failure.calls(), 2, 'Dataset download can be retried after a failure');
  await failure.context.close();

  let release;
  const held = new Promise(resolve => {release = resolve;});
  const cancelled = await setup({serveData: async route => {await held;await route.fulfill({json: data}).catch(() => {});}});
  const download = cancelled.page.waitForRequest('**/spotsData.json');
  await start(cancelled.page);
  await download;
  await cancelled.page.locator('#courier-actions [data-action="preview-mode"]').click();
  release();
  await cancelled.page.locator('.journey-stop-card').waitFor();
  assert.equal(await savedRoute(cancelled.page), undefined);
  await cancelled.context.close();

  assert.deepEqual(forbidden, [], 'No external POI API and no coordinates uploaded to a lookup endpoint');
  assert.deepEqual(errors, []);
  console.log('PASS: actual exported data → nearest destinations in Kinugasa/Osaka → full station delivery; saved route after movement/reload; no POI API; no OIC fallback outside coverage; 10km expansion/cache; Japanese unnamed spots; GPS denied/timeout/coarse; data retry and cancellation; small-screen action visibility. GPS simulated; only Gemini recognition is stubbed in the full journey.');
} finally {
  await browser.close();
}
