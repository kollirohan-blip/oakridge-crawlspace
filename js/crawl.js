// Under the house. The crawlspace has the house's own footprint (x + 200, so nothing of it is ever seen
// from above): packed dirt, cinder-block walls, piers under the girders, joists and the underside of
// the floor a metre up, pink insulation coming down in sheets. You get in by the laundry hatch and
// move on your belly. He gets in by the vent behind the porch bush. His nest is right under the guest
// bed: a sleeping bag, a moon night light, Dave's soup, the blue Tupperware, a family photo, 46 tally
// marks, and a notebook. build() is the static part; create() the few things that change.
(function () {
  var OC = (window.OC = window.OC || {});
  var DX = 200; // crawl x = house x + DX; z is the same
  var TOP = 0.98; // the underside of the floor
  var HATCH = { x: DX + 2.5, z: 10.5 };
  var HOLE = { x0: DX + 2.05, z0: 10.05, x1: DX + 2.95, z1: 10.95 };
  var NEST = { x: DX + 1.1, z: 15.6 }; // the middle of the guest bed, from underneath
  var VENT = { x0: DX + 5.2, x1: DX + 6.0, y0: 0.1, y1: 0.48 };
  var T = 0.2;

  function build(world) {
    var W = world;
    function solid(x0, z0, x1, z1, y1, kind) {
      W.boxes.push({ x0: x0, y0: 0, z0: z0, x1: x1, y1: y1 || TOP, z1: z1, kind: kind || 'foundation' });
    }
    var seed = 9173;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    var X0 = DX;
    var X1 = DX + 26;
    var XS = DX + 13; // the south wing's east side

    // ---- the ground and the underside of the floor ------------------------------------------------
    W.emitBox(X0, -0.05, 0, X1, 0, 8, { py: 'dirt' }, 1.6);
    W.emitBox(X0, -0.05, 8, XS, 0, 24, { py: 'dirt' }, 1.6);
    W.emitBox(X0, TOP, 0, X1, TOP + 0.04, 8, { ny: 'subfloor' }, 1.3);
    // the south wing's, in four pieces around the hatch
    W.emitBox(X0, TOP, 8, XS, TOP + 0.04, HOLE.z0, { ny: 'subfloor' }, 1.3);
    W.emitBox(X0, TOP, HOLE.z1, XS, TOP + 0.04, 24, { ny: 'subfloor' }, 1.3);
    W.emitBox(X0, TOP, HOLE.z0, HOLE.x0, TOP + 0.04, HOLE.z1, { ny: 'subfloor' }, 1.3);
    W.emitBox(HOLE.x1, TOP, HOLE.z0, XS, TOP + 0.04, HOLE.z1, { ny: 'subfloor' }, 1.3);
    // the hatch's shaft: the thickness of the floor, and the laundry room's ceiling far above it
    W.emitBox(HOLE.x0 - 0.04, TOP, HOLE.z0 - 0.04, HOLE.x0, TOP + 0.3, HOLE.z1 + 0.04, { px: 'wood' }, 0.6);
    W.emitBox(HOLE.x1, TOP, HOLE.z0 - 0.04, HOLE.x1 + 0.04, TOP + 0.3, HOLE.z1 + 0.04, { nx: 'wood' }, 0.6);
    W.emitBox(HOLE.x0, TOP, HOLE.z0 - 0.04, HOLE.x1, TOP + 0.3, HOLE.z0, { pz: 'wood' }, 0.6);
    W.emitBox(HOLE.x0, TOP, HOLE.z1, HOLE.x1, TOP + 0.3, HOLE.z1 + 0.04, { nz: 'wood' }, 0.6);

    // ---- the foundation (its inside faces), with the vent cut in the north wall ----------------------
    W.emitBox(X0 - T, 0, -T, VENT.x0, TOP, 0, { pz: 'block' }, 0.8);
    W.emitBox(VENT.x1, 0, -T, X1 + T, TOP, 0, { pz: 'block' }, 0.8);
    W.emitBox(VENT.x0, 0, -T, VENT.x1, VENT.y0, 0, { pz: 'block' }, 0.8);
    W.emitBox(VENT.x0, VENT.y1, -T, VENT.x1, TOP, 0, { pz: 'block' }, 0.8);
    // the vent's own depth, through the wall
    W.emitBox(VENT.x0 - 0.02, VENT.y0, -T, VENT.x0, VENT.y1, 0, { px: 'metal' }, 0.4);
    W.emitBox(VENT.x1, VENT.y0, -T, VENT.x1 + 0.02, VENT.y1, 0, { nx: 'metal' }, 0.4);
    W.emitBox(VENT.x0, VENT.y0 - 0.02, -T, VENT.x1, VENT.y0, 0, { py: 'metal' }, 0.4);
    W.emitBox(VENT.x0, VENT.y1, -T, VENT.x1, VENT.y1 + 0.02, 0, { ny: 'metal' }, 0.4);
    solid(X0 - T, -T, X1 + T, 0);
    W.emitBox(X1, 0, 0, X1 + T, TOP, 8, { nx: 'block' }, 0.8);
    solid(X1, 0, X1 + T, 8);
    W.emitBox(XS, 0, 8, X1 + T, TOP, 8 + T, { nz: 'block' }, 0.8);
    solid(XS, 8, X1 + T, 8 + T);
    W.emitBox(XS, 0, 8 + T, XS + T, TOP, 24, { nx: 'block' }, 0.8);
    solid(XS, 8 + T, XS + T, 24);
    W.emitBox(X0 - T, 0, 24, XS + T, TOP, 24 + T, { nz: 'block' }, 0.8);
    solid(X0 - T, 24, XS + T, 24 + T);
    W.emitBox(X0 - T, 0, 0, X0, TOP, 24, { px: 'block' }, 0.8);
    solid(X0 - T, 0, X0, 24);
    // a stem wall under the wall between the laundry room and the guest room, with one way through:
    // you cannot see the nest from the hatch
    W.emitBox(X0, 0, 12.9, X0 + 3.6, TOP, 13.1, { pz: 'block', nz: 'block', px: 'block' }, 0.8);
    solid(X0, 12.9, X0 + 3.6, 13.1);
    W.emitBox(X0 + 4.5, 0, 12.9, X0 + 6.3, TOP, 13.1, { pz: 'block', nz: 'block', nx: 'block' }, 0.8);
    solid(X0 + 4.5, 12.9, X0 + 6.3, 13.1);

    // ---- girders on piers, and the joists across them ----------------------------------------------
    W.emitBox(X0, 0.62, 3.9, X1, 0.8, 4.1, { pz: 'wood', nz: 'wood', ny: 'wood' }, 0.9);
    W.emitBox(X0 + 6.4, 0.62, 8, X0 + 6.6, 0.8, 24, { px: 'wood', nx: 'wood', ny: 'wood' }, 0.9);
    var piers = [];
    for (var px = 3.25; px < 25; px += 3.25) piers.push([X0 + px, 4]);
    [11, 14.2, 17.4, 20.6].forEach(function (pz) { piers.push([X0 + 6.5, pz]); });
    [[X0 + 9.8, 16], [X0 + 9.8, 21], [X0 + 3.2, 20.5], [X0 + 19.5, 6.6], [X0 + 10, 1.6]].forEach(function (p) { piers.push(p); });
    piers.forEach(function (p) {
      W.emitBox(p[0] - 0.2, 0, p[1] - 0.2, p[0] + 0.2, 0.62, p[1] + 0.2, { px: 'block', nx: 'block', pz: 'block', nz: 'block' }, 0.8);
      solid(p[0] - 0.2, p[1] - 0.2, p[0] + 0.2, p[1] + 0.2, 0.62, 'pier');
    });
    for (var jx = 0.4; jx < 26; jx += 0.8) {
      W.emitBox(X0 + jx - 0.035, 0.8, 0, X0 + jx + 0.035, TOP, 8, { px: 'wood', nx: 'wood', ny: 'wood' }, 0.9);
    }
    for (var jz = 8.4; jz < 24; jz += 0.8) {
      if (jz > HOLE.z0 - 0.1 && jz < HOLE.z1 + 0.1) {
        // headered off around the hatch
        W.emitBox(X0, 0.8, jz - 0.035, HOLE.x0 - 0.04, TOP, jz + 0.035, { pz: 'wood', nz: 'wood', ny: 'wood' }, 0.9);
        W.emitBox(HOLE.x1 + 0.04, 0.8, jz - 0.035, XS, TOP, jz + 0.035, { pz: 'wood', nz: 'wood', ny: 'wood' }, 0.9);
      } else W.emitBox(X0, 0.8, jz - 0.035, XS, TOP, jz + 0.035, { pz: 'wood', nz: 'wood', ny: 'wood' }, 0.9);
    }

    // ---- insulation: tucked up between the joists in places, hanging down in others -----------------
    for (var i = 0; i < 46; i++) {
      var south = rnd() < 0.42;
      var a = south ? X0 + 0.3 + rnd() * 11.5 : X0 + 0.5 + Math.floor(rnd() * 31) * 0.8 + 0.08;
      var b = south ? 8.5 + Math.floor(rnd() * 19) * 0.8 + 0.08 : 0.3 + rnd() * 6;
      var len = 1 + rnd() * 1.6;
      if (south) {
        if (a < HOLE.x1 + 0.3 && a + len > HOLE.x0 - 0.3 && b < HOLE.z1 + 0.2 && b + 0.64 > HOLE.z0 - 0.2) continue;
        W.emitBox(a, 0.86, b, a + len, TOP - 0.005, b + 0.64, { ny: 'insulation', px: 'insulation', nx: 'insulation' }, 0.7);
      } else W.emitBox(a, 0.86, b, a + 0.64, TOP - 0.005, b + len, { ny: 'insulation', pz: 'insulation', nz: 'insulation' }, 0.7);
    }
    // sheets of it hanging down to crawl past (no collision: it brushes over you)
    [[X0 + 3.9, 11.6, 0], [X0 + 5.2, 14.3, 1], [X0 + 2.6, 13.9, 0], [X0 + 8.3, 9.6, 1], [X0 + 4.6, 6.2, 0], [X0 + 7.4, 3.0, 1], [X0 + 12.6, 5.1, 0], [X0 + 3.3, 18.3, 1], [X0 + 16.0, 2.2, 0]].forEach(function (s) {
      var low = 0.3 + rnd() * 0.25;
      if (s[2]) W.emitBox(s[0], low, s[1], s[0] + 0.03, 0.9, s[1] + 0.62, { px: 'insulation', nx: 'insulation' }, 0.7);
      else W.emitBox(s[0], low, s[1], s[0] + 0.62, 0.9, s[1] + 0.03, { pz: 'insulation', nz: 'insulation' }, 0.7);
    });

    // ---- pipes and a duct --------------------------------------------------------------------------
    // the drains come down from the kitchen sink, the laundry sink and the bathroom
    [[X0 + 9.0, 0.5], [X0 + 1.55, 8.4], [X0 + 4.35, 20.45], [X0 + 3.95, 23.6]].forEach(function (p) {
      W.emitBox(p[0] - 0.06, 0, p[1] - 0.06, p[0] + 0.06, TOP, p[1] + 0.06, { px: 'metal', nx: 'metal', pz: 'metal', nz: 'metal' }, 0.5);
      solid(p[0] - 0.06, p[1] - 0.06, p[0] + 0.06, p[1] + 0.06, TOP, 'pipe');
    });
    W.emitBox(X0 + 1.5, 0.7, 8.4, X0 + 9.0, 0.78, 8.48, { pz: 'metal', nz: 'metal', ny: 'metal', py: 'metal' }, 0.5);
    W.emitBox(X0 + 8.96, 0.7, 0.5, X0 + 9.04, 0.78, 8.48, { px: 'metal', nx: 'metal', ny: 'metal' }, 0.5);
    // the furnace duct along the north wing, low enough that you go under it on your face
    W.emitBox(X0 + 7.6, 0.5, 5.6, X0 + 24.5, 0.8, 6.1, { pz: 'appliance', nz: 'appliance', ny: 'appliance' }, 1.2);
    W.emitBox(X0 + 7.6, 0.5, 5.6, X0 + 7.62, 0.8, 6.1, { nx: 'appliance' }, 1.2);

    // ---- his nest, under the guest bed: the parts that never move -----------------------------------
    var N = NEST;
    // soup. Whole cans of it, stacked neat, labels out
    if (OC.models && OC.models.has('food-can')) {
      [[0, 0, 0], [0.085, 0, 0], [0.17, 0, 0], [0.255, 0, 0], [0.0425, 0.11, 0], [0.1275, 0.11, 0], [0.2125, 0.11, 0], [0.085, 0.22, 0]].forEach(function (c) {
        OC.models.at('food-can', { x: N.x + 0.55 + c[0], y: c[1], z: N.z + 1.05, height: 0.11 });
      });
      [[0.9, 0.55, 1.2], [1.05, 0.7, 0.4], [0.95, 0.4, 2.2]].forEach(function (c) {
        OC.models.at('food-can', { x: N.x + c[0], y: 0.03, z: N.z + c[1], height: 0.11, rotY: c[2] });
      });
    }
  }

  // ---- the things that change (made once; the act shows and hides them) ----------------------------
  function create(world, scene) {
    var N = NEST;
    function lit(color) {
      return new THREE.MeshPhongMaterial({ color: color, specular: 0x000000 });
    }
    function glow(color) {
      return new THREE.MeshBasicMaterial({ color: color });
    }
    function mesh(geo, m, x, y, z, parent) {
      var o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      (parent || scene).add(o);
      return o;
    }
    function canvasTex(w, h, draw, smooth) {
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      draw(c.getContext('2d'));
      var t = new THREE.CanvasTexture(c);
      t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
      return t;
    }

    // what you see looking up the hatch: the laundry room's light
    var sky = mesh(new THREE.PlaneGeometry(0.9, 0.9), glow(0xd9cdb4), HATCH.x, TOP + 0.3, HATCH.z);
    sky.rotation.x = Math.PI / 2;
    // the padlock on the dirt under the hatch, open, Dave's key still in it
    var lock = new THREE.Group();
    lock.position.set(HATCH.x + 0.5, 0, HATCH.z + 0.75);
    lock.rotation.y = 0.7;
    scene.add(lock);
    mesh(new THREE.BoxGeometry(0.09, 0.03, 0.07), lit(0x8b8d92), 0, 0.015, 0, lock);
    mesh(new THREE.TorusGeometry(0.035, 0.008, 4, 8, Math.PI), lit(0x9fa1a6), 0.02, 0.02, -0.05, lock).rotation.x = -Math.PI / 2;
    mesh(new THREE.BoxGeometry(0.012, 0.012, 0.05), lit(0xc9a94a), -0.02, 0.022, 0.055, lock);

    // what is outside the vent: the night, and the back of the porch bush
    var ventMat = glow(0x0d131c);
    mesh(new THREE.PlaneGeometry(0.8, 0.38), ventMat, (VENT.x0 + VENT.x1) / 2, (VENT.y0 + VENT.y1) / 2, -T - 0.01);
    var leaf = glow(0x0a120b);
    [[0.12, 0.2, 0.3, 0.2], [0.5, 0.26, 0.34, 0.22], [0.32, 0.12, 0.26, 0.12]].forEach(function (l) {
      mesh(new THREE.PlaneGeometry(l[2], l[3]), leaf, VENT.x0 + l[0] + l[2] / 2 - 0.1, VENT.y0 + l[1], -T);
    });
    // the screen he took off, leaning inside
    var screenMat = new THREE.MeshPhongMaterial({ color: 0x6f7378, specular: 0x000000, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    var screen = mesh(new THREE.PlaneGeometry(0.84, 0.42), screenMat, VENT.x1 + 0.55, 0.2, 0.12);
    screen.rotation.x = -0.35;

    // ---- the nest ----------------------------------------------------------------------------------
    var nest = new THREE.Group();
    nest.position.set(N.x, 0, N.z);
    scene.add(nest);
    var bag = lit(0x3f4a36);
    mesh(new THREE.BoxGeometry(0.66, 0.07, 1.85), bag, -0.05, 0.035, 0.05, nest);
    mesh(new THREE.BoxGeometry(0.62, 0.05, 0.9), lit(0x4a573f), -0.05, 0.09, 0.45, nest).rotation.z = 0.04; // the flap, folded back neat
    mesh(new THREE.BoxGeometry(0.5, 0.1, 0.3), lit(0x1c2233), -0.05, 0.11, -0.7, nest); // a second hoodie, rolled up, for a pillow
    // the moon night light from his old room, on a battery
    var moonTex = canvasTex(32, 32, function (g) {
      g.fillStyle = '#000';
      g.fillRect(0, 0, 32, 32);
      g.fillStyle = '#ffe9a8';
      g.beginPath();
      g.arc(16, 16, 12, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(22, 13, 11, 0, Math.PI * 2);
      g.fill();
    });
    var moon = mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0.62, 0.13, -0.72, nest);
    moon.rotation.y = -0.5;
    mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), lit(0xcfcabd), 0.62, 0.025, -0.74, nest);
    // Dave's blue Tupperware, empty, washed, its lid beside it
    var blue = lit(0x2f5fa8);
    mesh(new THREE.BoxGeometry(0.24, 0.07, 0.17), blue, 0.6, 0.035, -0.1, nest).rotation.y = 0.3;
    mesh(new THREE.BoxGeometry(0.25, 0.012, 0.18), lit(0x3b70c0), 0.62, 0.006, 0.18, nest).rotation.y = -0.2;
    // wrappers, flattened and stacked, not thrown
    [[0xb8322a, 0], [0xd8a02a, 0.012], [0x2f7a4a, 0.024], [0xb8322a, 0.036], [0xe8e2d0, 0.048]].forEach(function (w, i) {
      mesh(new THREE.BoxGeometry(0.16, 0.01, 0.1), lit(w[0]), 0.56 + (i % 2) * 0.004, 0.005 + w[1], 0.5, nest);
    });
    // a sandwich bag of kibble
    mesh(new THREE.BoxGeometry(0.14, 0.05, 0.12), new THREE.MeshPhongMaterial({ color: 0x9a7448, specular: 0x333333, transparent: true, opacity: 0.85 }), -0.52, 0.025, 0.85, nest);
    // the family photo, propped on a brick: a dad, a mom, a boy, and the dad's face scratched out
    var photoTex = canvasTex(48, 36, function (g) {
      g.fillStyle = '#c9c0a6';
      g.fillRect(0, 0, 48, 36);
      g.fillStyle = '#8fa3b5';
      g.fillRect(2, 2, 44, 18);
      g.fillStyle = '#6f7d4f';
      g.fillRect(2, 20, 44, 14);
      g.fillStyle = '#7a7468';
      g.fillRect(6, 6, 22, 14); // the house
      g.fillStyle = '#3a3f52';
      g.fillRect(12, 14, 6, 14); // dad
      g.fillStyle = '#7d4a52';
      g.fillRect(22, 17, 6, 11); // mom
      g.fillStyle = '#26324f';
      g.fillRect(31, 21, 4, 7); // the boy
      g.fillStyle = '#d9b08c';
      g.fillRect(23, 13, 4, 4);
      g.fillRect(31, 17, 4, 4);
      g.fillStyle = '#e9e4d6'; // scratched down to the paper, hard, many times
      g.fillRect(12, 9, 6, 6);
      g.strokeStyle = '#8a8370';
      g.beginPath();
      g.moveTo(11, 9);
      g.lineTo(19, 15);
      g.moveTo(19, 9);
      g.lineTo(11, 15);
      g.moveTo(11, 12);
      g.lineTo(19, 12);
      g.stroke();
    });
    var frame = new THREE.Group();
    frame.position.set(-0.55, 0.11, -0.35);
    frame.rotation.set(-0.3, 0.9, 0);
    nest.add(frame);
    mesh(new THREE.BoxGeometry(0.24, 0.19, 0.012), lit(0x3c2a1a), 0, 0, 0, frame);
    mesh(new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshPhongMaterial({ map: photoTex, specular: 0x000000 }), 0, 0, 0.007, frame);
    // 46 marks scratched into the block beside where his head goes
    var tallyTex = canvasTex(160, 64, function (g) {
      g.clearRect(0, 0, 160, 64);
      g.strokeStyle = 'rgba(214,208,196,0.9)';
      g.lineWidth = 1.5;
      for (var i = 0; i < 46; i++) {
        var group = Math.floor(i / 5);
        var k = i % 5;
        var gx = 8 + (group % 5) * 30;
        var gy = 6 + Math.floor(group / 5) * 30;
        g.beginPath();
        if (k < 4) {
          g.moveTo(gx + k * 5 + (i % 3) - 1, gy);
          g.lineTo(gx + k * 5, gy + 20 + (i % 2));
        } else {
          g.moveTo(gx - 3, gy + 15);
          g.lineTo(gx + 19, gy + 4);
        }
        g.stroke();
      }
    }, true);
    var tally = mesh(new THREE.PlaneGeometry(1.1, 0.44), new THREE.MeshPhongMaterial({ map: tallyTex, transparent: true, specular: 0x000000, depthWrite: false }), DX + 0.012, 0.52, N.z - 0.2);
    tally.rotation.y = Math.PI / 2;
    // the notebook, on the sleeping bag, squared to its edge, a pencil on top
    var book = new THREE.Group();
    book.position.set(-0.08, 0.125, -0.2);
    book.rotation.y = 0.0;
    nest.add(book);
    var coverTex = canvasTex(32, 40, function (g) {
      g.fillStyle = '#16161a';
      g.fillRect(0, 0, 32, 40);
      for (var i = 0; i < 90; i++) {
        g.fillStyle = 'rgba(235,235,235,0.75)';
        g.fillRect((Math.random() * 32) | 0, (Math.random() * 40) | 0, 1 + ((Math.random() * 2) | 0), 1);
      }
      g.fillStyle = '#e8e2d0';
      g.fillRect(6, 12, 20, 12);
      g.fillStyle = '#16161a';
      g.font = '7px monospace';
      g.fillText('MASON', 6, 21);
    });
    var cov = lit(0x16161a);
    mesh(new THREE.BoxGeometry(0.19, 0.022, 0.25), [cov, cov, new THREE.MeshPhongMaterial({ map: coverTex, specular: 0x000000 }), cov, lit(0xe0dccf), cov], 0, 0, 0, book);
    mesh(new THREE.BoxGeometry(0.008, 0.008, 0.16), lit(0xc9a02a), 0.03, 0.016, 0.01, book).rotation.y = 0.5;

    // ---- dust: motes in the light, and what comes down when someone sits on the floor above ---------
    var MOTES = 110;
    var mpos = new Float32Array(MOTES * 3);
    var mvel = [];
    for (var i = 0; i < MOTES; i++) {
      mpos[i * 3 + 1] = -10;
      mvel.push({ x: (Math.random() - 0.5) * 0.04, y: (Math.random() - 0.5) * 0.02, z: (Math.random() - 0.5) * 0.04 });
    }
    var mgeo = new THREE.BufferGeometry();
    mgeo.setAttribute('position', new THREE.BufferAttribute(mpos, 3));
    var mmat = new THREE.PointsMaterial({ color: 0xd8cfb8, size: 0.012, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    var motes = new THREE.Points(mgeo, mmat);
    motes.frustumCulled = false;
    motes.visible = false;
    scene.add(motes);
    var FALL = 90;
    var fpos = new Float32Array(FALL * 3);
    var fvel = new Float32Array(FALL);
    for (var j = 0; j < FALL; j++) fpos[j * 3 + 1] = -10;
    var fgeo = new THREE.BufferGeometry();
    fgeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    var fmat = new THREE.PointsMaterial({ color: 0xb8ab90, size: 0.02, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
    var falling = new THREE.Points(fgeo, fmat);
    falling.frustumCulled = false;
    falling.visible = false;
    scene.add(falling);
    var fallT = 0;

    // the lights it borrows while Mason is down there, and where they go back to
    var HOME = {};
    (OC.house.lights || []).forEach(function (l) { HOME[l.id] = l; });
    function borrow(id, x, y, z, intensity, distance) {
      var l = world.lightById[id];
      if (!l) return;
      l.position.set(x, y, z);
      l.intensity = intensity;
      l.distance = distance;
    }

    var api = {
      book: book,
      at: {
        climb: { x: HATCH.x, y: 0.8, z: HATCH.z },
        padlock: { x: HATCH.x + 0.5, y: 0.04, z: HATCH.z + 0.75 },
        vent: { x: (VENT.x0 + VENT.x1) / 2, y: 0.29, z: 0.02 },
        notebook: { x: N.x - 0.08, y: 0.14, z: N.z - 0.2 },
        photo: { x: N.x - 0.55, y: 0.13, z: N.z - 0.35 },
        tally: { x: DX + 0.04, y: 0.5, z: N.z - 0.2 },
        soup: { x: N.x + 0.68, y: 0.14, z: N.z + 1.05 },
        tupperware: { x: N.x + 0.6, y: 0.06, z: N.z - 0.1 },
        kibble: { x: N.x - 0.52, y: 0.05, z: N.z + 0.85 },
        up: { x: N.x - 0.05, y: 0.94, z: N.z + 0.3 },
        moon: { x: N.x + 0.62, y: 0.13, z: N.z - 0.72 },
      },
      showNotebook: function (v) {
        book.visible = !!v;
      },
      // lightning seen through the vent, 0..1
      ventGlow: function (v) {
        ventMat.color.setRGB(0.05 + 0.75 * v, 0.075 + 0.78 * v, 0.11 + 0.8 * v);
      },
      // move the borrowed lights under the house (the hatch's light, his night light, the vent), or home
      lights: function (on) {
        if (on) {
          borrow('laundry', HATCH.x, 0.85, HATCH.z, 0.85, 4.5);
          borrow('guest', N.x + 0.62, 0.22, N.z - 0.6, 0.75, 3.6);
          borrow('yard', (VENT.x0 + VENT.x1) / 2, 0.3, 0.5, 0.3, 3.5);
        } else {
          ['laundry', 'guest', 'yard'].forEach(function (id) {
            var h = HOME[id];
            var l = world.lightById[id];
            if (!h || !l) return;
            l.position.set(h.x, h.y, h.z);
            l.distance = h.distance;
          });
        }
        motes.visible = !!on;
      },
      // dust shaken out of the floor above (x, z), drifting down
      dustFall: function (x, z) {
        for (var i = 0; i < FALL; i++) {
          var a = Math.random() * Math.PI * 2;
          var d = Math.sqrt(Math.random()) * 0.75;
          fpos[i * 3] = x + Math.cos(a) * d;
          fpos[i * 3 + 1] = TOP - 0.02 - Math.random() * 0.04;
          fpos[i * 3 + 2] = z + Math.sin(a) * d;
          fvel[i] = 0.12 + Math.random() * 0.3;
        }
        fallT = 4.5;
        falling.visible = true;
        fgeo.attributes.position.needsUpdate = true;
      },
      update: function (dt, cam, lightOn) {
        if (motes.visible) {
          var fx = -Math.sin(cam.yaw);
          var fz = -Math.cos(cam.yaw);
          for (var i = 0; i < MOTES; i++) {
            var o = i * 3;
            mpos[o] += mvel[i].x * dt;
            mpos[o + 1] += mvel[i].y * dt;
            mpos[o + 2] += mvel[i].z * dt;
            var dx = mpos[o] - cam.x;
            var dz = mpos[o + 2] - cam.z;
            if (mpos[o + 1] < 0.03 || mpos[o + 1] > 0.92 || dx * dx + dz * dz > 9 || dx * fx + dz * fz < -0.4) {
              // put it back somewhere in front, in the beam
              var dist = 0.4 + Math.random() * 2.4;
              var side = (Math.random() - 0.5) * dist * 0.9;
              mpos[o] = cam.x + fx * dist - fz * side;
              mpos[o + 2] = cam.z + fz * dist + fx * side;
              mpos[o + 1] = 0.06 + Math.random() * 0.8;
            }
          }
          mgeo.attributes.position.needsUpdate = true;
          mmat.opacity += ((lightOn ? 0.55 : 0.03) - mmat.opacity) * Math.min(1, dt * 6);
        }
        if (fallT > 0) {
          fallT = Math.max(0, fallT - dt);
          for (var k = 0; k < FALL; k++) {
            fpos[k * 3 + 1] = Math.max(0.01, fpos[k * 3 + 1] - fvel[k] * dt);
            fpos[k * 3] += (Math.random() - 0.5) * 0.01;
          }
          fgeo.attributes.position.needsUpdate = true;
          fmat.opacity = Math.min(0.8, fallT / 1.5);
          if (fallT === 0) falling.visible = false;
        }
      },
    };
    return api;
  }

  OC.crawl = {
    DX: DX,
    TOP: TOP,
    HATCH: HATCH,
    NEST: NEST,
    VENT: VENT,
    ENTRY: { x: HATCH.x, z: HATCH.z + 0.1, yaw: Math.PI }, // dropped in under the hatch, facing south
    build: build,
    create: create,
    // is this point under the house?
    contains: function (x, z) {
      return x > DX - 1 && x < DX + 27 && z > -1 && z < 25;
    },
  };
})();
