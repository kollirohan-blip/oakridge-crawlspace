const test = require('node:test');
const assert = require('node:assert/strict');
const { inView, createLookWatcher } = require('../js/engine/sightline.js');

const cam = (x, z, yaw) => ({ x, z, yaw });
const HALF = 0.6; // radians

test('target straight ahead is in view (yaw 0 faces -z), target behind is not', () => {
  assert.equal(inView(cam(0, 0, 0), { x: 0, z: -5 }, HALF), true);
  assert.equal(inView(cam(0, 0, 0), { x: 0, z: 5 }, HALF), false);
});

test('target just outside the field of view is not in view', () => {
  assert.equal(inView(cam(0, 0, 0), { x: 3, z: -5 }, HALF), true); // about 31 degrees
  assert.equal(inView(cam(0, 0, 0), { x: 5, z: -5 }, HALF), false); // 45 degrees
});

test('turning the camera brings a side target into view', () => {
  // yaw +90 degrees (turn left) faces -x
  assert.equal(inView(cam(0, 0, Math.PI / 2), { x: -5, z: 0 }, HALF), true);
  assert.equal(inView(cam(0, 0, 0), { x: -5, z: 0 }, HALF), false);
});

test('look watcher reports looked, then looked-away, then nothing until seen again', () => {
  const w = createLookWatcher({ x: 0, z: -5 }, HALF);
  assert.equal(w.update(cam(0, 0, Math.PI)), null); // facing away: never seen yet
  assert.equal(w.update(cam(0, 0, 0)), 'looked');
  assert.equal(w.update(cam(0, 0, 0)), null);
  assert.equal(w.update(cam(0, 0, Math.PI)), 'looked-away');
  assert.equal(w.update(cam(0, 0, Math.PI)), null);
  assert.equal(w.update(cam(0, 0, 0)), 'looked');
});
