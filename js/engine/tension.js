// The tension Director, after Alien: Isolation's two tiers. This tier decides WHEN: menace builds up
// while the player is calm, an ambient event is spent when it peaks, a cooldown follows, and after a
// real peak the house backs off for a relief window. A panicking player (fast turns, backing up,
// sprinting) gets a break. Standing still too long is punished, then relieved. What happens and
// where is up to the act and the scare pool. Pure logic.
// signs = { turnRate (rad/s), moving, backingUp, sprinting, lightOn }
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.tension = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_DT = 0.1;
  var EPS = 1e-9;

  function stressFrom(s) {
    var v = 0;
    if (s.turnRate > 2.5) v += 0.4;
    if (s.sprinting) v += 0.3;
    if (s.backingUp) v += 0.2;
    if (s.lightOn) v += 0.1;
    return Math.min(1, Math.round(v * 1000) / 1000); // 0.4+0.3+0.2+0.1 is 0.999... in floats
  }

  function createTension(opts) {
    opts = opts || {};
    var rise = opts.rise !== undefined ? opts.rise : 0.012;
    var threshold = opts.threshold !== undefined ? opts.threshold : 0.6;
    var cooldownSec = opts.cooldown !== undefined ? opts.cooldown : 20;
    var reliefSec = opts.reliefSec !== undefined ? opts.reliefSec : 30;
    var idleLimit = opts.idleLimit !== undefined ? opts.idleLimit : 40;
    var budget = opts.budget !== undefined ? opts.budget : Infinity;

    var menace = 0;
    var stress = 0;
    var cooldown = 0;
    var relief = 0;
    var idleT = 0;

    function inRelief() {
      return relief > EPS;
    }

    return {
      update: function (dt, signs) {
        dt = Math.min(Math.max(dt, 0), MAX_DT);
        stress += (stressFrom(signs) - stress) * Math.min(1, dt * 2);
        cooldown = Math.max(0, cooldown - dt);
        if (inRelief()) {
          relief = Math.max(0, relief - dt);
          menace = Math.max(0, menace - 0.05 * dt);
        } else {
          menace = Math.min(1, menace + rise * dt * (1 - 0.7 * stress));
        }

        var still = !signs.moving && signs.turnRate < 0.3;
        idleT = still ? idleT + dt : 0;
        if (idleT >= idleLimit - EPS && cooldown <= EPS && !inRelief()) {
          idleT = 0;
          relief = reliefSec / 2;
          return { kind: 'idle' };
        }

        if (menace >= threshold - EPS && cooldown <= EPS && !inRelief() && stress <= 0.6 && budget > 0) {
          menace = Math.max(0, menace - 0.35);
          cooldown = cooldownSec;
          budget -= 1;
          return { kind: 'ambient' };
        }
        return null;
      },
      // a scripted beat landed at this fear level (1..10)
      peak: function (fear) {
        if (fear >= 5) {
          menace = 0;
          relief = reliefSec;
        } else {
          menace = Math.max(0, menace - 0.3);
        }
      },
      // a comfort beat (petting Cooper, lights on, a dumb text): nothing happens for a while
      relieve: function (sec) {
        relief = Math.max(relief, sec);
      },
      // may a scripted beat go now?
      ready: function () {
        return !inRelief() && cooldown <= EPS;
      },
      // a scripted beat went: start a cooldown
      spend: function () {
        cooldown = cooldownSec;
      },
      menace: function () { return menace; },
      stress: function () { return stress; },
      inRelief: inRelief,
      budgetLeft: function () { return budget; },
    };
  }

  return { createTension: createTension, stressFrom: stressFrom };
});
