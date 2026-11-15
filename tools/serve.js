// Tiny static file server, for testing the game in a real browser. Not used to play it
// (index.html opens straight from disk). Usage: node tools/serve.js  (PORT env var overrides 8123)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function createServer(root) {
  const base = path.resolve(root);
  return http.createServer((req, res) => {
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch (e) {
      res.writeHead(400).end('bad request');
      return;
    }
    let file = path.resolve(base, '.' + pathname);
    if (file !== base && !file.startsWith(base + path.sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.stat(file, (err, st) => {
      if (!err && st.isDirectory()) file = path.join(file, 'index.html');
      fs.readFile(file, (err2, data) => {
        if (err2) {
          res.writeHead(404).end('not found');
          return;
        }
        res.writeHead(200, {
          'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
          'Cache-Control': 'no-store',
        });
        res.end(data);
      });
    });
  });
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 8123;
  createServer(path.join(__dirname, '..')).listen(port, '127.0.0.1', () => {
    console.log('serving on http://127.0.0.1:' + port);
  });
}

module.exports = { createServer };
