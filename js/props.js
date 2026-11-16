// Furniture (from house.furniture, merged into the static batch) and the few props that move or
// change: the patio slider, the front door, the laundry hatch, the TV, the microwave glow, the dog bowl.
(function () {
  var OC = (window.OC = window.OC || {});

  function build(world, house) {
    var scene = world.group;
    var mat = world.material;

    // ---- furniture ----------------------------------------------------------------------------
    house.furniture.forEach(function (f) {
      var b = f.b;
      world.box(b[0], b[1], b[2], b[3], b[4], b[5], f.tex);
      if (f.solid) {
        world.boxes.push({ x0: b[0], y0: b[1], z0: b[2], x1: b[3], y1: b[4], z1: b[5], kind: 'furniture' });
      }
    });

    function box(w, h, d, tex, x, y, z, parent) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(tex));
      m.position.set(x, y, z);
      (parent || scene).add(m);
      return m;
    }
    var glassMat = new THREE.MeshBasicMaterial({
      color: 0x0b1420,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // ---- the patio slider (living room, south wall) -----------------------------------------------
    var slider = (function () {
      var g = new THREE.Group();
      g.position.set(19.5, 0, 8);
      scene.add(g);
      box(2.2, 0.06, 0.08, 'metal', 0, 2.12, 0, g);
      box(2.2, 0.06, 0.08, 'metal', 0, 0.03, 0, g);
      box(0.06, 2.15, 0.08, 'metal', -1.07, 1.075, 0, g);
      box(0.06, 2.15, 0.08, 'metal', 1.07, 1.075, 0, g);
      var fixed = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.05), glassMat);
      fixed.position.set(-0.55, 1.05, 0);
      g.add(fixed);
      var leaf = new THREE.Group();
      leaf.position.set(0.55, 0, 0.05);
      g.add(leaf);
      var pane = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 2.05), glassMat);
      pane.position.set(0, 1.05, 0);
      leaf.add(pane);
      box(0.05, 2.1, 0.06, 'metal', -0.52, 1.05, 0, leaf);
      box(0.05, 2.1, 0.06, 'metal', 0.52, 1.05, 0, leaf);
      var latchMat = new THREE.MeshBasicMaterial({ color: 0xff8a2b });
      var latch = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.05), latchMat);
      latch.position.set(-0.46, 1.05, -0.02);
      leaf.add(latch);
      world.boxes.push({ x0: 18.4, x1: 20.6, z0: 7.95, z1: 8.05, y0: 0, y1: 2.15, kind: 'slider' });
      var api = {
        group: g,
        locked: false,
        open: 0,
        setLocked: function (v) {
          api.locked = !!v;
          latchMat.color.setHex(v ? 0x2b6b3a : 0xff8a2b); // green latch = locked
        },
        // slide the leaf open by this many metres (Act 2 leaves it three inches open)
        setOpen: function (m) {
          api.open = m;
          leaf.position.x = 0.55 - m;
        },
      };
      return api;
    })();

    // ---- the front door ---------------------------------------------------------------------------
    var frontDoor = (function () {
      var hinge = new THREE.Group();
      hinge.position.set(1.95, 0, 0);
      scene.add(hinge);
      box(1.05, 2.1, 0.05, 'door', 0.525, 1.05, 0, hinge);
      box(0.06, 0.06, 0.1, 'metal', 0.92, 1.0, 0, hinge); // knob
      box(0.05, 0.12, 0.08, 'metal', 0.92, 1.18, 0, hinge); // deadbolt
      var wall = { x0: 1.95, x1: 3.05, z0: -0.06, z1: 0.06, y0: 0, y1: 2.15, kind: 'door' };
      var door = OC.doors.createDoor({ box: wall, boxes: world.boxes, closed: true });
      var target = 0;
      var api = {
        isOpen: false,
        open: function () {
          if (api.isOpen) return;
          api.isOpen = true;
          target = -1.5;
          door.open();
        },
        // pass the player's position: the door will not close on them (returns false if it can't)
        close: function (playerPos) {
          if (!api.isOpen) return true;
          if (!door.close(playerPos)) return false;
          api.isOpen = false;
          target = 0;
          return true;
        },
        update: function (dt) {
          hinge.rotation.y += (target - hinge.rotation.y) * Math.min(1, dt * 4);
        },
      };
      return api;
    })();

    // ---- the laundry hatch --------------------------------------------------------------------------
    var hatch = (function () {
      box(0.9, 0.01, 0.9, 'black', 2.5, 0.012, 10.5);
      var pivot = new THREE.Group();
      pivot.position.set(2.05, 0.045, 10.5);
      scene.add(pivot);
      box(0.9, 0.04, 0.9, 'wood', 0.45, 0, 0, pivot);
      var padlock = box(0.1, 0.08, 0.06, 'metal', 0.8, 0.05, 0, pivot);
      box(0.96, 0.03, 0.03, 'metal', 2.5, 0.02, 10.0);
      box(0.96, 0.03, 0.03, 'metal', 2.5, 0.02, 11.0);
      var angle = 0;
      var swingT = 0;
      var api = {
        ajar: false,
        setAjar: function (v) {
          api.ajar = !!v;
          angle = v ? 0.34 : 0;
        },
        setPadlock: function (v) {
          padlock.visible = !!v;
        },
        // the padlock swinging a little, as if someone just let go of it
        swing: function () {
          swingT = 4;
        },
        update: function (dt) {
          pivot.rotation.z += (angle - pivot.rotation.z) * Math.min(1, dt * 3);
          if (swingT > 0) {
            swingT = Math.max(0, swingT - dt);
            padlock.rotation.x = Math.sin(swingT * 9) * 0.35 * (swingT / 4);
          }
        },
      };
      return api;
    })();

    // ---- the TV ---------------------------------------------------------------------------------
    var tv = (function () {
      var c = document.createElement('canvas');
      c.width = 64;
      c.height = 36;
      var g = c.getContext('2d');
      var tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter;
      var screen = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.75), new THREE.MeshBasicMaterial({ map: tex }));
      screen.position.set(19.5, 0.95, 0.43);
      scene.add(screen);
      var light = world.lightById.tv;
      var acc = 0;
      var t = 0;
      function blank() {
        g.fillStyle = '#050608';
        g.fillRect(0, 0, 64, 36);
        tex.needsUpdate = true;
      }
      blank();
      var api = {
        on: false,
        setOn: function (v) {
          api.on = !!v;
          if (!v) {
            blank();
            if (light) light.intensity = 0;
          }
        },
        update: function (dt) {
          if (!api.on) return;
          t += dt;
          acc += dt;
          if (light) light.intensity = 0.55 + Math.random() * 0.35;
          if (acc < 0.09) return;
          acc = 0;
          // a news-ish look: a blue desk, a lower-third bar, and a little static
          g.fillStyle = '#16233f';
          g.fillRect(0, 0, 64, 36);
          g.fillStyle = '#2b3d66';
          g.fillRect(8, 6, 20, 20);
          g.fillStyle = '#c9cdd6';
          g.fillRect(0, 28, 64, 5);
          g.fillStyle = '#7d1f1f';
          g.fillRect(0, 28, 10 + ((t * 8) % 54), 5);
          for (var i = 0; i < 90; i++) {
            var v = (Math.random() * 120 + 60) | 0;
            g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
            g.fillRect((Math.random() * 64) | 0, (Math.random() * 36) | 0, 1, 1);
          }
          tex.needsUpdate = true;
        },
      };
      return api;
    })();

    // ---- Dave's note on the fridge door, held by magnets (readable up close with E) ------------------
    (function () {
      var c = document.createElement('canvas');
      c.width = 48;
      c.height = 64;
      var g = c.getContext('2d');
      g.fillStyle = '#e9e3d2';
      g.fillRect(0, 0, 48, 64);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(0, 60, 48, 4);
      // scribbled handwriting: short wavy strokes, line by line
      g.strokeStyle = '#26315a';
      g.lineWidth = 1;
      var seed = 7;
      function rnd() {
        seed = (seed * 1103515245 + 12345) >>> 0;
        return (seed % 1000) / 1000;
      }
      for (var y = 9; y < 58; y += 5) {
        var x = 5;
        var end = 40 + rnd() * 4 - (y > 50 ? 18 : 0);
        g.beginPath();
        g.moveTo(x, y);
        while (x < end) {
          x += 2 + rnd() * 3;
          g.lineTo(x, y + (rnd() - 0.5) * 2.2);
        }
        g.stroke();
      }
      var tex = new THREE.CanvasTexture(c);
      tex.magFilter = THREE.NearestFilter;
      var note = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.28), new THREE.MeshPhongMaterial({ map: tex, specular: 0x000000 }));
      note.position.set(12.55, 1.36, 0.858);
      note.rotation.z = 0.04;
      scene.add(note);
      // magnets, including a few of Dave's terrible ones
      [[12.55, 1.49, 0xc0392b], [12.34, 1.62, 0x2e86c1], [12.74, 1.15, 0xf1c40f], [12.4, 1.05, 0x27ae60]].forEach(function (m) {
        var mag = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 0.012), new THREE.MeshPhongMaterial({ color: m[2], specular: 0x222222 }));
        mag.position.set(m[0], m[1], 0.864);
        scene.add(mag);
      });
    })();

    // ---- the living room lamp shade: it glows, because the bulb is inside it -------------------------
    var shadeMat = new THREE.MeshBasicMaterial({ color: 0xc98f52 });
    var shade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 0.36, 8, 1, true), shadeMat);
    shade.material.side = THREE.DoubleSide;
    shade.position.set(16, 1.76, 3);
    scene.add(shade);

    // ---- the microwave glow and the dog bowl ---------------------------------------------------------
    var microwave = (function () {
      var glow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.46, 0.2),
        new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
      );
      glow.position.set(6.25, 1.06, 0.66);
      glow.visible = false;
      scene.add(glow);
      return {
        setGlow: function (v) {
          glow.visible = !!v;
        },
      };
    })();

    var bowl = (function () {
      var food = box(0.4, 0.07, 0.4, 'cabinet', 11.2, 0.09, 6.9);
      food.visible = false;
      return {
        filled: false,
        setFilled: function (v) {
          this.filled = !!v;
          food.visible = !!v;
        },
      };
    })();

    // ---- Mason's car, on the driveway -------------------------------------------------------------
    var car = (function () {
      var g = new THREE.Group();
      g.position.set(10, 0, -9.7);
      scene.add(g);
      // double-sided, so the car still has walls and a roof when you are sitting inside it
      var paint = new THREE.MeshPhongMaterial({ color: 0x3b4a5c, specular: 0x222222, shininess: 20, side: THREE.DoubleSide });
      var trim = new THREE.MeshPhongMaterial({ color: 0x16181c, specular: 0x000000, side: THREE.DoubleSide });
      var glass = new THREE.MeshBasicMaterial({ color: 0x0a1018, transparent: true, opacity: 0.4, depthWrite: false, side: THREE.DoubleSide });
      function part(w, h, d, m, x, y, z) {
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        g.add(mesh);
        return mesh;
      }
      function pane(w, h, x, y, z, rotY) {
        var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotY || 0;
        g.add(mesh);
        return mesh;
      }
      // the car faces the house (+z), so the driver sits on the +x side
      part(1.8, 0.55, 4.2, paint, 0, 0.6, 0); // body
      part(1.62, 0.06, 2.3, paint, 0, 1.4, 0.15); // roof
      [[-0.78, -1.0], [0.78, -1.0], [-0.78, 1.3], [0.78, 1.3]].forEach(function (p) { part(0.06, 0.52, 0.06, paint, p[0], 1.13, p[1]); });
      pane(1.5, 0.5, 0, 1.13, 1.3); // windshield
      pane(1.5, 0.5, 0, 1.13, -1.0); // rear window
      pane(2.24, 0.5, -0.8, 1.13, 0.15, Math.PI / 2); // passenger side
      var glassSide = pane(2.24, 0.5, 0.8, 1.13, 0.15, Math.PI / 2); // the driver's window (it breaks)
      // inside
      part(1.6, 0.22, 0.32, trim, 0, 0.98, 1.08); // dashboard
      part(0.5, 0.14, 0.5, trim, 0.4, 0.62, -0.05); // driver's seat
      part(0.5, 0.6, 0.12, trim, 0.4, 0.95, -0.36);
      part(0.5, 0.14, 0.5, trim, -0.4, 0.62, -0.05); // passenger seat
      part(0.5, 0.6, 0.12, trim, -0.4, 0.95, -0.36);
      var wheel = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 4, 12), trim);
      wheel.position.set(0.4, 1.05, 0.82);
      wheel.rotation.x = -0.35;
      g.add(wheel);
      var wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.22, 10);
      var tyre = new THREE.MeshPhongMaterial({ color: 0x111111, specular: 0x000000 });
      [[-0.88, -1.3], [0.88, -1.3], [-0.88, 1.35], [0.88, 1.35]].forEach(function (p) {
        var w = new THREE.Mesh(wheelGeo, tyre);
        w.rotation.z = Math.PI / 2;
        w.position.set(p[0], 0.33, p[1]);
        g.add(w);
      });
      var lamp = new THREE.MeshBasicMaterial({ color: 0x4a4740 });
      part(0.3, 0.12, 0.04, lamp, -0.6, 0.72, 2.11);
      part(0.3, 0.12, 0.04, lamp, 0.6, 0.72, 2.11);
      // headlights: one spotlight toward the house (always present, so the light count never changes)
      var beam = new THREE.SpotLight(0xf4ecd0, 0, 32, 0.42, 0.5, 1.2);
      beam.position.set(0, 0.75, 2.2);
      beam.target.position.set(0, 0.2, 14);
      g.add(beam);
      g.add(beam.target);
      return {
        group: g,
        headlights: function (on) {
          beam.intensity = on ? 1.6 : 0;
          lamp.color.setHex(on ? 0xfff6dc : 0x4a4740);
        },
        breakWindow: function () {
          glassSide.visible = false;
        },
        fixWindow: function () {
          glassSide.visible = true;
        },
      };
    })();

    // ---- the porch bush (the fake rock with the spare key is under it) -----------------------------
    (function () {
      var leaf = new THREE.MeshPhongMaterial({ color: 0x1b2a17, specular: 0x000000, flatShading: true });
      [[5.4, 0.45, -0.75, 0.55], [5.9, 0.4, -0.6, 0.45], [5.6, 0.62, -0.5, 0.4]].forEach(function (b) {
        var m = new THREE.Mesh(new THREE.IcosahedronGeometry(b[3], 0), leaf);
        m.position.set(b[0], b[1], b[2]);
        scene.add(m);
      });
    })();

    // ---- the broom: leaning in the laundry room corner, in Mason's hands, or jammed in the slider track
    var broom = (function () {
      var g = new THREE.Group();
      scene.add(g);
      var stick = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 6), mat('wood'));
      stick.position.y = 0.72;
      g.add(stick);
      var head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.07), mat('fabric2'));
      head.position.y = 0.07;
      g.add(head);
      var api = {
        where: 'corner',
        set: function (where) {
          api.where = where;
          g.visible = where !== 'held';
          if (where === 'corner') {
            g.position.set(4.78, 0, 12.75);
            g.rotation.set(0.12, 0, -0.12);
          } else if (where === 'track') {
            // lying in the slider's floor track, from the fixed pane to the sliding one
            g.position.set(19.0, 0.04, 7.93);
            g.rotation.set(0, 0, Math.PI / 2);
          }
        },
      };
      api.set('corner');
      return api;
    })();

    // ---- the guest room closet: two doors with a two-inch gap, and what is behind it ---------------
    var closet = (function () {
      box(0.86, 2.08, 0.04, 'door', 0.55, 1.06, 17.57); // left door
      var right = box(0.86, 2.08, 0.04, 'door', 1.45, 1.06, 17.57); // right door, the one that opens
      var gap = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.04), new THREE.MeshBasicMaterial({ color: 0x010101 }));
      gap.rotation.y = Math.PI;
      gap.position.set(1.0, 1.06, 17.585);
      scene.add(gap);
      // the eye: pale, bloodshot, unblinking
      var c = document.createElement('canvas');
      c.width = 32;
      c.height = 24;
      var g = c.getContext('2d');
      g.fillStyle = '#010101';
      g.fillRect(0, 0, 32, 24);
      g.fillStyle = '#d9d4c8';
      g.beginPath();
      g.ellipse(16, 12, 14, 7, 0, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(150,30,30,0.7)';
      g.lineWidth = 1;
      [[3, 11, 9, 12], [4, 14, 10, 13], [29, 10, 23, 12], [28, 14, 22, 13]].forEach(function (l) {
        g.beginPath();
        g.moveTo(l[0], l[1]);
        g.lineTo(l[2], l[3]);
        g.stroke();
      });
      g.fillStyle = '#5d6b5f';
      g.beginPath();
      g.arc(15, 12, 5.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#000';
      g.beginPath();
      g.arc(15, 12, 2.6, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.fillRect(13, 10, 1, 1); // the glint
      var eyeTex = new THREE.CanvasTexture(c);
      eyeTex.magFilter = THREE.NearestFilter;
      var eye = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.05), new THREE.MeshBasicMaterial({ map: eyeTex, color: 0xd6d2ca }));
      eye.rotation.y = Math.PI;
      eye.position.set(1.0, 0.86, 17.58);
      eye.visible = false;
      scene.add(eye);
      var target = 0;
      var hinge = 0;
      var api = {
        eyeAt: { x: 1.0, y: 0.86, z: 17.58 },
        showEye: function (v) {
          eye.visible = !!v;
        },
        // the right door swinging open (the intruder coming out)
        burst: function () {
          target = 1.4;
        },
        reset: function () {
          target = 0;
          hinge = 0;
          right.position.set(1.45, 1.06, 17.57);
          right.rotation.y = 0;
          eye.visible = false;
        },
        update: function (dt) {
          hinge += (target - hinge) * Math.min(1, dt * 9);
          // swing about the door's outer edge (x = 1.88)
          right.rotation.y = hinge;
          right.position.set(1.88 - Math.cos(hinge) * 0.43, 1.06, 17.57 - Math.sin(hinge) * 0.43);
        },
      };
      return api;
    })();

    // ---- Mason's phone, lying on the floor after he drops it -------------------------------------
    var floorPhone = (function () {
      var m = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.012, 0.15), new THREE.MeshBasicMaterial({ color: 0x9fb8d8 }));
      m.position.set(1.3, 0.01, 16.85);
      m.rotation.y = 0.5;
      m.visible = false;
      scene.add(m);
      return {
        set: function (v) {
          m.visible = !!v;
        },
      };
    })();

    // ---- the bathroom door (it starts open, swung back into the bathroom) --------------------------
    var bathDoor = (function () {
      var hinge = new THREE.Group();
      hinge.position.set(5, 0, 21.05);
      scene.add(hinge);
      box(0.04, 2.05, 0.9, 'door', 0, 1.025, 0.45, hinge);
      box(0.12, 0.06, 0.06, 'metal', 0, 1.0, 0.8, hinge);
      var wall = { x0: 4.94, x1: 5.06, z0: 21.05, z1: 21.95, y0: 0, y1: 2.1, kind: 'door' };
      var door = OC.doors.createDoor({ box: wall, boxes: world.boxes, closed: false });
      var OPEN = -Math.PI / 2;
      var target = OPEN;
      var speed = 5;
      hinge.rotation.y = OPEN;
      var api = {
        closed: false,
        // pass the player's position: the door will not close on them (returns false if it can't)
        close: function (playerPos) {
          if (!door.close(playerPos)) return false;
          api.closed = true;
          target = 0;
          speed = 5;
          return true;
        },
        open: function (fast) {
          api.closed = false;
          target = OPEN;
          speed = fast ? 14 : 5;
          door.open();
        },
        update: function (dt) {
          hinge.rotation.y += (target - hinge.rotation.y) * Math.min(1, dt * speed);
        },
      };
      return api;
    })();

    // ---- the laundry room door (night one closes it; it starts open, swung back into the room) -------
    var laundryDoor = (function () {
      var hinge = new THREE.Group();
      hinge.position.set(5, 0, 10.05);
      scene.add(hinge);
      box(0.04, 2.05, 0.9, 'door', 0, 1.025, 0.45, hinge);
      box(0.12, 0.06, 0.06, 'metal', 0, 1.0, 0.8, hinge);
      var wall = { x0: 4.94, x1: 5.06, z0: 10.05, z1: 10.95, y0: 0, y1: 2.1, kind: 'door' };
      var door = OC.doors.createDoor({ box: wall, boxes: world.boxes, closed: false });
      var OPEN = -Math.PI / 2;
      var target = OPEN;
      var speed = 5;
      hinge.rotation.y = OPEN;
      var api = {
        closed: false,
        at: { x: 5, y: 1.0, z: 10.5 },
        // pass the player's position: the door will not close on them (returns false if it can't)
        close: function (playerPos, instant) {
          if (!door.close(playerPos)) return false;
          api.closed = true;
          target = 0;
          speed = 5;
          if (instant) hinge.rotation.y = 0;
          return true;
        },
        open: function (slow) {
          api.closed = false;
          target = OPEN;
          speed = slow ? 1.2 : 5;
          door.open();
        },
        reset: function () {
          door.open();
          api.closed = false;
          target = OPEN;
          hinge.rotation.y = OPEN;
        },
        update: function (dt) {
          hinge.rotation.y += (target - hinge.rotation.y) * Math.min(1, dt * speed);
        },
      };
      return api;
    })();

    // ---- him: a hooded figure with a pale face and a crowbar --------------------------------------
    var intruder = (function () {
      var g = new THREE.Group(); // faces local +z
      g.visible = false;
      scene.add(g);
      var cloth = new THREE.MeshPhongMaterial({ color: 0x121316, specular: 0x000000 });
      // the face glows faintly: a pale face in a dark window has to read even where there is no light
      var skin = new THREE.MeshBasicMaterial({ color: 0x8a837b });
      var iron = new THREE.MeshPhongMaterial({ color: 0x2a2d31, specular: 0x333333, shininess: 30 });
      function part(w, h, d, m, x, y, z, parent) {
        var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
        mesh.position.set(x, y, z);
        (parent || g).add(mesh);
        return mesh;
      }
      part(0.46, 0.64, 0.26, cloth, 0, 1.12, 0);
      part(0.4, 0.2, 0.24, cloth, 0, 0.78, 0);
      var head = new THREE.Group();
      head.position.set(0, 1.58, 0);
      g.add(head);
      part(0.27, 0.31, 0.29, cloth, 0, 0.02, -0.01, head); // hood
      // the face: an oval drawn on a canvas, pale in the middle and shadowed at the edges
      var fc = document.createElement('canvas');
      fc.width = 32;
      fc.height = 40;
      var fg = fc.getContext('2d');
      var grad = fg.createRadialGradient(16, 18, 2, 16, 20, 17);
      grad.addColorStop(0, '#b7b0a6');
      grad.addColorStop(0.7, '#7d766e');
      grad.addColorStop(1, '#2a2725');
      fg.fillStyle = grad;
      fg.beginPath();
      fg.ellipse(16, 20, 13, 18, 0, 0, Math.PI * 2);
      fg.fill();
      fg.fillStyle = 'rgba(10,8,8,0.85)'; // eye sockets
      fg.beginPath();
      fg.ellipse(10.5, 17, 4, 2.6, 0, 0, Math.PI * 2);
      fg.ellipse(21.5, 17, 4, 2.6, 0, 0, Math.PI * 2);
      fg.fill();
      fg.fillStyle = '#c9c4ba'; // the wet glint of eyes that are looking straight at you
      fg.fillRect(11, 16, 1, 1);
      fg.fillRect(22, 16, 1, 1);
      fg.fillStyle = 'rgba(30,25,22,0.6)';
      fg.fillRect(15, 20, 2, 6); // nose shadow
      fg.fillRect(11, 30, 10, 1); // mouth
      var faceTex = new THREE.CanvasTexture(fc);
      faceTex.magFilter = THREE.NearestFilter;
      skin.map = faceTex;
      skin.color.setHex(0xffffff);
      skin.transparent = true;
      skin.alphaTest = 0.5;
      var face = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.22), skin);
      face.position.set(0, -0.01, 0.137);
      head.add(face);
      // red-eye: what a camera flash does to eyes that are wide open in the dark
      var redMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, fog: false });
      var redEyes = [-0.029, 0.029].map(function (x) {
        var e = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.02), redMat);
        e.position.set(x, 0.007, 0.139);
        e.visible = false;
        head.add(e);
        return e;
      });
      var legs = [-0.11, 0.11].map(function (x) {
        var hip = new THREE.Group();
        hip.position.set(x, 0.7, 0);
        g.add(hip);
        part(0.15, 0.7, 0.17, cloth, 0, -0.35, 0, hip);
        return hip;
      });
      var arms = [-0.3, 0.3].map(function (x) {
        var sh = new THREE.Group();
        sh.position.set(x, 1.4, 0);
        g.add(sh);
        part(0.12, 0.62, 0.12, cloth, 0, -0.3, 0, sh);
        return sh;
      });
      part(0.03, 0.78, 0.03, iron, 0, -0.62, 0.08, arms[1]); // the crowbar, in his right hand
      var phase = 0;
      var api = {
        pos: { x: 0, z: 0 },
        heading: 0,
        crouch: 0,
        raise: 0, // 0..1: the crowbar arm lifted for a swing
        show: function (v) {
          g.visible = !!v;
        },
        redEye: function (v) {
          redEyes.forEach(function (e) { e.visible = !!v; });
        },
        visible: function () {
          return g.visible;
        },
        setPos: function (x, z) {
          api.pos.x = x;
          api.pos.z = z;
        },
        faceTo: function (x, z) {
          api.heading = Math.atan2(x - api.pos.x, z - api.pos.z);
        },
        // step toward a point; returns true on arrival
        stepTo: function (x, z, speed, dt) {
          var dx = x - api.pos.x;
          var dz = z - api.pos.z;
          var d = Math.hypot(dx, dz);
          if (d < 0.05) return true;
          var s = Math.min(d, speed * dt);
          api.pos.x += (dx / d) * s;
          api.pos.z += (dz / d) * s;
          api.heading = Math.atan2(dx, dz);
          phase += dt * speed * 4.5;
          return false;
        },
        update: function () {
          var swing = Math.sin(phase) * 0.55;
          legs[0].rotation.x = swing;
          legs[1].rotation.x = -swing;
          arms[0].rotation.x = -swing * 0.6;
          arms[1].rotation.x = -api.raise * 2.6 + swing * 0.3 * (1 - api.raise);
          head.rotation.x = api.crouch * 0.35;
          g.position.set(api.pos.x, -0.42 * api.crouch, api.pos.z);
          g.rotation.y = api.heading;
        },
      };
      return api;
    })();

    // ---- broken glass falling into the car ---------------------------------------------------------
    var shards = (function () {
      var list = [];
      var m = new THREE.MeshBasicMaterial({ color: 0x9fb2bf, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      for (var i = 0; i < 16; i++) {
        var s = new THREE.Mesh(new THREE.PlaneGeometry(0.05 + Math.random() * 0.05, 0.04 + Math.random() * 0.05), m);
        s.visible = false;
        scene.add(s);
        list.push({ mesh: s, v: new THREE.Vector3(), alive: false });
      }
      return {
        burst: function (x, y, z) {
          list.forEach(function (p) {
            p.mesh.position.set(x + (Math.random() - 0.5) * 0.1, y + (Math.random() - 0.5) * 0.4, z + (Math.random() - 0.5) * 1.6);
            p.v.set(-0.8 - Math.random() * 1.4, Math.random() * 0.8, (Math.random() - 0.5) * 0.6);
            p.mesh.visible = true;
            p.alive = true;
          });
        },
        clear: function () {
          list.forEach(function (p) {
            p.mesh.visible = false;
            p.alive = false;
          });
        },
        update: function (dt) {
          list.forEach(function (p) {
            if (!p.alive) return;
            p.v.y -= 9.8 * dt;
            p.mesh.position.addScaledVector(p.v, dt);
            p.mesh.rotation.x += dt * 7;
            p.mesh.rotation.y += dt * 5;
            if (p.mesh.position.y < 0.4) {
              p.mesh.position.y = 0.4;
              p.alive = false;
            }
          });
        },
      };
    })();

    // ---- lights, by id (each act sets its own levels) ----------------------------------------------
    function setLights(levels) {
      Object.keys(levels).forEach(function (id) {
        var l = world.lightById[id];
        if (l) l.intensity = levels[id];
      });
    }

    // ---- Dave's bedroom windows: a lamp behind the blinds, and sometimes someone standing there ------
    // Everything here faces outward (+x), so it can be seen from the courtyard and the living room
    // but not from inside the master bedroom itself.
    var master = (function () {
      // Layers from the courtyard inward: glass (x 13.0), blinds (12.95), the figure (12.91), the glow
      // (12.87). Kept tight against the glass so the wall's thickness does not hide them at an angle.
      var glowMat = new THREE.MeshBasicMaterial({ color: 0xe0a865 });
      var windows = [17.5, 21.5];
      var glows = windows.map(function (z) {
        var p = new THREE.Mesh(new THREE.PlaneGeometry(1.96, 1.38), glowMat);
        p.rotation.y = Math.PI / 2;
        p.position.set(12.87, 1.5, z);
        p.visible = false;
        scene.add(p);
        return p;
      });
      var slatMat = new THREE.MeshPhongMaterial({ color: 0x8a7f6a, specular: 0x000000 });
      windows.forEach(function (z) {
        for (var y = 0.86; y < 2.2; y += 0.105) {
          var s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 1.98), slatMat);
          s.position.set(12.95, y, z);
          scene.add(s);
        }
      });
      // a person-shaped cut-out, drawn on a canvas
      var c = document.createElement('canvas');
      c.width = 64;
      c.height = 128;
      var g = c.getContext('2d');
      g.fillStyle = '#000';
      g.beginPath();
      g.ellipse(32, 18, 10, 13, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(27, 28, 10, 8);
      g.beginPath();
      g.moveTo(10, 46);
      g.quadraticCurveTo(14, 36, 32, 35);
      g.quadraticCurveTo(50, 36, 54, 46);
      g.lineTo(56, 128);
      g.lineTo(8, 128);
      g.closePath();
      g.fill();
      var figTex = new THREE.CanvasTexture(c);
      var figure = new THREE.Mesh(
        new THREE.PlaneGeometry(0.62, 1.24),
        new THREE.MeshBasicMaterial({ map: figTex, transparent: true, alphaTest: 0.5 })
      );
      figure.rotation.y = Math.PI / 2;
      figure.visible = false;
      scene.add(figure);
      var api = {
        stage: 'off',
        windows: windows.map(function (z) { return { x: 13, y: 1.5, z: z }; }),
        // 'off' | 'lampOn' | 'figureA' | 'figureB' | 'gone'
        setStage: function (s) {
          api.stage = s;
          var lit = s === 'lampOn' || s === 'figureA' || s === 'figureB';
          glows.forEach(function (p) { p.visible = lit; });
          figure.visible = s === 'figureA' || s === 'figureB';
          if (s === 'figureA') figure.position.set(12.91, 1.42, 17.3);
          if (s === 'figureB') figure.position.set(12.91, 1.47, 21.7);
        },
        // where to look to see the current stage
        focus: function () {
          return api.stage === 'figureB' ? api.windows[1] : api.windows[0];
        },
      };
      return api;
    })();

    var api = {
      bathDoor: bathDoor,
      laundryDoor: laundryDoor,
      decor: null, // js/decor.js attaches the night-one props here
      // put the props that acts did not reset themselves before Phase 1 back to their defaults
      reset: function () {
        laundryDoor.reset();
        setLights({ bath: 0 }); // added in Phase 1: the older acts do not set it themselves
        if (api.decor) api.decor.reset();
      },
      intruder: intruder,
      shards: shards,
      closet: closet,
      floorPhone: floorPhone,
      car: car,
      broom: broom,
      setLights: setLights,
      master: master,
      slider: slider,
      frontDoor: frontDoor,
      hatch: hatch,
      tv: tv,
      microwave: microwave,
      bowl: bowl,
      update: function (dt) {
        tv.update(dt);
        frontDoor.update(dt);
        hatch.update(dt);
        closet.update(dt);
        bathDoor.update(dt);
        laundryDoor.update(dt);
        intruder.update(dt);
        shards.update(dt);
        if (api.decor) api.decor.update(dt);
      },
    };
    return api;
  }

  OC.props = { build: build };
})();
