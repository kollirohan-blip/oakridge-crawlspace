// Path-finding on a grid of cells that are free for a body of a given radius. Walk-to targets for
// Cooper (and later the intruder). The grid is built once from the collision boxes; call rebuild()
// after a door opens or closes.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./collision.js'));
  else {
    root.OC = root.OC || {};
    root.OC.path = factory(root.OC.collision);
  }
})(typeof self !== 'undefined' ? self : this, function (collision) {
  function createNavGrid(opts) {
    var boxes = opts.boxes;
    var r = opts.radius;
    var step = opts.step || 0.25;
    var x0 = opts.x0;
    var z0 = opts.z0;
    var nx = Math.ceil((opts.x1 - x0) / step) + 1;
    var nz = Math.ceil((opts.z1 - z0) / step) + 1;
    var free = null;

    function rebuild() {
      free = new Uint8Array(nx * nz);
      for (var j = 0; j < nz; j++) {
        for (var i = 0; i < nx; i++) {
          free[j * nx + i] = collision.blocked(x0 + i * step, z0 + j * step, r, boxes) ? 0 : 1;
        }
      }
    }
    rebuild();

    function inGrid(i, j) {
      return i >= 0 && j >= 0 && i < nx && j < nz;
    }
    function clear(x, z) {
      return !collision.blocked(x, z, r - 0.02, boxes);
    }
    function segmentClear(a, b) {
      var n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (step / 2)));
      for (var i = 0; i <= n; i++) {
        if (!clear(a.x + ((b.x - a.x) * i) / n, a.z + ((b.z - a.z) * i) / n)) return false;
      }
      return true;
    }

    // the free cell centre nearest to a point (the point itself if its cell is free)
    function nearestFree(p) {
      var ci = Math.round((p.x - x0) / step);
      var cj = Math.round((p.z - z0) / step);
      if (inGrid(ci, cj) && free[cj * nx + ci]) return { i: ci, j: cj };
      var best = null;
      var bestD = Infinity;
      for (var rad = 1; rad <= 24; rad++) {
        for (var dj = -rad; dj <= rad; dj++) {
          for (var di = -rad; di <= rad; di++) {
            if (Math.max(Math.abs(di), Math.abs(dj)) !== rad) continue;
            var i = ci + di;
            var j = cj + dj;
            if (!inGrid(i, j) || !free[j * nx + i]) continue;
            var d = di * di + dj * dj;
            if (d < bestD) {
              bestD = d;
              best = { i: i, j: j };
            }
          }
        }
        if (best) return best;
      }
      return null;
    }

    function centre(c) {
      return { x: x0 + c.i * step, z: z0 + c.j * step };
    }

    function findPath(from, to) {
      var s = nearestFree(from);
      var t = nearestFree(to);
      if (!s || !t) return null;
      var end = clear(to.x, to.z) ? { x: to.x, z: to.z } : centre(t);
      if (segmentClear(from, end)) return [end];

      // breadth-first search over free cells, eight ways, without cutting corners
      var prev = new Int32Array(nx * nz).fill(-2);
      var queue = [s.j * nx + s.i];
      prev[queue[0]] = -1;
      var goal = t.j * nx + t.i;
      var found = false;
      for (var head = 0; head < queue.length && !found; head++) {
        var cur = queue[head];
        var ci = cur % nx;
        var cj = (cur - ci) / nx;
        for (var dj = -1; dj <= 1; dj++) {
          for (var di = -1; di <= 1; di++) {
            if (!di && !dj) continue;
            var i = ci + di;
            var j = cj + dj;
            if (!inGrid(i, j) || !free[j * nx + i]) continue;
            if (di && dj && (!free[cj * nx + i] || !free[j * nx + ci])) continue;
            var n = j * nx + i;
            if (prev[n] !== -2) continue;
            prev[n] = cur;
            if (n === goal) {
              found = true;
              break;
            }
            queue.push(n);
          }
          if (found) break;
        }
      }
      if (!found) return null;

      var cells = [];
      for (var c = goal; c !== -1; c = prev[c]) cells.push({ i: c % nx, j: Math.floor(c / nx) });
      cells.reverse();
      var pts = cells.map(centre);
      pts[pts.length - 1] = end;

      // string-pulling: keep only the corners the body actually has to turn at
      var out = [];
      var curPt = from;
      var k = 0;
      while (k < pts.length) {
        var far = k;
        for (var m = pts.length - 1; m > k; m--) {
          if (segmentClear(curPt, pts[m])) {
            far = m;
            break;
          }
        }
        out.push(pts[far]);
        curPt = pts[far];
        k = far + 1;
      }
      return out;
    }

    return { findPath: findPath, rebuild: rebuild, isFree: clear };
  }

  return { createNavGrid: createNavGrid };
});
