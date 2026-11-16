const test = require('node:test');
const assert = require('node:assert/strict');
const { outcome, createStareRule } = require('../js/engine/bluff.js');

test('only the calm bluff (option c) survives', () => {
  assert.equal(outcome('c'), 'survive');
  assert.equal(outcome('a'), 'scream');
  assert.equal(outcome('b'), 'confront');
});

test('running out of time counts as freezing', () => {
  assert.equal(outcome('timeout'), 'freeze');
});

test('anything unexpected is treated as freezing, never as surviving', () => {
  assert.equal(outcome(undefined), 'freeze');
  assert.equal(outcome('d'), 'freeze');
});

test('the stare rule trips after 1.2 s of continuous looking', () => {
  const rule = createStareRule(1.2);
  for (let i = 0; i < 11; i++) assert.equal(rule.update(true, 0.1), false);
  assert.equal(rule.update(true, 0.1), true);
});

test('glances do not add up: looking away resets the stare', () => {
  const rule = createStareRule(1.2);
  for (let k = 0; k < 5; k++) {
    for (let i = 0; i < 8; i++) assert.equal(rule.update(true, 0.1), false);
    assert.equal(rule.update(false, 0.1), false);
  }
});
