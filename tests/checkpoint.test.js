const test = require('node:test');
const assert = require('node:assert/strict');
const { createRetry, spotOf, hintId, TEXT } = require('../js/engine/checkpoint.js');

// Phase 8: checkpoints inside The Call and The Search, and failing fairly. A fail goes back to the
// last saved beat. Two fails in the same spot earn a hint. A jump scare is shown once.

test('no checkpoint until the act saves one', () => {
  const r = createRetry();
  assert.equal(r.checkpoint('act4'), null);
  r.save('act4', 'search', { t: 40 });
  assert.deepEqual(r.checkpoint('act4'), { act: 'act4', beat: 'search', data: { t: 40 } });
});

test('a fail goes back to the last checkpoint, not the first', () => {
  const r = createRetry();
  r.save('act4', 'search', { t: 40 });
  r.save('act4', 'door', { t: 160 });
  r.save('act4', 'car', { t: 230 });
  assert.equal(r.checkpoint('act4').beat, 'car');
  assert.equal(r.checkpoint('act4').data.t, 230);
});

test('each act keeps its own checkpoint', () => {
  const r = createRetry();
  r.save('act3', 'photo', { t: 70 });
  r.save('act4', 'door', { t: 160 });
  assert.equal(r.checkpoint('act3').beat, 'photo');
  assert.equal(r.checkpoint('act4').beat, 'door');
});

test('the saved state is a copy: changing it later does not change the checkpoint', () => {
  const r = createRetry();
  const habits = [{ action: 'calledDeputy', detail: {} }];
  const data = { habits, uses: { couch: 1 } };
  r.save('act4', 'door', data);
  habits.push({ action: 'hid', detail: { kind: 'couch' } });
  data.uses.couch = 2;
  const cp = r.checkpoint('act4');
  assert.equal(cp.data.habits.length, 1);
  assert.equal(cp.data.uses.couch, 1);
  // and what a retry is handed can't change the next retry either
  cp.data.habits.push({ action: 'x' });
  assert.equal(r.checkpoint('act4').data.habits.length, 1);
});

test('a resumed run keeps the habit log, the evidence, Ray and the act flags as they were saved', () => {
  const r = createRetry();
  const habits = [
    { action: 'calledDeputy', detail: {}, at: '1:05 PM', t: 3 },
    { action: 'photoEye', detail: {}, at: '12:31 AM', t: 70 },
    { action: 'hid', detail: { kind: 'couch' }, at: '12:39 AM', t: 120 },
  ];
  r.save('act4', 'car', { habits, chainTries: 2, uses: { couch: 1 }, showerOn: true });
  const d = r.checkpoint('act4').data;
  assert.deepEqual(d.habits, habits);
  assert.ok(d.habits.some((e) => e.action === 'calledDeputy'));
  assert.ok(d.habits.some((e) => e.action === 'photoEye'));
  assert.equal(d.chainTries, 2);
  assert.deepEqual(d.uses, { couch: 1 });
  assert.equal(d.showerOn, true);
});

test('fails are counted per spot: the second fail in the same spot earns the hint', () => {
  const r = createRetry();
  const a = r.fail('act4', 'noise');
  assert.equal(a.spot, 'car');
  assert.equal(a.count, 1);
  assert.equal(a.hint, null);
  const b = r.fail('act4', 'noise');
  assert.equal(b.count, 2);
  assert.equal(b.hint, 'retry.hint.act4.noise');
  const c = r.fail('act4', 'noise');
  assert.equal(c.hint, 'retry.hint.act4.noise'); // and every fail after it
});

test('two different ways to fail at the car are the same spot; the hint is for the latest one', () => {
  const r = createRetry();
  r.fail('act4', 'seen');
  const b = r.fail('act4', 'noise');
  assert.equal(b.count, 2);
  assert.equal(b.hint, hintId('act4', 'noise'));
});

test('a fail somewhere else does not count toward this spot', () => {
  const r = createRetry();
  r.fail('act4', 'caught');
  const car = r.fail('act4', 'noise');
  assert.equal(car.count, 1);
  assert.equal(car.hint, null);
  assert.equal(r.fails('act4', 'house'), 1);
  assert.equal(r.fails('act4', 'car'), 1);
});

