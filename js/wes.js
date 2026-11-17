// Wes Hale, built to be remembered (docs/story-v2.md): 6'5" and skeletal, stooped from years under the
// house with his head pushed forward; the same faded navy OAKRIDGE TIGERS hoodie from the 1999 poster,
// too small now, the sleeves stopping short of long pale bony wrists; barefoot; insulation on his
// shoulders; a calm, gentle, too-wide smile that never changes, and eyes wide open.
// A jointed figure made of boxes, like Cooper, so every pose is ours: stand, tilt (his head, like a
// dog listening), crouch, unfold (rising slowly to his full height, knees popping), crawl, and a finger
// held to his lips. Keeps the old intruder's API (setPos, faceTo, stepTo, crouch, raise, show,
// redEye), so the acts that drive him keep working.
(function () {
  var OC = (window.OC = window.OC || {});

  var SKIN = 0x9a9086;
  var DIRT = 0x6e655c;
  var HOODIE = 0x1b2335;
  var PANTS = 0x2a2c31;

  function faceTexture() {
    var W = 128;
    var H = 160;
    var c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    var g = c.getContext('2d');
    var seed = 11;
    function rnd() {
      seed = (seed * 1103515245 + 12345) >>> 0;
      return (seed % 10000) / 10000;
    }
    // grey, sunless skin, lit from above, falling away into the hood at the edges
    var base = g.createRadialGradient(64, 62, 6, 64, 78, 78);
    base.addColorStop(0, '#a39a8d');
    base.addColorStop(0.55, '#7f776c');
    base.addColorStop(0.85, '#3b3631');
    base.addColorStop(1, '#0d0c0b');
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    for (var i = 0; i < 1400; i++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(40,34,30,0.08)' : 'rgba(190,180,165,0.06)';
      g.fillRect((rnd() * W) | 0, (rnd() * H) | 0, 2, 2);
    }
    function shade(x, y, rx, ry, a) {
      var gr = g.createRadialGradient(x, y, 1, x, y, Math.max(rx, ry));
      gr.addColorStop(0, 'rgba(18,14,12,' + a + ')');
      gr.addColorStop(1, 'rgba(18,14,12,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      g.fill();
    }
    shade(26, 92, 16, 22, 0.55); // hollow cheeks
    shade(102, 92, 16, 22, 0.55);
    shade(42, 62, 20, 15, 0.75); // deep sockets
    shade(86, 62, 20, 15, 0.75);
    shade(64, 30, 40, 10, 0.25); // the hood's shadow on the brow
    // eyes, wide open and unblinking: almond shapes, white showing all round the iris
    function eye(cx) {
      g.fillStyle = '#d2cab6';
      g.beginPath();
      g.moveTo(cx - 13, 62);
      g.quadraticCurveTo(cx, 51, cx + 13, 62);
      g.quadraticCurveTo(cx, 71, cx - 13, 62);
      g.fill();
      g.fillStyle = '#626a60';
      g.beginPath();
      g.arc(cx, 62, 4.2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#0a0a0a';
      g.beginPath();
      g.arc(cx, 62, 2, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.8)';
      g.fillRect(cx - 2, 60, 1, 1);
      g.strokeStyle = 'rgba(25,18,16,0.9)'; // the lids
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(cx - 14, 62);
      g.quadraticCurveTo(cx, 50, cx + 14, 62);
      g.stroke();
      g.strokeStyle = 'rgba(90,40,40,0.5)'; // red rims
      g.beginPath();
      g.moveTo(cx - 12, 64);
      g.quadraticCurveTo(cx, 71, cx + 12, 64);
      g.stroke();
    }
    eye(42);
    eye(86);
    g.strokeStyle = 'rgba(60,50,44,0.7)'; // thin brows, raised a little: calm, interested
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(28, 46);
    g.quadraticCurveTo(42, 41, 55, 45);
    g.moveTo(73, 45);
    g.quadraticCurveTo(86, 41, 100, 46);
    g.stroke();
    shade(64, 80, 6, 14, 0.4); // the nose
    g.fillStyle = 'rgba(30,24,22,0.6)';
    g.fillRect(57, 92, 4, 2);
    g.fillRect(67, 92, 4, 2);
    // the beard: overgrown, dark at the jaw, thinning toward the cheeks
    var jaw = g.createLinearGradient(0, 96, 0, 160);
    jaw.addColorStop(0, 'rgba(45,39,33,0)');
    jaw.addColorStop(0.35, 'rgba(45,39,33,0.75)');
    jaw.addColorStop(1, 'rgba(25,21,18,0.95)');
    g.fillStyle = jaw;
    g.fillRect(0, 96, W, 64);
    for (var k = 0; k < 900; k++) {
      var bx = (rnd() * W) | 0;
      var by = 100 + ((rnd() * 60) | 0);
      g.fillStyle = rnd() < 0.5 ? 'rgba(70,62,52,0.7)' : 'rgba(20,17,15,0.7)';
      g.fillRect(bx, by, 1, 2 + ((rnd() * 3) | 0));
    }
    // the smile: calm, gentle, never changing, too wide; cracked pale lips
    g.strokeStyle = '#1a1211';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(24, 106);
    g.quadraticCurveTo(64, 126, 104, 106);
    g.stroke();
    g.strokeStyle = 'rgba(160,130,118,0.75)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(30, 110);
    g.quadraticCurveTo(64, 128, 98, 110);
    g.stroke();
    g.strokeStyle = 'rgba(25,18,16,0.6)'; // the creases the smile pulls into his cheeks
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(22, 98);
    g.quadraticCurveTo(19, 106, 24, 112);
    g.moveTo(106, 98);
    g.quadraticCurveTo(109, 106, 104, 112);
    g.stroke();
    var t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
  }

  function printTexture() {
    var c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    var g = c.getContext('2d');
    g.fillStyle = '#1b2335';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#8f8667';
    g.font = 'bold 9px monospace';
    g.fillText('OAKRIDGE', 10, 22);
    g.font = 'bold 13px monospace';
    g.fillText('TIGERS', 8, 37);
    var seed = 5;
    for (var i = 0; i < 260; i++) {
      seed = (seed * 1103515245 + 12345) >>> 0;
      var x = seed % 64;
      seed = (seed * 1103515245 + 12345) >>> 0;
      var y = 10 + (seed % 32);
      g.fillStyle = '#1b2335'; // the print, cracked
      g.fillRect(x, y, 1 + (seed % 2), 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
  }

  // pose targets (radians, metres). Joints: spine, neck, head roll (tilt), shoulders, elbows, hips,
  // knees, and how low the pelvis sits.
  var POSES = {
    stand: { pelvis: 1.09, spine: 0.22, neck: 0.38, tilt: 0, nod: -0.1, lean: 0, armL: 0.12, armR: 0.12, elbowL: -0.2, elbowR: -0.2, hipL: 0.04, hipR: 0.04, kneeL: 0.08, kneeR: 0.08, inR: 0, finger: 0 },
    tilt: { pelvis: 1.09, spine: 0.24, neck: 0.42, tilt: 0.5, nod: 0.05, lean: 0.04, armL: 0.1, armR: 0.1, elbowL: -0.15, elbowR: -0.15, hipL: 0.04, hipR: 0.04, kneeL: 0.08, kneeR: 0.08, inR: 0, finger: 0 },
    crouch: { pelvis: 0.52, spine: 0.75, neck: 0.15, tilt: 0.15, nod: -0.25, lean: 0, armL: 0.6, armR: 0.6, elbowL: -0.9, elbowR: -0.9, hipL: 1.55, hipR: 1.55, kneeL: 2.35, kneeR: 2.35, inR: 0, finger: 0 },
    crawl: { pelvis: 0.5, spine: 1.45, neck: -0.9, tilt: 0, nod: -0.3, lean: 0, armL: 1.4, armR: 1.4, elbowL: 0, elbowR: 0, hipL: 0, hipR: 0, kneeL: 1.55, kneeR: 1.55, inR: 0, finger: 0 },
    shush: { pelvis: 1.09, spine: 0.2, neck: 0.32, tilt: 0.2, nod: -0.05, lean: 0, armL: 0.1, armR: 1.35, elbowL: -0.2, elbowR: -2.25, inR: 0.95, hipL: 0.04, hipR: 0.04, kneeL: 0.08, kneeR: 0.08, finger: 1 },
    peek: { pelvis: 1.06, spine: 0.3, neck: 0.4, tilt: 0.35, nod: 0, lean: 0.22, armL: 0.1, armR: 0.25, elbowL: -0.2, elbowR: -0.5, hipL: 0.06, hipR: 0.06, kneeL: 0.1, kneeR: 0.1, inR: 0, finger: 0 },
  };

  function create(scene) {
    var root = new THREE.Group(); // faces local +z
    root.visible = false;
    scene.add(root);
    var mats = {
      hoodie: new THREE.MeshPhongMaterial({ color: HOODIE, specular: 0x000000 }),
      print: new THREE.MeshPhongMaterial({ map: printTexture(), specular: 0x000000 }),
      pants: new THREE.MeshPhongMaterial({ color: PANTS, specular: 0x000000 }),
      skin: new THREE.MeshPhongMaterial({ color: SKIN, specular: 0x000000 }),
      dirt: new THREE.MeshPhongMaterial({ color: DIRT, specular: 0x000000 }),
      fluff: new THREE.MeshPhongMaterial({ color: 0xc99aa0, specular: 0x000000 }),
      iron: new THREE.MeshPhongMaterial({ color: 0x2a2d31, specular: 0x333333, shininess: 30 }),
    };
    // the face glows a little: a pale face in a dark doorway has to read even where no light falls
    var faceMat = new THREE.MeshBasicMaterial({ map: faceTexture(), color: 0x9a948c });

    function box(w, h, d, mat, x, y, z, parent) {
      var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      parent.add(m);
      return m;
    }
    function joint(x, y, z, parent) {
      var j = new THREE.Group();
      j.position.set(x, y, z);
      parent.add(j);
      return j;
    }

    var pelvis = joint(0, 1.09, 0, root);
    box(0.36, 0.16, 0.2, mats.pants, 0, -0.02, 0, pelvis);
    var spine = joint(0, 0.04, 0, pelvis);
    box(0.4, 0.58, 0.21, mats.hoodie, 0, 0.3, 0, spine); // the hoodie, a size too small
    var printMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), mats.print);
    printMesh.position.set(0, 0.36, 0.106);
    spine.add(printMesh);
    box(0.3, 0.12, 0.04, mats.hoodie, 0, 0.1, 0.11, spine); // the pouch
    box(0.06, 0.03, 0.05, mats.fluff, -0.15, 0.6, -0.02, spine); // insulation on his shoulders
    box(0.05, 0.025, 0.04, mats.fluff, 0.13, 0.6, 0.04, spine);
    var neck = joint(0, 0.6, 0.02, spine);
    box(0.09, 0.08, 0.09, mats.skin, 0, 0.03, 0, neck);
    var head = joint(0, 0.09, 0.03, neck);
    head.rotation.order = 'YXZ';
    box(0.2, 0.25, 0.17, mats.skin, 0, 0.11, -0.02, head); // the head sits behind the face plane
    var faceMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.21), faceMat);
    faceMesh.position.set(0, 0.105, 0.1); // set back in the hood
    head.add(faceMesh);
    // the hood, always up: back, top and sides, the face set back in it
    box(0.27, 0.31, 0.06, mats.hoodie, 0, 0.12, -0.11, head);
    box(0.27, 0.05, 0.27, mats.hoodie, 0, 0.27, 0.0, head);
    box(0.04, 0.3, 0.27, mats.hoodie, -0.125, 0.11, 0.0, head);
    box(0.04, 0.3, 0.27, mats.hoodie, 0.125, 0.11, 0.0, head);
    // red-eye, for the camera's flash
    var redMat = new THREE.MeshBasicMaterial({ color: 0xff2a1a, fog: false });
    var haloMat = new THREE.MeshBasicMaterial({ color: 0xff3a20, fog: false, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
    var redEyes = [-0.04, 0.04].map(function (x) {
      var e = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.03), redMat);
      e.position.set(x, 0.14, 0.115);
      var halo = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.13), haloMat);
      halo.position.z = 0.002;
      e.add(halo);
      e.visible = false;
      head.add(e);
      return e;
    });

    function arm(side) {
      var sh = joint(side * 0.23, 0.56, 0, spine);
      box(0.09, 0.34, 0.09, mats.hoodie, 0, -0.17, 0, sh);
      var el = joint(0, -0.34, 0, sh);
      box(0.085, 0.2, 0.085, mats.hoodie, 0, -0.1, 0, el); // the sleeve stops here...
      box(0.05, 0.13, 0.05, mats.skin, 0, -0.26, 0, el); // ...long pale bony wrist
      var hand = joint(0, -0.33, 0, el);
      box(0.06, 0.18, 0.025, mats.skin, 0, -0.09, 0, hand); // long hands
      var finger = box(0.014, 0.09, 0.014, mats.skin, 0.012, -0.21, 0.004, hand);
      return { sh: sh, el: el, hand: hand, finger: finger };
    }
    var armL = arm(-1);
    var armR = arm(1);
    armR.finger.visible = true;
    armL.finger.visible = false;
    var crowbar = box(0.025, 0.78, 0.025, mats.iron, 0, -0.32, 0.05, armR.hand);
    crowbar.visible = false;

    function leg(side) {
      var hip = joint(side * 0.1, -0.06, 0, pelvis);
      box(0.12, 0.5, 0.13, mats.pants, 0, -0.25, 0, hip);
      var knee = joint(0, -0.5, 0, hip);
      box(0.09, 0.47, 0.1, mats.pants, 0, -0.235, 0, knee);
      box(0.08, 0.05, 0.09, mats.skin, 0, -0.495, 0, knee); // bare ankle
      var foot = box(0.1, 0.07, 0.27, mats.dirt, 0, -0.53, 0.07, knee); // barefoot, filthy
      return { hip: hip, knee: knee, foot: foot };
    }
    var legL = leg(-1);
    var legR = leg(1);

    var cur = JSON.parse(JSON.stringify(POSES.stand));
    var target = POSES.stand;
    var poseName = 'stand';
    var walkPhase = 0;
    var walking = 0;
    var unfold = null; // { t, cb }

    var api = {
      group: root,
      pos: { x: 0, z: 0 },
      heading: 0,
      crouch: 0, // 0..1, the old intruder's crouch (blends toward the crouch pose)
      raise: 0, // 0..1, the crowbar arm lifted for a swing
      crowbar: false,
      lift: 0, // metres up (or down, below something that hides his legs: the car door)
      show: function (v) {
        root.visible = !!v;
      },
      visible: function () {
        return root.visible;
      },
      redEye: function (v) {
        redEyes.forEach(function (e) { e.visible = !!v; });
      },
      setPos: function (x, z) {
        api.pos.x = x;
        api.pos.z = z;
      },
      faceTo: function (x, z) {
        api.heading = Math.atan2(x - api.pos.x, z - api.pos.z);
      },
      // 'stand' | 'tilt' | 'crouch' | 'crawl' | 'shush' (finger to his lips) | 'peek'
      pose: function (name, snap) {
        if (!POSES[name]) throw new Error('unknown pose: ' + name);
        poseName = name;
        target = POSES[name];
        if (snap) cur = JSON.parse(JSON.stringify(target));
      },
      poseName: function () {
        return poseName;
      },
      // rise slowly from a crouch to his full height, knees popping (cb when he is up)
      unfold: function (cb) {
        api.pose('crouch', true);
        unfold = { t: 0, cb: cb || null, popped: 0 };
      },
      // step toward a point at a slow walk; returns true on arrival
      stepTo: function (x, z, speed, dt) {
        var dx = x - api.pos.x;
        var dz = z - api.pos.z;
        var d = Math.hypot(dx, dz);
        if (d < 0.05) return true;
        var s = Math.min(d, speed * dt);
        api.pos.x += (dx / d) * s;
        api.pos.z += (dz / d) * s;
        api.heading = Math.atan2(dx, dz);
        walkPhase += dt * speed * 3.6;
        walking = 1;
        return false;
      },
      update: function (dt) {
        dt = dt || 0.016;
        if (unfold) {
          unfold.t += dt;
          var k = Math.min(1, unfold.t / 3.2);
          var e = k * k * (3 - 2 * k);
          ['pelvis', 'spine', 'neck', 'tilt', 'nod', 'armL', 'armR', 'elbowL', 'elbowR', 'inR', 'hipL', 'hipR', 'kneeL', 'kneeR'].forEach(function (j) {
            cur[j] = POSES.crouch[j] + (POSES.stand[j] - POSES.crouch[j]) * e;
          });
          if (OC.audio && unfold.popped < 2 && unfold.t > 1.0 + unfold.popped * 0.8) {
            unfold.popped++;
            OC.audio.play('kneePop', { pos: { x: api.pos.x, y: 0.6, z: api.pos.z }, gain: 0.8 });
          }
          if (k >= 1) {
            var cb = unfold.cb;
            unfold = null;
            poseName = 'stand';
            target = POSES.stand;
            if (cb) cb();
          }
        } else {
          var r = Math.min(1, dt * 4);
          Object.keys(cur).forEach(function (j) {
            var goal = target[j];
            if (api.crouch > 0 && POSES.crouch[j] !== undefined) goal += (POSES.crouch[j] - goal) * api.crouch;
            cur[j] += (goal - cur[j]) * r;
          });
        }
        // the walk: long slow strides, arms limp
        var stride = walking ? Math.sin(walkPhase) : 0;
        walking = Math.max(0, walking - dt * 4);
        pelvis.position.y = cur.pelvis + (walking ? Math.abs(Math.cos(walkPhase)) * 0.03 : 0);
        spine.rotation.x = cur.spine;
        root.rotation.z = 0;
        spine.rotation.z = cur.lean;
        neck.rotation.x = cur.neck - cur.spine * 0.6;
        head.rotation.x = cur.nod;
        head.rotation.z = cur.tilt;
        var raiseR = api.raise * 2.6;
        armL.sh.rotation.x = -cur.armL - stride * 0.25;
        armR.sh.rotation.x = -cur.armR + stride * 0.25 - raiseR;
        armL.el.rotation.x = cur.elbowL;
        armR.el.rotation.x = cur.elbowR;
        armR.sh.rotation.z = -cur.inR; // across to his mouth
        armR.finger.visible = cur.finger > 0.5;
        legL.hip.rotation.x = -cur.hipL + stride * 0.45;
        legR.hip.rotation.x = -cur.hipR - stride * 0.45;
        legL.knee.rotation.x = cur.kneeL + Math.max(0, -stride) * 0.5;
        legR.knee.rotation.x = cur.kneeR + Math.max(0, stride) * 0.5;
        crowbar.visible = api.crowbar || api.raise > 0.01;
        root.position.set(api.pos.x, api.lift || 0, api.pos.z);
        root.rotation.y = api.heading;
      },
    };
    return api;
  }

  OC.wes = { create: create, POSES: Object.keys(POSES) };
})();
