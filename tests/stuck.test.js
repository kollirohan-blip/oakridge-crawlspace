const test = require('node:test');
const assert = require('node:assert/strict');
const house = require('../content/house.js');
const { buildWalls } = require('../js/engine/layout.js');
const { blocked } = require('../js/engine/collision.js');
const { createNavGrid } = require('../js/engine/path.js');
const { zoneOf, refusal, pickSpot, pickHint } = require('../js/engine/stuck.js');

const R = 0.28; // player radius
const solidFurniture = house.furniture
  .filter((f) => f.solid)
  .map((f) => ({ x0: f.b[0], y0: f.b[1], z0: f.b[2], x1: f.b[3], y1: f.b[4], z1: f.b[5] }));
const houseBoxes = buildWalls(house).concat(house.solids || [], solidFurniture);

// a closed door: a slab across the doorway
function doorBox(id) {
  const d = house.doors.find((x) => x.id === id);
  const h = d.width / 2;
  return d.axis === 'x'
    ? { x0: d.x - h, x1: d.x + h, z0: d.z - 0.1, z1: d.z + 0.1, y0: 0, y1: 2.1 }
    : { x0: d.x - 0.1, x1: d.x + 0.1, z0: d.z - h, z1: d.z + h, y0: 0, y1: 2.1 };
}

// what js/stuck.js hands pickSpot in the game: collision for the player, and walking on the nav grid
function world(extra) {
  const boxes = houseBoxes.concat(extra || []);
  const nav = createNavGrid({ boxes, x0: -6, z0: -14, x1: 34, z1: 34, step: 0.25, radius: 0.25 });
  return {
    house,
    free: (x, z) => !blocked(x, z, R, boxes),
    walk: (from, to) => {
      const path = nav.findPath(from, to);
      if (!path) return null;
      const end = path[path.length - 1];
      if (Math.hypot(end.x - to.x, end.z - to.z) > 0.4) return null;
      let m = 0;
      let at = from;
      path.forEach((p) => {
        m += Math.hypot(p.x - at.x, p.z - at.z);
        at = p;
      });
      return m;
    },
  };
}
const open = world();

// ---- zones ------------------------------------------------------------------------------------------
test('a point is in a room, the shed, the yard, or away from the house', () => {
  assert.equal(zoneOf(house, 9, 4), 'kitchen');
  assert.equal(zoneOf(house, 6, 14), 'hall');
  assert.equal(zoneOf(house, house.stand.shedInside.x, house.stand.shedInside.z), 'shed');
  assert.equal(zoneOf(house, house.stand.shedDoor.x, house.stand.shedDoor.z), 'yard');
  assert.equal(zoneOf(house, 2.5, -4), 'yard');
  assert.equal(zoneOf(house, 19.5, 14), 'yard'); // the patio
  assert.equal(zoneOf(house, 400, 4), null); // the Gas-N-Go
  assert.equal(zoneOf(house, 10, 120), null); // the road home
});

test('every room has a stand point to be moved to', () => {
  house.rooms.forEach((r) => {
    const has = Object.keys(house.stand).some((n) => zoneOf(house, house.stand[n].x, house.stand[n].z) === r.id);
    assert.ok(has, r.id + ' has no stand point');
  });
});

// ---- when it is refused ------------------------------------------------------------------------------
test('the set-piece chapters refuse it from start to finish', () => {
  ['act3', 'act4', 'epilogue'].forEach((act) => {
    assert.equal(refusal({ act, zone: 'hall' }), 'scene', act);
  });
  assert.equal(refusal({ act: null, zone: 'hall' }), 'scene');
  assert.equal(refusal(null), 'scene');
});

test('free roaming at the house is allowed', () => {
  assert.equal(refusal({ act: 'act1', zone: 'kitchen' }), null);
  assert.equal(refusal({ act: 'day2', zone: 'yard' }), null);
  assert.equal(refusal({ act: 'act2', zone: 'shed' }), null);
});

test('a cutscene, a choice, a note, a call, the keypad or sitting down refuses it', () => {
  const base = { act: 'act1', zone: 'kitchen' };
  ['cutscene', 'choosing', 'reading', 'talking', 'modal', 'frozen'].forEach((k) => {
    assert.equal(refusal(Object.assign({}, base, { [k]: true })), 'busy', k);
  });
  assert.equal(refusal(Object.assign({}, base, { actBusy: 'busy' })), 'busy');
});

test('under the house, away from it, or in the car it is refused with its own reason', () => {
  assert.equal(refusal({ act: 'act2', zone: null, prone: true }), 'crawl');
  assert.equal(refusal({ act: 'act2', zone: 'laundry', actBusy: 'crawl' }), 'crawl');
  assert.equal(refusal({ act: 'day2', zone: null }), 'away');
  assert.equal(refusal({ act: 'day2', zone: 'yard', actBusy: 'away', frozen: true }), 'away');
});

// ---- where it moves you ------------------------------------------------------------------------------
test('standing free in a room, you go to the stand point nearest on foot', () => {
  const s = pickSpot(Object.assign({ pos: { x: 9, z: 3 } }, open));
  assert.ok(s);
  assert.equal(s.by, 'walk');
  assert.equal(zoneOf(house, s.x, s.z), 'kitchen');
  // nothing else is closer on foot
  Object.keys(house.stand).forEach((n) => {
    const t = house.stand[n];
    if (!open.free(t.x, t.z)) return;
    const m = open.walk({ x: 9, z: 3 }, t);
    if (m !== null) assert.ok(m >= s.metres - 1e-9, n + ' is closer on foot than ' + s.name);
  });
});

