const test = require('node:test');
const assert = require('node:assert/strict');
const { createHabits } = require('../js/engine/habits.js');
const { resolveEnding, endingLines, endingMarks, notebookReadout, formatStarted } = require('../js/engine/evidence.js');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const textData = (() => {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../content/text.js'), 'utf8'), { window });
  return window.OC.textData;
})();

// The epilogue asks one question: what can Mason prove? The answer comes from the habit log alone, so
// it survives a checkpoint reload. Key evidence: the two photos that show him (night one's hallway,
// the closet at 12:30), and from under the house, his notebook (photographed or taken) and a photo of
// the nest. Strong = 3 or more key items including one that shows him; partial = 2; little = 0 or 1.
const logOf = (list) => {
  const h = createHabits();
  list.forEach(([action, detail, clock]) => h.log(action, detail, { clock: clock || '', t: 0 }));
  return h.entries();
};

test('resolveEnding: an empty log proves nothing', () => {
  const r = resolveEnding([]);
  assert.equal(r.tier, 'little');
  assert.deepEqual(r.key, []);
  assert.equal(r.showsHim, false);
});

test('resolveEnding: one dark photo of a closet is not enough', () => {
  const r = resolveEnding(logOf([['photoEye']]));
  assert.equal(r.tier, 'little');
  assert.deepEqual(r.key, ['photoEye']);
  assert.equal(r.showsHim, true);
});

test('resolveEnding: both photos of him make it partial', () => {
  const r = resolveEnding(logOf([['photoWes'], ['photoEye']]));
  assert.equal(r.tier, 'partial');
  assert.deepEqual(r.key, ['photoWes', 'photoEye']);
});

test('resolveEnding: three key items including one that shows him is strong', () => {
  const r = resolveEnding(logOf([['photoNest'], ['notebook', { kind: 'photo' }], ['photoEye']]));
  assert.equal(r.tier, 'strong');
  assert.deepEqual(r.key, ['photoEye', 'notebook', 'photoNest']);
});

test('resolveEnding: the notebook counts when taken or photographed, not when left behind', () => {
  assert.equal(resolveEnding(logOf([['photoWes'], ['photoEye'], ['notebook', { kind: 'took' }]])).tier, 'strong');
  const left = resolveEnding(logOf([['photoWes'], ['photoEye'], ['notebook', { kind: 'left' }]]));
  assert.equal(left.tier, 'partial');
  assert.equal(left.notebook, 'left');
});

test('resolveEnding: evidence of where he lived, without a picture of him, tops out at partial', () => {
  const r = resolveEnding(logOf([['notebook', { kind: 'took' }], ['photoNest']]));
  assert.equal(r.tier, 'partial');
  assert.equal(r.showsHim, false);
});

test('resolveEnding: doing the same thing twice does not count twice', () => {
  assert.equal(resolveEnding(logOf([['photoEye'], ['photoEye'], ['photoEye']])).tier, 'little');
});

test('resolveEnding: what he saw but cannot show is support, not proof', () => {
  const r = resolveEnding(logOf([['photoEye'], ['sawClip'], ['sawPrintsOut'], ['sawPoster'], ['faceAtGlass']]));
  assert.equal(r.tier, 'little');
  assert.deepEqual(r.support, ['clip', 'prints', 'poster', 'face']);
});

test('resolveEnding: reads the side facts the epilogue lines need', () => {
  const r = resolveEnding(logOf([
    ['calledDeputy'], ['sawShopper', { looked: true }], ['crawl', { kind: 'tally' }], ['readNotebook'],
    ['survived', { ray: true }],
  ]));
  assert.equal(r.deputy, true);
  assert.equal(r.shopper, true);
  assert.equal(r.counted, true);
  assert.equal(r.plan, true);
  assert.equal(r.ray, true);
  const none = resolveEnding(logOf([['survived', { ray: false }]]));
  assert.equal(none.deputy, false);
  assert.equal(none.ray, false);
  assert.equal(none.plan, false);
  assert.equal(none.counted, false);
});

test('endingLines: the verdict for each tier, then what Mason knew, then the deputy', () => {
  const strong = endingLines(resolveEnding(logOf([
    ['photoWes'], ['photoEye'], ['photoNest'], ['readNotebook'], ['calledDeputy'],
  ])));
  assert.deepEqual(strong, ['ep.strong.1', 'ep.strong.2', 'ep.plan', 'ep.deputy']);
  assert.deepEqual(endingLines(resolveEnding(logOf([['photoWes'], ['photoEye']]))), ['ep.partial.1', 'ep.partial.2']);
  assert.deepEqual(endingLines(resolveEnding([])), ['ep.little.1', 'ep.little.2']);
});

test('endingMarks: one mark per ending, and Ray at the window is an ending of its own', () => {
  assert.deepEqual(endingMarks(resolveEnding([])), ['ending:little']);
  assert.deepEqual(endingMarks(resolveEnding(logOf([['photoWes'], ['photoEye'], ['survived', { ray: true }]]))), ['ending:partial', 'ending:ray']);
});

test('every epilogue line the resolver can ask for is written', () => {
  const logs = [
    [], [['photoWes'], ['photoEye']],
    [['photoWes'], ['photoEye'], ['photoNest'], ['readNotebook'], ['calledDeputy'], ['survived', { ray: true }]],
  ];
  logs.forEach((l) => endingLines(resolveEnding(logOf(l))).forEach((id) => {
    assert.equal(typeof textData[id], 'string', 'missing text: ' + id);
  }));
});

test('formatStarted: the real day and time, the way he writes', () => {
  assert.equal(formatStarted(new Date(2026, 10, 17, 21, 42)), 'tuesday 11/17, 9:42 pm');
  assert.equal(formatStarted(new Date(2026, 0, 3, 0, 5)), 'saturday 1/3, 12:05 am');
  assert.equal(formatStarted(new Date(2026, 6, 4, 12, 0)), 'saturday 7/4, 12:00 pm');
  assert.equal(formatStarted(null), null);
  assert.equal(formatStarted(new Date('nonsense')), null);
});

test('notebookReadout: his lines about both nights, never night two, and the real time you started last', () => {
  const entries = logOf([
    ['dinner', { kind: 'lasagna' }, '7:42 PM'], ['twoScoops', {}, '8:01 PM'], ['dayTwo'],
    ['coffee', {}, '10:15 AM'], ['nightTwo'], ['fedCooper', {}, '8:40 PM'],
  ]);
  const out = notebookReadout(entries, new Date(2026, 10, 17, 21, 42), 6);
  assert.deepEqual(out.lines, ['7:42 ate the lasagna. good.', '8:01 two scoops. dave said one', "10:15 drank dave's coffee. dave makes it too strong"]);
  assert.equal(out.last, 'tuesday 11/17, 9:42 pm');
});

test('notebookReadout: keeps the first few lines, and an empty log still gets a page', () => {
  const many = logOf([['mail'], ['trash'], ['washedUp'], ['brushedTeeth'], ['lockedPatio'], ['watchedTv'], ['petCooper']]);
  assert.equal(notebookReadout(many, null, 4).lines.length, 4);
  assert.equal(notebookReadout(many, null, 4).last, null);
  assert.ok(notebookReadout([], null, 6).lines.length > 0);
});