test('every bluff answer that fails is one spot', () => {
  assert.equal(spotOf('act3', 'scream'), 'bluff');
  assert.equal(spotOf('act3', 'confront'), 'bluff');
  assert.equal(spotOf('act3', 'freeze'), 'bluff');
  assert.equal(spotOf('act3', 'look'), 'walk');
  const r = createRetry();
  r.fail('act3', 'scream');
  assert.equal(r.fail('act3', 'freeze').hint, 'retry.hint.act3.freeze');
});

test('the closet burst plays on the first failed bluff, never on the second', () => {
  const r = createRetry();
  assert.equal(r.fail('act3', 'confront').scare, true);
  assert.equal(r.fail('act3', 'confront').scare, false);
  assert.equal(r.fail('act3', 'scream').scare, false);
});

test('looking back after a failed bluff does not show the closet burst a second time', () => {
  const r = createRetry();
  assert.equal(r.fail('act3', 'scream').scare, true);
  assert.equal(r.fail('act3', 'look').scare, false);
});

test('in the search, each kind of fail scare plays once', () => {
  const r = createRetry();
  assert.equal(r.fail('act4', 'caught').scare, true); // found
  assert.equal(r.fail('act4', 'checked').scare, false); // found again: hum
  assert.equal(r.fail('act4', 'noise').scare, true); // the glass, the first time
  assert.equal(r.fail('act4', 'seen').scare, false); // the glass again: hum
  assert.equal(r.fail('act4', 'door').scare, true);
});

test('a scare on the way (the face at the glass) is new once, then seen', () => {
  const r = createRetry();
  assert.equal(r.seen('act4', 'faceAtGlass'), false);
  assert.equal(r.scare('act4', 'faceAtGlass'), true);
  assert.equal(r.seen('act4', 'faceAtGlass'), true);
  assert.equal(r.scare('act4', 'faceAtGlass'), false);
});

test('starting the act fresh forgets its checkpoint, its fails and what was seen; other acts keep theirs', () => {
  const r = createRetry();
  r.save('act4', 'car', { t: 230 });
  r.fail('act4', 'noise');
  r.fail('act4', 'noise');
  r.scare('act4', 'faceAtGlass');
  r.save('act3', 'photo', { t: 70 });
  r.fail('act3', 'scream');
  r.enter('act4');
  assert.equal(r.checkpoint('act4'), null);
  assert.equal(r.fails('act4', 'car'), 0);
  assert.equal(r.lastFail('act4'), null);
  assert.equal(r.seen('act4', 'faceAtGlass'), false);
  assert.equal(r.fail('act4', 'noise').scare, true);
  assert.equal(r.checkpoint('act3').beat, 'photo');
  assert.equal(r.fails('act3', 'bluff'), 1);
  assert.equal(r.seen('act3', 'closetBurst'), true);
});

test('the last fail is remembered for the retry, as a copy', () => {
  const r = createRetry();
  assert.equal(r.lastFail('act4'), null);
  r.fail('act4', 'outside');
  r.fail('act4', 'outside');
  const lf = r.lastFail('act4');
  assert.equal(lf.hint, 'retry.hint.act4.outside');
  lf.hint = null;
  assert.equal(r.lastFail('act4').hint, 'retry.hint.act4.outside');
});

test('an unknown fail still counts and scares once, but has no hint (so no missing text)', () => {
  const r = createRetry();
  r.fail('act9', 'oops');
  const b = r.fail('act9', 'oops');
  assert.equal(b.count, 2);
  assert.equal(b.hint, null);
  assert.equal(b.scare, false);
});

test('there is a hint line for every fail in both acts', () => {
  const want = ['scream', 'confront', 'freeze', 'look'].map((x) => 'retry.hint.act3.' + x)
    .concat(['door', 'caught', 'checked', 'outside', 'seen', 'noise'].map((x) => 'retry.hint.act4.' + x));
  assert.deepEqual(TEXT.slice().sort(), want.sort());
});

test('the game has every hint line, and each is hand-written (no two the same)', () => {
  global.window = {};
  require('../content/text.js');
  const data = global.window.OC.textData;
  const lines = TEXT.map((id) => data[id]);
  TEXT.forEach((id, i) => assert.ok(typeof lines[i] === 'string' && lines[i].length > 10, 'missing ' + id));
  assert.equal(new Set(lines).size, lines.length);
  delete global.window;
});

test('a checkpoint needs an act and a beat', () => {
  const r = createRetry();
  assert.throws(() => r.save('act4', '', {}), /act and a beat/);
});
