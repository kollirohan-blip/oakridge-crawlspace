const test = require('node:test');
const assert = require('node:assert/strict');
const { createStorm } = require('../js/engine/storm.js');

// run the storm for `seconds`, collecting events with the time they happened
function run(storm, seconds, step) {
  const out = [];
  step = step || 0.05;
  let t = 0;
  for (let i = 0; i < Math.round(seconds / step); i++) {
    t += step;
    storm.update(step).forEach((e) => out.push(Object.assign({ at: Math.round(t * 100) / 100 }, e)));
  }
  return out;
}

test('a storm at level 0 does nothing', () => {
  const s = createStorm({ rnd: () => 0.5 });
  assert.deepEqual(run(s, 120), []);
  assert.equal(s.level(), 0);
});

test('the level eases toward its target instead of jumping', () => {
  const s = createStorm({ rnd: () => 0.5 });
  s.setLevel(1);
  s.update(0.1);
  assert.ok(s.level() > 0 && s.level() < 0.2, 'after 0.1 s it has only begun: ' + s.level());
  for (let i = 0; i < 400; i++) s.update(0.1);
  assert.ok(s.level() > 0.99);
});

test('at full strength lightning comes every 9 to 26 seconds, each followed by its thunder', () => {
  let i = 0;
  const seq = [0.1, 0.9, 0.5, 0.3, 0.7];
  const s = createStorm({ rnd: () => seq[i++ % seq.length], level: 1 });
  const ev = run(s, 200);
  const flashes = ev.filter((e) => e.type === 'flash');
  const thunder = ev.filter((e) => e.type === 'thunder');
  assert.ok(flashes.length >= 7, 'only ' + flashes.length + ' flashes in 200 s');
  for (let k = 1; k < flashes.length; k++) {
    const gap = flashes[k].at - flashes[k - 1].at;
    assert.ok(gap >= 8.9 && gap <= 26.1, 'gap ' + gap);
  }
  flashes.forEach((f) => {
    assert.ok(f.strength >= 0.35 && f.strength <= 1);
    assert.ok(f.thunderIn >= 0.3 && f.thunderIn <= 5);
    const th = thunder.filter((x) => Math.abs(x.at - (f.at + f.thunderIn)) < 0.11)[0];
    assert.ok(th || f.at + f.thunderIn > 200, 'no thunder after the flash at ' + f.at);
    if (th) assert.equal(th.strength, f.strength);
  });
});

test('a weaker storm flashes less often', () => {
  const count = (level) => run(createStorm({ rnd: () => 0.5, level }), 300).filter((e) => e.type === 'flash').length;
  assert.ok(count(0.4) < count(1), count(0.4) + ' vs ' + count(1));
  assert.ok(count(0.4) > 0);
});

test('strike() flashes on the next update, whatever the level, with the thunder it was given', () => {
  const s = createStorm({ rnd: () => 0.5 });
  s.strike(1, 0.4);
  const ev = run(s, 1);
  assert.deepEqual(ev.map((e) => e.type), ['flash', 'thunder']);
  assert.equal(ev[0].at, 0.05);
  assert.equal(ev[0].strength, 1);
  assert.ok(Math.abs(ev[1].at - 0.45) < 0.06);
});

test('a hidden tab coming back does not fire a burst of lightning', () => {
  const s = createStorm({ rnd: () => 0.5, level: 1 });
  const ev = s.update(600);
  assert.ok(ev.length <= 1);
});
