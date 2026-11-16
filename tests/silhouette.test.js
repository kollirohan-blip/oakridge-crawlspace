const test = require('node:test');
const assert = require('node:assert/strict');
const { createSilhouette } = require('../js/engine/silhouette.js');

const STAGES = ['lampOn', 'figureA', 'figureB', 'gone'];

function look(s, seconds) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += 0.1) {
    const e = s.update(true, 0.1);
    if (e) events.push(e);
  }
  return events;
}
function away(s) {
  return s.update(false, 0.1);
}

test('starts at the first stage', () => {
  assert.equal(createSilhouette(STAGES).stage(), 'lampOn');
});

test('a glance shorter than 0.4 s does not count: looking away does not move it on', () => {
  const s = createSilhouette(STAGES);
  look(s, 0.2);
  assert.equal(away(s), null);
  assert.equal(s.stage(), 'lampOn');
});

test('a real look, then looking away, moves to the next stage', () => {
  const s = createSilhouette(STAGES);
  look(s, 0.5);
  assert.deepEqual(away(s), { advancedTo: 'figureA' });
  assert.equal(s.stage(), 'figureA');
});

test('it never changes while it is being watched, however long', () => {
  const s = createSilhouette(STAGES);
  look(s, 30);
  assert.equal(s.stage(), 'lampOn');
});

test('each stage reports being sighted exactly once', () => {
  const s = createSilhouette(STAGES);
  const first = look(s, 1.0);
  assert.deepEqual(first, [{ sighted: 'lampOn' }]);
  away(s);
  look(s, 0.1); // a glance at the new stage: not a sighting yet
  away(s);
  assert.equal(s.stage(), 'figureA', 'a glance does not move it on either');
  assert.deepEqual(look(s, 0.6), [{ sighted: 'figureA' }]);
  assert.deepEqual(look(s, 2), []);
});

test('the whole sequence runs in order and stops at the last stage', () => {
  const s = createSilhouette(STAGES);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    look(s, 0.5);
    away(s);
    seen.push(s.stage());
  }
  assert.deepEqual(seen, ['figureA', 'figureB', 'gone', 'gone', 'gone', 'gone']);
});

test('reset() goes back to the start', () => {
  const s = createSilhouette(STAGES);
  look(s, 0.5);
  away(s);
  s.reset();
  assert.equal(s.stage(), 'lampOn');
});
