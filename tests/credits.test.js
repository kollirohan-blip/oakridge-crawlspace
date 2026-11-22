// The end credits name what the game is made from: every Kenney kit whose license ships in
// assets/models, and three.js from vendor/. Add a kit and forget its credit, and this fails.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// the credit lines, in the order js/epilogue.js shows them
function creditLines() {
  const src = fs.readFileSync(path.join(ROOT, 'js/epilogue.js'), 'utf8');
  const m = src.match(/var CREDITS = \[([^\]]*)\]/);
  assert.ok(m, 'js/epilogue.js has a CREDITS list');
  const ids = m[1].match(/'[^']+'/g).map((s) => s.slice(1, -1));
  global.window = {};
  delete require.cache[require.resolve('../content/text.js')];
  require('../content/text.js');
  const data = global.window.OC.textData;
  delete global.window;
  return ids.map((id) => {
    assert.equal(typeof data[id], 'string', 'missing text ' + id);
    return data[id];
  });
}

test('the credits name every Kenney kit that ships with the game', () => {
  const text = creditLines().join('\n');
  const kits = fs
    .readdirSync(path.join(ROOT, 'assets/models'))
    .map((f) => f.match(/^LICENSE-kenney-(.+)\.txt$/))
    .filter(Boolean)
    .map((m) => m[1].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '));
  assert.ok(kits.length >= 4, 'found the kit licenses');
  assert.match(text, /Kenney/);
  assert.match(text, /CC0/);
  kits.forEach((k) => assert.ok(text.includes(k), 'the credits miss ' + k));
});

test('the credits name three.js and its license', () => {
  const text = creditLines().join('\n');
  assert.match(text, /three\.js/);
  assert.match(text, /MIT/);
});
