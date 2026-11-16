// Act 3's rules. outcome(choice): only the calm bluff ('c') survives; anything else, including running
// out of time, does not. createStareRule(limit): trips when the player stares (continuously) at the
// closet for `limit` seconds while walking out of the room.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.bluff = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var OUTCOMES = { a: 'scream', b: 'confront', c: 'survive' };

  function outcome(choice) {
    return OUTCOMES[choice] || 'freeze';
  }

  function createStareRule(limit) {
    var t = 0;
    return {
      update: function (looking, dt) {
        if (!looking) {
          t = 0;
          return false;
        }
        t += dt;
        return t >= limit - 1e-9;
      },
      reset: function () {
        t = 0;
      },
    };
  }

  return { outcome: outcome, createStareRule: createStareRule };
});
