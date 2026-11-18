// The phone's cursor: a pointer drawn on Mason's phone while it is out. The mouse stays captured for
// looking, so the cursor is moved by the mouse's movement. On the phone, the mouse moves the cursor and
// the view stays still; push past the phone's edge and the part past the edge turns the view, the way the
// mouse always does. Off the phone, the pointer is remembered at most OUT pixels away, so coming back is
// a short move, and the view turns as far as you like. Pure logic in screen pixels; js/phone.js draws it.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.cursor = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var OUT = 160; // how far off the phone the pointer is remembered

  function create() {
    return { x: 0, y: 0 }; // the pointer: on the phone, or up to OUT off it
  }
  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }
  function usable(r) {
    return !!r && r.right - r.left > 1 && r.bottom - r.top > 1;
  }
  function outside(r, x, y) {
    return x < r.left || x > r.right || y < r.top || y > r.bottom;
  }
  // the travel from a to b that lies inside [lo, hi], with the sign of b - a
  function within(a, b, lo, hi) {
    var o = Math.max(0, Math.min(Math.max(a, b), hi) - Math.max(Math.min(a, b), lo));
    return b >= a ? o : -o;
  }

  // put the cursor on the phone: fx, fy across it (0 to 1), the middle if left out
  function place(c, r, fx, fy) {
    if (!usable(r)) return;
    c.x = r.left + (r.right - r.left) * (typeof fx === 'number' ? clamp(fx, 0, 1) : 0.5);
    c.y = r.top + (r.bottom - r.top) * (typeof fy === 'number' ? clamp(fy, 0, 1) : 0.5);
  }

  // the mouse moved by (dx, dy). r is the phone's rectangle on screen, or null when it is not showing.
  // abs: where a real pointer is, when the mouse is not captured (it is followed, not capped).
  // Returns the part of the movement that turns the view.
  function move(c, dx, dy, r, abs) {
    if (!usable(r)) return { x: dx, y: dy };
    var x0 = abs ? abs.x - dx : c.x;
    var y0 = abs ? abs.y - dy : c.y;
    var tx = x0 + dx;
    var ty = y0 + dy;
    var nx = abs ? tx : clamp(tx, r.left - OUT, r.right + OUT);
    var ny = abs ? ty : clamp(ty, r.top - OUT, r.bottom + OUT);
    // off the phone sideways, every bit of up and down turns the view, and the other way round
    var offX = x0 < r.left || x0 > r.right || nx < r.left || nx > r.right;
    var offY = y0 < r.top || y0 > r.bottom || ny < r.top || ny > r.bottom;
    var look = {
      x: offY ? dx : dx - within(x0, tx, r.left, r.right),
      y: offX ? dy : dy - within(y0, ty, r.top, r.bottom),
    };
    c.x = nx;
    c.y = ny;
    return look;
  }

  // where to draw it: on the phone, waiting on the edge (out) while the pointer is off it
  function point(c, r) {
    if (!usable(r)) return { x: c.x, y: c.y, out: true };
    return { x: clamp(c.x, r.left, r.right), y: clamp(c.y, r.top, r.bottom), out: outside(r, c.x, c.y) };
  }
  // where it is across the phone (0 to 1), to put it back there next time
  function where(c, r) {
    var p = point(c, r);
    if (!usable(r)) return { fx: 0.5, fy: 0.5 };
    return { fx: (p.x - r.left) / (r.right - r.left), fy: (p.y - r.top) / (r.bottom - r.top) };
  }

  return { create: create, place: place, move: move, point: point, where: where, OUT: OUT };
});
