const test = require('node:test');
const assert = require('node:assert/strict');
const { createOverhead } = require('../js/engine/overhead.js');

// feed it a script of [seconds, moving] stretches; collect events with their times
function play(o, script, step) {
  const out = [];
  step = step || 0.05;
  script.forEach(([seconds, moving]) => {
    for (let i = 0; i < Math.round(seconds / step); i++) {
      play.t += step;
      o.update(step, moving).forEach((type) => out.push({ type, at: Math.round(play.t * 100) / 100 }));
    }
  });
  return out;
}
function fresh() {
  play.t = 0;
  const o = createOverhead();
  o.start();
  return o;
}

test('nothing happens until it is started', () => {
  play.t = 0;
  const o = createOverhead();
  assert.deepEqual(play(o, [[20, true], [5, false]]), []);
  assert.equal(o.phase(), 'idle');
});

test('while you crawl there are footsteps above, about three every two seconds', () => {
  const o = fresh();
  const steps = play(o, [[6, true]]).filter((e) => e.type === 'step');
  assert.ok(steps.length >= 7 && steps.length <= 11, steps.length + ' steps in 6 s');
});

test('when you stop, they stop: one last step a beat late, then nothing', () => {
  const o = fresh();
  play(o, [[3, true]]);
  const after = play(o, [[4, false]]);
  assert.equal(after.filter((e) => e.type === 'step').length, 1, 'exactly one late step');
  assert.ok(after[0].at - 3 >= 0.3 && after[0].at - 3 <= 0.7, 'a beat late: ' + (after[0].at - 3));
});

test('after you have tested it twice they stop for good, and the next time you hold still someone sits down', () => {
  const o = fresh();
  const ev = play(o, [[4, true], [2, false], [4, true], [2, false], [3, true], [5, false]]);
  const sit = ev.filter((e) => e.type === 'sit');
  assert.equal(sit.length, 1);
  assert.ok(o.phase() === 'sat' || o.phase() === 'ringing');
  // no steps between the end of the second stop and the sit
  const stray = ev.filter((e) => e.type === 'step' && e.at > 12.7 && e.at < sit[0].at);
  assert.deepEqual(stray, []);
  // he sits only once you have been still a while (you stopped again at 15 s)
  assert.ok(sit[0].at >= 15 + 2, 'sat at ' + sit[0].at);
});

test('then the phone upstairs starts to ring, once', () => {
  const o = fresh();
  const ev = play(o, [[4, true], [2, false], [4, true], [2, false], [20, false]]);
  assert.deepEqual(ev.filter((e) => e.type !== 'step').map((e) => e.type), ['sit', 'ring']);
  const sit = ev.filter((e) => e.type === 'sit')[0];
  const ring = ev.filter((e) => e.type === 'ring')[0];
  assert.ok(ring.at - sit.at >= 4 && ring.at - sit.at <= 10);
  assert.equal(o.phase(), 'ringing');
  assert.deepEqual(play(o, [[30, true], [30, false]]), [], 'nothing more after the ring');
});

test('a player who never holds still is sat on anyway, in the end', () => {
  const o = fresh();
  const ev = play(o, [[90, true]]);
  assert.equal(ev.filter((e) => e.type === 'sit').length, 1);
  assert.equal(ev.filter((e) => e.type === 'ring').length, 1);
});

test('a player who never moves is sat on too', () => {
  const o = fresh();
  const ev = play(o, [[60, false]]);
  assert.equal(ev.filter((e) => e.type === 'sit').length, 1);
});
