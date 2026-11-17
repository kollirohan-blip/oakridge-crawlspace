// The storm on night two, as timing only: how hard it is raining (a level that eases toward a target)
// and when the lightning comes, each flash followed by its thunder after a delay that says how far off
// it was. js/weather.js turns these events into light, rain and sound. Pure logic.
//   var s = createStorm({ rnd, level }); s.setLevel(1); s.update(dt) -> [{ type: 'flash', strength, thunderIn }, { type: 'thunder', strength }]
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.storm = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_DT = 0.1;

  function createStorm(opts) {
    opts = opts || {};
    var rnd = opts.rnd || Math.random;
    var minGap = opts.minGap !== undefined ? opts.minGap : 9;
    var maxGap = opts.maxGap !== undefined ? opts.maxGap : 26;
    var level = opts.level || 0;
    var target = level;
    var nextFlash = null; // seconds until the next flash, once one is due
    var pending = []; // thunder on its way: { t, strength }
    var forced = null;

    function gap() {
      return (minGap + rnd() * (maxGap - minGap)) / Math.max(level, 0.25);
    }

    return {
      // 0 = clear, 1 = the worst of it
      setLevel: function (v) {
        target = Math.max(0, Math.min(1, v));
      },
      level: function () {
        return level;
      },
      // a flash now (a scripted one), with its thunder this many seconds later
      strike: function (strength, thunderIn) {
        forced = { strength: strength, thunderIn: thunderIn };
      },
      update: function (dt) {
        dt = Math.min(Math.max(dt, 0), MAX_DT);
        var events = [];
        level += (target - level) * Math.min(1, dt * 0.25);
        if (target === 0 && level < 0.001) level = 0;

        for (var i = pending.length - 1; i >= 0; i--) {
          pending[i].t -= dt;
          if (pending[i].t <= 1e-9) events.push({ type: 'thunder', strength: pending.splice(i, 1)[0].strength });
        }

        var flash = null;
        if (forced) {
          flash = forced;
          forced = null;
        } else if (level > 0.05) {
          if (nextFlash === null) nextFlash = gap();
          nextFlash -= dt;
          if (nextFlash <= 1e-9) {
            flash = { strength: 0.35 + rnd() * 0.65, thunderIn: 0.3 + rnd() * 4.2 };
            nextFlash = gap();
          }
        } else nextFlash = null;

        if (flash) {
          events.unshift({ type: 'flash', strength: flash.strength, thunderIn: flash.thunderIn });
          pending.push({ t: flash.thunderIn, strength: flash.strength });
        }
        return events;
      },
    };
  }

  return { createStorm: createStorm, MAX_DT: MAX_DT };
});
