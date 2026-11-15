const test = require('node:test');
const assert = require('node:assert/strict');
const { buildWalls, roomAt } = require('../js/engine/layout.js');

const house = {
  wallHeight: 2.6,
  rooms: [
    { id: 'A', x0: 0, z0: 0, x1: 4, z1: 4 },
    { id: 'B', x0: 4, z0: 0, x1: 8, z1: 4 },
  ],
  doors: [{ x: 4, z: 2, axis: 'z', width: 1 }],
  windows: [],
  props: [],
};

// total length (along the wall) of thin boxes lying on the line x = 4
function lengthOnLineX(boxes, x) {
  return boxes
    .filter((b) => b.x0 < x && b.x1 > x && b.x1 - b.x0 < 0.5)
    .reduce((sum, b) => sum + (b.z1 - b.z0), 0);
}

test('shared wall between two rooms is built once, with a gap exactly as wide as the door', () => {
  const boxes = buildWalls(house);
  assert.ok(Math.abs(lengthOnLineX(boxes, 4) - 3) < 1e-6, 'wall on x=4 should be 4 long minus a 1 wide door');
});

test('no wall box covers the middle of the doorway', () => {
  const boxes = buildWalls(house);
  const covers = boxes.some((b) => b.x0 <= 4 && b.x1 >= 4 && b.z0 <= 2 && b.z1 >= 2);
  assert.equal(covers, false);
});

test('a window leaves a gap in the wall that is blocked by a glass box, so the player cannot walk through', () => {
  const h = { ...house, doors: [], windows: [{ x: 4, z: 2, axis: 'z', width: 1, sill: 0.9, height: 1.0 }] };
  const boxes = buildWalls(h);
  const glass = boxes.filter((b) => b.kind === 'glass');
  assert.equal(glass.length, 1);
  assert.ok(Math.abs(glass[0].y0 - 0.9) < 1e-9 && Math.abs(glass[0].y1 - 1.9) < 1e-9);
  assert.ok(boxes.some((b) => b.kind === 'sill'));
  assert.ok(boxes.some((b) => b.kind === 'lintel'));
});

test('roomAt returns the containing room id, and null outside every room', () => {
  assert.equal(roomAt(house, 1, 1), 'A');
  assert.equal(roomAt(house, 6, 3), 'B');
  assert.equal(roomAt(house, -1, 1), null);
  assert.equal(roomAt(house, 9, 1), null);
});
