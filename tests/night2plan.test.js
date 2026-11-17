const test = require('node:test');
const assert = require('node:assert/strict');
const { createHabits, nightTwoPlan, tonightsPlan, notebookPages } = require('../js/engine/habits.js');

// Night 2 reads the log: which habits the house punishes, and what Wes wrote in his notebook.
const logOf = (list) => {
  const h = createHabits();
  list.forEach(([action, detail, clock, t]) => h.log(action, detail, { clock: clock || '', t: t || 0 }));
  return h.entries();
};

test('nightTwoPlan: sleeping with every light on trips the breaker', () => {
  const p = nightTwoPlan(logOf([['bed', { lights: 4 }]]));
  assert.equal(p.gates.breaker, true);
  assert.equal(p.gates.lightFalters, false);
  assert.equal(p.gates.tvReflection, false);
});

test('nightTwoPlan: heavy phone light and window watching set their own gates, not the breaker', () => {
  const p = nightTwoPlan(logOf([
    ['bed', { lights: 1 }], ['phoneLight', { sec: 200 }],
    ['windowLook'], ['windowLook'], ['windowLook'],
  ]));
  assert.deepEqual(p.gates, { breaker: false, lightFalters: true, tvReflection: true });
});

test('nightTwoPlan: a log that sets no gate (or no log at all) still gets the breaker', () => {
  assert.equal(nightTwoPlan([]).gates.breaker, true);
  assert.equal(nightTwoPlan(logOf([['bed', { lights: 0 }], ['phoneLight', { sec: 5 }]])).gates.breaker, true);
});

test('nightTwoPlan: the familiar sound is the thing he cooked with', () => {
  assert.equal(nightTwoPlan(logOf([['dinner', { kind: 'lasagna' }]])).familiar, 'microwave');
  assert.equal(nightTwoPlan(logOf([['dinner', { kind: 'tupperware' }]])).familiar, 'microwave');
  assert.equal(nightTwoPlan(logOf([['dinner', { kind: 'mac' }]])).familiar, 'kettle');
  assert.equal(nightTwoPlan(logOf([['dinner', { kind: 'pizza' }]])).familiar, 'oven');
  assert.equal(nightTwoPlan(logOf([['dinner', { kind: 'cereal' }], ['tvOn']])).familiar, 'tv');
  assert.equal(nightTwoPlan([]).familiar, 'microwave');
});

test('tonightsPlan: his routine in the order he did it, and always bed last', () => {
  const plan = tonightsPlan(logOf([
    ['tvOn', {}, '7:40 PM'], ['dinner', { kind: 'pizza' }, '8:05 PM'], ['brushedTeeth', {}, '9:10 PM'], ['bed', { lights: 0 }, '1:50 AM'],
  ]));
  assert.deepEqual(plan, ['tv', 'dinner', 'bathroom', 'bed']);
});

test('tonightsPlan: an empty log is still a plan, and day two is not part of the routine', () => {
  assert.deepEqual(tonightsPlan([]), ['bed']);
  const plan = tonightsPlan(logOf([['dinner', { kind: 'mac' }], ['bed', {}], ['dayTwo'], ['tvOn'], ['brushedTeeth']]));
  assert.deepEqual(plan, ['dinner', 'bed']);
});

test('notebookPages: night one, then today, then the plan for tonight', () => {
  const pages = notebookPages(logOf([
    ['dinner', { kind: 'lasagna' }, '7:48 PM'], ['petCooper', {}, '7:52 PM'], ['bed', { lights: 4 }, '1:55 AM'],
    ['dayTwo'],
    ['calledDeputy', {}, '11:40 AM'], ['sawGrowthMarks', {}, '3:15 PM'],
  ]));
  assert.equal(pages[0].title, 'MASON');
  assert.deepEqual(pages[0].lines, ['7:48 ate the lasagna. good.', '7:52 pets the dog a lot', '1:55 bed. every light on']);
  assert.equal(pages[1].title, 'TODAY');
  assert.equal(pages[1].lines.length, 2);
  assert.match(pages[1].lines[0], /^11:40 /);
  const last = pages[pages.length - 1];
  assert.equal(last.title, "TONIGHT'S PLAN");
  assert.deepEqual(last.lines.slice(0, 2), ['dinner', 'bed']);
});

test('notebookPages: a long night runs onto more pages, and nothing is lost', () => {
  const many = [];
  ['mail', 'trash', 'washedUp', 'brushedTeeth', 'lockedPatio', 'watchedTv', 'photo', 'petCooper', 'fetch', 'trick', 'fedCooper', 'twoScoops'].forEach((a, i) => many.push([a, {}, '8:' + (10 + i) + ' PM']));
  const pages = notebookPages(logOf(many), 5);
  const night = pages.filter((p) => p.title.indexOf('MASON') === 0);
  assert.equal(night.length, 3);
  assert.equal(night.reduce((n, p) => n + p.lines.length, 0), 12);
  assert.ok(night.every((p) => p.lines.length <= 5));
});

test('notebookPages: with no log there is still a first page and a plan', () => {
  const pages = notebookPages([]);
  assert.equal(pages[0].title, 'MASON');
  assert.ok(pages[0].lines.length >= 1, 'he wrote something about a boy he never saw do anything');
  assert.equal(pages[pages.length - 1].title, "TONIGHT'S PLAN");
});

test('startChapter: restarting a chapter forgets what was logged in it the last time, and nothing before it', () => {
  const h = createHabits();
  h.log('dinner', { kind: 'mac' });
  h.startChapter('dayTwo');
  h.log('coffee');
  h.log('calledDeputy');
  h.startChapter('nightTwo');
  h.log('tookNotebook');
  // restart day two: its entries and everything after go, night one stays
  h.startChapter('dayTwo');
  assert.deepEqual(h.entries().map((e) => e.action), ['dinner', 'dayTwo']);
  h.log('coffee');
  h.startChapter('nightTwo');
  h.startChapter('nightTwo');
  assert.deepEqual(h.entries().map((e) => e.action), ['dinner', 'dayTwo', 'coffee', 'nightTwo']);
});

test('nightTwoPlan and the notebook ignore what happens on night two itself', () => {
  const entries = logOf([['dinner', { kind: 'mac' }, '8:00 PM'], ['dayTwo'], ['coffee', {}, '10:05 AM'], ['nightTwo'], ['tookNotebook', {}, '10:40 PM'], ['sawHook', {}, '10:50 PM'], ['dinner', { kind: 'pizza' }, '11:00 PM']]);
  const pages = notebookPages(entries);
  const all = pages.map((p) => p.lines.join('|')).join('|');
  assert.ok(!/nightTwo|tookNotebook|the bar|pizza/.test(all), all);
  assert.equal(nightTwoPlan(entries).familiar, 'kettle');
  assert.equal(pages.filter((p) => p.title === 'TODAY')[0].lines.length, 1);
});

test('notebookPages: the day-two marker itself is never written down', () => {
  const pages = notebookPages(logOf([['dinner', { kind: 'mac' }, '8:00 PM'], ['dayTwo'], ['coffee', {}, '10:05 AM']]));
  pages.forEach((p) => p.lines.forEach((l) => assert.ok(!/dayTwo/.test(l), l)));
});
