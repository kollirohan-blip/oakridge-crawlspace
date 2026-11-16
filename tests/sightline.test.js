const test = require('node:test');
const assert = require('node:assert/strict');
const { inView, createLookWatcher, lineOfSight } = require('../js/engine/sightline.js');

const wall = { x0: 4, x1: 4.2, z0: -10, z1: 10, y0: 0, y1: 2.6, kind: 'wall' };

test('lineOfSight is blocked by a wall that spans the eye height', () => {
  assert.equal(lineOfSight([wall], { x: 0, z: 0 }, { x: 8, z: 0 }, 1.5), false);
});

test('lineOfSight is clear when nothing stands between, and glass does not block', () => {
  assert.equal(lineOfSight([], { x: 0, z: 0 }, { x: 8, z: 0 }, 1.5), true);
  assert.equal(lineOfSight([{ ...wall, kind: 'glass' }], { x: 0, z: 0 }, { x: 8, z: 0 }, 1.5), true);
});

test('the patio slider is a glass door: it does not block the view either', () => {
  assert.equal(lineOfSight([{ ...wall, kind: 'slider' }], { x: 0, z: 0 }, { x: 8, z: 0 }, 1.5), true);
});

test('lineOfSight ignores boxes that are entirely below or above the eye height', () => {
  assert.equal(lineOfSight([{ ...wall, y0: 0, y1: 0.9 }], { x: 0, z: 0 }, { x: 8, z: 0 }, 1.5), true);
  assert.equal(lineOfSight([{ ...wall, y0: 2.0, y1: 2.6 }], { x: 0, z: 0 }, { x: 8, z: 0 }, 1.5), true);
});

test('lineOfSight is clear when the segment ends before reaching the wall', () => {
  assert.equal(lineOfSight([wall], { x: 0, z: 0 }, { x: 3, z: 0 }, 1.5), true);
});

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
