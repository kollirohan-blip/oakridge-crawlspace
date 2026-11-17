// What happens over your head while you are under the house. Footsteps on the floorboards that walk
// when you crawl and stop when you stop, one step late. Once you have tested that twice they stop for
// good; the next time you hold still, someone sits down on the floor right above you. Then, a while
// later, the phone upstairs starts to ring. Every stage has a fallback, so a player who never stops
// (or never moves) still gets all of it. Pure logic: the act decides where the sounds are.
//   var o = createOverhead(); o.start(); o.update(dt, moving) -> ['step' | 'sit' | 'ring', ...]
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.overhead = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_DT = 0.1;

  function createOverhead(opts) {
    opts = opts || {};
    var stepEvery = opts.stepEvery || 0.62;
    var lag = opts.lag || 0.45; // the one step after you stop
    var stopsNeeded = opts.stopsNeeded || 2;
    var sitAfter = opts.sitAfter || 2.5; // still this long, and he sits
    var ringAfter = opts.ringAfter || 6;
    var maxFollow = opts.maxFollow || 25; // never stops? they stop following anyway
    var maxIdle = opts.maxIdle || 8; // never moves? the same
    var giveUp = opts.giveUp || 20; // never holds still? he sits anyway

    var phase = 'idle'; // 'idle' | 'following' | 'waiting' | 'sat' | 'ringing'
    var phaseT = 0;
    var stepT = 0;
    var movedT = 0; // how long this stretch of crawling has lasted
    var late = null; // seconds until the late step
    var stops = 0;
    var stillT = 0;

    function go(next) {
      phase = next;
      phaseT = 0;
      stillT = 0;
    }

    return {
      start: function () {
        if (phase === 'idle') go('following');
      },
      phase: function () {
        return phase;
      },
      stops: function () {
        return stops;
      },
      update: function (dt, moving) {
        dt = Math.min(Math.max(dt, 0), MAX_DT);
        var events = [];
        if (phase === 'idle' || phase === 'ringing') return events;
        phaseT += dt;
        stillT = moving ? 0 : stillT + dt;

        if (phase === 'following') {
          if (moving) {
            late = null;
            movedT += dt;
            stepT += dt;
            if (stepT >= stepEvery - 1e-9) {
              stepT -= stepEvery;
              events.push('step');
            }
          } else {
            if (movedT > 0) {
              // you just stopped: one more step lands, a beat late
              if (movedT >= 1) {
                late = lag;
                stops++;
              }
              movedT = 0;
              stepT = 0;
            }
            if (late !== null) {
              late -= dt;
              if (late <= 1e-9) {
                late = null;
                events.push('step');
                if (stops >= stopsNeeded) go('waiting');
              }
            }
          }
          if (phase === 'following' && (phaseT >= maxFollow || (stops === 0 && stillT >= maxIdle))) go('waiting');
          return events;
        }

        if (phase === 'waiting') {
          if (stillT >= sitAfter - 1e-9 || phaseT >= giveUp) {
            events.push('sit');
            go('sat');
          }
          return events;
        }

        if (phase === 'sat' && phaseT >= ringAfter - 1e-9) {
          events.push('ring');
          go('ringing');
        }
        return events;
      },
    };
  }

  return { createOverhead: createOverhead };
});
