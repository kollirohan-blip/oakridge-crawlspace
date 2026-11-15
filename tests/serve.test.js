const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const { createServer } = require('../tools/serve.js');

function get(port, p) {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: p }, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'], body }));
      })
      .on('error', reject);
  });
}

test('serves files from the root with a content type, and refuses to leave the root', async () => {
  const server = createServer(path.join(__dirname, '..'));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  try {
    const ok = await get(port, '/package.json');
    assert.equal(ok.status, 200);
    assert.match(ok.type, /json/);
    const escape = await get(port, '/../../../Windows/win.ini');
    assert.ok(escape.status === 403 || escape.status === 404);
    const missing = await get(port, '/nope.html');
    assert.equal(missing.status, 404);
  } finally {
    server.close();
  }
});
