import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'screenshots');
const outputFile = path.join(outputDir, 'mobile-preview.html');
const host = '127.0.0.1';
const port = Number(process.env.PORT || 9321);
const baseURL = `http://${host}:${port}`;

const routes = [
  { path: '/', title: 'Home', readySelector: '#ui-layer' },
  { path: '/cleaner.html', title: 'Data Cleaner', readySelector: '.container' }
];

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    const url = new URL(req.url, baseURL);
    let filePath = decodeURIComponent(url.pathname);
    if (filePath === '/' || filePath === '') filePath = '/index.html';

    const target = path.normalize(path.join(root, filePath));
    if (!target.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(target)
      .then(data => {
        res.writeHead(200, {
          'Content-Type': contentTypes[path.extname(target).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store'
        });
        res.end(data);
      })
      .catch(() => {
        res.writeHead(404);
        res.end('Not found');
      });
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolve);
  });
}

function close(server) {
  server.closeAllConnections?.();
  return new Promise(resolve => server.close(resolve));
}

async function installOfflineLeafletStubs(page) {
  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', route => {
    route.fulfill({ status: 200, contentType: 'text/css', body: '' });
  });

  await page.route('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', route => {
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: `
        window.L = {
          map: () => ({
            setView() { return this; },
            on() { return this; },
            addLayer() { return this; },
            removeLayer() { return this; },
            hasLayer() { return false; },
            createPane() { return this; },
            getPane() { return { style: {} }; },
            setMaxBounds() { return this; },
            getZoom() { return 17; },
            latLngToContainerPoint() { return { x: 200, y: 360 }; }
          }),
          tileLayer: () => ({ addTo() { return this; } }),
          layerGroup: () => ({ addTo() { return this; }, clearLayers() {}, addLayer() {}, eachLayer() {} }),
          marker: () => ({ addTo() { return this; }, bindPopup() { return this; }, openPopup() {}, setIcon() {}, off() {}, on() {} }),
          circle: () => ({ addTo() { return this; }, setStyle() {}, bindTooltip() { return this; } }),
          polygon: () => ({ addTo() { return this; }, setStyle() {}, bindTooltip() { return this; } }),
          polyline: () => ({ addTo() { return this; }, setStyle() {} }),
          divIcon: options => options,
          latLng: (lat, lng) => ({
            lat,
            lng,
            distanceTo(other) {
              const point = Array.isArray(other) ? { lat: other[0], lng: other[1] } : other;
              const dx = (Number(lat) - Number(point.lat)) * 111320;
              const dy = (Number(lng) - Number(point.lng)) * 111320;
              return Math.sqrt(dx * dx + dy * dy);
            }
          }),
          latLngBounds: (...bounds) => ({ bounds })
        };
      `
    });
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function renderGallery(captures) {
  const generatedAt = new Date().toLocaleString('zh-CN', {
    hour12: false,
    timeZone: 'Asia/Tokyo'
  });

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mobile Preview Gallery</title>
  <style>
    :root { color-scheme: light; --ink: #172023; --muted: #66777c; --line: rgba(23,32,35,.12); --panel: #fff; --bg: #eef3f2; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--ink); font-family: Arial, "Microsoft YaHei", sans-serif; }
    header { padding: 24px clamp(16px, 4vw, 42px) 10px; }
    h1 { margin: 0 0 6px; font-size: clamp(24px, 4vw, 38px); letter-spacing: 0; }
    .meta { color: var(--muted); font-size: 14px; font-weight: 700; }
    main { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; padding: 18px clamp(16px, 4vw, 42px) 42px; align-items: start; }
    article { overflow: hidden; border: 1px solid var(--line); border-radius: 12px; background: var(--panel); box-shadow: 0 12px 34px rgba(23,32,35,.1); }
    .card-head { display: flex; justify-content: space-between; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
    h2 { margin: 0; font-size: 17px; }
    code { color: var(--muted); font-size: 13px; font-weight: 800; }
    img { display: block; width: 100%; height: auto; background: #071214; }
  </style>
</head>
<body>
  <header>
    <h1>Mobile Preview Gallery</h1>
    <div class="meta">Generated at ${escapeHtml(generatedAt)} / iPhone 13 / ${captures.length} routes</div>
  </header>
  <main>
    ${captures.map(capture => `
      <article>
        <div class="card-head">
          <h2>${escapeHtml(capture.title)}</h2>
          <code>${escapeHtml(capture.path)}</code>
        </div>
        <img src="data:image/png;base64,${capture.base64}" alt="${escapeHtml(capture.title)} mobile screenshot">
      </article>
    `).join('')}
  </main>
</body>
</html>`;
}

function openFile(filePath) {
  if (process.env.CI) return;
  const resolved = path.resolve(filePath);
  const command = process.platform === 'win32'
    ? 'cmd'
    : process.platform === 'darwin'
      ? 'open'
      : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/c', 'start', '', resolved]
    : [resolved];

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  });
  child.unref();
}
async function captureRoute(context, route) {
  const page = await context.newPage();
  await installOfflineLeafletStubs(page);
  await page.goto(`${baseURL}${route.path}`, { waitUntil: 'domcontentloaded' });
  await page.locator(route.readySelector).waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(750);

  const buffer = await page.screenshot({
    fullPage: true,
    animations: 'disabled'
  });
  await page.close();

  return {
    ...route,
    base64: buffer.toString('base64')
  };
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const server = createStaticServer();
  await listen(server);

  let browser;
  try {
    browser = await chromium.launch();
    const context = await browser.newContext({
      ...devices['iPhone 13'],
      locale: 'zh-CN',
      timezoneId: 'Asia/Tokyo',
      geolocation: { latitude: 34.81036, longitude: 135.56108 },
      permissions: ['geolocation']
    });

    const captures = [];
    for (const route of routes) {
      captures.push(await captureRoute(context, route));
    }
    await context.close();

    await fs.writeFile(outputFile, renderGallery(captures), 'utf8');
    console.log(`Mobile preview gallery generated: ${outputFile}`);
    openFile(outputFile);
  } finally {
    if (browser) await browser.close();
    await close(server);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

