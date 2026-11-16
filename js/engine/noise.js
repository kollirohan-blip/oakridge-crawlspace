// The noise meter while Mason hides in the car. Every movement pokes it; it drains on its own.
// If it ever fills, the man heard him, and it stays that way.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.noise = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var DECAY = 0.15; // per second

  function createNoiseMeter(opts) {
    var decay = (opts && opts.decay) || DECAY;
    var level = 0;
    var tripped = false;
    function clamp(v) {
      return Math.max(0, Math.min(1, v));
    }
    return {
      poke: function (amount) {
        level = clamp(level + Math.max(0, amount));
        if (level >= 1 - 1e-9) tripped = true;
      },
      tick: function (dt) {
        level = clamp(level - decay * dt);
      },
      level: function () {
        return level;
      },
      exceeded: function () {
        return tripped;
      },
      reset: function () {
        level = 0;
        tripped = false;
      },
    };
  }

  return { createNoiseMeter: createNoiseMeter };
});
