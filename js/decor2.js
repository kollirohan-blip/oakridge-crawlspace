// The things in the house that are different on night two, and the few new fixtures that night needs.
// On night one and day two they sit in their ordinary state; js/night2/*.js moves them.
//   a kitchen chair (tucked in, pulled out, or standing in the hall facing the guest room door),
//   the toilet seat, the family photo on the foyer table (standing, or face down), the guest bed
//   (slept in, or made with tight corners), Dave's kitchen tablet and its shopping list, the sticky
//   note on the guest room door, the scrawl over the pipes note, wet bare footprints to the hatch
//   (and, later, out of it), the grocery bag and what was in it, Dave's flashlight, the breaker's
//   switch, and the wall phone's handset.
(function () {
  var OC = (window.OC = window.OC || {});

  function build(world, props, house) {
    var scene = world.group;
    function lit(color, extra) {
      return new THREE.MeshPhongMaterial(Object.assign({ color: color, specular: 0x000000 }, extra || {}));
    }
    function glow(color, extra) {
      return new THREE.MeshBasicMaterial(Object.assign({ color: color }, extra || {}));
    }
    function mesh(geo, m, x, y, z, parent) {
      var o = new THREE.Mesh(geo, m);
      o.position.set(x, y, z);
      (parent || scene).add(o);
      return o;
    }
    function box(w, h, d, m, x, y, z, parent) {
      return mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, parent);
    }
    function canvasTex(w, h, draw, smooth) {
      var c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      var g = c.getContext('2d');
      draw(g);
      var t = new THREE.CanvasTexture(c);
      t.magFilter = smooth ? THREE.LinearFilter : THREE.NearestFilter;
      t.userData = { canvas: c, ctx: g };
      return t;
    }

    // ---- the east kitchen chair ----------------------------------------------------------------
    var chair = (function () {
      var g = new THREE.Group();
      scene.add(g);
      if (OC.models && OC.models.has('chairCushion')) {
        var inst = OC.models.instance('chairCushion');
        OC.models.fitObject(inst, 'chairCushion', [-0.225, 0, -0.25, 0.225, 0.95, 0.25], 3);
        g.add(inst);
      } else {
        box(0.45, 0.45, 0.5, world.material('fabric'), 0, 0.225, 0, g);
        box(0.06, 0.5, 0.5, world.material('fabric'), 0.2, 0.7, 0, g);
      }
      var solid = { x0: 0, y0: 0, z0: 0, x1: 0, y1: 0.95, z1: 0, kind: 'furniture' };
      world.boxes.push(solid);
      var SPOTS = {
        tucked: { x: 10.625, z: 4.1, r: 0, hw: 0.225, hd: 0.25 },
        out: { x: 11.4, z: 4.75, r: -0.75, hw: 0.3, hd: 0.3 }, // dragged back and turned to face the hall
        hall: { x: 6.45, z: 16.0, r: 0, hw: 0.225, hd: 0.25 }, // in the hall, facing the guest room door
      };
      var api = {
        where: 'tucked',
        at: function () {
          var s = SPOTS[api.where];
          return { x: s.x, y: 0.6, z: s.z };
        },
        set: function (where) {
          var s = SPOTS[where];
          api.where = where;
          g.position.set(s.x, 0, s.z);
          g.rotation.y = s.r;
          solid.x0 = s.x - s.hw;
          solid.x1 = s.x + s.hw;
          solid.z0 = s.z - s.hd;
          solid.z1 = s.z + s.hd;
        },
      };
      api.set('tucked');
      return api;
    })();

    // ---- the toilet seat (the model's own is down; this is it left up) ------------------------------
    var seat = box(0.035, 0.44, 0.4, lit(0xe6e4dc), 4.47, 0.66, 20.45);
    seat.rotation.z = -0.14;
    seat.visible = false;

    // ---- the family photo on the foyer table -----------------------------------------------------
    var photo = (function () {
      var tex = canvasTex(48, 36, function (g) {
        g.fillStyle = '#9fb6c9';
        g.fillRect(0, 0, 48, 36);
        g.fillStyle = '#6f8a4d';
        g.fillRect(0, 24, 48, 12);
        g.fillStyle = '#b5452a'; // Dave, in the loudest shirt he owns
        g.fillRect(8, 13, 11, 15);
        g.fillStyle = '#e0b08a';
        g.fillRect(10, 5, 7, 8);
        g.fillStyle = '#4a3020';
        g.fillRect(11, 10, 5, 2); // the moustache
        g.fillStyle = '#3d6a8a'; // Aunt Linda
        g.fillRect(24, 15, 9, 13);
        g.fillStyle = '#d8a888';
        g.fillRect(25, 8, 7, 7);
        g.fillStyle = '#7a4a2a';
        g.fillRect(24, 6, 9, 3);
        g.fillStyle = '#d9a84f'; // Cooper, a puppy, mostly ears
        g.fillRect(36, 23, 8, 5);
        g.fillRect(41, 19, 5, 5);
        g.fillStyle = '#8a5a22';
        g.fillRect(40, 19, 2, 4);
      });
      var g = new THREE.Group();
      g.position.set(4.25, 0.8, 0.46);
      scene.add(g);
      var frame = new THREE.Group();
      g.add(frame);
      var wood = lit(0x4a3422);
      box(0.26, 0.21, 0.016, wood, 0, 0.105, 0, frame);
      var pic = mesh(new THREE.PlaneGeometry(0.22, 0.17), new THREE.MeshPhongMaterial({ map: tex, specular: 0x000000 }), 0, 0.105, 0.009, frame);
      box(0.03, 0.14, 0.09, wood, 0, 0.07, -0.05, frame).rotation.x = 0.5; // its little stand
      var api = {
        at: { x: 4.25, y: 0.9, z: 0.46 },
        down: false,
        set: function (down) {
          api.down = !!down;
          frame.rotation.set(down ? Math.PI / 2 : -0.12, 0, 0);
          frame.position.set(0, down ? 0.012 : 0, down ? -0.1 : 0);
          pic.visible = !down;
        },
      };
      api.set(false);
      return api;
    })();

    // ---- the guest bed: slept in, or made --------------------------------------------------------
    var bed = (function () {
      var messy = new THREE.Group();
      var made = new THREE.Group();
      scene.add(messy);
      scene.add(made);
      var blanket = lit(0x3b4a66);
      var sheet = lit(0xd8d4c8);
      // slept in: the blanket kicked to the foot, a T-shirt, the pillow crooked
      var lump = box(0.55, 0.16, 1.2, blanket, 1.72, 0.7, 15.55, messy);
      lump.rotation.set(0.05, 0.25, 0.1);
      box(0.5, 0.05, 0.8, blanket, 1.25, 0.66, 15.9, messy).rotation.y = -0.2;
      box(0.34, 0.04, 0.3, lit(0x55585e), 1.0, 0.67, 15.15, messy).rotation.y = 0.6;
      // made: flat, squared, the top sheet folded down a hand's width, the corners tucked like a hospital's
      box(1.42, 0.035, 1.46, blanket, 1.37, 0.665, 15.6, made);
      box(0.2, 0.04, 1.46, sheet, 0.76, 0.668, 15.6, made);
      box(0.04, 0.2, 1.46, blanket, 2.085, 0.56, 15.6, made);
      box(1.42, 0.2, 0.04, blanket, 1.37, 0.56, 14.87, made);
      box(1.42, 0.2, 0.04, blanket, 1.37, 0.56, 16.33, made);
      // the notebook, if it comes back: on the pillow, squared to it
      var book = new THREE.Group();
      book.position.set(0.42, 0.72, 15.6);
      book.rotation.y = Math.PI / 2;
      scene.add(book);
      var cov = lit(0x16161a);
      box(0.19, 0.022, 0.25, [cov, cov, lit(0x23232a), cov, lit(0xe0dccf), cov], 0, 0, 0, book);
      book.visible = false;
      var api = {
        at: { x: 1.3, y: 0.75, z: 15.6 },
        pillow: { x: 0.42, y: 0.75, z: 15.6 },
        made: false,
        set: function (isMade) {
          api.made = !!isMade;
          messy.visible = !isMade;
          made.visible = !!isMade;
        },
        showNotebook: function (v) {
          book.visible = !!v;
        },
      };
      api.set(false);
      return api;
    })();

    // ---- Dave's kitchen tablet: the shared shopping list ----------------------------------------
    var tablet = (function () {
      var LIST = ['dog food', 'batteries', 'lightbulbs', 'soup (again??)'];
      var scrawl = false;
      var tex = canvasTex(96, 72, function () {}, true);
      function draw() {
        var g = tex.userData.ctx;
        g.fillStyle = '#10141c';
        g.fillRect(0, 0, 96, 72);
        g.fillStyle = '#2a3a55';
        g.fillRect(0, 0, 96, 12);
        g.fillStyle = '#dfe6f2';
        g.font = '8px monospace';
        g.fillText("DAVE'S LIST", 4, 9);
        g.font = '7px monospace';
        LIST.forEach(function (l, i) {
          g.strokeStyle = '#7d8aa0';
          g.strokeRect(5.5, 17.5 + i * 10, 5, 5);
          g.fillStyle = '#c8d0de';
          g.fillText(l, 14, 23 + i * 10);
        });
        if (scrawl) {
          // written with a fingertip, pressed hard, like someone who has not used one of these before
          g.strokeStyle = '#f2f4f8';
          g.lineWidth = 2.2;
          g.lineCap = 'round';
          g.beginPath();
          var x = 8;
          var y = 66;
          // m
          g.moveTo(x, y);
          g.lineTo(x + 1, y - 8);
          g.lineTo(x + 5, y - 2);
          g.lineTo(x + 9, y - 9);
          g.lineTo(x + 11, y);
          // i
          g.moveTo(x + 18, y - 7);
          g.lineTo(x + 19, y);
          // l
          g.moveTo(x + 27, y - 13);
          g.lineTo(x + 28, y);
          // k
          g.moveTo(x + 36, y - 13);
          g.lineTo(x + 37, y);
          g.moveTo(x + 44, y - 8);
          g.lineTo(x + 38, y - 3);
          g.lineTo(x + 46, y + 1);
          g.stroke();
        }
        tex.needsUpdate = true;
      }
      var g = new THREE.Group();
      g.position.set(8.1, 0.92, 0.3);
      g.rotation.x = -0.3;
      scene.add(g);
      box(0.3, 0.215, 0.014, lit(0x1a1b1e), 0, 0.11, 0, g);
      var screen = mesh(new THREE.PlaneGeometry(0.27, 0.19), glow(0x9aa4b4, { map: tex }), 0, 0.11, 0.008, g);
      box(0.1, 0.1, 0.02, lit(0x1a1b1e), 0, 0.05, -0.05, g).rotation.x = 0.9;
      var api = {
        at: { x: 8.1, y: 1.04, z: 0.34 },
        list: LIST,
        scrawled: function () {
          return scrawl;
        },
        setScrawl: function (v) {
          scrawl = !!v;
          draw();
        },
        // how bright the screen is (it lights nothing, but in a dark kitchen it is the thing you see)
        setBright: function (v) {
          screen.material.color.setScalar(v);
        },
      };
      draw();
      api.setBright(0.6);
      return api;
    })();

    // ---- the sticky note on the guest room door frame, hall side ------------------------------------
    var doorNote = (function () {
      var tex = canvasTex(64, 64, function (g) {
        g.fillStyle = '#e8d35a';
        g.fillRect(0, 0, 64, 64);
        g.fillStyle = 'rgba(0,0,0,0.1)';
        g.fillRect(0, 0, 64, 7);
        g.fillStyle = '#1d2a6b';
        g.font = 'bold 11px monospace';
        ['THIS IS', 'NOT', 'YOUR', 'ROOM.'].forEach(function (l, i) { g.fillText(l, 6, 22 + i * 12); });
      }, true);
      var m = mesh(new THREE.PlaneGeometry(0.13, 0.13), new THREE.MeshPhongMaterial({ map: tex, specular: 0x000000 }), 5.104, 1.48, 16.63);
      m.rotation.y = Math.PI / 2;
      m.rotation.z = 0.04;
      m.visible = false;
      return {
        at: { x: 5.11, y: 1.48, z: 16.63 },
        show: function (v) {
          m.visible = !!v;
        },
        visible: function () {
          return m.visible;
        },
      };
    })();

    // ---- the pipes note, after someone corrected it -------------------------------------------------
    var pipesNote = (function () {
      var tex = canvasTex(48, 48, function (g) {
        g.fillStyle = '#e8d35a';
        g.fillRect(0, 0, 48, 48);
        g.fillStyle = '#1d2a6b';
        g.font = '7px monospace';
        g.fillText('If you hear', 3, 12);
        g.fillText('scratching', 3, 21);
        g.fillText("it's", 3, 30);
        g.fillText('the pipes', 3, 42);
        g.strokeStyle = '#141414';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(2, 40);
        g.lineTo(44, 38);
        g.moveTo(3, 37);
        g.lineTo(45, 41);
        g.stroke();
        g.fillStyle = '#141414';
        g.font = 'bold 8px monospace';
        g.fillText('NOT', 22, 31);
      }, true);
      var m = mesh(new THREE.PlaneGeometry(0.092, 0.092), new THREE.MeshPhongMaterial({ map: tex, specular: 0x000000 }), 12.36, 1.12, 0.8625);
      m.visible = false;
      return {
        changed: false,
        set: function (v) {
          this.changed = !!v;
          m.visible = !!v;
        },
      };
    })();

    // ---- wet bare footprints on the laundry room's concrete -----------------------------------------
    var prints = (function () {
      var tex = canvasTex(32, 64, function (g) {
        g.clearRect(0, 0, 32, 64);
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.ellipse(15, 46, 8, 13, 0, 0, Math.PI * 2); // the heel and arch
        g.fill();
        g.beginPath();
        g.ellipse(16, 22, 10, 11, 0, 0, Math.PI * 2); // the ball
        g.fill();
        g.clearRect(0, 28, 9, 14); // the arch does not touch
        [[7, 8, 3.2], [13, 5, 3], [19, 5, 2.8], [24, 8, 2.5], [28, 12, 2.2]].forEach(function (t) {
          g.beginPath();
          g.arc(t[0], t[1], t[2], 0, Math.PI * 2);
          g.fill();
        });
      }, true);
      function trail(points) {
        var mat = new THREE.MeshPhongMaterial({ color: 0x050608, alphaMap: tex, transparent: true, opacity: 0.8, specular: 0x1c1c1c, shininess: 30, depthWrite: false });
        var inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.125, 0.31), mat, points.length);
        var m = new THREE.Matrix4();
        var q = new THREE.Quaternion();
        var e = new THREE.Euler();
        points.forEach(function (p, i) {
          // flat on the floor, toes toward the heading; the left foot is the right one mirrored
          e.set(-Math.PI / 2, p.h, 0, 'YXZ');
          q.setFromEuler(e);
          m.compose(new THREE.Vector3(p.x, 0.006, p.z), q, new THREE.Vector3(p.left ? -1 : 1, 1, 1));
          inst.setMatrixAt(i, m);
        });
        inst.instanceMatrix.needsUpdate = true;
        inst.visible = false;
        mat.side = THREE.DoubleSide; // mirrored instances are wound the other way
        scene.add(inst);
        return inst;
      }
      // walk a line of points, one print every 0.55 m, feet either side of it
      function walk(path) {
        var out = [];
        var left = true;
        for (var s = 0; s < path.length - 1; s++) {
          var a = path[s];
          var b = path[s + 1];
          var len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          var h = Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])); // yaw whose forward (-sin, -cos) points along the path
          for (var d = 0.15; d < len; d += 0.55) {
            var t = d / len;
            var side = left ? -0.09 : 0.09;
            out.push({ x: a[0] + (b[0] - a[0]) * t + Math.cos(h) * side, z: a[1] + (b[1] - a[1]) * t - Math.sin(h) * side, h: h, left: left });
            left = !left;
          }
        }
        return out;
      }
      // in: from the door to the hatch, where they stop. out: up out of the hatch and back to the door
      var tin = trail(walk([[4.85, 10.42], [3.9, 10.3], [3.02, 10.42]]));
      var tout = trail(walk([[3.0, 10.78], [3.9, 10.95], [4.9, 10.62]]));
      return {
        hatchEnd: { x: 3.2, y: 0.02, z: 10.42 },
        outEnd: { x: 4.6, y: 0.02, z: 10.7 },
        show: function (which) {
          tin.visible = which === 'in' || which === 'both';
          tout.visible = which === 'out' || which === 'both';
        },
        showing: function () {
          return tin.visible && tout.visible ? 'both' : tin.visible ? 'in' : tout.visible ? 'out' : 'none';
        },
      };
    })();

    // ---- the grocery bag on the kitchen table, and what Mason bought ---------------------------------
    var groceries = (function () {
      var g = new THREE.Group();
      g.position.set(9.4, 0.78, 4.3);
      scene.add(g);
      var kraft = lit(0xa98a5a);
      var bag = new THREE.Group();
      g.add(bag);
      box(0.3, 0.36, 0.2, kraft, -0.35, 0.18, 0, bag);
      box(0.3, 0.02, 0.2, lit(0x6b5636), -0.35, 0.36, 0, bag);
      var parts = {
        dogFood: new THREE.Group(),
        batteries: box(0.13, 0.02, 0.09, lit(0xd8742a), 0.42, 0.01, 0.2, g),
        snack: new THREE.Group(),
        milk: new THREE.Group(),
      };
      g.add(parts.dogFood);
      box(0.3, 0.42, 0.14, lit(0xb8955e), 0.05, 0.21, -0.25, parts.dogFood);
      box(0.31, 0.12, 0.145, lit(0x8a2a1d), 0.05, 0.24, -0.25, parts.dogFood);
      g.add(parts.snack);
      var snackMat = lit(0xe08a2a);
      box(0.24, 0.3, 0.1, snackMat, 0.12, 0.15, 0.12, parts.snack).rotation.y = 0.3;
      g.add(parts.milk);
      box(0.09, 0.2, 0.09, lit(0xe8e6de), 0.48, 0.1, -0.1, parts.milk);
      box(0.09, 0.05, 0.02, lit(0x3b70c0), 0.48, 0.22, -0.1, parts.milk);
      var SNACK = { a: 0xe08a2a, b: 0x6a8a3a, c: 0x9fc08a };
      var api = {
        at: { x: 9.4, y: 0.95, z: 4.3 },
        partAt: {
          dogFood: { x: 9.45, y: 1.0, z: 4.05 },
          batteries: { x: 9.82, y: 0.82, z: 4.5 },
          snack: { x: 9.52, y: 0.93, z: 4.42 },
          milk: { x: 9.88, y: 0.9, z: 4.2 },
        },
        // nothing | the bag and everything in it
        show: function (v) {
          g.visible = !!v;
        },
        has: function (id) {
          return g.visible && parts[id].visible;
        },
        // put a thing on the table, or take it away
        set: function (id, v) {
          parts[id].visible = !!v;
        },
        snackKind: function (kind) {
          snackMat.color.setHex(SNACK[kind] || SNACK.a);
        },
        reset: function () {
          Object.keys(parts).forEach(function (k) { parts[k].visible = true; });
          g.visible = false;
        },
      };
      api.reset();
      return api;
    })();

    // ---- Dave's flashlight, in the junk drawer (shown on the counter once Mason has found it) ---------
    var torch = (function () {
      var g = new THREE.Group();
      g.position.set(5.62, 0.94, 0.45);
      g.rotation.y = 0.5;
      scene.add(g);
      var body = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), lit(0x8a2a22), 0, 0.02, 0, g);
      body.rotation.z = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(0.032, 0.022, 0.05, 8), lit(0x8f9399), 0.1, 0.02, 0, g).rotation.z = -Math.PI / 2;
      g.visible = false;
      return {
        at: { x: 5.65, y: 0.8, z: 0.72 }, // the drawer's front
        show: function (v) {
          g.visible = !!v;
        },
      };
    })();

    // ---- the breaker panel's door and main switch (laundry room, west wall, beside the hatch) ---------
    var breaker = (function () {
      var g = new THREE.Group();
      g.position.set(0.105, 1.45, 10.5);
      scene.add(g);
      box(0.03, 0.5, 0.36, lit(0x6f7378), 0.015, 0, 0, g);
      var sw = box(0.03, 0.07, 0.05, lit(0x1a1a1a), 0.04, 0.12, 0, g);
      var led = box(0.01, 0.02, 0.02, glow(0x2fd05a), 0.035, 0.2, 0.12, g);
      [-0.1, -0.03, 0.04].forEach(function (y) {
        [-0.09, 0, 0.09].forEach(function (z) { box(0.012, 0.035, 0.05, lit(0x2a2a2c), 0.032, y - 0.06, z, g); });
      });
      var api = {
        at: { x: 0.16, y: 1.5, z: 10.5 },
        tripped: false,
        set: function (tripped) {
          api.tripped = !!tripped;
          sw.position.y = tripped ? 0.07 : 0.12;
          led.material.color.setHex(tripped ? 0x30100c : 0x2fd05a);
        },
      };
      api.set(false);
      return api;
    })();

    // ---- the wall phone's handset (the base is furniture) --------------------------------------------
    var landline = (function () {
      var hs = box(0.06, 0.24, 0.05, lit(0xd8d2c0), 7.5, 1.4, 7.82);
      return {
        at: { x: 7.5, y: 1.4, z: 7.82 },
        // off the hook: in Mason's hand
        lift: function (v) {
          hs.visible = !v;
        },
      };
    })();

    var api = {
      chair: chair,
      photo: photo,
      bed: bed,
      tablet: tablet,
      doorNote: doorNote,
      pipesNote: pipesNote,
      prints: prints,
      groceries: groceries,
      torch: torch,
      breaker: breaker,
      landline: landline,
      toiletSeat: function (up) {
        seat.visible = !!up;
      },
      seatAt: { x: 4.3, y: 0.7, z: 20.45 },
      keyHook: { x: 4.86, y: 1.5, z: 11.6 },
      // floor registers (the grilles are furniture): where breathing can come from
      vents: [{ x: 6.6, y: 0.03, z: 13.45, room: 'hall' }, { x: 15.2, y: 0.03, z: 7.3, room: 'living' }, { x: 12.4, y: 0.03, z: 3.0, room: 'kitchen' }],
      // everything as it is on an ordinary day
      reset: function () {
        chair.set('tucked');
        seat.visible = false;
        photo.set(false);
        bed.set(false);
        bed.showNotebook(false);
        tablet.setScrawl(false);
        tablet.setBright(0.6);
        doorNote.show(false);
        pipesNote.set(false);
        prints.show('none');
        groceries.reset();
        torch.show(false);
        breaker.set(false);
        landline.lift(false);
      },
    };
    api.reset();
    props.changes = api;
    return api;
  }

  OC.decor2 = { build: build };
})();
