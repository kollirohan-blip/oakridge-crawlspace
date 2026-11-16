// Cooper, the golden retriever. A small low-poly dog that follows Mason, goes where he is sent,
// eats, and stares at whatever is wrong before the player notices it.
(function () {
  var OC = (window.OC = window.OC || {});
  var RADIUS = 0.25;
  var WALK = 1.8;

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
    part(0.85, 0.38, 0.36, fur, 0, 0.55, 0, group);
    part(0.3, 0.42, 0.34, fur, 0.4, 0.58, 0, group);
    var head = new THREE.Group();
    head.position.set(0.55, 0.74, 0);
    group.add(head);
    part(0.3, 0.28, 0.28, fur, 0.13, 0.05, 0, head);
    part(0.18, 0.12, 0.16, fur, 0.35, -0.02, 0, head);
    part(0.05, 0.06, 0.07, dark, 0.45, 0.01, 0, head);
    part(0.08, 0.2, 0.1, dark, 0.04, 0.17, 0.15, head);
    part(0.08, 0.2, 0.1, dark, 0.04, 0.17, -0.15, head);
    var tail = new THREE.Group();
    tail.position.set(-0.43, 0.66, 0);
    group.add(tail);
    part(0.4, 0.1, 0.1, fur, -0.2, 0.04, 0, tail);
    var legs = [];
    [[0.3, 0.13], [0.3, -0.13], [-0.3, 0.13], [-0.3, -0.13]].forEach(function (p) {
      var hip = new THREE.Group();
      hip.position.set(p[0], 0.36, p[1]);
      group.add(hip);
      part(0.1, 0.34, 0.1, fur, 0, -0.17, 0, hip);
      legs.push(hip);
    });
    world.group.add(group);

    var api = {
      pos: { x: start.x, z: start.z },
      heading: 0,
      mode: 'follow', // follow | goto | eat | stare
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

    api.setPos = function (x, z) {
      api.pos.x = x;
      api.pos.z = z;
    };
    api.follow = function () {
      api.mode = 'follow';
      goal = null;
      route = [];
    };
    api.goTo = function (x, z, cb) {
      api.mode = 'goto';
      goal = { x: x, z: z };
      api.onArrive = cb || null;
      planTo(x, z);
      stuck = 0;
    };
    api.eat = function (seconds, cb) {
      api.mode = 'eat';
      eatLeft = seconds;
      onEatDone = cb || null;
    };
    // stand and stare at a point in the world (x, y, z), or pass null to carry on
    api.stare = function (target) {
      if (!target) {
        api.lookAt = null;
        if (api.mode === 'stare') api.mode = 'follow';
        return;
      }
      api.lookAt = target;
      api.mode = 'stare';
    };

    api.update = function (dt) {
      var moved = 0;
      if (api.mode === 'follow') {
        var d = Math.hypot(ctl.pos.x - api.pos.x, ctl.pos.z - api.pos.z);
        if (d > 2.2) {
          routeT -= dt;
          if (routeT <= 0 || !route.length) {
            planTo(ctl.pos.x, ctl.pos.z);
            routeT = 0.6;
          }
          moved = walkRoute(WALK, dt);
        } else {
          route = [];
          if (d > 1.6) turnToward(Math.atan2(-(ctl.pos.z - api.pos.z), ctl.pos.x - api.pos.x), dt);
        }
        if (stuck > 2.5 || d > 9) {
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
        turnToward(Math.atan2(-(api.lookAt.z - api.pos.z), api.lookAt.x - api.pos.x), dt);
      }

      phase += moved > 0 ? dt * 11 : 0;
      var swing = moved > 0 ? 0.6 : 0;
      legs[0].rotation.z = Math.sin(phase) * swing;
      legs[1].rotation.z = -Math.sin(phase) * swing;
      legs[2].rotation.z = -Math.sin(phase) * swing;
      legs[3].rotation.z = Math.sin(phase) * swing;
      var headTarget = api.mode === 'eat' ? -0.95 : api.mode === 'stare' ? 0.12 : 0;
      head.rotation.z += (headTarget - head.rotation.z) * Math.min(1, dt * 6);
      tail.rotation.y = Math.sin(performance.now() / 160) * (api.mode === 'stare' ? 0.05 : 0.45);

      group.position.set(api.pos.x, 0, api.pos.z);
      group.rotation.y = api.heading;
    };

    api.group = group;
    return api;
  }

  OC.cooper = { create: create };
})();
