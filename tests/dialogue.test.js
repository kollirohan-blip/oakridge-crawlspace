const test = require('node:test');
const assert = require('node:assert/strict');
const { createDialogue, validateDialogue } = require('../js/engine/dialogue.js');

const TREE = {
  start: 'hi',
  nodes: {
    hi: {
      say: [['Cashier', 'Help you find anything?']],
      choices: [
        { id: 'dave', text: "I'm watching the Dave place.", next: 'dave', log: 'toldCashier' },
        { id: 'no', text: 'Just this, thanks.', next: 'bye' },
      ],
    },
    dave: { say: [['Cashier', 'Oh. The Dave place.']], next: 'gossip' },
    gossip: {
      say: [['Cashier', 'People used to talk.'], ['Mason', 'About what?']],
      choices: [{ id: 'what', text: 'Talk about what?', next: 'bye', log: 'askedGossip' }],
    },
    bye: { say: [['Cashier', 'Have a good one.']], end: true },
  },
};

test('a dialogue starts at its start node', () => {
  const d = createDialogue(TREE);
  assert.equal(d.id(), 'hi');
  assert.equal(d.node().say[0][1], 'Help you find anything?');
  assert.equal(d.done(), false);
});

test('choosing moves to the next node and remembers what was chosen', () => {
  const d = createDialogue(TREE);
  const n = d.choose('dave');
  assert.equal(d.id(), 'dave');
  assert.equal(n, d.node());
  assert.deepEqual(d.history(), [{ node: 'hi', choice: 'dave', log: 'toldCashier' }]);
});

test('a node with next and no choices is moved past with advance()', () => {
  const d = createDialogue(TREE);
  d.choose('dave');
  assert.equal(d.advance(), true);
  assert.equal(d.id(), 'gossip');
  assert.equal(d.advance(), false, 'a node with choices waits for one');
});

test('reaching an end node finishes the dialogue', () => {
  const d = createDialogue(TREE);
  d.choose('no');
  assert.equal(d.id(), 'bye');
  assert.equal(d.done(), true);
});

test('a choice that is not on offer is an error, and so is choosing after the end', () => {
  const d = createDialogue(TREE);
  assert.throws(() => d.choose('nope'), /no choice "nope" at "hi"/);
  d.choose('no');
  assert.throws(() => d.choose('no'), /dialogue is over/);
});

test('logs() lists what the choices logged, in order', () => {
  const d = createDialogue(TREE);
  d.choose('dave');
  d.advance();
  d.choose('what');
  assert.deepEqual(d.logs(), ['toldCashier', 'askedGossip']);
});

test('validateDialogue finds a missing start, a dead link and a node that goes nowhere', () => {
  assert.deepEqual(validateDialogue(TREE), []);
  const bad = {
    start: 'x',
    nodes: {
      a: { say: [], choices: [{ id: 'c', text: 't', next: 'missing' }] },
      b: { say: [] },
    },
  };
  const problems = validateDialogue(bad);
  assert.ok(problems.some((p) => /start "x" is not a node/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /"a" links to missing node "missing"/.test(p)), problems.join('\n'));
  assert.ok(problems.some((p) => /"b" has no choices, no next and no end/.test(p)), problems.join('\n'));
});
