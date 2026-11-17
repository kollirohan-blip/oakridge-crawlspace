const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { validateDialogue, createDialogue } = require('../js/engine/dialogue.js');

// content/talks.js is a browser script that fills window.OC.talkData; run it against a bare window
function load() {
  const window = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../content/talks.js'), 'utf8'), { window });
  return window.OC.talkData;
}
const SPEAKERS = ['Mason', 'Mom', 'Dave', 'Ethan', 'Ray', 'Dispatch', 'Cashier'];

test('Day 2 has every conversation the game starts', () => {
  const T = load();
  ['mom', 'dave', 'ethan', 'ray', 'rayAgain', 'rayVisit', 'cashier', 'daveLandline', 'daveLate'].forEach((id) => assert.ok(T[id], 'missing ' + id));
});

test('every conversation is a valid tree', () => {
  const T = load();
  for (const [id, tree] of Object.entries(T)) assert.deepEqual(validateDialogue(tree), [], id);
});

test('every line has a known speaker and words, and every choice has words', () => {
  const T = load();
  for (const [id, tree] of Object.entries(T)) {
    for (const [nid, n] of Object.entries(tree.nodes)) {
      assert.ok(Array.isArray(n.say), id + '.' + nid + ' has no say list');
      n.say.forEach(([who, text]) => {
        assert.ok(SPEAKERS.includes(who), id + '.' + nid + ': unknown speaker ' + who);
        assert.ok(typeof text === 'string' && text.trim().length > 1, id + '.' + nid + ': an empty line');
      });
      (n.choices || []).forEach((c) => assert.ok(c.id && c.text && c.text.trim(), id + '.' + nid + ': a choice with no words'));
    }
  }
});

test('asking Ray to come out logs calledDeputy, and saying no does not', () => {
  const T = load();
  const walk = (picks) => {
    const d = createDialogue(T.ray);
    for (const p of picks) {
      while (d.advance());
      if (d.done()) break;
      d.choose(p);
    }
    while (d.advance());
    return d;
  };
  const yes = walk(['come']);
  assert.ok(yes.done());
  assert.ok(yes.logs().includes('calledDeputy'));
  const no = walk(['never']);
  assert.ok(no.done());
  assert.ok(!no.logs().includes('calledDeputy'));
});

test('Dave gives Ray\'s number on every path through his call', () => {
  const T = load();
  const ends = [];
  (function explore(picks) {
    const d = createDialogue(T.dave);
    for (const p of picks) {
      while (d.advance());
      d.choose(p);
    }
    while (d.advance());
    if (d.done()) return ends.push(d.logs());
    d.node().choices.forEach((c) => explore(picks.concat(c.id)));
  })([]);
  assert.ok(ends.length >= 2, 'Dave has more than one path');
  ends.forEach((logs) => assert.ok(logs.includes('gotRaysNumber'), 'a path without the number: ' + logs.join()));
});
