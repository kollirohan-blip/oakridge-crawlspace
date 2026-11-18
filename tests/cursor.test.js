const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../js/engine/cursor.js');

// the phone on screen: 300 wide, 500 tall, at the bottom right of a 1600x900 window
const PHONE = { left: 1260, top: 360, right: 1560, bottom: 860 };

function fresh() {
  const c = C.create();
  C.place(c, PHONE); // the middle
  return c;
}

test('placing puts the cursor on the phone, by default in the middle', () => {
  const c = fresh();
  const p = C.point(c, PHONE);
  assert.equal(p.x, 1410);
  assert.equal(p.y, 610);
  assert.equal(p.out, false);
});

test('placing again restores where it was on the phone, even if the phone moved', () => {
  const c = fresh();
  C.move(c, 60, -100, PHONE);
  const at = C.where(c, PHONE);
  const raised = { left: 500, top: 100, right: 1100, bottom: 700 }; // held up, bigger
  C.place(c, raised, at.fx, at.fy);
  const p = C.point(c, raised);
  assert.ok(Math.abs(p.x - (500 + 600 * at.fx)) < 1e-9);
  assert.ok(Math.abs(p.y - (100 + 600 * at.fy)) < 1e-9);
  assert.equal(p.out, false);
});

test('on the phone the mouse moves the cursor one to one and does not turn the view', () => {
  const c = fresh();
  const look = C.move(c, 40, -25, PHONE);
  assert.deepEqual(look, { x: 0, y: 0 });
  const p = C.point(c, PHONE);
  assert.equal(p.x, 1450);
  assert.equal(p.y, 585);
});

test('pushing past an edge turns the view by exactly the part past the edge', () => {
  const c = fresh();
  const look = C.move(c, -190, 0, PHONE); // 150 to the left edge, 40 past it
  assert.equal(look.x, -40);
  assert.equal(look.y, 0);
  const p = C.point(c, PHONE);
  assert.equal(p.x, PHONE.left); // the cursor waits on the edge
  assert.equal(p.out, true);
});

test('off the phone, all of the movement turns the view, up and down too', () => {
  const c = fresh();
  C.move(c, -200, 0, PHONE);
  const look = C.move(c, -12, 30, PHONE);
  assert.deepEqual(look, { x: -12, y: 30 });
});

test('the view keeps turning however far the mouse goes, but the cursor never strays far', () => {
  const c = fresh();
  let turned = 0;
  for (let i = 0; i < 100; i++) turned += C.move(c, -50, 0, PHONE).x;
  assert.equal(turned, -50 * 100 + 150); // everything past the edge
  assert.ok(c.x >= PHONE.left - C.OUT - 1e-9);
});

test('coming back is short: the cursor is on the phone again within OUT, and from then on the view stays put', () => {
  const c = fresh();
  for (let i = 0; i < 40; i++) C.move(c, -50, 0, PHONE); // far off to the left
  let back = 0;
  let steps = 0;
  while (C.point(c, PHONE).out && steps < 1000) {
    back += C.move(c, 5, 0, PHONE).x;
    steps++;
  }
  assert.ok(back <= C.OUT + 1e-9, 'turned back ' + back);
  assert.ok(back > 0);
  assert.deepEqual(C.move(c, 20, 0, PHONE), { x: 0, y: 0 });
});

test('a big flick that crosses an edge only turns by the part past it, both ways', () => {
  const c = fresh();
  assert.equal(C.move(c, 400, 0, PHONE).x, 250); // 150 to the right edge
  assert.equal(C.move(c, -260, 0, PHONE).x, -160); // OUT back to the edge, then 100 on the phone
  assert.equal(C.point(c, PHONE).out, false);
  assert.equal(C.point(c, PHONE).x, PHONE.right - 100);
});

test('the top and bottom edges work the same way', () => {
  const c = fresh();
  assert.equal(C.move(c, 0, -300, PHONE).y, -50);
  assert.equal(C.point(c, PHONE).y, PHONE.top);
  const c2 = fresh();
  assert.equal(C.move(c2, 0, 270, PHONE).y, 20);
});

test('with no phone on screen (the camera app) the mouse only looks', () => {
  const c = fresh();
  const before = { x: c.x, y: c.y };
  assert.deepEqual(C.move(c, 33, -7, null), { x: 33, y: -7 });
  assert.deepEqual({ x: c.x, y: c.y }, before);
});

test('a real pointer that is not captured is followed where it is, and only turns the view off the phone', () => {
  const c = fresh();
  // the real pointer went from (1300, 500) to (1340, 520): all on the phone
  assert.deepEqual(C.move(c, 40, 20, PHONE, { x: 1340, y: 520 }), { x: 0, y: 0 });
  assert.deepEqual(C.point(c, PHONE), { x: 1340, y: 520, out: false });
  // then it went 100 to the left, 20 of it on the phone
  assert.deepEqual(C.move(c, -100, 0, PHONE, { x: 1180, y: 520 }), { x: -80, y: 0 });
  assert.equal(C.point(c, PHONE).out, true);
  // far off: no cap for a real pointer, it is where it is
  C.move(c, -800, 0, PHONE, { x: 380, y: 520 });
  assert.equal(c.x, 380);
});

test('a zero-size phone counts as no phone', () => {
  const c = fresh();
  assert.deepEqual(C.move(c, 5, 5, { left: 0, top: 0, right: 0, bottom: 0 }), { x: 5, y: 5 });
});
