// Rohan's rule: at most three jump scares in the whole episode, each followed by a relief beat
// (docs/story-v2.md): the flash photo's eye (The Call), the closet burst (The Call, only when you fail)
// and his face at the car glass (The Search). A jump scare here is the 'sting' sound, so every place
// that plays it is listed below. Fail screens in The Search play it too: a fail's scare is part of
// failing, and each one plays only the first time (js/engine/checkpoint.js).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// file -> how many places play the sting, and what each one is
const ALLOWED = {
  'js/acts/act3.js': 2, // jump scare 1, the eye in the flash photo; jump scare 2, the closet burst on a failed bluff
  'js/acts/act4.js': 2, // jump scare 3, his face at the car glass; the first time you fail The Search
};

function stings() {
  const found = {};
  function walk(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return walk(p);
      if (!/\.js$/.test(e.name)) return;
      const rel = path.relative(ROOT, p).split(path.sep).join('/');
      if (rel === 'js/audio.js') return; // where the sound is made, not played
      const n = (fs.readFileSync(p, 'utf8').match(/\(\s*'sting'/g) || []).length;
      if (n) found[rel] = n;
    });
  }
  walk(path.join(ROOT, 'js'));
  return found;
}

test('the sting plays only at the three jump scares (and a first fail in The Search)', () => {
  assert.deepEqual(stings(), ALLOWED);
});
