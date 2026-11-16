// What is the player looking at? Props are merged into batched meshes and cannot be ray-picked, so
// this does it analytically: an item qualifies if it is within reach, close enough to the crosshair
// (an item's `radius` widens the cone), enabled, and not hidden behind a wall.
// cam = {x,y,z,yaw,pitch}; item = {id,x,y,z,radius?,enabled?: bool | () => bool}. yaw 0 faces -z.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./sightline.js'));
  else {
    root.OC = root.OC || {};
    root.OC.pick = factory(root.OC.sightline);
  }
})(typeof self !== 'undefined' ? self : this, function (sightline) {
  var REACH = 2.3;
  var HALF_ANGLE = 0.22; // radians, a little over 12 degrees

  function isEnabled(item) {
    if (typeof item.enabled === 'function') return !!item.enabled();
    return item.enabled !== false;
  }

  function pickTarget(cam, items, boxes, opts) {
    var reach = (opts && opts.reach) || REACH;
    var half = (opts && opts.halfAngle) || HALF_ANGLE;
    var cp = Math.cos(cam.pitch);
    var fx = -Math.sin(cam.yaw) * cp;
    var fy = Math.sin(cam.pitch);
    var fz = -Math.cos(cam.yaw) * cp;
    var best = null;
    var bestAngle = Infinity;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!isEnabled(it)) continue;
      var dx = it.x - cam.x;
      var dy = it.y - cam.y;
      var dz = it.z - cam.z;
      var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > reach || dist < 1e-6) continue;
      var dot = (fx * dx + fy * dy + fz * dz) / dist;
      var angle = Math.acos(Math.max(-1, Math.min(1, dot)));
      var tolerance = half + Math.atan2(it.radius || 0.15, dist);
      if (angle > tolerance) continue;
      if (!sightline.lineOfSight(boxes, { x: cam.x, z: cam.z }, { x: it.x, z: it.z }, it.y)) continue;
      if (angle < bestAngle) {
        bestAngle = angle;
        best = it;
      }
    }
    return best;
  }

  return { pickTarget: pickTarget, REACH: REACH };
});
