// The figure in Dave's window. It steps through its stages (lamp on, figure in one window, figure in
// the other, gone) and only ever moves when the player looks away after really looking (0.4 s).
// While it is being watched it never changes. update(seen, dt) returns {sighted}, {advancedTo} or null.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.silhouette = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  function createSilhouette(stages, opts) {
    var need = (opts && opts.minLook) || 0.4;
    var i = 0;
    var seenT = 0;
    var sighted = false;
    var wasSeen = false;
    return {
      stage: function () {
        return stages[i];
      },
      index: function () {
        return i;
      },
      update: function (seen, dt) {
        if (seen) {
          wasSeen = true;
          seenT += dt;
          if (!sighted && seenT >= need - 1e-9) {
            sighted = true;
            return { sighted: stages[i] };
          }
          return null;
        }
        if (wasSeen) {
          wasSeen = false;
          seenT = 0;
          if (sighted && i < stages.length - 1) {
            i++;
            sighted = false;
            return { advancedTo: stages[i] };
          }
        }
        return null;
      },
      reset: function () {
        i = 0;
        seenT = 0;
        sighted = false;
        wasSeen = false;
      },
    };
  }
  return { createSilhouette: createSilhouette };
});
