// In-game clock: maps real seconds onto story minutes. startMin/endMin are minutes after midnight
// and endMin may run past 1440 (1:30 AM the next day = 25 * 60 + 30). Each tick is clamped to 0.1 s
// so a hidden tab coming back to life cannot jump the clock.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.clock = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var MAX_DT = 0.1;

  function gameClock(opts) {
    var t = 0;
    function minutes() {
      var f = Math.min(1, t / opts.durationSec);
      return opts.startMin + (opts.endMin - opts.startMin) * f;
    }
    function label() {
      var m = Math.floor(minutes()) % 1440;
      var h24 = Math.floor(m / 60);
      var mm = m % 60;
      var h12 = h24 % 12 || 12;
      return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + (h24 < 12 ? 'AM' : 'PM');
    }
    return {
      tick: function (dt) {
        t += Math.min(Math.max(dt, 0), MAX_DT);
      },
      minutes: minutes,
      label: label,
      finished: function () {
        return t >= opts.durationSec;
      },
    };
  }

  return { gameClock: gameClock, MAX_DT: MAX_DT };
});
