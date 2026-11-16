// The scare pool from docs/story-v2.md, placed by night and fear level. The act supplies what each one
// does; js/engine/scarePool.js decides which may happen. Night 1 draws only the ambient sounds, Cooper's
// ears, sudden silence and idle punish; the rest wait for Night 2.
(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else {
    root.OC = root.OC || {};
    root.OC.scares = data;
  }
})(typeof self !== 'undefined' ? self : this, function () {
  return {
    items: [
      // house sounds, repeatable
      { id: 'creak', kind: 'ambient', nights: [1, 2], once: false, cooldown: 30 },
      { id: 'iceMaker', kind: 'ambient', nights: [1, 2], once: false, cooldown: 45 },
      { id: 'cooperEars', kind: 'ambient', nights: [1, 2], once: false, cooldown: 40 },
      // the fridge, the clock and the rain stop for 3 s before he is near
      { id: 'suddenSilence', kind: 'scare', nights: [1, 2], minFear: 3, once: false, cooldown: 90 },
      // stand still too long and the house makes a sound behind you, then a real relief beat
      { id: 'idlePunish', kind: 'idle', nights: [1, 2], once: false, cooldown: 0 },
      // Night 2, one time each
      { id: 'repeatedKnocks', kind: 'scare', nights: [2], minFear: 5 },
      { id: 'heldBreath', kind: 'scare', nights: [2], minFear: 6 },
      { id: 'emptyFetch', kind: 'scare', nights: [2], minFear: 4 },
      { id: 'wrongReflection', kind: 'scare', nights: [2], minFear: 5 },
      { id: 'followingLight', kind: 'scare', nights: [2], minFear: 5 },
      { id: 'familiarSound', kind: 'scare', nights: [2], minFear: 4 },
      { id: 'almostSighting', kind: 'scare', nights: [2], minFear: 5 },
      { id: 'blockedRoute', kind: 'scare', nights: [2], minFear: 4 },
      { id: 'changedNote', kind: 'scare', nights: [2], minFear: 3 },
      { id: 'fish', kind: 'scare', nights: [2], minFear: 4 },
    ],
  };
});
