// Turns a house description into wall boxes. Pure: no DOM, no Three.js.
// house = { wallHeight, rooms:[{id,x0,z0,x1,z1}], doors:[{x,z,axis,width}], windows:[{x,z,axis,width,sill,height}] }
// `axis` is the direction the wall RUNS: 'x' = wall along x at z = door.z, 'z' = wall along z at x = door.x.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.layout = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var THICKNESS = 0.2;
  var EPS = 1e-6;

  function roomAt(house, x, z) {
    for (var i = 0; i < house.rooms.length; i++) {
      var r = house.rooms[i];
      if (x >= r.x0 && x < r.x1 && z >= r.z0 && z < r.z1) return r.id;
    }
    return null;
  }

  function mergeIntervals(list) {
    var sorted = list.slice().sort(function (a, b) { return a[0] - b[0]; });
    var out = [];
    sorted.forEach(function (iv) {
      var last = out[out.length - 1];
      if (last && iv[0] <= last[1] + EPS) last[1] = Math.max(last[1], iv[1]);
      else out.push([iv[0], iv[1]]);
    });
    return out;
  }

  function subtract(intervals, cut) {
    var out = [];
    intervals.forEach(function (iv) {
      if (cut[1] <= iv[0] + EPS || cut[0] >= iv[1] - EPS) {
        out.push(iv);
        return;
      }
      if (cut[0] > iv[0] + EPS) out.push([iv[0], cut[0]]);
      if (cut[1] < iv[1] - EPS) out.push([cut[1], iv[1]]);
    });
    return out;
  }

  function box(axis, coord, a, b, y0, y1, kind) {
    var h = THICKNESS / 2;
    return axis === 'x'
      ? { x0: a, x1: b, z0: coord - h, z1: coord + h, y0: y0, y1: y1, kind: kind }
      : { x0: coord - h, x1: coord + h, z0: a, z1: b, y0: y0, y1: y1, kind: kind };
  }

  // an opening's position on its wall line: [coord of the line, centre along the line]
  function place(o) {
    return o.axis === 'x' ? { coord: o.z, centre: o.x } : { coord: o.x, centre: o.z };
  }

  function buildWalls(house) {
    var H = house.wallHeight;
    var lines = {};

    function addEdge(axis, coord, a, b) {
      var key = axis + ':' + Math.round(coord * 1000);
      if (!lines[key]) lines[key] = { axis: axis, coord: coord, intervals: [] };
      lines[key].intervals.push([a, b]);
    }
    house.rooms.forEach(function (r) {
      addEdge('x', r.z0, r.x0, r.x1);
      addEdge('x', r.z1, r.x0, r.x1);
      addEdge('z', r.x0, r.z0, r.z1);
      addEdge('z', r.x1, r.z0, r.z1);
    });

    var boxes = [];
    Object.keys(lines).forEach(function (key) {
      var line = lines[key];
      var solid = mergeIntervals(line.intervals);
      var doors = (house.doors || []).filter(function (d) {
        return d.axis === line.axis && Math.abs(place(d).coord - line.coord) < EPS;
      });
      var windows = (house.windows || []).filter(function (w) {
        return w.axis === line.axis && Math.abs(place(w).coord - line.coord) < EPS;
      });
      var cuts = doors.concat(windows);
      cuts.forEach(function (o) {
        var c = place(o).centre;
        solid = subtract(solid, [c - o.width / 2, c + o.width / 2]);
      });
      solid.forEach(function (iv) {
        boxes.push(box(line.axis, line.coord, iv[0], iv[1], 0, H, 'wall'));
      });
      windows.forEach(function (w) {
        var c = place(w).centre;
        var a = c - w.width / 2;
        var b = c + w.width / 2;
        boxes.push(box(line.axis, line.coord, a, b, 0, w.sill, 'sill'));
        boxes.push(box(line.axis, line.coord, a, b, w.sill, w.sill + w.height, 'glass'));
        boxes.push(box(line.axis, line.coord, a, b, w.sill + w.height, H, 'lintel'));
      });
    });
    return boxes;
  }

  return { buildWalls: buildWalls, roomAt: roomAt, THICKNESS: THICKNESS };
});
