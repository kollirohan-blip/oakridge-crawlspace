// Flappy Cooper, the game on Mason's phone: tap to flap, fly Cooper between the fire hydrants.
// Pure logic in screen pixels (y grows downward); js/phone.js draws it.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.flappy = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var GRAVITY = 420;
  var FLAP = -150;
  var SPEED = 55;
  var SPACING = 75;
  var GAP = 60;
  var MARGIN = 20;
  var PIPE_W = 16;
  var X = 30; // Cooper's column
  var R = 6;

  function createFlappy(opts) {
    var w = opts.w;
    var h = opts.h;
    var rnd = opts.rnd || Math.random;
    var best = 0;
    var started = false;
    var api = { state: null, X: X, R: R, PIPE_W: PIPE_W, GAP: GAP };

    api.reset = function () {
      started = false;
      api.state = { y: h / 2, vy: 0, score: 0, alive: true, pipes: [] };
    };
    api.flap = function () {
      if (!api.state.alive) api.reset();
      started = true;
      api.state.vy = FLAP;
    };
    api.best = function () {
      return best;
    };
    api.started = function () {
      return started;
    };
    api.tick = function (dt) {
      var s = api.state;
      if (!started || !s.alive) return;
      s.vy += GRAVITY * dt;
      s.y += s.vy * dt;
      if (s.y < R) {
        s.y = R;
        s.vy = 0;
      }
      var last = s.pipes[s.pipes.length - 1];
      if (!last || last.x < w + 10 - SPACING) {
        s.pipes.push({ x: w + 10, gapY: MARGIN + rnd() * (h - 2 * MARGIN - GAP) + GAP / 2, passed: false });
      }
      s.pipes.forEach(function (p) {
        p.x -= SPEED * dt;
        if (Math.abs(p.x - X) < PIPE_W / 2 + R && (s.y - R < p.gapY - GAP / 2 || s.y + R > p.gapY + GAP / 2)) {
          s.alive = false;
        }
        if (!p.passed && p.x + PIPE_W / 2 < X - R) {
          p.passed = true;
          s.score++;
          best = Math.max(best, s.score);
        }
      });
      s.pipes = s.pipes.filter(function (p) { return p.x > -PIPE_W; });
      if (s.y + R >= h) s.alive = false;
    };

    api.reset();
    return api;
  }

  return { createFlappy: createFlappy };
});
