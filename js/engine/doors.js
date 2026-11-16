// A door's solid state. Its box is in the collision list only while it is closed, and it refuses to
// close on someone standing in the doorway (that used to trap the player in Act 2).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./collision.js'));
  else {
    root.OC = root.OC || {};
    root.OC.doors = factory(root.OC.collision);
  }
})(typeof self !== 'undefined' ? self : this, function (collision) {
  var CLEARANCE = 0.3; // a little more than the player's radius

  function createDoor(opts) {
    var box = opts.box;
    var boxes = opts.boxes;
    var api = { closed: false, box: box };

    // close the door; pass the player's position so it will not close on them. Returns true if it closed.
    api.close = function (pos) {
      if (api.closed) return true;
      if (pos && collision.blocked(pos.x, pos.z, CLEARANCE, [box])) return false;
      api.closed = true;
      if (boxes.indexOf(box) < 0) boxes.push(box);
      return true;
    };
    api.open = function () {
      api.closed = false;
      var i = boxes.indexOf(box);
      if (i >= 0) boxes.splice(i, 1);
    };

    if (opts.closed) api.close();
    return api;
  }

  return { createDoor: createDoor };
});
