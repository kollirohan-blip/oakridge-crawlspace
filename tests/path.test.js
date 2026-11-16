const test = require('node:test');
const assert = require('node:assert/strict');
const { createNavGrid } = require('../js/engine/path.js');
const { blocked } = require('../js/engine/collision.js');
const { buildWalls } = require('../js/engine/layout.js');
const house = require('../content/house.js');

const R = 0.25;
const box = (x0, z0, x1, z1) => ({ x0, z0, x1, z1, y0: 0, y1: 2.6, kind: 'wall' });

// every segment of the path must be walkable for a body of radius R (sampled finely)
function pathIsClear(start, path, boxes) {
  let a = start;
  for (const b of path) {
    const n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05);
    for (let i = 0; i <= n; i++) {
      const x = a.x + ((b.x - a.x) * i) / Math.max(1, n);
      const z = a.z + ((b.z - a.z) * i) / Math.max(1, n);
      if (blocked(x, z, R - 0.03, boxes)) return false;
    }
    a = b;
  }
  return true;
}

test('in open space the path is one straight leg to the target', () => {
  const nav = createNavGrid({ boxes: [], x0: -10, z0: -10, x1: 10, z1: 10, step: 0.25, radius: R });
  const p = nav.findPath({ x: 0, z: 0 }, { x: 5, z: 0 });
  assert.deepEqual(p, [{ x: 5, z: 0 }]);
});

test('the path goes around a wall through the gap', () => {
  const boxes = [box(2.9, -8, 3.1, -1), box(2.9, 1, 3.1, 8)];
  const nav = createNavGrid({ boxes, x0: -10, z0: -10, x1: 10, z1: 10, step: 0.25, radius: R });
  const start = { x: 0, z: 5 };
  const p = nav.findPath(start, { x: 6, z: 5 });
  assert.ok(p && p.length >= 2, 'needs a detour');
  assert.ok(pathIsClear(start, p, boxes), 'every leg must be clear');
  assert.deepEqual(p[p.length - 1], { x: 6, z: 5 });
});

test('a target sealed inside a ring of walls has no path', () => {
  const boxes = [box(4, -2, 4.2, 2), box(6, -2, 6.2, 2), box(4, -2, 6.2, -1.8), box(4, 1.8, 6.2, 2)];
  const nav = createNavGrid({ boxes, x0: -10, z0: -10, x1: 10, z1: 10, step: 0.25, radius: R });
  assert.equal(nav.findPath({ x: 0, z: 0 }, { x: 5, z: 0 }), null);
});

test('a target inside furniture is moved to the nearest free spot', () => {
  const boxes = [box(4, -1, 5, 1)];
  const nav = createNavGrid({ boxes, x0: -10, z0: -10, x1: 10, z1: 10, step: 0.25, radius: R });
  const p = nav.findPath({ x: 0, z: 0 }, { x: 4.5, z: 0 });
  assert.ok(p && p.length >= 1);
  const end = p[p.length - 1];
  assert.equal(blocked(end.x, end.z, R - 0.03, boxes), false);
  assert.ok(Math.hypot(end.x - 4.5, end.z) < 1.2);
});

test('in the real house: the living room to the dog bowl in the kitchen is a clear path', () => {
  const furniture = house.furniture
    .filter((f) => f.solid)
    .map((f) => ({ x0: f.b[0], z0: f.b[2], x1: f.b[3], z1: f.b[5], y0: f.b[1], y1: f.b[4], kind: 'furniture' }));
  const boxes = buildWalls(house).concat(house.solids, furniture);
  const nav = createNavGrid({ boxes, x0: -6, z0: -14, x1: 34, z1: 34, step: 0.2, radius: R });
  const start = { x: 15.5, z: 5.5 };
  const p = nav.findPath(start, { x: 11.2, z: 6.2 });
  assert.ok(p, 'there must be a route');
  assert.ok(pathIsClear(start, p, boxes), 'every leg must be clear of walls and furniture');
});

test('long routes across the whole house are fast enough to re-plan every frame or so', () => {
  const furniture = house.furniture
    .filter((f) => f.solid)
    .map((f) => ({ x0: f.b[0], z0: f.b[2], x1: f.b[3], z1: f.b[5], y0: f.b[1], y1: f.b[4], kind: 'furniture' }));
  const boxes = buildWalls(house).concat(house.solids, furniture);
  const nav = createNavGrid({ boxes, x0: -6, z0: -14, x1: 34, z1: 34, step: 0.25, radius: R });
  const trips = [
    [{ x: 2.5, z: -4 }, { x: 10, z: 20.5 }], // porch to Dave's room
    [{ x: 22.5, z: 5.5 }, { x: 2.5, z: 21.5 }], // living room to the bathroom
    [{ x: 10, z: 20.5 }, { x: 24, z: 14 }], // Dave's room out to the courtyard
    [{ x: 2.9, z: 15.6 }, { x: 10, z: -8.5 }], // guest room to the car
  ];
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 5; i++) {
    trips.forEach(([a, b]) => {
      const p = nav.findPath(a, b);
      assert.ok(p && p.length, 'route exists');
      assert.ok(pathIsClear(a, p, boxes), 'route is clear');
    });
  }
  const msPerPath = Number(process.hrtime.bigint() - t0) / 1e6 / (5 * trips.length);
  assert.ok(msPerPath < 15, `a route took ${msPerPath.toFixed(1)} ms on average (budget 15 ms)`);
});

test('rebuild() notices a door that has been opened', () => {
  const boxes = [box(2.9, -12, 3.1, 12)]; // a wall that spans the whole grid, so there is no way round
  const nav = createNavGrid({ boxes, x0: -10, z0: -10, x1: 10, z1: 10, step: 0.25, radius: R });
  assert.equal(nav.findPath({ x: 0, z: 0 }, { x: 6, z: 0 }), null);
  boxes.length = 0;
  nav.rebuild();
  assert.ok(nav.findPath({ x: 0, z: 0 }, { x: 6, z: 0 }));
});
