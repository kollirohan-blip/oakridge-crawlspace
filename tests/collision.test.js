const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveMove } = require('../js/engine/collision.js');
const { buildWalls } = require('../js/engine/layout.js');

const wallAtX4 = [{ x0: 4, x1: 4.2, z0: -10, z1: 10, y0: 0, y1: 2.6, kind: 'wall' }];

test('a 5 m move straight into a wall stops one radius short of it and never inside', () => {
  const r = 0.3;
  const p = resolveMove({ x: 0, z: 0 }, { x: 5, z: 0 }, wallAtX4, r);
  assert.ok(p.x <= 4 - r + 1e-6, 'must not penetrate');
  assert.ok(p.x > 4 - r - 0.03, 'must get close to the wall');
  assert.equal(p.z, 0);
});

test('moving diagonally into a wall slides along it', () => {
  const p = resolveMove({ x: 3, z: 1 }, { x: 2, z: 1 }, wallAtX4, 0.3);
  assert.ok(p.x <= 3.7 + 1e-6);
  assert.ok(Math.abs(p.z - 2) < 1e-6, 'z movement is kept');
});

test('a huge single-frame move cannot tunnel through a thin wall', () => {
  const p = resolveMove({ x: 0, z: 0 }, { x: 50, z: 0 }, wallAtX4, 0.3);
  assert.ok(p.x < 4);
});

test('diagonal move into an inside corner of a room stays inside the room', () => {
  const room = { wallHeight: 2.6, rooms: [{ id: 'R', x0: 0, z0: 0, x1: 4, z1: 4 }], doors: [], windows: [], props: [] };
  const boxes = buildWalls(room);
  const p = resolveMove({ x: 3.4, z: 3.4 }, { x: 5, z: 5 }, boxes, 0.3);
  assert.ok(p.x < 4 && p.z < 4);
  assert.ok(p.x > 0 && p.z > 0);
});

// A door closing on someone standing in the doorway (Act 2's front door did this) must not trap them.
const door = [{ x0: 1.95, x1: 3.05, z0: -0.06, z1: 0.06, y0: 0, y1: 2.15, kind: 'door' }];

test('a body caught overlapping a box can still walk out of it', () => {
  const p = resolveMove({ x: 2.5, z: 0.05 }, { x: 0, z: 1.0 }, door, 0.28);
  assert.ok(p.z > 1.0, `should have walked clear, stopped at z=${p.z.toFixed(2)}`);
});

test('a body caught overlapping a box can slide along it', () => {
  const p = resolveMove({ x: 2.5, z: 0.2 }, { x: 0.5, z: 0 }, door, 0.28);
  assert.ok(Math.abs(p.x - 3.0) < 1e-6, `should have slid sideways, x=${p.x.toFixed(2)}`);
});

test('a body caught overlapping a box cannot push deeper into it', () => {
  const p = resolveMove({ x: 2.5, z: 0.2 }, { x: 0, z: -1.0 }, door, 0.28);
  assert.ok(p.z >= 0.2 - 1e-9, `must not move into the door, got z=${p.z.toFixed(3)}`);
});

test('zero move returns the same position', () => {
  const p = resolveMove({ x: 1, z: 2 }, { x: 0, z: 0 }, wallAtX4, 0.3);
  assert.deepEqual(p, { x: 1, z: 2 });
});
