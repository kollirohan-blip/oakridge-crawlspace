// Circle-vs-box movement on the ground plane (y is ignored: every box blocks).
// Moves in short sub-steps so a big per-frame move cannot tunnel through a thin wall,
// and resolves x and z separately so the player slides along walls.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.collision = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function blocked(x, z, r, boxes) {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var cx = Math.min(Math.max(x, b.x0), b.x1);
      var cz = Math.min(Math.max(z, b.z0), b.z1);
      var dx = x - cx;
      var dz = z - cz;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  // how far a circle sinks into a box (positive = overlapping)
  function penetration(x, z, r, b) {
    var cx = Math.min(Math.max(x, b.x0), b.x1);
    var cz = Math.min(Math.max(z, b.z0), b.z1);
    return r - Math.hypot(x - cx, z - cz);
  }

  // Like blocked(), but a box the body is already caught in (a door that closed on it) only blocks
  // moves that would push it deeper; moving out of it or along it is allowed.
  function blockedFrom(x, z, r, boxes, caught) {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      var k = caught.boxes.indexOf(b);
      if (k >= 0) {
        if (penetration(x, z, r, b) > caught.depth[k] + 1e-9) return true;
      } else if (penetration(x, z, r, b) > 0) {
        return true;
      }
    }
    return false;
  }

  function caughtIn(x, z, r, boxes) {
    var out = { boxes: [], depth: [] };
    for (var i = 0; i < boxes.length; i++) {
      var d = penetration(x, z, r, boxes[i]);
      if (d > 0) {
        out.boxes.push(boxes[i]);
        out.depth.push(d);
      }
    }
    return out;
  }

  // Advance one axis by `step`, or as far as it can go without entering a box.
  function advance(x, z, step, axis, r, boxes) {
    if (step === 0) return axis === 'x' ? x : z;
    var cur = axis === 'x' ? x : z;
    var caught = caughtIn(x, z, r, boxes);
    var free = function (t) {
      return axis === 'x'
        ? !blockedFrom(cur + step * t, z, r, boxes, caught)
        : !blockedFrom(x, cur + step * t, r, boxes, caught);
    };
    if (free(1)) return cur + step;
    var lo = 0;
    var hi = 1;
    for (var i = 0; i < 12; i++) {
      var mid = (lo + hi) / 2;
      if (free(mid)) lo = mid;
      else hi = mid;
    }
    return cur + step * lo;
  }

  function resolveMove(pos, delta, boxes, radius) {
    var x = pos.x;
    var z = pos.z;
    var len = Math.hypot(delta.x, delta.z);
    if (len === 0) return { x: x, z: z };
    var n = Math.max(1, Math.ceil(len / (radius / 2)));
    var sx = delta.x / n;
    var sz = delta.z / n;
    for (var i = 0; i < n; i++) {
      x = advance(x, z, sx, 'x', radius, boxes);
      z = advance(x, z, sz, 'z', radius, boxes);
    }
    return { x: x, z: z };
  }

  return { resolveMove: resolveMove, blocked: blocked };
});
