// First-person controller: pointer lock, WASD, mouse look, light head bob, wall collision,
// and the phone light (a spotlight riding on the camera, with a battery).
// While the pointer is not locked the controller ignores input completely.
(function () {
  var OC = (window.OC = window.OC || {});

  var EYE = 1.65;
  var RADIUS = 0.28;
  var WALK = 2.0; // m/s: slow on purpose
  var SPRINT = 4.6;
  var SENSITIVITY = 0.0022;
  var PITCH_MAX = 1.48; // about 85 degrees
  var BATTERY_SECONDS = 360; // of light-on time

  function create(camera, boxes) {
    var keys = {};
    var bobPhase = 0;
    var bobAmp = 0;
    var lastStep = 0;

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
      boxes: boxes,
      light: { on: false, battery: 1, available: true, spot: spot },
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
    document.addEventListener('mousemove', function (e) {
      if (!api.locked) return;
      api.yaw -= (e.movementX || 0) * SENSITIVITY;
      api.pitch -= (e.movementY || 0) * SENSITIVITY;
      api.pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, api.pitch));
    });
    document.addEventListener('pointerlockchange', function () {
      setLocked(document.pointerLockElement === document.body);
    });
    document.addEventListener('pointerlockerror', function () {
      if (OC.hud) OC.hud.toast('Click again to capture the mouse');
    });

    function applyCamera() {
      var bob = Math.sin(bobPhase) * 0.03 * bobAmp;
      camera.position.set(api.pos.x, EYE + api.eyeOffset + bob, api.pos.z);
      camera.rotation.set(api.pitch, api.yaw, 0);
    }

    api.update = function (dt) {
      api.eyeOffset += (api.eyeTarget - api.eyeOffset) * Math.min(1, dt * 6);
      if (api.locked && !api.frozen) {
        var f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
        var s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
        if (f || s) {
          var len = Math.hypot(f, s);
          f /= len;
          s /= len;
          var speed = api.sprintAllowed && (keys.ShiftLeft || keys.ShiftRight) ? SPRINT : WALK;
          var sin = Math.sin(api.yaw);
          var cos = Math.cos(api.yaw);
          // forward is (-sin, -cos); right is (cos, -sin)
          var dx = (f * -sin + s * cos) * speed * dt;
          var dz = (f * -cos + s * -sin) * speed * dt;
          var p = OC.collision.resolveMove(api.pos, { x: dx, z: dz }, api.boxes, RADIUS);
          api.pos.x = p.x;
          api.pos.z = p.z;
          bobPhase += dt * speed * 3.2;
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
        L.battery = Math.max(0, L.battery - dt / BATTERY_SECONDS);
        if (L.battery === 0) {
          L.on = false;
          L.available = false;
        }
      }
      var flicker = L.battery < 0.15 && Math.random() < 0.1 ? 0.25 : 1;
      spot.intensity = L.on ? 2.4 * flicker : 0;

      applyCamera();
    };

    return api;
  }

  OC.controller = { create: create, EYE: EYE, RADIUS: RADIUS };
})();
