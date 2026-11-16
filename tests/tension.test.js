const test = require('node:test');
const assert = require('node:assert/strict');
const { createTension, stressFrom } = require('../js/engine/tension.js');

const CALM = { turnRate: 0, moving: true, backingUp: false, sprinting: false, lightOn: false };
const STILL = { turnRate: 0, moving: false, backingUp: false, sprinting: false, lightOn: false };
const PANIC = { turnRate: 4, moving: true, backingUp: true, sprinting: true, lightOn: true };

// run for `seconds` in 0.05 s steps; return the events with the time they fired
function run(d, seconds, signs, start) {
  const out = [];
  let t = start || 0;
  const end = t + seconds;
  while (t < end - 1e-9) {
    t += 0.05;
    const ev = d.update(0.05, signs);
    if (ev) out.push({ t: Math.round(t * 100) / 100, kind: ev.kind });
  }
  return out;
}

test('nothing fires before menace reaches the threshold, then an ambient event does', () => {
  const d = createTension({ rise: 0.1, threshold: 0.6, idleLimit: 999 });
  assert.deepEqual(run(d, 5.8, CALM), []);
  const evs = run(d, 0.4, CALM, 5.8);
  assert.equal(evs.length, 1);
  assert.equal(evs[0].kind, 'ambient');
});

test('after an ambient event the cooldown blocks another one', () => {
  const d = createTension({ rise: 1, threshold: 0.6, cooldown: 20, idleLimit: 999 });
  const first = run(d, 1, CALM);
  assert.equal(first.length, 1);
  assert.deepEqual(run(d, 19, CALM), []);
  assert.equal(run(d, 2, CALM).length, 1);
});

test('peak(6) forces a relief window and zeroes menace; nothing fires during it', () => {
  const d = createTension({ rise: 1, threshold: 0.6, reliefSec: 30, idleLimit: 999 });
  run(d, 0.3, CALM);
  d.peak(6);
  assert.equal(d.menace(), 0);
  assert.equal(d.inRelief(), true);
  assert.deepEqual(run(d, 29, CALM), []);
  assert.equal(d.inRelief(), true);
  run(d, 1.5, CALM);
  assert.equal(d.inRelief(), false);
});

test('peak(3) lowers menace but does not force relief', () => {
  const d = createTension({ rise: 0.1, threshold: 0.9, idleLimit: 999 });
  run(d, 5, CALM);
  const before = d.menace();
  d.peak(3);
  assert.ok(Math.abs(d.menace() - (before - 0.3)) < 1e-9);
  assert.equal(d.inRelief(), false);
});

test('ready() is false during relief and during a cooldown', () => {
  const d = createTension({ cooldown: 10, reliefSec: 5, idleLimit: 999 });
  assert.equal(d.ready(), true);
  d.spend();
  assert.equal(d.ready(), false);
  run(d, 10.1, CALM);
  assert.equal(d.ready(), true);
  d.relieve(5);
  assert.equal(d.ready(), false);
  run(d, 5.1, CALM);
  assert.equal(d.ready(), true);
});

test('high stress slows the rise and stops events firing', () => {
  const calm = createTension({ rise: 0.1, idleLimit: 999 });
  const scared = createTension({ rise: 0.1, idleLimit: 999 });
  run(calm, 3, CALM);
  run(scared, 3, PANIC);
  assert.ok(scared.menace() < calm.menace());
  assert.ok(scared.stress() > 0.6);
  // even far past the threshold, a panicking player gets a break
  assert.deepEqual(run(scared, 60, PANIC), []);
});

test('standing still for idleLimit fires idle punish, then a relief window', () => {
  const d = createTension({ rise: 0, idleLimit: 40, reliefSec: 30 });
  assert.deepEqual(run(d, 39.9, STILL), []);
  const evs = run(d, 0.2, STILL, 39.9);
  assert.deepEqual(evs.map((e) => e.kind), ['idle']);
  assert.equal(d.inRelief(), true);
  // the relief is half the usual window: 15 s
  assert.deepEqual(run(d, 14.7, STILL), []);
  assert.equal(d.inRelief(), true);
  run(d, 0.4, STILL);
  assert.equal(d.inRelief(), false);
});

test('moving or looking around resets the idle timer', () => {
  const d = createTension({ rise: 0, idleLimit: 40 });
  run(d, 30, STILL);
  run(d, 0.1, CALM);
  assert.deepEqual(run(d, 39, STILL), []);
  run(d, 0.1, { ...STILL, turnRate: 1 });
  assert.deepEqual(run(d, 39, STILL), []);
});

test('the budget stops ambient events once spent', () => {
  const d = createTension({ rise: 1, threshold: 0.6, cooldown: 1, budget: 2, idleLimit: 999 });
  const evs = run(d, 30, CALM);
  assert.equal(evs.length, 2);
  assert.equal(d.budgetLeft(), 0);
});

test('a huge frame delta (a hidden tab coming back) counts as 0.1 s', () => {
  const d = createTension({ rise: 0.1, threshold: 0.6, idleLimit: 999 });
  assert.equal(d.update(30, CALM), null);
  assert.ok(Math.abs(d.menace() - 0.01) < 1e-9, 'menace ' + d.menace());
});

test('stressFrom adds up the signs and clamps to 1', () => {
  assert.equal(stressFrom(CALM), 0);
  assert.ok(Math.abs(stressFrom({ ...CALM, turnRate: 3 }) - 0.4) < 1e-9);
  assert.ok(Math.abs(stressFrom({ ...CALM, sprinting: true }) - 0.3) < 1e-9);
  assert.ok(Math.abs(stressFrom({ ...CALM, backingUp: true }) - 0.2) < 1e-9);
  assert.ok(Math.abs(stressFrom({ ...CALM, lightOn: true }) - 0.1) < 1e-9);
  assert.equal(stressFrom(PANIC), 1);
});
