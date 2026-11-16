// Field-of-view maths on the ground plane. yaw 0 faces -z (Three.js default); positive yaw turns left.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.sightline = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function inView(cam, target, halfFov) {
    var dx = target.x - cam.x;
    var dz = target.z - cam.z;
    var d = Math.hypot(dx, dz);
    if (d < 1e-9) return true;
    var fx = -Math.sin(cam.yaw);
    var fz = -Math.cos(cam.yaw);
    return (fx * dx + fz * dz) / d >= Math.cos(halfFov);
  }

  // update(cam) -> 'looked' when the target enters view, 'looked-away' when it leaves, else null.
  function createLookWatcher(target, halfFov) {
    var wasIn = false;
    return {
      update: function (cam) {
        var now = inView(cam, target, halfFov);
        if (now && !wasIn) {
          wasIn = true;
          return 'looked';
        }
        if (!now && wasIn) {
          wasIn = false;
          return 'looked-away';
        }
        return null;
      },
    };
  }

  // Does the 2D segment a->b cross the box's footprint? (slab method)
  function segmentHitsBox(a, b, box) {
    var tmin = 0;
    var tmax = 1;
    var dims = [
      [a.x, b.x - a.x, box.x0, box.x1],
      [a.z, b.z - a.z, box.z0, box.z1],
    ];
    for (var i = 0; i < dims.length; i++) {
      var o = dims[i][0];
      var d = dims[i][1];
      var lo = dims[i][2];
      var hi = dims[i][3];
      if (Math.abs(d) < 1e-12) {
        if (o < lo || o > hi) return false;
      } else {
        var t1 = (lo - o) / d;
        var t2 = (hi - o) / d;
        if (t1 > t2) { var s = t1; t1 = t2; t2 = s; }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return false;
      }
    }
    return true;
  }

  // Can something at eye height y see from `from` to `to`? Glass is see-through; boxes that sit
  // wholly above or below y (sills, lintels) do not block.
  function lineOfSight(boxes, from, to, y) {
    for (var i = 0; i < boxes.length; i++) {
      var b = boxes[i];
      if (b.kind === 'glass' || b.kind === 'slider') continue; // both are see-through
      if (typeof b.y0 === 'number' && (y < b.y0 || y > b.y1)) continue;
      if (segmentHitsBox(from, to, b)) return false;
    }
    return true;
  }

  return { inView: inView, createLookWatcher: createLookWatcher, lineOfSight: lineOfSight };
});
