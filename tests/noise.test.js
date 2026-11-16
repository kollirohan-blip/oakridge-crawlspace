const test = require('node:test');
const assert = require('node:assert/strict');
const { createNoiseMeter } = require('../js/engine/noise.js');

test('holding perfectly still for 60 s never trips the meter', () => {
  const m = createNoiseMeter();
  for (let i = 0; i < 600; i++) m.tick(0.1);
  assert.equal(m.level(), 0);
  assert.equal(m.exceeded(), false);
});

test('small, slow sounds fade away faster than they build up', () => {
  const m = createNoiseMeter();
  for (let s = 0; s < 60; s++) {
    m.poke(0.08);
    for (let i = 0; i < 10; i++) m.tick(0.1);
  }
  assert.equal(m.exceeded(), false);
  assert.ok(m.level() < 0.5);
});

test('a burst of noise trips it', () => {
  const m = createNoiseMeter();
  for (let i = 0; i < 12; i++) {
    m.poke(0.12);
    m.tick(0.05);
  }
  assert.equal(m.exceeded(), true);
});

test('the level stays between 0 and 1', () => {
  const m = createNoiseMeter();
  m.poke(5);
  assert.equal(m.level(), 1);
  for (let i = 0; i < 500; i++) m.tick(0.1);
  assert.equal(m.level(), 0);
});

test('once tripped it stays tripped (the man heard you)', () => {
  const m = createNoiseMeter();
  m.poke(2);
  assert.equal(m.exceeded(), true);
  for (let i = 0; i < 100; i++) m.tick(0.1);
  assert.equal(m.exceeded(), true);
});

test('reset() clears it for a retry', () => {
  const m = createNoiseMeter();
  m.poke(2);
  m.reset();
  assert.equal(m.exceeded(), false);
  assert.equal(m.level(), 0);
});
