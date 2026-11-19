// The game's own files hold no stray control characters. The menu arrow was once a raw \x15 byte where a
// "\25B6" escape was meant, so every hovered menu button showed a box and "B6". Tabs and line ends only.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DIRS = ['css', 'js', 'content']; // the game's own code and text (vendor/ is Three.js, not ours)
const EXT = /\.(js|css|html)$/;

function gameFiles() {
  const out = [path.join(ROOT, 'index.html')];
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (EXT.test(e.name)) out.push(p);
    });
  }
  DIRS.forEach((d) => walk(path.join(ROOT, d)));
  return out;
}

test('no control characters other than tab and line ends in the game files', () => {
  const bad = [];
  gameFiles().forEach((f) => {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      const m = line.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
      if (m) bad.push(path.relative(ROOT, f) + ':' + (i + 1) + ' has \\x' + m[0].charCodeAt(0).toString(16).padStart(2, '0'));
    });
  });
  assert.deepEqual(bad, []);
});
