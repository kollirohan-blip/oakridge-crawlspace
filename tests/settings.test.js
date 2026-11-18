const test = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULTS, normalize, load, save } = require('../js/engine/settings.js');

function memoryStorage() {
  const data = {};
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    data,
  };
}
const brokenStorage = {
  getItem: () => { throw new Error('blocked'); },
  setItem: () => { throw new Error('blocked'); },
};

test('with nothing saved, the defaults are used', () => {
  assert.deepEqual(load(memoryStorage()), DEFAULTS);
});

test('values out of range are pulled back into range', () => {
  const s = normalize({ sensitivity: 50, volume: -1, vhs: 3, fov: 10 });
  assert.equal(s.sensitivity, 3);
  assert.equal(s.volume, 0);
  assert.equal(s.vhs, 1);
  assert.equal(s.fov, 55);
});

test('nonsense values fall back to the default for that setting', () => {
  const s = normalize({ sensitivity: 'fast', subtitle: 'huge', bob: 'yes' });
  assert.equal(s.sensitivity, DEFAULTS.sensitivity);
  assert.equal(s.subtitle, DEFAULTS.subtitle);
  assert.equal(s.bob, DEFAULTS.bob);
});

test('settings survive a save and a load', () => {
  const store = memoryStorage();
  const mine = { sensitivity: 1.6, volume: 0.4, vhs: 0.3, fov: 80, subtitle: 'large', bob: false, brightness: 1.35 };
  assert.equal(save(store, mine), true);
  assert.deepEqual(load(store), mine);
});

test('a corrupted save loads as defaults instead of crashing', () => {
  const store = memoryStorage();
  store.setItem('oakridge.settings', '{not json');
  assert.deepEqual(load(store), DEFAULTS);
});

test('brightness starts at 1, which leaves the picture exactly as it was made', () => {
  assert.equal(DEFAULTS.brightness, 1);
  assert.equal(load(memoryStorage()).brightness, 1);
});

test('brightness is kept between 0.5 and 2, and nonsense falls back to 1', () => {
  assert.equal(normalize({ brightness: 9 }).brightness, 2);
  assert.equal(normalize({ brightness: 0 }).brightness, 0.5);
  assert.equal(normalize({ brightness: 'bright' }).brightness, 1);
  assert.equal(normalize({ brightness: NaN }).brightness, 1);
  assert.equal(normalize({ brightness: 1.4 }).brightness, 1.4);
});

test('a save from before brightness existed loads with brightness 1 and keeps everything else', () => {
  const store = memoryStorage();
  store.setItem('oakridge.settings', JSON.stringify({ sensitivity: 2, volume: 0.5, vhs: 0, fov: 90, subtitle: 'small', bob: false }));
  const s = load(store);
  assert.equal(s.brightness, 1);
  assert.equal(s.sensitivity, 2);
  assert.equal(s.fov, 90);
  assert.equal(s.bob, false);
});

test('blocked storage (private window) still gives defaults, and saving just reports false', () => {
  assert.deepEqual(load(brokenStorage), DEFAULTS);
  assert.equal(save(brokenStorage, DEFAULTS), false);
});
