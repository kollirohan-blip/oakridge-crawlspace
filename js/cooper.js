// Cooper, the golden retriever. A small low-poly dog that follows Mason, goes where he is sent, eats,
// stares at whatever is wrong before the player notices it, does tricks, fetches, begs at the table,
// and will not set foot in the laundry room.
(function () {
  var OC = (window.OC = window.OC || {});
  var RADIUS = 0.25;
  var WALK = 1.8;

  // pose targets: rig offset/rotation and leg angles (front-left, front-right, back-left, back-right)
  var POSES = {
    stand: { y: 0, z: 0, rx: 0, rz: 0, legs: [0, 0, 0, 0], head: 0 },
    sit: { y: -0.08, z: 0, rx: 0, rz: 0.42, legs: [-0.42, -0.42, 1.25, 1.25], head: -0.25 },
    beg: { y: -0.08, z: 0, rx: 0, rz: 0.42, legs: [-0.42, -0.42, 1.25, 1.25], head: 0.25 },
    paw: { y: -0.08, z: 0, rx: 0, rz: 0.42, legs: [0.9, -0.42, 1.25, 1.25], head: -0.1 },
    lie: { y: -0.3, z: 0, rx: 0, rz: 0, legs: [1.45, 1.45, 1.45, 1.45], head: 0.15 },
    playDead: { y: 0.12, z: -0.5, rx: 1.45, rz: 0, legs: [0.3, -0.3, -0.3, 0.3], head: 0.2 },
  };

  function create(world, ctl, start) {
    var fur = new THREE.MeshPhongMaterial({ color: 0xb58a45, specular: 0x000000, shininess: 1 });
    var dark = new THREE.MeshPhongMaterial({ color: 0x3a2a1a, specular: 0x000000, shininess: 1 });
    function part(w, h, d, m, x, y, z, parent) {
      var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    }

    var group = new THREE.Group(); // local +x is the way the dog faces
    var rig = new THREE.Group(); // everything that bends into a pose
    group.add(rig);
    part(0.85, 0.38, 0.36, fur, 0, 0.55, 0, rig);
    part(0.3, 0.42, 0.34, fur, 0.4, 0.58, 0, rig);
    var head = new THREE.Group();
    head.position.set(0.55, 0.74, 0);
    head.rotation.order = 'YZX';
    rig.add(head);
    part(0.3, 0.28, 0.28, fur, 0.13, 0.05, 0, head);
    part(0.18, 0.12, 0.16, fur, 0.35, -0.02, 0, head);
    part(0.05, 0.06, 0.07, dark, 0.45, 0.01, 0, head);
    var ears = [part(0.08, 0.2, 0.1, dark, 0.04, 0.17, 0.15, head), part(0.08, 0.2, 0.1, dark, 0.04, 0.17, -0.15, head)];
    var tail = new THREE.Group();
    tail.position.set(-0.43, 0.66, 0);
    rig.add(tail);
    part(0.4, 0.1, 0.1, fur, -0.2, 0.04, 0, tail);
    var legs = [];
    [[0.3, 0.13], [0.3, -0.13], [-0.3, 0.13], [-0.3, -0.13]].forEach(function (p) {
      var hip = new THREE.Group();
      hip.position.set(p[0], 0.36, p[1]);
      rig.add(hip);
      part(0.1, 0.34, 0.1, fur, 0, -0.17, 0, hip);
      legs.push(hip);
    });
    world.group.add(group);

    var api = {
      pos: { x: start.x, z: start.z },
      heading: 0,
      mode: 'follow', // follow | goto | eat | stare | idle | fetch | sniff
      poseName: 'stand',
      waiting: false, // sitting outside the room he will not go into
      onArrive: null,
      lookAt: null,
    };
    var phase = 0;
    var eatLeft = 0;
    var stuck = 0;
    var goal = null;
    var onEatDone = null;
    var route = []; // waypoints from the path-finder
    var routeT = 0;
    var cur = JSON.parse(JSON.stringify(POSES.stand)); // the pose being eased toward the target
    var earsFlat = false;
    var wagLevel = null; // null: automatic
    var wagSpeed = 1;
    var headTarget = null; // look at a point while lying or sitting
    var avoid = null; // { rect, wait }
    var whineT = 0;
    var fetchState = null; // { ball, stage: 'out'|'back', cb }
    var sniffState = null;

    function planTo(x, z) {
      var p = ctl.nav ? ctl.nav.findPath(api.pos, { x: x, z: z }) : null;
      route = p || [{ x: x, z: z }];
    }
    // follow the current route; returns how far it moved this frame
    function walkRoute(speed, dt) {
      if (!route.length) return 0;
      var wp = route[0];
      var moved = stepToward(wp.x, wp.z, speed, dt);
      if (Math.hypot(wp.x - api.pos.x, wp.z - api.pos.z) < 0.12) route.shift();
      return moved;
    }

    function turnToward(angle, dt) {
      var d = angle - api.heading;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      api.heading += d * Math.min(1, dt * 7);
    }
    function faceAngle(x, z) {
      return Math.atan2(-(z - api.pos.z), x - api.pos.x);
    }

    function stepToward(tx, tz, speed, dt) {
      var dx = tx - api.pos.x;
      var dz = tz - api.pos.z;
      var dist = Math.hypot(dx, dz);
      if (dist < 0.05) return 0;
      var step = Math.min(dist, speed * dt);
      var before = { x: api.pos.x, z: api.pos.z };
      var p = OC.collision.resolveMove(api.pos, { x: (dx / dist) * step, z: (dz / dist) * step }, ctl.boxes, RADIUS);
      api.pos.x = p.x;
      api.pos.z = p.z;
      turnToward(Math.atan2(-dz, dx), dt);
      var moved = Math.hypot(api.pos.x - before.x, api.pos.z - before.z);
      stuck = moved < step * 0.2 ? stuck + dt : 0;
      return moved;
    }

    function inRect(r, p) {
      return p.x > r.x0 && p.x < r.x1 && p.z > r.z0 && p.z < r.z1;
    }
    function whine() {
      if (OC.audio) OC.audio.play('whine', { pos: { x: api.pos.x, y: 0.6, z: api.pos.z } });
    }
    // where his mouth is (for carrying the ball)
    function mouth() {
      return { x: api.pos.x + Math.cos(api.heading) * 0.95, z: api.pos.z - Math.sin(api.heading) * 0.95 };
    }

    api.setPos = function (x, z) {
      api.pos.x = x;
      api.pos.z = z;
    };
    api.pose = function (name) {
      if (!POSES[name]) throw new Error('unknown pose: ' + name);
      api.poseName = name;
    };
    api.ears = function (flat) {
      earsFlat = !!flat;
    };
    // tail wag: a level (0 still .. 0.6 wild) and speed, or null for automatic
    api.wag = function (level, speed) {
      wagLevel = level === null || level === undefined ? null : level;
      wagSpeed = speed || 1;
    };
    // turn just his head toward a point (lying down, sitting), or null
    api.headTo = function (point) {
      headTarget = point;
    };
    api.follow = function () {
      api.mode = 'follow';
      api.poseName = 'stand';
      api.waiting = false;
      earsFlat = false;
      headTarget = null;
      fetchState = null;
      sniffState = null;
      goal = null;
      route = [];
    };
    api.goTo = function (x, z, cb) {
      api.mode = 'goto';
      api.poseName = 'stand';
      goal = { x: x, z: z };
      api.onArrive = cb || null;
      planTo(x, z);
      stuck = 0;
    };
    api.eat = function (seconds, cb) {
      api.mode = 'eat';
      api.poseName = 'stand';
      eatLeft = seconds;
      onEatDone = cb || null;
    };
    // stand and stare at a point in the world (x, y, z), or pass null to carry on
    api.stare = function (target) {
      // Busy walking somewhere, eating or fetching: a stare would cancel that and its callback would
      // never fire. Staring is flavour; finishing the errand is not.
      if (api.mode === 'goto' || api.mode === 'eat' || api.mode === 'fetch' || api.mode === 'sniff') return;
      if (!target) {
        api.lookAt = null;
        if (api.mode === 'stare') api.mode = 'follow';
        return;
      }
      api.lookAt = target;
      api.mode = 'stare';
      api.poseName = 'stand';
    };
    // while following: if the player is inside rect, sit at `wait` and whine instead of going in
    api.setAvoid = function (rect, wait) {
      avoid = rect ? { rect: rect, wait: wait } : null;
    };
    // run to the ball, carry it back, drop it at Mason's feet. cb('done' | 'refused')
    api.fetch = function (ball, cb) {
      api.mode = 'fetch';
      api.poseName = 'stand';
      fetchState = { ball: ball, stage: 'out', cb: cb || null, replan: 0 };
      route = [];
    };
    // walk to a point, nose down for a couple of seconds, then cb()
    api.sniff = function (point, cb) {
      api.goTo(point.x, point.z, function () {
        api.mode = 'sniff';
        sniffState = { t: 2.2, cb: cb || null, at: point };
      });
    };

    api.update = function (dt) {
      var moved = 0;
      if (api.mode === 'follow') {
        var target = { x: ctl.pos.x, z: ctl.pos.z };
        var refuse = avoid && inRect(avoid.rect, ctl.pos) && !inRect(avoid.rect, api.pos);
        if (refuse) target = avoid.wait;
        var d = Math.hypot(target.x - api.pos.x, target.z - api.pos.z);
        var near = refuse ? 0.25 : 2.2;
        if (d > near) {
          api.waiting = false;
          if (api.poseName !== 'stand' && d > 2.6) api.poseName = 'stand';
          routeT -= dt;
          if (routeT <= 0 || !route.length) {
            planTo(target.x, target.z);
            routeT = 0.6;
          }
          moved = walkRoute(WALK, dt);
        } else {
          route = [];
          if (refuse) {
            // sitting at the door, looking in, ears back
            if (!api.waiting) whineT = 1.5;
            api.waiting = true;
            api.poseName = 'sit';
            turnToward(faceAngle(ctl.pos.x, ctl.pos.z), dt);
            whineT -= dt;
            if (whineT <= 0) {
              whine();
              whineT = 6 + Math.random() * 3;
            }
          } else {
            api.waiting = false;
            if (d > 1.6) turnToward(faceAngle(ctl.pos.x, ctl.pos.z), dt);
          }
        }
        if (!refuse && (stuck > 2.5 || d > 9)) {
          // wedged behind furniture or left far behind: pop back next to Mason
          api.pos.x = ctl.pos.x - Math.sin(ctl.yaw) * 1.0;
          api.pos.z = ctl.pos.z - Math.cos(ctl.yaw) * 1.0;
          if (OC.collision.blocked(api.pos.x, api.pos.z, RADIUS, ctl.boxes)) {
            api.pos.x = ctl.pos.x;
            api.pos.z = ctl.pos.z;
          }
          stuck = 0;
        }
      } else if (api.mode === 'goto' && goal) {
        moved = walkRoute(WALK * 1.4, dt);
        if (!route.length || stuck > 2) {
          api.mode = 'idle';
          var cb = api.onArrive;
          api.onArrive = null;
          goal = null;
          stuck = 0;
          if (cb) cb();
        }
      } else if (api.mode === 'eat') {
        eatLeft -= dt;
        if (eatLeft <= 0) {
          api.mode = 'follow';
          var done = onEatDone;
          onEatDone = null;
          if (done) done();
        }
      } else if (api.mode === 'stare' && api.lookAt) {
        turnToward(faceAngle(api.lookAt.x, api.lookAt.z), dt);
      } else if (api.mode === 'fetch' && fetchState) {
        var f = fetchState;
        if (f.stage === 'out') {
          var b = f.ball.pos;
          if (avoid && inRect(avoid.rect, b) && !f.ball.moving) {
            // it rolled into the laundry room: he will not go in after it
            fetchState = null;
            api.mode = 'follow';
            api.waiting = false;
            whine();
            if (f.cb) f.cb('refused');
          } else {
            f.replan -= dt;
            if (f.replan <= 0 || !route.length) {
              planTo(b.x, b.z);
              f.replan = 0.4;
            }
            moved = walkRoute(WALK * 1.6, dt);
            var m = mouth();
            if (!f.ball.moving && Math.hypot(b.x - m.x, b.z - m.z) < 0.45) {
              f.stage = 'back';
              f.ball.carried = true;
              route = [];
            } else if (stuck > 3) {
              fetchState = null;
              api.mode = 'follow';
              if (f.cb) f.cb('refused');
            }
          }
        } else {
          f.replan -= dt;
          if (f.replan <= 0 || !route.length) {
            planTo(ctl.pos.x, ctl.pos.z);
            f.replan = 0.4;
          }
          var dp = Math.hypot(ctl.pos.x - api.pos.x, ctl.pos.z - api.pos.z);
          if (dp > 1.3) moved = walkRoute(WALK * 1.4, dt);
          var mm = mouth();
          f.ball.pos.x = mm.x;
          f.ball.pos.z = mm.z;
          f.ball.pos.y = 0.62;
          if (dp <= 1.3 || stuck > 3) {
            f.ball.carried = false;
            f.ball.dropAt(mm.x, mm.z);
            fetchState = null;
            api.mode = 'follow';
            if (f.cb) f.cb('done');
          }
        }
      } else if (api.mode === 'sniff' && sniffState) {
        sniffState.t -= dt;
        turnToward(faceAngle(sniffState.at.x, sniffState.at.z), dt);
        if (sniffState.t <= 0) {
          var sc = sniffState.cb;
          sniffState = null;
          api.mode = 'idle';
          if (sc) sc();
        }
      }

      // ---- the pose, eased ----
      var walking = moved > 0;
      var P = POSES[walking ? 'stand' : api.poseName];
      var k = Math.min(1, dt * 6);
      ['y', 'z', 'rx', 'rz', 'head'].forEach(function (key) {
        cur[key] += (P[key] - cur[key]) * k;
      });
      for (var i = 0; i < 4; i++) cur.legs[i] += (P.legs[i] - cur.legs[i]) * k;
      rig.position.set(0, cur.y, cur.z);
      rig.rotation.set(cur.rx, 0, cur.rz);

      phase += walking ? dt * 11 : 0;
      var swing = walking ? 0.6 : 0;
      legs[0].rotation.z = cur.legs[0] + Math.sin(phase) * swing;
      legs[1].rotation.z = cur.legs[1] - Math.sin(phase) * swing;
      legs[2].rotation.z = cur.legs[2] - Math.sin(phase) * swing;
      legs[3].rotation.z = cur.legs[3] + Math.sin(phase) * swing;

      var sniffing = api.mode === 'sniff' || api.mode === 'eat';
      var hz = sniffing ? -0.95 + (api.mode === 'sniff' ? Math.sin(performance.now() / 90) * 0.12 : 0) : api.mode === 'stare' ? 0.12 : cur.head;
      var hy = 0;
      if (headTarget && !walking) {
        var want = faceAngle(headTarget.x, headTarget.z) - api.heading;
        while (want > Math.PI) want -= 2 * Math.PI;
        while (want < -Math.PI) want += 2 * Math.PI;
        hy = Math.max(-1.2, Math.min(1.2, want));
        hz = 0.3;
      }
      head.rotation.z += (hz - head.rotation.z) * Math.min(1, dt * 6);
      head.rotation.y += (hy - head.rotation.y) * Math.min(1, dt * 4);
      ears.forEach(function (e, j) {
        var side = j === 0 ? 1 : -1;
        e.rotation.x += ((earsFlat ? 1.25 * side : 0) - e.rotation.x) * Math.min(1, dt * 8);
        e.position.y += ((earsFlat ? 0.1 : 0.17) - e.position.y) * Math.min(1, dt * 8);
      });
      var amp = wagLevel !== null ? wagLevel : api.mode === 'stare' || api.waiting ? 0.05 : api.poseName === 'playDead' ? 0 : 0.45;
      tail.rotation.y = Math.sin((performance.now() / 160) * wagSpeed) * amp;

      group.position.set(api.pos.x, 0, api.pos.z);
      group.rotation.y = api.heading;
    };

    api.group = group;
    return api;
  }

  OC.cooper = { create: create, POSES: Object.keys(POSES) };
})();
