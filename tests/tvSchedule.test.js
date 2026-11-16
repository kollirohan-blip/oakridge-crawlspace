const test = require('node:test');
const assert = require('node:assert/strict');
const { createTv, captionAt } = require('../js/engine/tvSchedule.js');
const data = require('../content/tv.js');

function tickFor(tv, seconds) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += 0.1) {
    const ev = tv.tick(0.1);
    if (ev) events.push(ev);
  }
  return events;
}

test('the channel list: 7 news, 22 shopping, 31 nature, 48 weather, each with captions', () => {
  assert.deepEqual(data.channels.map((c) => c.n), [7, 22, 31, 48]);
  assert.deepEqual(data.channels.map((c) => c.id), ['news', 'shop', 'nature', 'weather']);
  data.channels.forEach((c) => {
    assert.ok(c.lines.length >= 4 && c.lines.length <= 6, c.id + ' has ' + c.lines.length + ' lines');
    c.lines.forEach((l) => assert.ok(typeof l === 'string' && l.length > 0));
  });
  assert.equal(data.lineSec, 5);
  assert.equal(data.alert.delay, 4);
  assert.equal(data.alert.duration, 16);
  assert.ok(data.alert.lines.length > 0);
});

test('captionAt cycles through a channel\'s lines', () => {
  const ch = { lines: ['a', 'b', 'c'] };
  assert.equal(captionAt(ch, 0, 5), 'a');
  assert.equal(captionAt(ch, 4.9, 5), 'a');
  assert.equal(captionAt(ch, 5, 5), 'b');
  assert.equal(captionAt(ch, 15, 5), 'a');
});

test('a TV that is off shows nothing and ignores the remote', () => {
  const tv = createTv(data);
  assert.equal(tv.on, false);
  assert.equal(tv.caption(), '');
  assert.equal(tv.next(), null);
  assert.equal(tv.channel().n, 7);
});

test('turned on, it starts on channel 7 and the captions move along', () => {
  const tv = createTv(data);
  tv.power(true);
  assert.equal(tv.caption(), data.channels[0].lines[0]);
  tickFor(tv, 5.05);
  assert.equal(tv.caption(), data.channels[0].lines[1]);
});

test('the remote cycles 7, 22, 31, 48 and back, with a black frame, from the top of each channel', () => {
  const tv = createTv(data);
  tv.power(true);
  tickFor(tv, 6);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    assert.deepEqual(tv.next(), { black: true, reflection: false });
    seen.push(tv.channel().n);
    assert.equal(tv.caption(), tv.channel().lines[0]);
  }
  assert.deepEqual(seen, [22, 31, 48, 7]);
});

test('the emergency alert interrupts every channel, then is gone for good', () => {
  const tv = createTv(data);
  tv.power(true);
  tv.arm('alert');
  assert.deepEqual(tickFor(tv, 3.9), []);
  assert.equal(tv.alerting(), false);
  assert.deepEqual(tickFor(tv, 0.2), ['alertStart']);
  assert.equal(tv.alerting(), true);
  assert.equal(tv.seen('alert'), true);
  assert.equal(tv.caption(), data.alert.lines[0]);
  tv.next();
  assert.equal(tv.caption(), data.alert.lines[0], 'changing the channel does not escape it');
  assert.deepEqual(tickFor(tv, 16), ['alertEnd']);
  assert.equal(tv.alerting(), false);
  // the show carried on underneath, as if nothing had interrupted it
  assert.ok(tv.channel().lines.includes(tv.caption()));
  assert.ok(!data.alert.lines.includes(tv.caption()));
  tv.arm('alert');
  assert.deepEqual(tickFor(tv, 30), [], 'it never comes back');
});

test('an armed alert waits until the TV is on', () => {
  const tv = createTv(data);
  tv.arm('alert');
  assert.deepEqual(tickFor(tv, 10), []);
  tv.power(true);
  assert.deepEqual(tickFor(tv, 4.1), ['alertStart']);
});

test('switching the TV off during the alert ends it, and it never returns', () => {
  const tv = createTv(data);
  tv.power(true);
  tv.arm('alert');
  tickFor(tv, 5);
  assert.equal(tv.alerting(), true);
  tv.power(false);
  assert.equal(tv.alerting(), false);
  tv.power(true);
  assert.deepEqual(tickFor(tv, 30), []);
  assert.equal(tv.seen('alert'), true);
});

test('switching off resets the channel clock but keeps the channel', () => {
  const tv = createTv(data);
  tv.power(true);
  tv.next();
  tickFor(tv, 6);
  tv.power(false);
  tv.power(true);
  assert.equal(tv.channel().n, 22);
  assert.equal(tv.caption(), data.channels[1].lines[0]);
});

test('once armed, the next channel change shows the reflection, once', () => {
  const tv = createTv(data);
  tv.power(true);
  assert.equal(tv.next().reflection, false);
  tv.arm('reflection');
  assert.deepEqual(tv.next(), { black: true, reflection: true });
  assert.equal(tv.seen('reflection'), true);
  assert.equal(tv.next().reflection, false);
});

test('arming an unknown event is an error', () => {
  assert.throws(() => createTv(data).arm('ghost'), /unknown tv event: ghost/);
});
