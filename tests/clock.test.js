const test = require('node:test');
const assert = require('node:assert/strict');
const { gameClock } = require('../js/engine/clock.js');

test('label at the start is 7:30 PM', () => {
  const c = gameClock({ startMin: 19 * 60 + 30, endMin: 25 * 60 + 30, durationSec: 600 });
  assert.equal(c.label(), '7:30 PM');
});

test('a huge dt (hidden tab) advances the clock no more than a 0.1 s tick', () => {
  const a = gameClock({ startMin: 1170, endMin: 1530, durationSec: 600 });
  const b = gameClock({ startMin: 1170, endMin: 1530, durationSec: 600 });
  a.tick(1000);
  b.tick(0.1);
  assert.equal(a.minutes(), b.minutes());
});

test('the label wraps past midnight to 12:20 AM', () => {
  const c = gameClock({ startMin: 23 * 60 + 50, endMin: 24 * 60 + 50, durationSec: 60 });
  assert.equal(c.label(), '11:50 PM');
  for (let i = 0; i < 480; i++) c.tick(0.0625); // 30 s exactly
  assert.equal(c.label(), '12:20 AM');
});

test('the clock stops at the end time', () => {
  const c = gameClock({ startMin: 1170, endMin: 1530, durationSec: 1 });
  for (let i = 0; i < 100; i++) c.tick(0.1);
  assert.equal(c.minutes(), 1530);
  assert.equal(c.label(), '1:30 AM');
});
