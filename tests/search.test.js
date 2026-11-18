const test = require('node:test');
const assert = require('node:assert/strict');
const { createSearch } = require('../js/engine/search.js');

// Wes searching the house in Act 4: he never chases. He goes to a room, tries its handle, looks
// around, tilts his head and listens, and moves on. He comes to check what he hears. He sees you only
// if the act says he can. Hide in the same place twice and he checks it.
const ROOMS = [
  { id: 'office', door: { x: 7, z: 11.5 }, point: { x: 10, z: 11.5 } },
  { id: 'master', door: { x: 7, z: 19.5 }, point: { x: 10, z: 19.5 } },
  { id: 'kitchen', door: { x: 6, z: 8 }, point: { x: 9, z: 4 } },
  { id: 'living', door: { x: 13, z: 4 }, point: { x: 19, z: 5 } },
];
const HIDES = [
  { id: 'masterBed', at: { x: 9.6, z: 22.6 }, room: 'master' },
  { id: 'couch', at: { x: 19.3, z: 4.9 }, room: 'living' },
];
let seed = 1;
const rnd = () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
function fresh(opts) {
  seed = 7;
  const s = createSearch(Object.assign({ rooms: ROOMS, hides: HIDES, start: { x: 10, z: 11.5 }, rnd }, opts || {}));
  s.start();
  return s;
}
const quiet = { seen: false, noise: null, hidden: null };
// run for `seconds`, with sense() giving what he can sense each step; collect events
function run(s, seconds, sense, step) {
  const out = [];
  step = step || 0.05;
  for (let i = 0; i < Math.round(seconds / step); i++) {
    run.t = (run.t || 0) + step;
    s.update(step, typeof sense === 'function' ? sense(s) : sense || quiet).forEach((e) => out.push(Object.assign({ at: run.t }, e)));
  }
  return out;
}

test('nothing happens before start()', () => {
  const s = createSearch({ rooms: ROOMS, hides: HIDES, start: { x: 10, z: 11.5 } });
  assert.deepEqual(s.update(1, quiet), []);
  assert.equal(s.job(), 'idle');
});

test('he works through rooms: the handle, a look round, a listen, then the next room, never the same one twice in a row', () => {
  const s = fresh();
  const ev = run(s, 160);
  const kinds = ev.map((e) => e.type);
  assert.ok(kinds.includes('handle'), 'tries a handle');
  assert.ok(kinds.includes('check'), 'looks round a room');
  assert.ok(kinds.includes('listen'), 'stops to listen');
  const rooms = ev.filter((e) => e.type === 'check').map((e) => e.room);
  assert.ok(rooms.length >= 4, 'checked ' + rooms.length + ' rooms in 160 s');
  for (let i = 1; i < rooms.length; i++) assert.notEqual(rooms[i], rooms[i - 1], 'the same room twice in a row: ' + rooms.join());
  // in each room: handle, then check, then listen
  const first = kinds.indexOf('handle');
  assert.ok(first >= 0 && kinds.indexOf('check', first) > first && kinds.indexOf('listen', first) > kinds.indexOf('check', first));
});

test('he never runs', () => {
  const s = fresh();
  let last = { x: s.pos().x, z: s.pos().z };
  for (let i = 0; i < 2000; i++) {
    s.update(0.05, i % 200 < 5 ? { seen: false, noise: { x: 19, z: 5, loud: 1 }, hidden: null } : quiet);
    const p = s.pos();
    const v = Math.hypot(p.x - last.x, p.z - last.z) / 0.05;
    assert.ok(v <= 1.31, 'moved at ' + v.toFixed(2) + ' m/s');
    last = { x: p.x, z: p.z };
  }
});

test('he listens with his head tilted, and stands still to do it', () => {
  const s = fresh();
  let tilted = 0;
  let movedWhileTilted = false;
  let last = { x: s.pos().x, z: s.pos().z };
  for (let i = 0; i < 3000; i++) {
    s.update(0.05, quiet);
    const p = s.pos();
    if (s.pose() === 'tilt') {
      tilted++;
      if (Math.hypot(p.x - last.x, p.z - last.z) > 1e-6) movedWhileTilted = true;
    }
    last = { x: p.x, z: p.z };
  }
  assert.ok(tilted > 20, 'never tilted his head');
  assert.equal(movedWhileTilted, false);
});

test('seen for long enough, he has found you; a glimpse is not enough', () => {
  const s = fresh();
  let ev = run(s, 0.4, { seen: true, noise: null, hidden: null });
  assert.equal(ev.filter((e) => e.type === 'caught').length, 0, 'caught on a glimpse');
  run(s, 2, quiet);
  ev = run(s, 0.4, { seen: true, noise: null, hidden: null });
  assert.equal(ev.filter((e) => e.type === 'caught').length, 0, 'the glimpse did not fade');
  ev = run(s, 1.0, { seen: true, noise: null, hidden: null });
  assert.equal(ev.filter((e) => e.type === 'caught').length, 1);
  assert.equal(s.job(), 'caught');
  assert.deepEqual(run(s, 5, { seen: true, noise: null, hidden: null }), [], 'caught only once, then he stops');
});

