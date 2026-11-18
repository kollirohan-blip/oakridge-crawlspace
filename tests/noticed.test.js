const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createHabits, nightTwoPlan } = require('../js/engine/habits.js');
const N = require('../js/engine/noticed.js');

// P5 (the learning, made visible) and P6 (Mason talks back to silly play): the counters in the habit
// log, which gate maps to which line, and what Wes writes down about it.
const logOf = (list) => {
  const h = createHabits();
  list.forEach(([action, detail, clock, t]) => h.log(action, detail, { clock: clock || '', t: t || 0 }));
  return h.entries();
};
const times = (action, n, detail) => Array.from({ length: n }, (_, i) => [action, detail || {}, '', i * 2]);
function text() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../content/text.js'), 'utf8'), { window });
  return window.OC.textData;
}

// ---- P5: which habit each gate learned -----------------------------------------------------------------

test('nightTwoPlan says why each gate fired: a habit, or (for the breaker only) the fallback', () => {
  assert.deepEqual(nightTwoPlan(logOf([['bed', { lights: 4 }]])).why, { breaker: 'lightsOn', lightFalters: null, tvReflection: null });
  assert.deepEqual(nightTwoPlan([]).why, { breaker: 'fallback', lightFalters: null, tvReflection: null });
  assert.deepEqual(
    nightTwoPlan(logOf([['bed', { lights: 1 }], ['phoneLight', { sec: 200 }], ['windowLook'], ['windowLook'], ['windowLook']])).why,
    { breaker: null, lightFalters: 'heavyLight', tvReflection: 'windowWatcher' },
  );
});

test('gate to line: each learned gate has its own thought for Mason', () => {
  const all = nightTwoPlan(logOf([['bed', { lights: 3 }], ['phoneLight', { sec: 150 }], ['windowLook'], ['windowLook'], ['windowLook']]));
  assert.equal(N.knewText(all, 'breaker'), 'p8.knew.breaker');
  assert.equal(N.knewText(all, 'lightFalters'), 'p8.knew.light');
  assert.equal(N.knewText(all, 'tvReflection'), 'p8.knew.tv');
});

test('gate to line: a breaker that only fired as the fallback learned nothing, so Mason says nothing', () => {
  const plan = nightTwoPlan([]);
  assert.equal(plan.gates.breaker, true);
  assert.equal(N.knewText(plan, 'breaker'), null);
  assert.equal(N.habitFor(plan, 'breaker'), null);
});

test('gate to line: a gate that did not fire has no line, whatever the reason says', () => {
  const plan = nightTwoPlan(logOf([['bed', { lights: 1 }], ['phoneLight', { sec: 200 }]]));
  assert.equal(N.knewText(plan, 'breaker'), null);
  assert.equal(N.knewText(plan, 'tvReflection'), null);
  assert.equal(N.knewText({ gates: { breaker: false }, why: { breaker: 'lightsOn' } }, 'breaker'), null);
  assert.equal(N.knewText(plan, 'nonsense'), null);
});

test('gate to line: a plan forced for a check (no reasons) counts its gates as learned', () => {
  const forced = { gates: { breaker: true, lightFalters: false, tvReflection: true }, familiar: 'microwave' };
  assert.equal(N.knewText(forced, 'breaker'), 'p8.knew.breaker');
  assert.equal(N.knewText(forced, 'lightFalters'), null);
  assert.equal(N.knewText(forced, 'tvReflection'), 'p8.knew.tv');
});

// ---- P6: the counters ------------------------------------------------------------------------------------

test('progress counts an action in the log', () => {
  const q = N.quirk('flush');
  assert.equal(N.progress(logOf(times('flush', 4)), q), 4);
  assert.equal(N.progress([], q), 0);
});

test('a count quirk is due at its count, not one before', () => {
  assert.deepEqual(N.due(logOf(times('flush', 4)), 1, {}).map((d) => d.id), []);
  assert.deepEqual(N.due(logOf(times('flush', 5)), 1, {}).map((d) => d.id), ['flush']);
  assert.deepEqual(N.due(logOf(times('fridge', 6)), 1, {}).map((d) => d.id), ['fridge']);
  assert.deepEqual(N.due(logOf(times('hatchTry', 4)), 1, {}).map((d) => d.id), ['hatch']);
  assert.deepEqual(N.due(logOf([['treeline']]), 1, {}).map((d) => d.id), ['treeline']);
});

test('each reaction plays at most once a night: said ones are never due again', () => {
  const log = logOf(times('flush', 9));
  assert.deepEqual(N.due(log, 1, { flush: true }), []);
});

test('reactions belong to their nights: the toilet is night one, the trees are both', () => {
  assert.deepEqual(N.due(logOf(times('flush', 5)), 2, {}), []);
  const d = N.due(logOf([['treeline']]), 2, {});
  assert.deepEqual(d.map((x) => x.id), ['treeline']);
  assert.equal(d[0].text, 'p8.quirk.treeline2');
  assert.equal(N.due(logOf([['treeline']]), 1, {})[0].text, 'p8.quirk.treeline');
});

