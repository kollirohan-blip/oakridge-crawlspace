const test = require('node:test');
const assert = require('node:assert/strict');
const { createHabits, restore, settledIn, gates, notebookLines } = require('../js/engine/habits.js');

const at = (clock, t) => ({ clock, t });

test('log() records action, detail, clock label and time; entries() is a copy', () => {
  const h = createHabits();
  const e = h.log('dinner', { kind: 'lasagna' }, at('7:48 PM', 61));
  assert.deepEqual(e, { action: 'dinner', detail: { kind: 'lasagna' }, at: '7:48 PM', t: 61 });
  const list = h.entries();
  list.push({ action: 'x' });
  assert.equal(h.entries().length, 1);
});

test('log() without a time still records the action', () => {
  const h = createHabits();
  const e = h.log('petCooper');
  assert.equal(e.action, 'petCooper');
  assert.equal(e.at, '');
  assert.equal(e.t, 0);
  assert.deepEqual(e.detail, {});
});

test('count, has and last over repeated actions', () => {
  const h = createHabits();
  h.log('petCooper', {}, at('7:40 PM', 10));
  h.log('trick', { kind: 'sit' }, at('7:41 PM', 20));
  h.log('petCooper', {}, at('7:45 PM', 40));
  assert.equal(h.count('petCooper'), 2);
  assert.equal(h.count('mail'), 0);
  assert.equal(h.has('trick'), true);
  assert.equal(h.has('mail'), false);
  assert.equal(h.last('petCooper').t, 40);
  assert.equal(h.last('mail'), null);
});

test('reset() empties the log', () => {
  const h = createHabits();
  h.log('mail');
  h.reset();
  assert.equal(h.entries().length, 0);
});

test('settledIn: 4 tasks or 480 s, not 3 tasks at 479 s', () => {
  assert.equal(settledIn({ tasksDone: 3, elapsed: 479 }), false);
  assert.equal(settledIn({ tasksDone: 4, elapsed: 0 }), true);
  assert.equal(settledIn({ tasksDone: 0, elapsed: 480 }), true);
});

test('gates are all false on an empty log', () => {
  assert.deepEqual(gates([]), { lightsOn: false, heavyLight: false, windowWatcher: false });
});

test('gates: lights left on at bed, heavy phone light, a window watcher', () => {
  const h = createHabits();
  h.log('bed', { lights: 3 });
  h.log('phoneLight', { sec: 120 });
  h.log('windowLook');
  h.log('windowLook');
  h.log('windowLook');
  assert.deepEqual(gates(h.entries()), { lightsOn: true, heavyLight: true, windowWatcher: true });
});

test('gates: just under each threshold stays false', () => {
  const h = createHabits();
  h.log('bed', { lights: 2 });
  h.log('phoneLight', { sec: 119 });
  h.log('windowLook');
  h.log('windowLook');
  assert.deepEqual(gates(h.entries()), { lightsOn: false, heavyLight: false, windowWatcher: false });
});

test('serialize then restore round-trips', () => {
  const h = createHabits();
  h.log('dinner', { kind: 'pizza' }, at('8:01 PM', 90));
  h.log('mail', {}, at('8:10 PM', 120));
  const back = restore(JSON.parse(JSON.stringify(h.serialize())));
  assert.deepEqual(back.entries(), h.entries());
  assert.equal(h.serialize().v, 1);
});

test('restore of bad data gives an empty log', () => {
  [null, undefined, 'x', 7, { v: 9, entries: [{ action: 'mail' }] }, { v: 1, entries: 'no' }].forEach((bad) => {
    assert.equal(restore(bad).entries().length, 0, 'for ' + JSON.stringify(bad));
  });
});

test('restore skips malformed entries but keeps good ones', () => {
  const back = restore({ v: 1, entries: [{ action: 'mail', detail: {}, at: '8:00 PM', t: 3 }, { nope: 1 }, null] });
  assert.equal(back.entries().length, 1);
  assert.equal(back.entries()[0].action, 'mail');
});

test('notebookLines: an empty log gives no lines', () => {
  assert.deepEqual(notebookLines([]), []);
});

test('notebookLines: Wes writes times without AM/PM, in order', () => {
  const h = createHabits();
  h.log('dinner', { kind: 'lasagna' }, at('7:48 PM', 60));
  h.log('washedUp', {}, at('8:30 PM', 200));
  h.log('bed', { lights: 1 }, at('1:58 AM', 900));
  assert.deepEqual(notebookLines(h.entries()), [
    '7:48 ate the lasagna. good.',
    '8:30 washed the dishes with his back to me',
    '1:58 bed',
  ]);
});

test('notebookLines: the dishes that matter, and bed with the lights on', () => {
  const h = createHabits();
  h.log('dinner', { kind: 'cereal' }, at('7:50 PM', 60));
  h.log('dinner', { kind: 'tupperware' }, at('7:55 PM', 70));
  h.log('bed', { lights: 4 }, at('2:01 AM', 900));
  assert.deepEqual(notebookLines(h.entries()), [
    '7:50 cereal with no milk. i will get milk',
    '7:55 he ate from the blue box. that was mine',
    '2:01 bed. every light on',
  ]);
});

test('notebookLines: unknown actions are skipped and repeats collapse to the first', () => {
  const h = createHabits();
  h.log('petCooper', {}, at('7:40 PM', 10));
  h.log('somethingNew', {}, at('7:41 PM', 11));
  h.log('petCooper', {}, at('7:42 PM', 12));
  h.log('petCooper', {}, at('7:43 PM', 13));
  assert.deepEqual(notebookLines(h.entries()), ['7:40 pets the dog a lot']);
});

test('notebookLines: actions keyed by kind use their kind line', () => {
  const h = createHabits();
  h.log('scratch', { kind: 'hatch' }, at('11:02 PM', 500));
  assert.deepEqual(notebookLines(h.entries()), ['11:02 came to the hatch. stood right on top of me']);
});
