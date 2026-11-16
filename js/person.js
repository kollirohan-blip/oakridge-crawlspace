// Ordinary people (Deputy Ray, the cashier): a jointed figure like Wes, but built normal, with an
// outfit, a hat and a friendly painted face. They walk the house's paths, turn to face you, and nod
// along while they talk.
(function () {
  var OC = (window.OC = window.OC || {});

  function faceTexture(look) {
    var c = document.createElement('canvas');
    c.width = 64;
    c.height = 80;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 38, 4, 32, 42, 40);
    grad.addColorStop(0, look.skinLight);
    grad.addColorStop(1, look.skinDark);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 80);
    g.fillStyle = '#e9e4da';
    g.fillRect(16, 32, 10, 5);
    g.fillRect(38, 32, 10, 5);
    g.fillStyle = '#3a2c22';
    g.fillRect(19, 32, 4, 5);
    g.fillRect(41, 32, 4, 5);
    g.fillStyle = look.hair;
    g.fillRect(14, 26, 13, 3);
    g.fillRect(37, 26, 13, 3);
    g.fillStyle = 'rgba(60,40,30,0.35)';
    g.fillRect(30, 38, 4, 12);
    if (look.moustache) {
      g.fillStyle = look.hair;
      g.fillRect(22, 54, 20, 4);
    }
    g.fillStyle = '#6a3b33';
    g.fillRect(24, 60, 16, 3);
    if (look.glasses) {
      g.strokeStyle = '#1a1a1a';
      g.lineWidth = 1;
      g.strokeRect(14, 30, 14, 9);
      g.strokeRect(36, 30, 14, 9);
      g.fillStyle = '#1a1a1a';
      g.fillRect(28, 33, 8, 1);
    }
    var t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    return t;
  }

  // look = { shirt, pants, skinLight, skinDark, hair, hat: 'campaign'|'cap'|null, vest?, moustache?, glasses?, height? }
  function create(scene, look) {
    var root = new THREE.Group(); // faces local +z
    root.visible = false;
    scene.add(root);
    var s = (look.height || 1.8) / 1.8;
    root.scale.set(s, s, s);
    function mat(c) {
      return new THREE.MeshPhongMaterial({ color: c, specular: 0x000000 });
    }
    var shirt = mat(look.shirt);
    var pants = mat(look.pants);
    var skin = mat(new THREE.Color(look.skinLight).getHex());
    var shoe = mat(0x1d1a17);
    function box(w, h, d, m, x, y, z, parent) {
      var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      o.position.set(x, y, z);
      parent.add(o);
      return o;
    }
    function joint(x, y, z, parent) {
      var j = new THREE.Group();
      j.position.set(x, y, z);
      parent.add(j);
      return j;
    }
    var pelvis = joint(0, 0.95, 0, root);
    box(0.38, 0.18, 0.22, pants, 0, 0, 0, pelvis);
    var spine = joint(0, 0.06, 0, pelvis);
    box(0.44, 0.56, 0.24, shirt, 0, 0.28, 0, spine);
    if (look.vest) box(0.46, 0.4, 0.26, mat(look.vest), 0, 0.3, 0, spine);
    if (look.badge) box(0.06, 0.07, 0.01, mat(0xc9a94a), -0.11, 0.4, 0.126, spine);
    var neck = joint(0, 0.58, 0, spine);
    box(0.1, 0.08, 0.1, skin, 0, 0.03, 0, neck);
    var head = joint(0, 0.08, 0, neck);
    box(0.21, 0.25, 0.2, skin, 0, 0.12, -0.01, head);
    var face = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.23), new THREE.MeshPhongMaterial({ map: faceTexture(look), specular: 0x000000 }));
    face.position.set(0, 0.12, 0.092);
    head.add(face);
    box(0.22, 0.06, 0.21, mat(new THREE.Color(look.hair).getHex()), 0, 0.25, -0.01, head);
    if (look.hat === 'campaign') {
      box(0.42, 0.02, 0.42, mat(0x6b5a3c), 0, 0.27, 0, head);
      box(0.22, 0.1, 0.22, mat(0x6b5a3c), 0, 0.32, 0, head);
    } else if (look.hat === 'cap') {
      box(0.23, 0.07, 0.22, mat(look.capColor || 0x8a2a22), 0, 0.27, -0.01, head);
      box(0.2, 0.02, 0.1, mat(look.capColor || 0x8a2a22), 0, 0.245, 0.13, head);
    }
    function limb(x, y, len, w, m, parent, end) {
      var j = joint(x, y, 0, parent);
      box(w, len, w, m, 0, -len / 2, 0, j);
      if (end) box(end[0], end[1], end[2], end[3], 0, -len - end[1] / 2, end[4] || 0, j);
      return j;
    }
    var armL = limb(-0.27, 0.54, 0.62, 0.1, shirt, spine, [0.08, 0.14, 0.05, skin]);
    var armR = limb(0.27, 0.54, 0.62, 0.1, shirt, spine, [0.08, 0.14, 0.05, skin]);
    var legL = limb(-0.1, -0.06, 0.88, 0.13, pants, pelvis, [0.12, 0.07, 0.26, shoe, 0.06]);
    var legR = limb(0.1, -0.06, 0.88, 0.13, pants, pelvis, [0.12, 0.07, 0.26, shoe, 0.06]);

    var phase = 0;
    var walking = 0;
    var talkT = 0;
    var route = [];
    var onArrive = null;
    var api = {
      group: root,
      pos: { x: 0, z: 0 },
      heading: 0,
      show: function (v) {
        root.visible = !!v;
      },
      visible: function () {
        return root.visible;
      },
      setPos: function (x, z) {
        api.pos.x = x;
        api.pos.z = z;
      },
      faceTo: function (x, z) {
        api.heading = Math.atan2(x - api.pos.x, z - api.pos.z);
      },
      // walk to a point along the house's paths (nav may be null: straight line); cb on arrival
      walkTo: function (x, z, nav, cb) {
        var p = nav ? nav.findPath(api.pos, { x: x, z: z }) : null;
        route = p && p.length ? p : [{ x: x, z: z }];
        onArrive = cb || null;
      },
      walking: function () {
        return route.length > 0;
      },
      // nod along while talking, for this many seconds
      talk: function (seconds) {
        talkT = seconds || 2;
      },
      update: function (dt) {
        if (route.length) {
          var wp = route[0];
          var dx = wp.x - api.pos.x;
          var dz = wp.z - api.pos.z;
          var d = Math.hypot(dx, dz);
          var step = Math.min(d, 1.25 * dt);
          if (d > 0.01) {
            api.pos.x += (dx / d) * step;
            api.pos.z += (dz / d) * step;
            api.heading = Math.atan2(dx, dz);
          }
          if (d < 0.08) route.shift();
          phase += dt * 6;
          walking = 1;
          if (!route.length && onArrive) {
            var cb = onArrive;
            onArrive = null;
            cb();
          }
        } else walking = Math.max(0, walking - dt * 5);
        var sw = Math.sin(phase) * 0.5 * walking;
        legL.rotation.x = sw;
        legR.rotation.x = -sw;
        armL.rotation.x = -sw * 0.7;
        armR.rotation.x = sw * 0.7;
        talkT = Math.max(0, talkT - dt);
        head.rotation.x = talkT > 0 ? Math.sin(talkT * 9) * 0.08 : 0;
        root.position.set(api.pos.x, 0, api.pos.z);
        root.rotation.y = api.heading;
      },
    };
    return api;
  }

  OC.person = { create: create };
})();
