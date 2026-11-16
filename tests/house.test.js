const test = require('node:test');
const assert = require('node:assert/strict');
const house = require('../content/house.js');
const { buildWalls, roomAt } = require('../js/engine/layout.js');
const { resolveMove, blocked } = require('../js/engine/collision.js');
const { inView, lineOfSight } = require('../js/engine/sightline.js');

const R = 0.28; // player radius
const boxes = buildWalls(house);

function roomById(id) {
  return house.rooms.find((r) => r.id === id);
}

test('rooms do not overlap', () => {
  for (let i = 0; i < house.rooms.length; i++) {
    for (let j = i + 1; j < house.rooms.length; j++) {
      const a = house.rooms[i];
      const b = house.rooms[j];
      const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
      const d = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0);
      assert.ok(!(w > 1e-6 && d > 1e-6), `${a.id} overlaps ${b.id}`);
    }
  }
});

test('every door and window sits on a wall line that actually covers it', () => {
  const edges = [];
  house.rooms.forEach((r) => {
    edges.push({ axis: 'x', coord: r.z0, a: r.x0, b: r.x1 });
    edges.push({ axis: 'x', coord: r.z1, a: r.x0, b: r.x1 });
    edges.push({ axis: 'z', coord: r.x0, a: r.z0, b: r.z1 });
    edges.push({ axis: 'z', coord: r.x1, a: r.z0, b: r.z1 });
  });
  house.doors.concat(house.windows).forEach((o) => {
    const coord = o.axis === 'x' ? o.z : o.x;
    const centre = o.axis === 'x' ? o.x : o.z;
    const ok = edges.some(
      (e) =>
        e.axis === o.axis &&
        Math.abs(e.coord - coord) < 1e-6 &&
        e.a <= centre - o.width / 2 + 1e-6 &&
        e.b >= centre + o.width / 2 - 1e-6
    );
    assert.ok(ok, `opening at (${o.x},${o.z}) is not on any wall`);
  });
});

test('every spawn point is in free space', () => {
  const names = Object.keys(house.spawns);
  assert.ok(names.length >= 3);
  names.forEach((n) => {
    const s = house.spawns[n];
    assert.equal(blocked(s.x, s.z, R, boxes), false, `spawn ${n} is inside a wall`);
    if (!s.outdoor) assert.notEqual(roomAt(house, s.x, s.z), null, `spawn ${n} is not in a room`);
  });
});

test('every room can be reached from the foyer through doorways', () => {
  const adjacent = (a, b, door) => {
    if (door.axis === 'z') {
      const line = door.x;
      return (
        (Math.abs(a.x1 - line) < 1e-6 && Math.abs(b.x0 - line) < 1e-6) ||
        (Math.abs(b.x1 - line) < 1e-6 && Math.abs(a.x0 - line) < 1e-6)
      ) && door.z > Math.max(a.z0, b.z0) && door.z < Math.min(a.z1, b.z1);
    }
    const line = door.z;
    return (
      (Math.abs(a.z1 - line) < 1e-6 && Math.abs(b.z0 - line) < 1e-6) ||
      (Math.abs(b.z1 - line) < 1e-6 && Math.abs(a.z0 - line) < 1e-6)
    ) && door.x > Math.max(a.x0, b.x0) && door.x < Math.min(a.x1, b.x1);
  };
  const seen = new Set(['foyer']);
  const queue = ['foyer'];
  while (queue.length) {
    const a = roomById(queue.shift());
    house.rooms.forEach((b) => {
      if (seen.has(b.id)) return;
      if (house.doors.some((d) => adjacent(a, b, d))) {
        seen.add(b.id);
        queue.push(b.id);
      }
    });
  }
  assert.deepEqual([...seen].sort(), house.rooms.map((r) => r.id).sort());
});

function walk(start, waypoints) {
  let p = { x: start[0], z: start[1] };
  waypoints.forEach(([x, z]) => {
    p = resolveMove(p, { x: x - p.x, z: z - p.z }, boxes, R);
    assert.ok(Math.hypot(p.x - x, p.z - z) < 0.05, `could not reach (${x}, ${z}); stopped at (${p.x.toFixed(2)}, ${p.z.toFixed(2)})`);
  });
}

