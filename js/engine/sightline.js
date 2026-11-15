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

  return { inView: inView, createLookWatcher: createLookWatcher };
});