test('locked out on the porch, you are never moved inside, even when an inside spot is closer', () => {
  const locked = world([doorBox('front'), doorBox('patio')]);
  const pos = { x: 2.5, z: -0.5 }; // right outside the front door; the inside of the door is 1.5 m away
  const s = pickSpot(Object.assign({ pos }, locked));
  assert.ok(s);
  assert.equal(zoneOf(house, s.x, s.z), 'yard', 'moved to ' + s.name);
});

test('caught in a wall beside a closed door, you stay on your own side of it', () => {
  // the laundry door is shut (night one, before the knocks); Mason is half inside its wall, hall side
  const shut = world([doorBox('laundry')]);
  const pos = { x: 5.02, z: 10.0 };
  assert.equal(zoneOf(house, pos.x, pos.z), 'hall');
  const s = pickSpot(Object.assign({ pos }, shut));
  assert.ok(s);
  assert.notEqual(zoneOf(house, s.x, s.z), 'laundry', 'went through the closed door to ' + s.name);
});

test('outside the shed with its door shut, you are not put inside it', () => {
  const shed = world([{ x0: 25.5, x1: 29.5, z0: -3.7, z1: -3.5, y0: 0, y1: 2.2 }]); // the shed's front wall, shut
  const s = pickSpot(Object.assign({ pos: { x: 27.4, z: -2.2 } }, shed));
  assert.ok(s);
  assert.notEqual(s.name, 'shedInside');
});

test('wedged in a pocket nothing can be walked out of, you go to the nearest stand point in the same room', () => {
  // a little box of furniture around Mason in the hall, closed on every side
  const pocket = [
    { x0: 5.3, x1: 6.7, z0: 12.3, z1: 12.4 },
    { x0: 5.3, x1: 6.7, z0: 13.6, z1: 13.7 },
    { x0: 5.3, x1: 5.4, z0: 12.3, z1: 13.7 },
    { x0: 6.6, x1: 6.7, z0: 12.3, z1: 13.7 },
  ];
  const w = world(pocket);
  const s = pickSpot(Object.assign({ pos: { x: 6, z: 13 } }, w));
  assert.ok(s);
  assert.equal(s.by, 'room');
  assert.equal(zoneOf(house, s.x, s.z), 'hall');
  assert.equal(s.name, 'laundryDoorHall'); // 2.5 m away; the guest door spot is 3 m
});

test('a room with no way out and no stand point gives nothing, so the game can say so', () => {
  const tiny = { rooms: [{ id: 'box', x0: 0, z0: 0, x1: 2, z1: 2 }], stand: { far: { x: 10, z: 10 } } };
  const s = pickSpot({ house: tiny, pos: { x: 1, z: 1 }, free: () => true, walk: () => null });
  assert.equal(s, null);
});

test('away from the house there is nowhere to be moved to', () => {
  assert.equal(pickSpot(Object.assign({ pos: { x: 400, z: 4 } }, open)), null);
});

test('a stand point blocked by something (a door shut over it) is never used', () => {
  const s = pickSpot({
    house: { rooms: house.rooms, stand: { a: { x: 9, z: 3 }, b: { x: 10, z: 3 } } },
    pos: { x: 9.2, z: 3 },
    free: (x) => x !== 9,
    walk: (from, to) => Math.hypot(to.x - from.x, to.z - from.z),
  });
  assert.equal(s.name, 'b');
});

// ---- which to-do the nudge talks about ----------------------------------------------------------------
const HINTS = { dinner: {}, mail: {}, washUp: { after: 'dinner' }, hatch: {} };

test('the nudge picks the first undone task with a hint', () => {
  const tasks = [{ id: 'dinner', done: false }, { id: 'mail', done: false }];
  assert.equal(pickHint({ tasks, seenAt: {}, hints: HINTS, given: {} }), 'dinner');
});

test('a task already nudged, done, or without a hint is skipped', () => {
  const tasks = [{ id: 'dinner', done: true }, { id: 'feed', done: false }, { id: 'mail', done: false }];
  assert.equal(pickHint({ tasks, seenAt: {}, hints: HINTS, given: {} }), 'mail');
  assert.equal(pickHint({ tasks, seenAt: {}, hints: HINTS, given: { mail: true } }), null);
});

test('no washing up before dinner: a task waits for the one it needs', () => {
  const tasks = [{ id: 'washUp', done: false }, { id: 'dinner', done: false }];
  assert.equal(pickHint({ tasks, seenAt: {}, hints: HINTS, given: { dinner: true } }), null);
  tasks[1].done = true;
  assert.equal(pickHint({ tasks, seenAt: {}, hints: HINTS, given: {} }), 'washUp');
});

test('what the night just asked for wins over old chores', () => {
  const tasks = [{ id: 'mail', done: false }, { id: 'hatch', done: false }];
  assert.equal(pickHint({ tasks, seenAt: { mail: 0, hatch: 400 }, hints: HINTS, given: {} }), 'hatch');
});

test('a task that only just showed up is left alone for a minute', () => {
  const tasks = [{ id: 'mail', done: false }, { id: 'hatch', done: false }];
  const o = { tasks, seenAt: { mail: 0, hatch: 400 }, hints: HINTS, given: {}, minAge: 60 };
  assert.equal(pickHint(Object.assign({ now: 420 }, o)), 'mail');
  assert.equal(pickHint(Object.assign({ now: 460 }, o)), 'hatch');
});