test('the player can walk through every doorway (living room to guest bedroom)', () => {
  walk([20, 4], [[13, 4], [9, 4], [6, 7], [6, 16], [5, 16], [2.5, 16]]);
});

test('the player can reach the master bedroom, laundry, office and bathroom from the hall', () => {
  walk([6, 16], [[6, 19.5], [7, 19.5], [10, 19.5]]);
  walk([10, 19.5], [[6, 19.5], [6, 21.5], [2.5, 21.5]]);
  walk([2.5, 21.5], [[6, 21.5], [6, 10.5], [2.5, 10.5]]);
  walk([2.5, 10.5], [[6, 10.5], [6, 11.5], [10, 11.5]]);
});

test('the player can walk from the foyer out of the front door, and from the living room onto the patio', () => {
  walk([9, 4], [[5, 4], [2.5, 4], [2.5, -3]]);
  walk([19.5, 5], [[19.5, 11]]);
});

test('the player cannot walk through a closed wall (kitchen into the office)', () => {
  const p = resolveMove({ x: 9, z: 6 }, { x: 0, z: 5 }, boxes, R);
  assert.ok(p.z < 8, 'must stop at the wall between kitchen and office');
});

// --- furniture must not wall anything off ---------------------------------------------------------
const solidFurniture = house.furniture
  .filter((f) => f.solid)
  .map((f) => ({ x0: f.b[0], y0: f.b[1], z0: f.b[2], x1: f.b[3], y1: f.b[4], z1: f.b[5], kind: 'furniture' }));
const allBoxes = boxes.concat(house.solids, solidFurniture);

function reachableFrom(start, step) {
  const key = (i, j) => i + ',' + j;
  const x0 = -6;
  const z0 = -14;
  const nx = Math.round(40 / step);
  const nz = Math.round(48 / step);
  const free = (i, j) => !blocked(x0 + i * step, z0 + j * step, R, allBoxes);
  const si = Math.round((start.x - x0) / step);
  const sj = Math.round((start.z - z0) / step);
  const seen = new Set([key(si, sj)]);
  const queue = [[si, sj]];
  while (queue.length) {
    const [i, j] = queue.pop();
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([di, dj]) => {
      const a = i + di;
      const b = j + dj;
      if (a < 0 || b < 0 || a > nx || b > nz || seen.has(key(a, b)) || !free(a, b)) return;
      seen.add(key(a, b));
      queue.push([a, b]);
    });
  }
  return { has: (p) => seen.has(key(Math.round((p.x - x0) / step), Math.round((p.z - z0) / step))) };
}

test('with the furniture in, every spawn and every spot you stand to use something is reachable from the front step', () => {
  const reach = reachableFrom(house.spawns.porch, 0.1);
  const targets = Object.assign({}, house.spawns, house.stand);
  Object.keys(targets).forEach((name) => {
    const t = targets[name];
    assert.equal(blocked(t.x, t.z, R, allBoxes), false, `${name} is inside furniture or a wall`);
    assert.ok(reach.has(t), `${name} cannot be reached on foot from the front step`);
  });
});

test('from the living room the master window is in view and the line of sight is clear through the glass', () => {
  const cam = { x: 17, z: 3, yaw: 2.87 };
  const w = house.anchors.masterWindow;
  assert.equal(inView(cam, w, 0.5), true);
  assert.equal(lineOfSight(boxes, cam, w, 1.5), true);
});

test('from the east end of the living room both of Dave\'s windows can be seen, and fairly face-on', () => {
  const cam = { x: 24, z: 6.5 };
  house.windows
    .filter((w) => w.id === 'masterE1' || w.id === 'masterE2')
    .forEach((w) => {
      const target = { x: w.x, z: w.z };
      assert.equal(lineOfSight(boxes, cam, target, 1.5), true, `${w.id} must be visible through the glass`);
      const facing = (cam.x - w.x) / Math.hypot(cam.x - w.x, cam.z - w.z);
      assert.ok(facing >= 0.34, `${w.id} is seen too edge-on (${facing.toFixed(2)})`);
    });
});

test('from the kitchen the master window is not visible: the walls are in the way', () => {
  const cam = { x: 9, z: 3, yaw: 3.0 };
  assert.equal(lineOfSight(boxes, cam, house.anchors.masterWindow, 1.5), false);
});
