// Night one's props: the things the routine is made of. Static parts (sticky notes, magnets, burners)
// go into the world's batched meshes; the few that move or change are small meshes of their own:
// the oven and kettle lights, the microwave window, the plate, the pan Cooper knocks off the counter,
// the trash bag, the ball, the singing fish and the light out in the trees.
(function () {
  var OC = (window.OC = window.OC || {});

  var FOOD_COLORS = { lasagna: 0xb5452a, pizza: 0xd9a63a, mac: 0xe0b23c, cereal: 0xb89a62, tupperware: 0x3c6fb8 };
  var BALL_HOME = { x: 22.0, z: 5.0 };
  var BALL_R = 0.06;

  function build(world, props, house) {
    var scene = world.group;
    var mat = world.material;

    function mesh(geo, material, x, y, z, parent) {
      var m = new THREE.Mesh(geo, material);
      m.position.set(x, y, z);
      (parent || scene).add(m);
      return m;
    }
    function basic(color, extra) {
      return new THREE.MeshBasicMaterial(Object.assign({ color: color }, extra || {}));
    }

    // ---- static: sticky notes, magnets, burners ---------------------------------------------------
    var S = 0.045; // half a sticky note
    var D = 0.003;
    (house.stickies || []).forEach(function (n) {
      var f = {};
      f[n.face] = 'sticky';
      if (n.face === 'pz' || n.face === 'nz') world.emitBox(n.x - S, n.y - S, n.z - D, n.x + S, n.y + S, n.z + D, f, 0.09);
      else world.emitBox(n.x - D, n.y - S, n.z - S, n.x + D, n.y + S, n.z + S, f, 0.09);
    });
    [[12.3, 1.55], [12.75, 1.3], [12.47, 0.98], [12.7, 1.72], [12.28, 1.3]].forEach(function (p) {
      world.emitBox(p[0] - 0.03, p[1] - 0.018, 0.852, p[0] + 0.03, p[1] + 0.018, 0.866, { pz: 'magnet' }, 0.25);
    });
    [[7.08, 0.3], [7.47, 0.3], [7.08, 0.58], [7.47, 0.58]].forEach(function (p) {
      world.box(p[0] - 0.08, 0.92, p[1] - 0.08, p[0] + 0.08, 0.93, p[1] + 0.08, 'black');
    });

    // ---- the oven window and the kettle's light ---------------------------------------------------
    var ovenGlow = mesh(new THREE.PlaneGeometry(0.52, 0.32), basic(0xff7a2a), 7.275, 0.425, 0.816);
    ovenGlow.visible = false;
    var kettleLed = mesh(new THREE.BoxGeometry(0.03, 0.03, 0.01), basic(0x331010), 10.8, 0.97, 0.536);

    // ---- the microwave window: a tiny canvas (off, cooking with the plate turning, done) ------------
    var mc = document.createElement('canvas');
    mc.width = 32;
    mc.height = 16;
    var mg = mc.getContext('2d');
    var mtex = new THREE.CanvasTexture(mc);
    mtex.magFilter = THREE.NearestFilter;
    var screen = mesh(new THREE.PlaneGeometry(0.46, 0.2), basic(0xffffff, { map: mtex }), 6.25, 1.06, 0.668);
    var micro = { mode: 'off', t: 0, acc: 0, food: 0xb5452a };
    function drawMicro() {
      if (micro.mode === 'cook') {
        mg.fillStyle = '#e8b866';
        mg.fillRect(0, 0, 32, 16);
        mg.fillStyle = '#f4efe2'; // the plate, turning
        mg.beginPath();
        mg.ellipse(14, 11, 9, 3, 0, 0, Math.PI * 2);
        mg.fill();
        var a = micro.t * 1.6;
        mg.fillStyle = '#' + micro.food.toString(16).padStart(6, '0');
        mg.fillRect(14 + Math.cos(a) * 4 - 3, 8 + Math.sin(a) * 1, 6, 3);
        mg.fillStyle = '#1a1208';
        mg.fillRect(26, 0, 6, 16); // the control panel
        mg.fillStyle = '#4cff7a';
        mg.fillRect(27, 3, 4, 2);
      } else {
        mg.fillStyle = '#0d1216';
        mg.fillRect(0, 0, 32, 16);
        mg.fillStyle = 'rgba(255,255,255,0.06)';
        mg.fillRect(2, 2, 10, 2);
        mg.fillStyle = '#1a1208';
        mg.fillRect(26, 0, 6, 16);
        mg.fillStyle = micro.mode === 'done' ? '#4cff7a' : '#1d3b26';
        mg.fillRect(27, 3, 4, 2);
      }
      mtex.needsUpdate = true;
    }
    drawMicro();

    // ---- the plate (with whatever dinner is on it) --------------------------------------------------
    var plate = new THREE.Group();
    mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.018, 12), new THREE.MeshPhongMaterial({ color: 0xece6d8, specular: 0x111111 }), 0, 0, 0, plate);
    var foodMat = new THREE.MeshPhongMaterial({ color: 0xb5452a, specular: 0x000000 });
    var food = mesh(new THREE.BoxGeometry(0.12, 0.04, 0.09), foodMat, 0, 0.028, 0, plate);
    plate.visible = false;
    scene.add(plate);
    var PLATE_AT = { table: [9.95, 0.79, 4.1], sink: [1.55, 0.93, 8.38] };

    // ---- the pan Cooper knocks off the counter ------------------------------------------------------
    var pan = new THREE.Group();
    var iron = new THREE.MeshPhongMaterial({ color: 0x2a2c30, specular: 0x444444, shininess: 30 });
    mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.05, 10), iron, 0, 0, 0, pan);
    mesh(new THREE.BoxGeometry(0.03, 0.02, 0.22), iron, 0, 0.01, 0.24, pan);
    scene.add(pan);
    var PAN_HOME = { x: 7.95, y: 0.955, z: 0.42 };
    var PAN_FLOOR = { x: 8.25, y: 0.03, z: 1.1 };
    var panT = -1;

    // ---- the kitchen trash bag ----------------------------------------------------------------------
    var bag = mesh(new THREE.BoxGeometry(0.32, 0.26, 0.3), mat('black'), 7.7, 0.55, 7.52);

    // ---- the tennis ball ----------------------------------------------------------------------------
    var ballMesh = mesh(new THREE.SphereGeometry(BALL_R, 8, 6), new THREE.MeshPhongMaterial({ color: 0xc8e04a, specular: 0x222222 }), BALL_HOME.x, BALL_R, BALL_HOME.z);
    var ball = {
      pos: { x: BALL_HOME.x, y: BALL_R, z: BALL_HOME.z },
      vel: { x: 0, y: 0, z: 0 },
      held: false,
      moving: false,
      onBounce: null,
      // thrown from the camera along where it looks
      throwFrom: function (cam) {
        var cp = Math.cos(cam.pitch);
        var fx = -Math.sin(cam.yaw) * cp;
        var fz = -Math.cos(cam.yaw) * cp;
        var fy = Math.sin(cam.pitch);
        ball.pos = { x: cam.x + fx * 0.3, y: Math.max(0.3, cam.y - 0.2), z: cam.z + fz * 0.3 };
        ball.vel = { x: fx * 5.5, y: fy * 5.5 + 1.6, z: fz * 5.5 };
        ball.held = false;
        ball.moving = true;
      },
      pickUp: function () {
        ball.held = true;
        ball.moving = false;
      },
      // drop it at a spot on the floor (Cooper bringing it back)
      dropAt: function (x, z) {
        ball.held = false;
        ball.moving = false;
        ball.pos = { x: x, y: BALL_R, z: z };
      },
      home: function () {
        ball.dropAt(BALL_HOME.x, BALL_HOME.z);
      },
      update: function (dt) {
        ballMesh.visible = !ball.held;
        if (ball.moving) {
          ball.vel.y -= 9.8 * dt;
          var p = OC.collision.resolveMove(ball.pos, { x: ball.vel.x * dt, z: ball.vel.z * dt }, world.boxes, BALL_R);
          if (Math.abs(p.x - (ball.pos.x + ball.vel.x * dt)) > 1e-4) ball.vel.x *= -0.4;
          if (Math.abs(p.z - (ball.pos.z + ball.vel.z * dt)) > 1e-4) ball.vel.z *= -0.4;
          ball.pos.x = p.x;
          ball.pos.z = p.z;
          ball.pos.y += ball.vel.y * dt;
          if (ball.pos.y <= BALL_R) {
            ball.pos.y = BALL_R;
            if (Math.abs(ball.vel.y) > 1 && ball.onBounce) ball.onBounce(ball.pos);
            ball.vel.y = -ball.vel.y * 0.45;
            ball.vel.x *= 0.7;
            ball.vel.z *= 0.7;
            if (Math.hypot(ball.vel.x, ball.vel.z) < 0.15 && Math.abs(ball.vel.y) < 0.6) {
              ball.moving = false;
              ball.pos.y = BALL_R;
            }
          }
        }
        ballMesh.position.set(ball.pos.x, ball.pos.y, ball.pos.z);
      },
    };

    // ---- the singing fish (a motion sensor; it sings when anything goes past) -----------------------
    var fishG = new THREE.Group(); // faces -x, out of the hall's east wall
    fishG.position.set(6.85, 1.45, 9.4);
    scene.add(fishG);
    var scales = new THREE.MeshPhongMaterial({ color: 0x6f8f3a, specular: 0x333322, shininess: 20 });
    var belly = new THREE.MeshPhongMaterial({ color: 0xc9b77a, specular: 0x111111 });
    mesh(new THREE.BoxGeometry(0.05, 0.11, 0.26), scales, -0.03, 0, 0, fishG);
    mesh(new THREE.BoxGeometry(0.052, 0.04, 0.2), belly, -0.031, -0.04, 0, fishG);
    var fishHead = new THREE.Group();
    fishHead.position.set(-0.03, 0, -0.13);
    fishG.add(fishHead);
    mesh(new THREE.BoxGeometry(0.05, 0.1, 0.09), scales, 0, 0, -0.04, fishHead);
    var jaw = mesh(new THREE.BoxGeometry(0.05, 0.025, 0.07), basic(0x5a1414), 0, -0.05, -0.05, fishHead);
    mesh(new THREE.BoxGeometry(0.01, 0.015, 0.015), basic(0x111111), -0.026, 0.02, -0.06, fishHead); // eye
    var fishTail = new THREE.Group();
    fishTail.position.set(-0.03, 0, 0.13);
    fishG.add(fishTail);
    mesh(new THREE.BoxGeometry(0.02, 0.14, 0.08), scales, 0, 0, 0.04, fishTail);
    var singT = 0;
    var fish = {
      at: { x: 6.85, y: 1.45, z: 9.4 },
      singing: function () {
        return singT > 0;
      },
      sing: function () {
        singT = 2.8;
      },
    };

    // ---- the light out in the trees (it blinks once) -----------------------------------------------
    var treeLightMesh = mesh(new THREE.SphereGeometry(0.16, 6, 4), basic(0xfff3c4, { fog: false }), -14, 1.4, -18);
    // a soft halo, so a flashlight 20 m away reads as a flashlight and not a stuck pixel
    mesh(new THREE.SphereGeometry(0.7, 8, 6), basic(0xfff0c0, { fog: false, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending }), 0, 0, 0, treeLightMesh);
    treeLightMesh.visible = false;
    var blinkT = 0;
    var treeLight = {
      at: { x: -14, y: 1.4, z: -18 },
      blink: function () {
        blinkT = 0.35;
      },
    };

    var api = {
      stoveGlow: function (v) {
        ovenGlow.visible = !!v;
      },
      kettleLight: function (v) {
        kettleLed.material.color.setHex(v ? 0xff3a2a : 0x331010);
      },
      microwaveScreen: function (mode, dish) {
        micro.mode = mode;
        if (dish && FOOD_COLORS[dish]) micro.food = FOOD_COLORS[dish];
        drawMicro();
      },
      // where the plate is: 'none' | 'table' | 'tableEmpty' | 'sink'
      plate: function (where, dish) {
        if (where === 'tableEmpty') {
          food.visible = false;
          plate.position.set(PLATE_AT.table[0], PLATE_AT.table[1], PLATE_AT.table[2]);
          plate.visible = true;
          return;
        }
        plate.visible = where === 'table' || where === 'sink';
        if (dish && FOOD_COLORS[dish]) foodMat.color.setHex(FOOD_COLORS[dish]);
        food.visible = where === 'table';
        var p = PLATE_AT[where];
        if (p) plate.position.set(p[0], p[1], p[2]);
      },
      pan: {
        down: false,
        at: PAN_HOME,
        fall: function () {
          if (api.pan.down) return;
          api.pan.down = true;
          panT = 0;
        },
      },
      // the trash bag: 'can' | 'held' | 'out'
      bag: function (where) {
        bag.visible = where === 'can';
      },
      ball: ball,
      fish: fish,
      treeLight: treeLight,
      dogBed: { x: 24.6, z: 6.75 },
      reset: function () {
        ovenGlow.visible = false;
        api.kettleLight(false);
        api.microwaveScreen('off');
        api.plate('none');
        api.pan.down = false;
        panT = -1;
        pan.position.set(PAN_HOME.x, PAN_HOME.y, PAN_HOME.z);
        pan.rotation.set(0, 0.6, 0);
        bag.visible = true;
        ball.home();
        singT = 0;
        blinkT = 0;
        treeLightMesh.visible = false;
      },
      update: function (dt) {
        ball.update(dt);
        if (micro.mode === 'cook') {
          micro.t += dt;
          micro.acc += dt;
          if (micro.acc > 0.1) {
            micro.acc = 0;
            drawMicro();
          }
        }
        if (panT >= 0 && panT < 1) {
          panT = Math.min(1, panT + dt / 0.35);
          var k = panT * panT;
          pan.position.set(
            PAN_HOME.x + (PAN_FLOOR.x - PAN_HOME.x) * panT,
            PAN_HOME.y + (PAN_FLOOR.y - PAN_HOME.y) * k,
            PAN_HOME.z + (PAN_FLOOR.z - PAN_HOME.z) * panT
          );
          pan.rotation.set(panT * 2.6, 0.6 + panT * 1.2, panT * 0.4);
        }
        if (singT > 0) {
          singT = Math.max(0, singT - dt);
          var s = singT > 0 ? 1 : 0;
          jaw.position.y = -0.05 - Math.abs(Math.sin(singT * 18)) * 0.02 * s;
          fishHead.rotation.y = s * -0.5; // the head turns out from the wall
          fishTail.rotation.y = Math.sin(singT * 12) * 0.45 * s;
        }
        if (blinkT > 0) {
          blinkT = Math.max(0, blinkT - dt);
          treeLightMesh.visible = blinkT > 0;
        }
      },
    };
    api.reset();
    props.decor = api;
    return api;
  }

  OC.decor = { build: build };
})();
