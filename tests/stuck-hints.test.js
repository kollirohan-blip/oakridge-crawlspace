const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { HINTS, TEXT, hintText, busyFor, REASONS } = require('../js/engine/stuck.js');

// Phase 8 (P16): what the stall nudge says, and when a night's own state rules out "I'm stuck".

test('only the three nights with a to-do list get nudges; the set pieces get none', () => {
  assert.deepEqual(Object.keys(HINTS).sort(), ['act1', 'act2', 'day2']);
});

test('every hinted task is a real task on that night (no typo leaves a hint that can never fire)', () => {
  Object.keys(HINTS).forEach((act) => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'acts', act + '.js'), 'utf8');
    Object.keys(HINTS[act]).forEach((id) => {
      assert.ok(src.includes("id: '" + id + "'"), act + ' has no task ' + id);
    });
  });
});

test('a hint that waits for another task names one on the same night', () => {
  Object.keys(HINTS).forEach((act) => {
    Object.keys(HINTS[act]).forEach((id) => {
      [].concat(HINTS[act][id].after || []).forEach((need) => {
        assert.ok(HINTS[act][need], act + '.' + id + ' waits for ' + need + ', which is not a task here');
      });
    });
  });
});

test('the washing up waits for dinner, and the groceries wait for getting inside', () => {
  assert.equal(HINTS.act1.washUp.after, 'dinner');
  assert.equal(HINTS.act2.groceries.after, 'inside');
});

test('the tasks a night resolves on its own (the hallway pic, finding Cooper, the phone) get no nudge', () => {
  assert.equal(HINTS.act1.photo, undefined);
  assert.equal(HINTS.act1.findCooper, undefined);
  assert.equal(HINTS.act2.landline, undefined);
});

test('each hint has its own line id, and the text list has every hint, refusal and the move', () => {
  assert.equal(hintText('act1', 'washUp'), 'stuck.hint.act1.washUp');
  const want = [];
  Object.keys(HINTS).forEach((act) => Object.keys(HINTS[act]).forEach((id) => want.push(hintText(act, id))));
  REASONS.forEach((r) => want.push('stuck.no.' + r));
  want.push('stuck.moved');
  assert.deepEqual(TEXT.slice().sort(), want.sort());
});

test('the game has every line, and each is hand-written (no two the same)', () => {
  global.window = {};
  require('../content/text.js');
  const data = global.window.OC.textData;
  TEXT.forEach((id) => assert.ok(typeof data[id] === 'string' && data[id].length > 10, 'missing ' + id));
  const lines = TEXT.map((id) => data[id]);
  assert.equal(new Set(lines).size, lines.length);
  delete global.window;
});

test('under the house is the crawl; the drive and the Gas-N-Go are away or busy', () => {
  assert.equal(busyFor('act2', { inCrawl: true }), 'crawl');
  assert.equal(busyFor('act2', { inCrawl: false }), null);
  assert.equal(busyFor('day2', { phase: 'driveOut' }), 'busy');
  assert.equal(busyFor('day2', { phase: 'driveHome' }), 'busy');
  assert.equal(busyFor('day2', { phase: 'toAfternoon' }), 'busy');
  assert.equal(busyFor('day2', { phase: 'shop' }), 'away');
  assert.equal(busyFor('day2', { phase: 'morning' }), null);
  assert.equal(busyFor('day2', { phase: 'afternoon' }), null);
});

test('once a night is ending it is busy, whichever night it is', () => {
  assert.equal(busyFor('act1', { ending: true }), 'busy');
  assert.equal(busyFor('day2', { ending: true, phase: 'afternoon' }), 'busy');
  assert.equal(busyFor('act1', {}), null);
  assert.equal(busyFor('act1', null), null);
});

test('every reason busyFor gives is one the pause menu has a line for', () => {
  ['crawl', 'away', 'busy'].forEach((r) => assert.ok(REASONS.indexOf(r) >= 0));
  assert.ok(REASONS.indexOf('scene') >= 0);
});
