const test = require('node:test');
const assert = require('node:assert/strict');
const { pickTarget } = require('../js/engine/pick.js');

// the camera stands at the origin, eye height 1.65, facing -z (yaw 0), level
const cam = { x: 0, y: 1.65, z: 0, yaw: 0, pitch: 0 };
const item = (id, x, y, z, extra) => Object.assign({ id, x, y, z }, extra || {});
const wall = { x0: -5, x1: 5, z0: -1.6, z1: -1.4, y0: 0, y1: 2.6, kind: 'wall' };

test('picks an item straight ahead within reach', () => {
  const t = pickTarget(cam, [item('a', 0, 1.65, -1.5)], []);
  assert.equal(t && t.id, 'a');
});

test('ignores an item that is out of reach', () => {
  assert.equal(pickTarget(cam, [item('a', 0, 1.65, -3.5)], []), null);
});

test('ignores an item behind the player', () => {
  assert.equal(pickTarget(cam, [item('a', 0, 1.65, 1.5)], []), null);
});

test('ignores an item with a wall between it and the player', () => {
  assert.equal(pickTarget(cam, [item('a', 0, 1.65, -2.0)], [wall]), null);
});

test('skips disabled items, whether the flag is false or a function returning false', () => {
  const items = [item('a', 0, 1.65, -1.5, { enabled: false }), item('b', 0.1, 1.65, -1.6, { enabled: () => false })];
  assert.equal(pickTarget(cam, items, []), null);
});

test('an enabled function returning true keeps the item', () => {
  const t = pickTarget(cam, [item('a', 0, 1.65, -1.5, { enabled: () => true })], []);
  assert.equal(t && t.id, 'a');
});

test('of two items in reach, picks the one closest to the crosshair', () => {
  const items = [item('left', -0.5, 1.65, -1.5), item('centre', 0.05, 1.65, -1.5)];
  assert.equal(pickTarget(cam, items, []).id, 'centre');
});

test('an item on the floor needs the player to look down', () => {
  const floor = item('bowl', 0, 0.2, -1.2);
  assert.equal(pickTarget(cam, [floor], []), null);
  assert.equal(pickTarget({ ...cam, pitch: -0.95 }, [floor], []).id, 'bowl');
});

test('a bigger radius makes an item easier to hit off-centre', () => {
  const small = item('s', 0.7, 1.65, -1.5);
  const big = item('b', 0.7, 1.65, -1.5, { radius: 0.5 });
  assert.equal(pickTarget(cam, [small], []), null);
  assert.equal(pickTarget(cam, [big], []).id, 'b');
});

test('an item inside a solid prop (the key under the bush) can still be picked from outside it', () => {
  const bush = { x0: -0.6, x1: 0.6, z0: -2.1, z1: -0.9, y0: 0, y1: 0.9, kind: 'bush' };
  const key = item('bush', 0, 0.35, -1.5, { radius: 0.6 });
  const looking = { ...cam, pitch: -0.75 };
  assert.equal(pickTarget(looking, [key], [bush]).id, 'bush');
});

test('sitting inside a solid box (the car), things inside the same box can be picked', () => {
  const car = { x0: -0.9, x1: 0.9, z0: -2.5, z1: 1.7, y0: 0, y1: 1.45, kind: 'car' };
  const ignition = item('ignition', 0, 0.95, -1.1, { radius: 0.35 });
  const seated = { x: 0, y: 1.05, z: 0, yaw: 0, pitch: -0.1 };
  assert.equal(pickTarget(seated, [ignition], [car]).id, 'ignition');
});

test('a different solid box in between still hides an item', () => {
  const crate = { x0: -0.5, x1: 0.5, z0: -1.2, z1: -0.8, y0: 0, y1: 2, kind: 'furniture' };
  assert.equal(pickTarget(cam, [item('a', 0, 1.65, -1.8)], [crate]), null);
});

test('turning the camera brings a side item into the crosshair', () => {
  const side = item('a', -1.5, 1.65, 0); // to the west; yaw +90 degrees faces -x
  assert.equal(pickTarget(cam, [side], []), null);
  assert.equal(pickTarget({ ...cam, yaw: Math.PI / 2 }, [side], []).id, 'a');
});
