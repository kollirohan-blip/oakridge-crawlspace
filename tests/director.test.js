const test = require('node:test');
const assert = require('node:assert/strict');
const { createDirector } = require('../js/engine/director.js');

function make(extra = {}) {
  const log = [];
  const def = {
    tasks: [{ id: 'a', label: 'Task A' }, { id: 'b', label: 'Task B' }, { id: 'c', label: 'Task C' }],
    triggers: [],
    ...extra,
  };
  const hooks = { onAdvance: () => log.push('advance'), onTask: (id) => log.push('task:' + id) };
  return { d: createDirector(def, hooks), log, hooks };
}

test('completing the same task twice counts once', () => {
  const { d, log } = make();
  assert.equal(d.complete('a'), true);
  assert.equal(d.complete('a'), false);
  assert.deepEqual(log.filter((l) => l.startsWith('task:')), ['task:a']);
});

test('finishing tasks in any order advances the act exactly once', () => {
  const { d, log } = make();
  d.complete('c');
  d.complete('a');
  assert.equal(d.actDone(), false);
  d.complete('b');
  d.complete('b');
  d.complete('c');
  assert.equal(d.actDone(), true);
  assert.equal(log.filter((l) => l === 'advance').length, 1);
});

test('completing an unknown task is an error, not a silent no-op', () => {
  const { d } = make();
  assert.throws(() => d.complete('nope'), /unknown task: nope/);
});

test('a once trigger fires once even while its condition stays true', () => {
  let fired = 0;
  const { d } = make({ triggers: [{ id: 't', when: () => true, do: () => fired++ }] });
  d.tick(0.1, {});
  d.tick(0.1, {});
  d.tick(0.1, {});
  assert.equal(fired, 1);
});

test('a trigger waits until its condition is true, and receives the state', () => {
  const seen = [];
  const { d } = make({
    triggers: [{ id: 't', when: (s) => s.go === true, do: (hooks, s) => seen.push(s.go) }],
  });
  d.tick(0.1, { go: false });
  assert.deepEqual(seen, []);
  d.tick(0.1, { go: true });
  assert.deepEqual(seen, [true]);
});

test('a trigger with once:false fires every tick while true', () => {
  let n = 0;
  const { d } = make({ triggers: [{ id: 't', once: false, when: () => true, do: () => n++ }] });
  d.tick(0.1, {});
  d.tick(0.1, {});
  assert.equal(n, 2);
});

test('advanceWhen can be a custom function over completed tasks', () => {
  const { d, log } = make({ advanceWhen: (dir) => dir.done('a') && dir.done('b') });
  d.complete('a');
  assert.equal(d.actDone(), false);
  d.complete('b');
  assert.equal(d.actDone(), true);
  assert.deepEqual(log.filter((l) => l === 'advance'), ['advance']);
});

test('list() gives task ids, labels and done flags for the phone', () => {
  const { d } = make();
  d.complete('b');
  assert.deepEqual(d.list(), [
    { id: 'a', label: 'Task A', done: false },
    { id: 'b', label: 'Task B', done: true },
    { id: 'c', label: 'Task C', done: false },
  ]);
});

test('sinceTask() counts the time ticked since the act began, then since the last task done', () => {
  const { d } = make();
  assert.equal(d.sinceTask(), 0);
  d.tick(2, {});
  d.tick(1.5, {});
  assert.ok(Math.abs(d.sinceTask() - 3.5) < 1e-9);
  d.complete('a');
  assert.equal(d.sinceTask(), 0);
  d.tick(4, {});
  assert.ok(Math.abs(d.sinceTask() - 4) < 1e-9);
});

test('a task completed a second time is not progress: sinceTask() keeps counting', () => {
  const { d } = make();
  d.complete('a');
  d.tick(10, {});
  d.complete('a');
  assert.ok(Math.abs(d.sinceTask() - 10) < 1e-9);
});

test('sinceTask() ignores a missing or broken dt', () => {
  const { d } = make();
  d.tick(1, {});
  d.tick(undefined, {});
  d.tick(NaN, {});
  d.tick(-5, {});
  assert.ok(Math.abs(d.sinceTask() - 1) < 1e-9);
});