test('petting Cooper for a full minute: a run of pets that spans 60 s, with no gap over 15 s', () => {
  const q = N.quirk('pet');
  const pets = (ts) => logOf(ts.map((t) => ['petCooper', {}, '', t]));
  // every 5 s from 0 to 60: a full minute
  const minute = pets([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  assert.equal(N.progress(minute, q), 60);
  assert.deepEqual(N.due(minute, 1, {}).map((d) => d.id), ['pet']);
  // 55 s is not a minute
  assert.deepEqual(N.due(pets([0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]), 1, {}), []);
  // a 16 s break starts the count again
  const broken = pets([0, 10, 20, 30, 46, 56, 66]);
  assert.equal(N.progress(broken, q), 30);
  // ten pets spread over an hour are not a minute of petting
  assert.deepEqual(N.due(pets([0, 100, 200, 300, 400, 500, 600, 700, 800, 900]), 1, {}), []);
});

test('flicking the lights: 8 switches inside 15 s, not 8 spread out', () => {
  const q = N.quirk('switches');
  const fast = logOf([0, 1, 2, 3, 4, 5, 6, 7].map((t) => ['switch', { kind: 'hall' }, '', t]));
  assert.equal(N.progress(fast, q), 8);
  assert.deepEqual(N.due(fast, 1, {}).map((d) => d.id), ['switches']);
  const slow = logOf([0, 10, 20, 30, 40, 50, 60, 70, 80, 90].map((t) => ['switch', {}, '', t]));
  assert.equal(N.progress(slow, q), 2);
  assert.deepEqual(N.due(slow, 1, {}), []);
});

test('several quirks can be due at once, in the order they are listed', () => {
  const log = logOf(times('fetch', 8).concat(times('flush', 5)));
  assert.deepEqual(N.due(log, 1, {}).map((d) => d.id), ['flush', 'fetch']);
});

// ---- P5 and P6 in Wes's notebook ---------------------------------------------------------------------------

test("the notebook's WHAT HE DOES page lists the habit a gate learned, and only learned ones", () => {
  const lights = N.noteLines(logOf([['bed', { lights: 4 }], ['dayTwo']]));
  assert.deepEqual(lights, [N.GATES.breaker.note]);
  assert.deepEqual(N.noteLines(logOf([['bed', { lights: 0 }]])), []); // the fallback breaker learned nothing
  const both = N.noteLines(logOf([['phoneLight', { sec: 300 }], ['windowLook'], ['windowLook'], ['windowLook']]));
  assert.deepEqual(both, [N.GATES.lightFalters.note, N.GATES.tvReflection.note]);
});

test('the notebook counts silly things the way Wes would: "opened the fridge 9 times. hungry boy"', () => {
  const lines = N.noteLines(logOf(times('fridge', 9).concat(times('hatchTry', 4))));
  assert.ok(lines.indexOf('opened the fridge 9 times. hungry boy') >= 0, lines.join(' | '));
  assert.ok(lines.indexOf('tried my door 4 times. i heard every one') >= 0, lines.join(' | '));
});

test('the notebook leaves out what did not reach its count, and what happened on night two', () => {
  const lines = N.noteLines(logOf(times('fridge', 5).concat([['dayTwo'], ['nightTwo']]).concat(times('fridge', 9))));
  assert.deepEqual(lines, []);
});

test('notebookPages: WHAT HE DOES goes just before TONIGHT\'S PLAN, and not at all when he has nothing', () => {
  const pages = N.notebookPages(logOf([['dinner', { kind: 'mac' }, '8:00 PM'], ['bed', { lights: 5 }, '1:50 AM'], ['dayTwo'], ['coffee', {}, '10:00 AM']]));
  const titles = pages.map((p) => p.title);
  assert.deepEqual(titles, ['MASON', 'TODAY', 'WHAT HE DOES', "TONIGHT'S PLAN"]);
  assert.deepEqual(pages[2].lines, [N.GATES.breaker.note]);
  const none = N.notebookPages(logOf([['dinner', { kind: 'mac' }, '8:00 PM']]));
  assert.ok(none.every((p) => p.title !== 'WHAT HE DOES'));
});

test('notebookPages: a long WHAT HE DOES page runs on, and nothing is lost', () => {
  const log = logOf([['bed', { lights: 4 }], ['phoneLight', { sec: 300 }], ['windowLook'], ['windowLook'], ['windowLook']]
    .concat(times('flush', 5), times('fridge', 6), times('hatchTry', 4), times('fishSet', 4), times('channel', 12), times('fetch', 8)));
  const pages = N.notebookPages(log, 4);
  const mine = pages.filter((p) => p.title.indexOf('WHAT HE DOES') === 0);
  assert.equal(mine.reduce((n, p) => n + p.lines.length, 0), 9);
  assert.equal(mine.length, 3);
  assert.equal(pages[pages.length - 1].title, "TONIGHT'S PLAN");
});

// ---- the words ----------------------------------------------------------------------------------------------

test('every line this feature uses is written in content/text.js', () => {
  const T = text();
  N.TEXT.forEach((id) => assert.ok(typeof T[id] === 'string' && T[id].length > 0, 'missing ' + id));
  ['breaker', 'lightFalters', 'tvReflection'].forEach((g) => assert.ok(N.TEXT.indexOf(N.GATES[g].text) >= 0, g));
  N.QUIRKS.forEach((q) => {
    assert.ok(N.TEXT.indexOf(q.text) >= 0, q.id);
    if (q.text2) assert.ok(N.TEXT.indexOf(q.text2) >= 0, q.id + ' (night two)');
  });
});

test("Wes writes in lowercase, Mason's lines stay short subtitles, and nothing is gross", () => {
  const T = text();
  const notes = N.QUIRKS.filter((q) => q.note).map((q) => q.note).concat(Object.values(N.GATES).map((g) => g.note));
  notes.forEach((n) => assert.equal(n, n.toLowerCase(), n));
  N.TEXT.forEach((id) => assert.ok(T[id].length <= 130, id + ' is ' + T[id].length + ' characters'));
  const gross = /\b(poop|pee|puke|vomit|barf|diarrh|fart|turd|crap|snot|booger|toilet paper)\w*/i;
  N.TEXT.forEach((id) => assert.ok(!gross.test(T[id]), id + ': ' + T[id]));
  notes.forEach((n) => assert.ok(!gross.test(n), n));
});
