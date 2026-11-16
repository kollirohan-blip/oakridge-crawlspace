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
  const mine = { sensitivity: 1.6, volume: 0.4, vhs: 0.3, fov: 80, subtitle: 'large', bob: false };
  assert.equal(save(store, mine), true);
  assert.deepEqual(load(store), mine);
});

test('a corrupted save loads as defaults instead of crashing', () => {
  const store = memoryStorage();
  store.setItem('oakridge.settings', '{not json');
  assert.deepEqual(load(store), DEFAULTS);
});

test('blocked storage (private window) still gives defaults, and saving just reports false', () => {
  assert.deepEqual(load(brokenStorage), DEFAULTS);
  assert.equal(save(brokenStorage, DEFAULTS), false);
});