test('a loud noise brings him to look at where it was; a quiet one far away does not', () => {
  const s = fresh();
  let ev = run(s, 0.1, { seen: false, noise: { x: 30, z: 30, loud: 0.1 }, hidden: null });
  assert.equal(ev.filter((e) => e.type === 'heard').length, 0, 'heard a whisper 25 m away');
  ev = run(s, 0.1, { seen: false, noise: { x: 19, z: 5, loud: 1 }, hidden: null });
  assert.equal(ev.filter((e) => e.type === 'heard').length, 1);
  assert.equal(s.job(), 'investigate');
  run(s, 30, quiet);
  // he got there, and stood listening
  const p = s.pos();
  assert.ok(Math.hypot(p.x - 19, p.z - 5) < 6, 'he went to look: at ' + p.x.toFixed(1) + ',' + p.z.toFixed(1));
});

test('hiding once in a place is safe; hiding there again, he comes and checks it', () => {
  const s = fresh();
  // first time under the bed: he does nothing about it
  let ev = run(s, 20, { seen: false, noise: null, hidden: 'masterBed' });
  assert.equal(ev.filter((e) => e.type === 'checkHide' || e.type === 'caught').length, 0);
  run(s, 5, quiet);
  // second time: he comes to the bed, and finds you still there
  ev = run(s, 90, { seen: false, noise: null, hidden: 'masterBed' });
  const caught = ev.filter((e) => e.type === 'caught');
  assert.equal(caught.length, 1, 'he did not check the bed');
  assert.equal(caught[0].hide, 'masterBed');
});

test('if you leave the place before he gets there, he finds it empty', () => {
  const s = fresh();
  run(s, 3, { seen: false, noise: null, hidden: 'couch' });
  run(s, 3, quiet);
  run(s, 1, { seen: false, noise: null, hidden: 'couch' }); // second time: he is coming
  assert.equal(s.job(), 'checkHide');
  const ev = run(s, 90, quiet); // and you slipped out
  assert.equal(ev.filter((e) => e.type === 'caught').length, 0);
  assert.equal(ev.filter((e) => e.type === 'checkHide' && e.hide === 'couch').length, 1, 'he looked there and found nothing');
});

test('a retry from a checkpoint remembers where Mason already hid: the next time there, he checks it', () => {
  const s = fresh({ uses: { couch: 1 } });
  assert.equal(s.uses('couch'), 1);
  assert.equal(s.uses('masterBed'), 0);
  run(s, 1, { seen: false, noise: null, hidden: 'couch' });
  assert.equal(s.job(), 'checkHide', 'the couch was used before the checkpoint');
  // a place not used before the checkpoint is still safe the first time
  const t = fresh({ uses: { couch: 1 } });
  const ev = run(t, 20, { seen: false, noise: null, hidden: 'masterBed' });
  assert.equal(ev.filter((e) => e.type === 'checkHide' || e.type === 'caught').length, 0);
});

test('the remembered hiding places are copied, not shared', () => {
  const uses = { couch: 1 };
  const s = fresh({ uses });
  run(s, 1, { seen: false, noise: null, hidden: 'couch' });
  assert.equal(uses.couch, 1);
  assert.equal(s.uses('couch'), 2);
});

test('hold() stops him where he is, and go() lets him carry on', () => {
  const s = fresh();
  run(s, 3, quiet);
  s.hold();
  const p0 = Object.assign({}, s.pos());
  const ev = run(s, 10, { seen: true, noise: { x: p0.x, z: p0.z, loud: 1 }, hidden: null });
  assert.deepEqual(ev, []);
  assert.deepEqual(s.pos(), p0);
  s.go();
  run(s, 3, quiet);
  assert.notDeepEqual(s.pos(), p0);
});

test('send(room) makes that room his next job, from wherever he is', () => {
  const s = fresh();
  run(s, 2, quiet);
  s.send('living');
  const ev = run(s, 60, quiet);
  const checks = ev.filter((e) => e.type === 'check');
  assert.ok(checks.length >= 1);
  assert.equal(checks[0].room, 'living');
  assert.throws(() => s.send('attic'), /no room "attic"/);
});

test('a room marked scripted is never chosen on his own, only when he is sent there', () => {
  seed = 7;
  const rooms = ROOMS.concat([{ id: 'bath', door: { x: 5.6, z: 21.5 }, point: { x: 5.6, z: 21.5 }, scripted: true }]);
  const s = createSearch({ rooms, hides: HIDES, start: { x: 10, z: 11.5 }, rnd });
  s.start();
  let ev = run(s, 400, quiet);
  assert.equal(ev.filter((e) => e.room === 'bath').length, 0, 'went to the scripted room by himself');
  s.send('bath');
  ev = run(s, 60, quiet);
  assert.ok(ev.some((e) => e.type === 'handle' && e.room === 'bath'));
});
