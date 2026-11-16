const test = require('node:test');
const assert = require('node:assert/strict');
const { createScarePool, validatePool } = require('../js/engine/scarePool.js');
const scares = require('../content/scares.js');

const ITEMS = [
  { id: 'creak', kind: 'ambient', nights: [1, 2], once: false, cooldown: 30 },
  { id: 'ice', kind: 'ambient', nights: [1], once: false, cooldown: 45 },
  { id: 'knocks', kind: 'scare', nights: [2], minFear: 5, once: true },
  { id: 'silence', kind: 'scare', nights: [1, 2], minFear: 3, maxFear: 8, once: true },
  { id: 'idle', kind: 'idle', nights: [1, 2], once: false, cooldown: 0 },
];
const ids = (list) => list.map((i) => i.id).sort();

test('eligible filters by night', () => {
  const p = createScarePool(ITEMS);
  assert.deepEqual(ids(p.eligible({ night: 1, fear: 5, now: 0 })), ['creak', 'ice', 'idle', 'silence']);
  assert.deepEqual(ids(p.eligible({ night: 2, fear: 5, now: 0 })), ['creak', 'idle', 'knocks', 'silence']);
});

test('eligible filters by fear range', () => {
  const p = createScarePool(ITEMS);
  assert.deepEqual(ids(p.eligible({ night: 1, fear: 2, now: 0 })), ['creak', 'ice', 'idle']);
  assert.deepEqual(ids(p.eligible({ night: 2, fear: 9, now: 0 })), ['creak', 'idle', 'knocks']);
});

test('eligible filters by kind when asked', () => {
  const p = createScarePool(ITEMS);
  assert.deepEqual(ids(p.eligible({ night: 1, fear: 5, now: 0, kind: 'ambient' })), ['creak', 'ice']);
});

test('a one-time item is gone once fired', () => {
  const p = createScarePool(ITEMS);
  p.fire('silence', 10);
  assert.equal(p.used('silence'), true);
  assert.ok(!ids(p.eligible({ night: 1, fear: 5, now: 500 })).includes('silence'));
});

test('a repeatable item comes back after its cooldown', () => {
  const p = createScarePool(ITEMS);
  p.fire('creak', 100);
  p.fire('ice', 101); // so creak is not also the last one fired
  assert.ok(!ids(p.eligible({ night: 1, fear: 1, now: 129 })).includes('creak'));
  assert.ok(ids(p.eligible({ night: 1, fear: 1, now: 130 })).includes('creak'));
  assert.equal(p.used('creak'), false);
});

test('pick never repeats the last fired item back to back', () => {
  const p = createScarePool([
    { id: 'a', kind: 'ambient', nights: [1], once: false },
    { id: 'b', kind: 'ambient', nights: [1], once: false },
  ]);
  p.fire('a', 0);
  for (let i = 0; i < 10; i++) assert.equal(p.pick({ night: 1, fear: 1, now: 1 }, () => i / 10).id, 'b');
});

test('pick returns null when the only eligible item is the last one fired', () => {
  const p = createScarePool([{ id: 'a', kind: 'ambient', nights: [1], once: false }]);
  p.fire('a', 0);
  assert.equal(p.pick({ night: 1, fear: 1, now: 100 }), null);
});

test('pick is deterministic with an injected random source', () => {
  const p = createScarePool(ITEMS);
  const ctx = { night: 1, fear: 5, now: 0, kind: 'ambient' };
  assert.equal(p.pick(ctx, () => 0).id, 'creak');
  assert.equal(p.pick(ctx, () => 0.99).id, 'ice');
});

test('pick returns null when nothing is eligible', () => {
  const p = createScarePool(ITEMS);
  assert.equal(p.pick({ night: 3, fear: 5, now: 0 }), null);
});

test('firing an unknown id is an error', () => {
  const p = createScarePool(ITEMS);
  assert.throws(() => p.fire('nope', 0), /unknown scare: nope/);
});

test('validatePool catches duplicates, missing nights and a bad fear range', () => {
  const problems = validatePool([
    { id: 'a', kind: 'ambient', nights: [1] },
    { id: 'a', kind: 'ambient', nights: [1] },
    { id: 'b', kind: 'scare', nights: [] },
    { id: 'c', kind: 'scare', nights: [2], minFear: 7, maxFear: 3 },
    { id: 'd', kind: 'weird', nights: [1] },
  ]);
  assert.equal(problems.length, 4, problems.join('\n'));
  assert.deepEqual(validatePool(ITEMS), []);
});

test('the game pool is valid and holds every scare in the story bible', () => {
  assert.deepEqual(validatePool(scares.items), []);
  const want = ['repeatedKnocks', 'heldBreath', 'emptyFetch', 'wrongReflection', 'followingLight', 'familiarSound',
    'almostSighting', 'blockedRoute', 'changedNote', 'suddenSilence', 'fish', 'idlePunish'];
  const have = scares.items.map((i) => i.id);
  want.forEach((id) => assert.ok(have.includes(id), 'missing ' + id));
});

test('Night 1 can draw exactly the five items it has handlers for', () => {
  const p = createScarePool(scares.items);
  const all = new Set();
  for (let fear = 1; fear <= 10; fear++) p.eligible({ night: 1, fear, now: 0 }).forEach((i) => all.add(i.id));
  assert.deepEqual([...all].sort(), ['cooperEars', 'creak', 'iceMaker', 'idlePunish', 'suddenSilence']);
  assert.ok(!ids(p.eligible({ night: 1, fear: 2, now: 0 })).includes('suddenSilence'), 'silence waits for fear 3');
});
