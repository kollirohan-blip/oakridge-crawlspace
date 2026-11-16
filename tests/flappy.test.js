const test = require('node:test');
const assert = require('node:assert/strict');
const { createFlappy } = require('../js/engine/flappy.js');

const mid = () => 0.5; // gaps in the middle of the screen

function tickFor(f, seconds, each) {
  for (let t = 0; t < seconds - 1e-9; t += 0.02) {
    if (each) each(f);
    f.tick(0.02);
  }
}

test('nothing moves until the first flap', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  const y = f.state.y;
  tickFor(f, 2);
  assert.equal(f.state.y, y);
  assert.equal(f.state.alive, true);
});

test('a flap sends Cooper up', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  f.flap();
  assert.ok(f.state.vy < 0);
  const y = f.state.y;
  f.tick(0.02);
  assert.ok(f.state.y < y);
});

test('gravity pulls him back down', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  f.flap();
  tickFor(f, 0.6);
  assert.ok(f.state.vy > 0);
});

test('hitting the floor ends the run', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  f.flap();
  tickFor(f, 3);
  assert.equal(f.state.alive, false);
});

test('flying through a gap scores a point', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  f.flap();
  tickFor(f, 4, (g) => {
    const p = g.state.pipes[0];
    g.state.y = p ? p.gapY : 90;
    g.state.vy = 0;
  });
  assert.equal(f.state.alive, true);
  assert.ok(f.state.score >= 1);
});

test('flying into a pipe ends the run', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  f.flap();
  tickFor(f, 4, (g) => {
    if (!g.state.alive) return;
    g.state.y = 12;
    g.state.vy = 0;
  });
  assert.equal(f.state.alive, false);
  assert.equal(f.state.score, 0);
});

test('reset starts a new run and keeps the best score', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  f.flap();
  tickFor(f, 4, (g) => {
    const p = g.state.pipes[0];
    g.state.y = p ? p.gapY : 90;
    g.state.vy = 0;
  });
  const score = f.state.score;
  f.reset();
  assert.equal(f.state.score, 0);
  assert.equal(f.state.alive, true);
  assert.equal(f.state.pipes.length, 0);
  assert.equal(f.best(), score);
});

test('a flap after the run ended starts a new one', () => {
  const f = createFlappy({ w: 120, h: 180, rnd: mid });
  f.flap();
  tickFor(f, 3);
  assert.equal(f.state.alive, false);
  f.flap();
  assert.equal(f.state.alive, true);
  assert.equal(f.state.score, 0);
});
