const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || '127.0.0.1';

const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${host}:${port}`);
    let file = decodeURIComponent(url.pathname);
    if (file === '/' || file === '') file = '/index.html';

    const target = path.normalize(path.join(root, file));
    if (!target.startsWith(root)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(target, (error, data) => {
        if (error) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }

        res.writeHead(200, {
            'Content-Type': types[path.extname(target).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        res.end(data);
    });
});

server.listen(port, host, () => {
    console.log(`SemanticMap server running: http://${host}:${port}/?dev=1`);
});
