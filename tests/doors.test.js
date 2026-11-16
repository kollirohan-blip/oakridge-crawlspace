const test = require('node:test');
const assert = require('node:assert/strict');
const { createDoor } = require('../js/engine/doors.js');

const box = { x0: 1.95, x1: 3.05, z0: -0.06, z1: 0.06, y0: 0, y1: 2.15, kind: 'door' };

test('a door starts open or closed as asked, and puts its box in the collision list only when closed', () => {
  const boxes = [];
  const d = createDoor({ box, boxes, closed: false });
  assert.equal(d.closed, false);
  assert.equal(boxes.length, 0);
  assert.equal(d.close({ x: 2.5, z: 3 }), true);
  assert.deepEqual(boxes, [box]);
  d.open();
  assert.equal(boxes.length, 0);
});

test('a door will not close on someone standing in the doorway', () => {
  const boxes = [];
  const d = createDoor({ box, boxes, closed: false });
  assert.equal(d.close({ x: 2.5, z: 0.1 }), false);
  assert.equal(d.closed, false);
  assert.equal(boxes.length, 0);
});

test('it closes once they have stepped clear', () => {
  const boxes = [];
  const d = createDoor({ box, boxes, closed: false });
  d.close({ x: 2.5, z: 0.2 });
  assert.equal(d.close({ x: 2.5, z: 0.5 }), true);
  assert.equal(d.closed, true);
});

test('closing or opening twice never duplicates or loses the box', () => {
  const boxes = [];
  const d = createDoor({ box, boxes, closed: true });
  d.close();
  d.close();
  assert.equal(boxes.length, 1);
  d.open();
  d.open();
  assert.equal(boxes.length, 0);
});
