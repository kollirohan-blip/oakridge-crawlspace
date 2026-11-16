// Builds the house, the yard and the night around it from content/house.js.
//
// All static geometry (walls, floors, ceilings, roofs, furniture boxes) is emitted as quads into one
// batch per texture and turned into a handful of meshes by commit(). That keeps the whole house to
// about twenty draw calls, which is what a laptop with integrated graphics needs.
(function () {
  var OC = (window.OC = window.OC || {});

  var WALL_TILE = 2.4; // metres of wall per texture repeat
  var FLOOR_TILE = 2;

  function build(scene, house) {
    var H = house.wallHeight;
    var group = new THREE.Group();
    scene.add(group);

    // ---- the batch -------------------------------------------------------------------------
    var parts = {}; // texture name -> { p, n, uv, i } (plain arrays)
    function part(tex) {
      return parts[tex] || (parts[tex] = { p: [], n: [], uv: [], i: [] });
    }
    // a, b, c, d: corners counter-clockwise as seen from the front (the side n points to)
    function quad(tex, a, b, c, d, n, uLen, vLen, tile) {
      var s = part(tex);
      var base = s.p.length / 3;
      var u = uLen / tile;
      var v = vLen / tile;
      [a, b, c, d].forEach(function (pt) {
        s.p.push(pt[0], pt[1], pt[2]);
        s.n.push(n[0], n[1], n[2]);
      });
      s.uv.push(0, 0, u, 0, u, v, 0, v);
      s.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
    // faces: { px, nx, py, ny, pz, nz } -> texture name, or omitted to skip that face
    function emitBox(x0, y0, z0, x1, y1, z1, f, tile) {
      var w = x1 - x0;
      var d = z1 - z0;
      var h = y1 - y0;
      tile = tile || WALL_TILE;
      if (f.pz) quad(f.pz, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], w, h, tile);
      if (f.nz) quad(f.nz, [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], w, h, tile);
      if (f.px) quad(f.px, [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], d, h, tile);
      if (f.nx) quad(f.nx, [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], d, h, tile);
      if (f.py) quad(f.py, [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], w, d, tile);
      if (f.ny) quad(f.ny, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], w, d, tile);
    }
    function floorQuad(tex, x0, z0, x1, z1, y, tile) {
      quad(tex, [x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], x1 - x0, z1 - z0, tile || FLOOR_TILE);
    }
    function ceilingQuad(tex, x0, z0, x1, z1, y, tile) {
      quad(tex, [x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1], [0, -1, 0], x1 - x0, z1 - z0, tile || FLOOR_TILE);
    }

    var glassParts = { p: [], n: [], uv: [], i: [] };
    var glassBoxes = [];
    function glassPane(b) {
      glassBoxes.push(b);
      var w = b.x1 - b.x0;
      var d = b.z1 - b.z0;
      var cx = (b.x0 + b.x1) / 2;
      var cz = (b.z0 + b.z1) / 2;
      var s = glassParts;
      var base = s.p.length / 3;
      var pts =
        w > d
          ? [[b.x0, b.y0, cz], [b.x1, b.y0, cz], [b.x1, b.y1, cz], [b.x0, b.y1, cz]]
          : [[cx, b.y0, b.z0], [cx, b.y0, b.z1], [cx, b.y1, b.z1], [cx, b.y1, b.z0]];
      pts.forEach(function (pt) {
        s.p.push(pt[0], pt[1], pt[2]);
        s.n.push(0, 0, 1);
        s.uv.push(0, 0);
      });
      s.i.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }

    // ---- walls -----------------------------------------------------------------------------
    function roomWall(px, pz) {
      var id = OC.layout.roomAt(house, px, pz);
      if (!id) return 'siding';
      for (var i = 0; i < house.rooms.length; i++) if (house.rooms[i].id === id) return house.rooms[i].wall;
      return 'siding';
    }

    // Cut a wall box wherever a room boundary crosses it, so each stretch gets its own room's wallpaper.
    function splitAtRooms(b, alongX) {
      var lo = alongX ? b.x0 : b.z0;
      var hi = alongX ? b.x1 : b.z1;
      var cuts = [];
      house.rooms.forEach(function (r) {
        [alongX ? r.x0 : r.z0, alongX ? r.x1 : r.z1].forEach(function (c) {
          if (c > lo + 1e-6 && c < hi - 1e-6 && cuts.indexOf(c) < 0) cuts.push(c);
        });
      });
      cuts.sort(function (a, c) { return a - c; });
      var points = [lo].concat(cuts, [hi]);
      var out = [];
      for (var i = 0; i < points.length - 1; i++) {
        var piece = {};
        for (var k in b) piece[k] = b[k];
        if (alongX) { piece.x0 = points[i]; piece.x1 = points[i + 1]; }
        else { piece.z0 = points[i]; piece.z1 = points[i + 1]; }
        out.push(piece);
      }
      return out;
    }

    function wallPiece(b) {
      var alongX = b.x1 - b.x0 > b.z1 - b.z0;
      splitAtRooms(b, alongX).forEach(function (p) {
        var cx = (p.x0 + p.x1) / 2;
        var cz = (p.z0 + p.z1) / 2;
        var f = alongX
          ? { pz: roomWall(cx, p.z1 + 0.3), nz: roomWall(cx, p.z0 - 0.3), px: 'plain', nx: 'plain' }
          : { px: roomWall(p.x1 + 0.3, cz), nx: roomWall(p.x0 - 0.3, cz), pz: 'plain', nz: 'plain' };
        emitBox(p.x0, p.y0, p.z0, p.x1, p.y1, p.z1, f);
      });
    }

    var wallBoxes = OC.layout.buildWalls(house);
    wallBoxes.forEach(function (b) {
      if (b.kind === 'glass') glassPane(b);
      else wallPiece(b);
    });

    // headers above doorways (visual only: nobody walks through the ceiling)
    house.doors.forEach(function (d) {
      var t = OC.layout.THICKNESS / 2;
      var hw = d.width / 2;
      wallPiece(
        d.axis === 'x'
          ? { x0: d.x - hw, x1: d.x + hw, z0: d.z - t, z1: d.z + t, y0: 2.15, y1: H, kind: 'header' }
          : { x0: d.x - t, x1: d.x + t, z0: d.z - hw, z1: d.z + hw, y0: 2.15, y1: H, kind: 'header' }
      );
    });

    // floors and ceilings
    house.rooms.forEach(function (r) {
      floorQuad(r.floor, r.x0, r.z0, r.x1, r.z1, 0);
      ceilingQuad('ceiling', r.x0, r.z0, r.x1, r.z1, H);
    });

    // roofs, seen only from outside
    (house.roofs || []).forEach(function (r) {
      emitBox(r.x0, H + 0.02, r.z0, r.x1, H + 0.37, r.z1, { px: 'shingle', nx: 'shingle', pz: 'shingle', nz: 'shingle', py: 'shingle' }, 2);
    });

    // the ground, the patio, the porch and the driveway
    floorQuad('grass', -67, -72, 93, 88, -0.02, 2);
    floorQuad('concrete', 16, 8, 23, 12.5, 0.01);
    floorQuad('concrete', 7.5, -27, 12.5, -1, 0.01);
    emitBox(0.7, 0, -2.4, 4.3, 0.15, 0, { px: 'wood', nx: 'wood', pz: 'wood', nz: 'wood', py: 'wood' }, 1.2);

    // ---- trees: two instanced meshes (a trunk and a crown), a dark ring beyond the yard ---------
    var spots = [];
    var seed = 12345;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    while (spots.length < 34) {
      var a = rnd() * Math.PI * 2;
      var rad = 22 + rnd() * 20;
      var x = 13 + Math.cos(a) * rad * 1.5;
      var z = 8 + Math.sin(a) * rad * 1.1;
      if (x < -27 || x > 53 || z < -31 || z > 46) continue;
      if (x > -4 && x < 30 && z > -22 && z < 30) continue; // keep the house, yard and drive clear
      spots.push([x, z]);
    }
    // Kenney's pines when the models are there (merged with the rest of the scenery: a few draw calls);
    // otherwise two instanced meshes of cones
    var PINES = ['tree_pineTallA', 'tree_pineTallB', 'tree_pineTallC', 'tree_pineRoundA', 'tree_pineDefaultA', 'tree_detailed_dark'];
    if (OC.models && OC.models.has(PINES[0])) {
      spots.forEach(function (s) {
        var kind = PINES[Math.floor(rnd() * PINES.length)];
        OC.models.at(kind, { x: s[0], z: s[1], rotY: rnd() * Math.PI * 2, height: 7 + rnd() * 5 });
      });
      // a second, nearer row thinly, so the yard has an edge you can see from the porch
      for (var k = 0; k < 26; k++) {
        var aa = rnd() * Math.PI * 2;
        var rr = 19 + rnd() * 4;
        var tx = 13 + Math.cos(aa) * rr * 1.45;
        var tz = 6 + Math.sin(aa) * rr * 1.15;
        if (tx > -5 && tx < 31 && tz > -22 && tz < 30) continue;
        OC.models.at(PINES[Math.floor(rnd() * PINES.length)], { x: tx, z: tz, rotY: rnd() * 6.28, height: 6 + rnd() * 4 });
      }
    } else {
    var trunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.25, 0.35, 5, 6),
      new THREE.MeshPhongMaterial({ color: 0x1d1610, specular: 0x000000 }),
      spots.length
    );
    var crowns = new THREE.InstancedMesh(
      new THREE.ConeGeometry(2.2, 6.5, 7),
      new THREE.MeshPhongMaterial({ color: 0x0f1a12, specular: 0x000000 }),
      spots.length
    );
    var m4 = new THREE.Matrix4();
    spots.forEach(function (s, i) {
      m4.makeTranslation(s[0], 2.5, s[1]);
      trunks.setMatrixAt(i, m4);
      m4.makeTranslation(s[0], 7.5, s[1]);
      crowns.setMatrixAt(i, m4);
    });
    group.add(trunks);
    group.add(crowns);
    }

    // ---- light: a faint moon, then warm pools where somebody left a lamp on -------------------
    var hemi = new THREE.HemisphereLight(0x33405e, 0x0a0a0e, 0.34);
    scene.add(hemi);
    // the sun: always in the scene (adding a light later recompiles every material), off at night
    var sun = new THREE.DirectionalLight(0xfff1dc, 0);
    sun.position.set(30, 40, -25);
    scene.add(sun);
    scene.add(sun.target);
    var lightById = {};
    var lights = (house.lights || []).map(function (l) {
      var pl = new THREE.PointLight(l.color, l.intensity, l.distance, 2);
      pl.position.set(l.x, l.y, l.z);
      pl.userData.base = l.intensity;
      scene.add(pl);
      if (l.id) lightById[l.id] = pl;
      return pl;
    });

    // ---- commit: turn the batches into meshes --------------------------------------------------
    var materials = {};
    function materialFor(tex) {
      if (!materials[tex]) {
        // Phong with no specular = per-pixel diffuse. (Lambert lights only the vertices, so big
        // walls and ceilings far from a lamp came out black.)
        materials[tex] = new THREE.MeshPhongMaterial({
          map: OC.textures.get(tex, 1, 1),
          specular: 0x000000,
          shininess: 1,
        });
      }
      return materials[tex];
    }
    function geometryFrom(s) {
      var g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(s.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(s.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2));
      g.setIndex(s.p.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(s.i, 1) : new THREE.Uint16BufferAttribute(s.i, 1));
      return g;
    }

    var world = {
      boxes: wallBoxes.concat(house.solids || []),
      rooms: house.rooms,
      anchors: house.anchors,
      group: group,
      lights: lights,
      lightById: lightById,
      material: materialFor,
      glassBoxes: glassBoxes,
      // furniture: a box of one texture on every face except the bottom
      box: function (x0, y0, z0, x1, y1, z1, tex, tile) {
        emitBox(x0, y0, z0, x1, y1, z1, { px: tex, nx: tex, pz: tex, nz: tex, py: tex }, tile || 1.2);
      },
      emitBox: emitBox,
      meshes: [],
      // 0 = night, 1 = a grey November day: the sky, the fog, the sun, the light in the windows
      setDaylight: function (f, renderer) {
        f = Math.max(0, Math.min(1, f));
        var night = new THREE.Color(0x0a0e16);
        var day = new THREE.Color(0xa7b7c6);
        var sky = night.clone().lerp(day, f);
        if (renderer) renderer.setClearColor(sky);
        if (scene.fog) {
          scene.fog.color.copy(sky);
          scene.fog.density = 0.04 - 0.028 * f;
        }
        hemi.intensity = 0.34 + 0.86 * f;
        hemi.color.set(0x33405e).lerp(new THREE.Color(0xd2dcea), f);
        hemi.groundColor.set(0x0a0a0e).lerp(new THREE.Color(0x4a4438), f);
        sun.intensity = 0.9 * f;
        if (world.glassMesh) {
          world.glassMesh.material.color.set(0x0b1420).lerp(new THREE.Color(0xb9c8d6), f);
          world.glassMesh.material.opacity = 0.3 - 0.12 * f;
        }
        world.daylight = f;
      },
      daylight: 0,
      commit: function () {
        Object.keys(parts).forEach(function (tex) {
          var mesh = new THREE.Mesh(geometryFrom(parts[tex]), materialFor(tex));
          mesh.matrixAutoUpdate = false;
          group.add(mesh);
          world.meshes.push(mesh);
        });
        parts = {};
        if (glassParts.p.length) {
          var gm = new THREE.MeshBasicMaterial({
            color: 0x0b1420,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          var glassMesh = new THREE.Mesh(geometryFrom(glassParts), gm);
          glassMesh.matrixAutoUpdate = false;
          group.add(glassMesh);
          world.glassMesh = glassMesh;
          glassParts = { p: [], n: [], uv: [], i: [] };
        }
      },
    };
    return world;
  }

  OC.world = { build: build };
})();
