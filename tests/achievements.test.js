const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { LIST, marksFor, createAchievements, restore } = require('../js/engine/achievements.js');

// Achievements are earned from marks: one per kind of thing Mason did (the habit log's action, and
// action:kind), plus a mark per ending. Marks pile up across playthroughs, so "every dinner" and
// "every ending" can take more than one run. Saved in localStorage; junk in storage means a fresh start.
const entry = (action, detail) => ({ action, detail: detail || {}, at: '', t: 0 });
const ids = (list) => list.map((a) => a.id);

test('marksFor: the action, and action:kind when there is a kind', () => {
  assert.deepEqual(marksFor(entry('twoScoops')), ['twoScoops']);
  assert.deepEqual(marksFor(entry('dinner', { kind: 'pizza', result: 'good' })), ['dinner', 'dinner:pizza']);
  assert.deepEqual(marksFor(null), []);
  assert.deepEqual(marksFor({}), []);
});

test('Two Scoops unlocks the first time, and only once', () => {
  const a = createAchievements();
  assert.deepEqual(ids(a.noteEntry(entry('twoScoops'))), ['twoScoops']);
  assert.deepEqual(a.noteEntry(entry('twoScoops')), []);
  assert.equal(a.has('twoScoops'), true);
});

test('Food Critic needs every dinner, and the dinners can come from different playthroughs', () => {
  let a = createAchievements();
  ['lasagna', 'pizza', 'mac', 'cereal'].forEach((kind) => {
    assert.deepEqual(a.noteEntry(entry('dinner', { kind })), []);
    a = restore(JSON.parse(JSON.stringify(a.serialize()))); // a new visit
  });
  assert.deepEqual(ids(a.noteEntry(entry('dinner', { kind: 'tupperware' }))), ['foodCritic']);
});

test('Good Boy needs petting, fetch and a trick', () => {
  const a = createAchievements();
  a.noteEntry(entry('petCooper'));
  a.noteEntry(entry('fetch'));
  assert.equal(a.has('goodBoy'), false);
  assert.deepEqual(ids(a.noteEntry(entry('trick', { kind: 'paw' }))), ['goodBoy']);
});

test('Every Ending unlocks with the sixth ending, after each ending unlocks its own', () => {
  const a = createAchievements();
  ['ending:little', 'ending:partial', 'ending:strong', 'ending:bad', 'ending:gag'].forEach((m) => {
    assert.equal(a.note(m).length, 1, m);
  });
  assert.deepEqual(ids(a.note('ending:ray')), ['endRay', 'allEndings']);
});

test('note takes one mark or several', () => {
  const a = createAchievements();
  assert.deepEqual(ids(a.note(['petCooper', 'fetch', 'trick'])), ['goodBoy']);
});

test('restore: junk, old versions and missing storage start fresh without throwing', () => {
  [null, undefined, 'x', 5, {}, { v: 2 }, { v: 1, marks: 'no' }, { v: 1, marks: [], unlocked: 7 }].forEach((junk) => {
    const a = restore(junk);
    assert.deepEqual(a.unlocked(), []);
  });
});

test('serialize and restore keep marks and unlock dates', () => {
  const a = createAchievements();
  a.noteEntry(entry('twoScoops'));
  const b = restore(JSON.parse(JSON.stringify(a.serialize())));
  assert.equal(b.has('twoScoops'), true);
  assert.equal(b.list().filter((x) => x.id === 'twoScoops')[0].unlocked, true);
  assert.equal(b.list().filter((x) => x.id === 'goodBoy')[0].unlocked, false);
});

test('every achievement has a title, a description and at least one mark', () => {
  const seen = {};
  LIST.forEach((a) => {
    assert.ok(a.id && !seen[a.id], 'id ' + a.id);
    seen[a.id] = true;
    assert.ok(a.title && a.desc, a.id);
    assert.ok(Array.isArray(a.all) && a.all.length > 0, a.id);
  });
  assert.ok(LIST.length >= 15);
});

test('every mark an achievement needs is one the game can actually produce', () => {
  // scan the game's own code for logged actions and kinds, so a typo here cannot make an achievement impossible
  const src = [];
  (function walk(dir) {
    fs.readdirSync(dir).forEach((f) => {
      const p = path.join(dir, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (f.endsWith('.js')) src.push(fs.readFileSync(p, 'utf8'));
    });
  })(path.join(__dirname, '../js'));
  src.push(fs.readFileSync(path.join(__dirname, '../content/talks.js'), 'utf8')); // dialogue choices log too
  const code = src.join('\n');
  LIST.forEach((a) => a.all.forEach((m) => {
    if (m.indexOf('ending:') === 0) return; // given out by the epilogue
    const [action, kind] = m.split(':');
    assert.ok(new RegExp("log(\\(|: )'" + action + "'").test(code), a.id + ': nothing logs ' + action);
    if (kind) assert.ok(code.indexOf("'" + kind + "'") >= 0, a.id + ': no kind ' + kind);
  }));
});
