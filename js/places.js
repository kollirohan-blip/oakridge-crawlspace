// The places Day 2 goes, built far from the house where nobody can see them from it: the road to town
// (a long two-lane through the woods, driven at dusk) and the Gas-N-Go (a lot, a pump, a little shop
// with two aisles, coolers, a counter and a bulletin board). Reached by fades. The road and the shop
// borrow the yard and porch lights while Mason is there, so the game never pays for extra lights.
(function () {
  var OC = (window.OC = window.OC || {});
  var ROAD_X = 300; // the road runs along z at this x
  var ROAD_Z0 = -380;
  var ROAD_Z1 = 380;
  var SHOP = { x0: 394, x1: 406, z0: 0, z1: 8 }; // the Gas-N-Go, its door on the north side (z 0)

  function build(world) {
    var W = world;
    var solid = function (b, kind) {
      W.boxes.push({ x0: b[0], y0: b[1], z0: b[2], x1: b[3], y1: b[4], z1: b[5], kind: kind || 'furniture' });
    };
    var box = function (b, tex, isSolid) {
      W.box(b[0], b[1], b[2], b[3], b[4], b[5], tex);
      if (isSolid) solid(b);
    };
    var fit = function (model, b, rot) {
      if (OC.models && OC.models.has(model)) OC.models.fit(model, b, rot);
    };
    var seed = 4242;
    function rnd() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }

    // ---- the road ------------------------------------------------------------------------------
    W.emitBox(ROAD_X - 60, -0.04, ROAD_Z0 - 20, ROAD_X + 60, -0.02, ROAD_Z1 + 20, { py: 'grass' }, 2);
    W.emitBox(ROAD_X - 4, -0.02, ROAD_Z0, ROAD_X + 4, 0.0, ROAD_Z1, { py: 'asphalt' }, 3);
    for (var z = ROAD_Z0; z < ROAD_Z1; z += 7) W.emitBox(ROAD_X - 0.06, 0.0, z, ROAD_X + 0.06, 0.004, z + 3, { py: 'stripe' }, 1);
    var PINES = ['tree_pineTallA', 'tree_pineTallB', 'tree_pineTallC', 'tree_pineRoundA', 'tree_pineDefaultA', 'tree_detailed_dark'];
    if (OC.models && OC.models.has(PINES[0])) {
      for (var tz = ROAD_Z0; tz < ROAD_Z1; tz += 7 + rnd() * 5) {
        [-1, 1].forEach(function (side) {
          var dx = 8 + rnd() * 9;
          OC.models.at(PINES[Math.floor(rnd() * PINES.length)], { x: ROAD_X + side * dx, z: tz + rnd() * 4, rotY: rnd() * 6.28, height: 7 + rnd() * 6 });
          if (rnd() < 0.5) OC.models.at(PINES[Math.floor(rnd() * PINES.length)], { x: ROAD_X + side * (dx + 6 + rnd() * 8), z: tz + rnd() * 6, rotY: rnd() * 6.28, height: 8 + rnd() * 5 });
        });
      }
    }
    // a mile marker and a rusted road sign
    box([ROAD_X + 5.2, 0, -120, ROAD_X + 5.3, 1.0, -119.9], 'metal');
    box([ROAD_X + 5.0, 1.0, -120.05, ROAD_X + 5.5, 1.3, -119.85], 'plain');

    // ---- the Gas-N-Go ---------------------------------------------------------------------------
    var S = SHOP;
    W.emitBox(S.x0 - 14, -0.03, S.z0 - 18, S.x1 + 14, -0.01, S.z1 + 10, { py: 'grass' }, 2);
    W.emitBox(S.x0 - 8, -0.01, S.z0 - 16, S.x1 + 8, 0.01, S.z0, { py: 'asphalt' }, 3); // the lot
    var H = 3.0;
    var T = 0.15;
    // walls (the north wall has the door at x 399.2..400.8 and two windows)
    box([S.x0, 0, S.z0, 399.2, 0.9, S.z0 + T], 'siding', true);
    box([400.8, 0, S.z0, S.x1, 0.9, S.z0 + T], 'siding', true);
    box([S.x0, 2.3, S.z0, S.x1, H, S.z0 + T], 'siding');
    box([S.x0, 0.9, S.z0, 395.2, 2.3, S.z0 + T], 'siding', true);
    box([398.6, 0.9, S.z0, 399.2, 2.3, S.z0 + T], 'siding', true);
    box([400.8, 0.9, S.z0, 401.4, 2.3, S.z0 + T], 'siding', true);
    box([404.8, 0.9, S.z0, S.x1, 2.3, S.z0 + T], 'siding', true);
    solid([395.2, 0.9, S.z0, 398.6, 2.3, S.z0 + T], 'glass');
    solid([401.4, 0.9, S.z0, 404.8, 2.3, S.z0 + T], 'glass');
    box([S.x0, 0, S.z1 - T, S.x1, H, S.z1], 'siding', true);
    box([S.x0, 0, S.z0, S.x0 + T, H, S.z1], 'siding', true);
    box([S.x1 - T, 0, S.z0, S.x1, H, S.z1], 'siding', true);
    W.emitBox(S.x0 + T, 0.0, S.z0 + T, S.x1 - T, 0.02, S.z1 - T, { py: 'shopfloor' }, 1);
    W.emitBox(S.x0 + T, H - 0.03, S.z0 + T, S.x1 - T, H, S.z1 - T, { ny: 'ceiling' }, 2);
    W.emitBox(S.x0 - 0.3, H, S.z0 - 0.3, S.x1 + 0.3, H + 0.25, S.z1 + 0.3, { py: 'shingle', px: 'shingle', nx: 'shingle', pz: 'shingle', nz: 'shingle' }, 2);
    // inside walls face in: the siding texture faces out; paint the inside faces
    W.emitBox(S.x0 + T, 0, S.z1 - T - 0.01, S.x1 - T, H, S.z1 - T, { nz: 'paintCream' }, 2.4);
    W.emitBox(S.x0 + T, 0, S.z0 + T, S.x0 + T + 0.01, H, S.z1 - T, { px: 'paintCream' }, 2.4);
    W.emitBox(S.x1 - T - 0.01, 0, S.z0 + T, S.x1 - T, H, S.z1 - T, { nx: 'paintCream' }, 2.4);
    // the north wall's inside, painted, around the door and the two windows
    [[S.x0 + T, 0, 399.2, 0.9], [400.8, 0, S.x1 - T, 0.9], [S.x0 + T, 2.3, S.x1 - T, H], [S.x0 + T, 0.9, 395.2, 2.3], [398.6, 0.9, 399.2, 2.3], [400.8, 0.9, 401.4, 2.3], [404.8, 0.9, S.x1 - T, 2.3]].forEach(function (p) {
      W.emitBox(p[0], p[1], S.z0 + T, p[2], p[3], S.z0 + T + 0.01, { pz: 'paintCream' }, 2.4);
    });
    // two gondola shelves (shelves both sides of a back panel), the coolers along the back, the counter
    var SHELF_Y = [0.12, 0.55, 0.98];
    [396.4, 399.4].forEach(function (x) {
      solid([x, 0, 2.4, x + 1.0, 1.6, 6.4]);
      box([x, 0, 2.4, x + 1.0, 0.12, 6.4], 'metal');
      box([x + 0.47, 0.12, 2.4, x + 0.53, 1.6, 6.4], 'metal');
      SHELF_Y.slice(1).concat([1.41]).forEach(function (y) { box([x, y - 0.03, 2.4, x + 1.0, y, 6.4], 'metal'); });
      box([x, 0, 2.36, x + 1.0, 1.6, 2.4], 'plain');
      box([x, 0, 6.4, x + 1.0, 1.6, 6.44], 'plain');
    });
    [[395.0, 397.0], [397.0, 399.0], [401.0, 403.0]].forEach(function (c) {
      fit('kitchenFridgeLarge', [c[0], 0, 7.2, c[1], 2.1, 7.85], 2);
      solid([c[0], 0, 7.2, c[1], 2.1, 7.85]);
    });
    // the counter, the register, and the rack of smokes and scratch tickets behind it
    box([402.4, 0, 1.0, 405.4, 0.92, 1.7], 'cabinet', true);
    box([402.35, 0.92, 0.95, 405.45, 0.97, 1.75], 'counter');
    box([404.5, 0.97, 1.15, 405.1, 1.25, 1.55], 'black');
    box([402.6, 1.0, S.z0 + T, 405.2, 2.0, S.z0 + T + 0.25], 'cabinet');
    // groceries, standing on the shelves at their real proportions (the ones Mason can buy are items)
    var GROCERIES = [['food-can', 0.13], ['food-carton-small', 0.2], ['food-soda-bottle', 0.3], ['food-candy-bar', 0.05], ['food-bag', 0.24], ['food-bottle-ketchup', 0.22], ['food-pizza-box', 0.06]];
    if (OC.models && OC.models.has('food-can')) {
      [396.4, 399.4].forEach(function (x) {
        SHELF_Y.forEach(function (y) {
          [x + 0.2, x + 0.8].forEach(function (gx) {
            var kind = GROCERIES[Math.floor(rnd() * GROCERIES.length)];
            for (var gz = 2.6; gz < 6.25; gz += 0.24) {
              if (rnd() < 0.12) continue; // somebody bought one
              if (rnd() < 0.3) kind = GROCERIES[Math.floor(rnd() * GROCERIES.length)];
              OC.models.at(kind[0], { x: gx + (rnd() - 0.5) * 0.06, y: y, z: gz, rotY: gx < x + 0.5 ? -Math.PI / 2 : Math.PI / 2, height: kind[1] });
            }
          });
        });
      });
    }
    // the bulletin board on the west wall, near the door
    box([S.x0 + T, 1.0, 1.0, S.x0 + T + 0.03, 1.9, 2.8], 'cork');
    [[1.15, 1.55, 1.45, 1.85], [1.6, 1.15, 1.95, 1.5], [2.1, 1.5, 2.6, 1.85], [2.2, 1.1, 2.6, 1.4]].forEach(function (p) {
      W.emitBox(S.x0 + T + 0.03, p[1], p[0], S.x0 + T + 0.035, p[3], p[2], { px: 'sticky' }, 0.4);
    });
    // the pump and its canopy, and the sign
    box([399.6, 0, -8.4, 400.4, 1.6, -7.6], 'appliance', true);
    box([394, 3.6, -11, 406, 3.8, -5], 'plain');
    [[394.2, -10.8], [405.6, -10.8], [394.2, -5.4], [405.6, -5.4]].forEach(function (p) { box([p[0], 0, p[1], p[0] + 0.2, 3.6, p[1] + 0.2], 'metal', true); });
    box([391.9, 0, -2.1, 392.1, 3.2, -1.9], 'metal');
    fit('car-truck', [386, 0, -12, 388.4, 1.9, -7], 0); // somebody's truck, nobody in it
  }

  // the sign is a canvas: GAS-N-GO, one letter out
  function buildSign(scene) {
    var c = document.createElement('canvas');
    c.width = 64;
    c.height = 24;
    var g = c.getContext('2d');
    g.fillStyle = '#1d2a4a';
    g.fillRect(0, 0, 64, 24);
    g.fillStyle = '#e8d35a';
    g.font = 'bold 11px monospace';
    g.fillText('GAS-N-GO', 3, 12);
    g.fillStyle = '#c9cdd6';
    g.font = '6px monospace';
    g.fillText('OPEN TIL 9', 14, 21);
    var t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    var m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    m.position.set(392, 3.5, -2);
    m.rotation.y = Math.PI / 2;
    scene.add(m);
  }

  OC.places = {
    ROAD_X: ROAD_X,
    ROAD_Z0: ROAD_Z0,
    ROAD_Z1: ROAD_Z1,
    SHOP: SHOP,
    build: function (world) {
      build(world);
      buildSign(world.group);
    },
    // borrow the porch and yard lights for the road or the shop; 'home' puts them back
    lightsAt: function (world, where) {
      var porch = world.lightById.porch;
      var yard = world.lightById.yard;
      if (where === 'shop') {
        porch.position.set(400, 2.8, 4);
        porch.distance = 16;
        yard.position.set(400, 3.3, -8);
        yard.distance = 14;
      } else {
        porch.position.set(2.5, 2.2, -1.4);
        porch.distance = 11;
        yard.position.set(8.5, 4.5, -9.5);
        yard.distance = 16;
      }
    },
  };
})();
