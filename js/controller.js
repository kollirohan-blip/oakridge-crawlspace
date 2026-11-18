// First-person controller: pointer lock, WASD, mouse look, light head bob, wall collision,
// and the phone light (a spotlight riding on the camera, with a battery).
// While the pointer is not locked the controller ignores input completely.
(function () {
  var OC = (window.OC = window.OC || {});

  var EYE = 1.65;
  var RADIUS = 0.28;
  var WALK = 2.0; // m/s: slow on purpose
  var CRAWL = 0.85; // on your belly, under the house
  var PRONE_EYE = 0.36; // eye height lying down
  var SPRINT = 4.6;
  var SENSITIVITY = 0.0022;
  var PITCH_MAX = 1.48; // about 85 degrees
  var BATTERY_SECONDS = 360; // of light-on time

  function create(camera, boxes) {
    var keys = {};
    var bobPhase = 0;
    var bobAmp = 0;
    var lastStep = 0;
    var expoT = 0;
    var expoTarget = 1;

    var spot = new THREE.SpotLight(0xfff2d8, 0, 22, 0.55, 0.6, 1.4);
    spot.position.set(0.12, -0.12, 0);
    spot.target.position.set(0, 0, -1);
    camera.add(spot);
    camera.add(spot.target);

    var api = {
      pos: { x: 0, z: 0 },
      yaw: 0,
      pitch: 0,
      locked: false,
      sprintAllowed: false,
      eyeOffset: 0, // set pieces lower the camera (crouching, hiding)
      eyeTarget: 0, // eyeOffset eases toward this
      frozen: false, // no walking (sitting, hiding, cutscenes); looking around still works
      sensitivity: 1, // from settings: a multiplier on mouse look
      bobEnabled: true, // from settings
      boxes: boxes,
      // drain: how fast the battery goes (1 = normal); falterT: seconds left of it cutting out
      light: { on: false, battery: 1, available: true, spot: spot, drain: 1, falterT: 0, power: 2.4, expo: 1 },
      prone: false, // lying down (the crawlspace): low, slow, and you cannot look far up
      moving: false, // really moving this frame (not just holding a key against a wall)
      onLockChange: null,
    };

    function setLocked(v) {
      v = !!v;
      if (api.locked === v) return;
      api.locked = v;
      if (!v) keys = {};
      if (api.onLockChange) api.onLockChange(v);
    }
    api.setLocked = setLocked;

    api.requestLock = function () {
      try {
        var p = document.body.requestPointerLock();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {
        /* the browser refused; the click panel stays up */
      }
    };

    api.toggleLight = function () {
      if (!api.light.available) return;
      api.light.on = !api.light.on;
    };

    // sit down somewhere: move there, lower the eyes, stop walking
    api.seat = function (x, z, yaw, eye) {
      api.teleport(x, z, yaw, 0);
      api.frozen = true;
      api.eyeTarget = eye;
    };
    api.stand = function () {
      api.frozen = false;
      api.eyeTarget = 0;
      api.prone = false;
    };
    // get down on your belly, or back up
    api.setProne = function (v) {
      api.prone = !!v;
      api.eyeTarget = v ? PRONE_EYE - EYE : 0;
      if (v) api.eyeOffset = api.eyeTarget; // no slow sink: you are already down there
    };
    // the light cuts out for a few seconds, flickering (a dying battery, or something worse)
    api.light.falter = function (seconds) {
      api.light.falterT = seconds;
    };

    api.teleport = function (x, z, yaw, pitch) {
      api.pos.x = x;
      api.pos.z = z;
      if (typeof yaw === 'number') api.yaw = yaw;
      if (typeof pitch === 'number') api.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, pitch));
    };

    window.addEventListener('keydown', function (e) {
      if (!api.locked) return;
      if (e.code === 'Tab') e.preventDefault();
      keys[e.code] = true;
      if (e.code === 'KeyF' && !e.repeat) api.toggleLight();
    });
    window.addEventListener('keyup', function (e) {
      keys[e.code] = false;
    });
    window.addEventListener('blur', function () {
      keys = {};
    });
    // is the browser really holding the mouse? (api.locked is "the game is running": the automated checks
    // run the game without the browser's pointer lock)
    api.captured = function () {
      return document.pointerLockElement === document.body;
    };
    // turn the view by a mouse movement, in pixels
    api.look = function (dx, dy) {
      api.yaw -= dx * SENSITIVITY * api.sensitivity;
      api.pitch -= dy * SENSITIVITY * api.sensitivity;
      api.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, api.pitch));
    };
    // mouseFilter(dx, dy, abs) -> { x, y }: the phone takes the movement for its cursor and hands back
    // the part that still turns the view. abs is where a real pointer is when the mouse is not captured.
    api.mouseFilter = null;
    document.addEventListener('mousemove', function (e) {
      if (!api.locked) return;
      var dx = e.movementX || 0;
      var dy = e.movementY || 0;
      if (api.mouseFilter) {
        var d = api.mouseFilter(dx, dy, e.isTrusted && !api.captured() ? { x: e.clientX, y: e.clientY } : null);
        if (d) {
          dx = d.x;
          dy = d.y;
        }
      }
      if (dx || dy) api.look(dx, dy);
    });
    document.addEventListener('pointerlockchange', function () {
      setLocked(document.pointerLockElement === document.body);
    });
    document.addEventListener('pointerlockerror', function () {
      if (OC.hud) OC.hud.toast('Click again to capture the mouse');
    });

    function applyCamera() {
      var bob = api.bobEnabled ? Math.sin(bobPhase) * (api.prone ? 0.012 : 0.03) * bobAmp : 0;
      camera.position.set(api.pos.x, EYE + api.eyeOffset + bob, api.pos.z);
      // crawling rocks you side to side, elbow to elbow
      var roll = api.prone && api.bobEnabled ? Math.sin(bobPhase * 0.5) * 0.035 * bobAmp : 0;
      camera.rotation.set(api.pitch, api.yaw, roll);
    }

    api.update = function (dt) {
      api.eyeOffset += (api.eyeTarget - api.eyeOffset) * Math.min(1, dt * 6);
      api.moving = false;
      if (api.prone) api.pitch = Math.max(-0.9, Math.min(0.9, api.pitch));
      if (api.locked && !api.frozen) {
        var f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
        var s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
        if (f || s) {
          var len = Math.hypot(f, s);
          f /= len;
          s /= len;
          var speed = api.prone ? CRAWL : api.sprintAllowed && (keys.ShiftLeft || keys.ShiftRight) ? SPRINT : WALK;
          var sin = Math.sin(api.yaw);
          var cos = Math.cos(api.yaw);
          // forward is (-sin, -cos); right is (cos, -sin)
          var dx = (f * -sin + s * cos) * speed * dt;
          var dz = (f * -cos + s * -sin) * speed * dt;
          var p = OC.collision.resolveMove(api.pos, { x: dx, z: dz }, api.boxes, RADIUS);
          api.moving = Math.hypot(p.x - api.pos.x, p.z - api.pos.z) > speed * dt * 0.3;
          api.pos.x = p.x;
          api.pos.z = p.z;
          bobPhase += dt * (api.prone ? 5.2 : speed * 3.2);
          bobAmp = Math.min(1, bobAmp + dt * 6);
          var stepIndex = Math.floor(bobPhase / Math.PI);
          if (stepIndex !== lastStep) {
            lastStep = stepIndex;
            if (api.onStep) api.onStep();
          }
        } else {
          bobAmp = Math.max(0, bobAmp - dt * 6);
        }
      }

      var L = api.light;
      if (L.on) {
        L.battery = Math.max(0, L.battery - (dt * (L.drain || 1)) / BATTERY_SECONDS);
        if (L.battery === 0) {
          L.on = false;
          L.available = false;
        }
      }
      var flicker = L.battery < 0.15 && Math.random() < 0.1 ? 0.25 : 1;
      if (L.falterT > 0) {
        L.falterT = Math.max(0, L.falterT - dt);
        flicker = Math.random() < 0.12 ? 0.6 : 0; // mostly dark, with a stutter of light
      }
      // exposure: how far away is what the light is pointed at? Close up, it is turned down, the way a
      // camera stops down, so a wall at arm's length keeps its detail instead of going white
      if (L.on) {
        expoT -= dt;
        if (expoT <= 0) {
          expoT = 0.08;
          var eyeY = EYE + api.eyeOffset;
          var cp = Math.cos(api.pitch);
          var fx = -Math.sin(api.yaw);
          var fz = -Math.cos(api.yaw);
          var reach = 3.2;
          if (api.pitch < -0.05) reach = Math.min(reach, eyeY / Math.sin(-api.pitch)); // the floor
          else if (api.pitch > 0.05) reach = Math.min(reach, ((api.prone ? 0.98 : 2.6) - eyeY) / Math.sin(api.pitch)); // the ceiling
          if (OC.sightline) {
            for (var dd = 0.5; dd < reach; dd += 0.45) {
              var to = { x: api.pos.x + fx * cp * dd, z: api.pos.z + fz * cp * dd };
              if (!OC.sightline.lineOfSight(api.boxes, api.pos, to, Math.max(0.05, eyeY + Math.sin(api.pitch) * dd))) {
                reach = dd;
                break;
              }
            }
          }
          expoTarget = Math.max(0.38, Math.min(1, reach / 2.9));
        }
        L.expo += (expoTarget - L.expo) * Math.min(1, dt * 5);
      }
      spot.intensity = L.on ? (L.power || 2.4) * flicker * L.expo : 0;

      applyCamera();
    };

    return api;
  }

  OC.controller = { create: create, EYE: EYE, RADIUS: RADIUS, PRONE_EYE: PRONE_EYE };
})();
