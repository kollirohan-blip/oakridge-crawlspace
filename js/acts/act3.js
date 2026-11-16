// Act 3: The eye in the closet (12:30 AM).
// Mason sits on the guest bed on the phone with Ethan. Reaching for the charger, he drops the phone
// between the bed and the closet. Reaching down, he sees an eye in the two-inch gap of the closet door.
// A whisper. Ethan asks what happened. Only the calm bluff survives; then he has to walk out to the
// bathroom without looking back.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};

  var CALL = [
    [1.0, 'Ethan', 'act3.call.e1'],
    [4.2, 'Mason', 'act3.call.m1'],
    [7.6, 'Ethan', 'act3.call.e2'],
    [11.0, 'Mason', 'act3.call.m2'],
    [16.0, 'Ethan', 'act3.call.e3'],
    [19.4, 'Mason', 'act3.call.m3'],
    [23.0, 'Ethan', 'act3.call.e4'],
  ];
  var TEXT = [
    'act3.vo.open', 'act3.call.e1', 'act3.call.m1', 'act3.call.e2', 'act3.call.m2', 'act3.call.e3', 'act3.call.m3',
    'act3.call.e4', 'act3.call.e5', 'act3.call.e6', 'act3.call.e7', 'act3.thought.cooper', 'act3.thought.charger',
    'act3.thought.drop', 'act3.whisper', 'act3.choice.prompt', 'act3.choice.a', 'act3.choice.b', 'act3.choice.c',
    'act3.thought.walk', 'act3.thought.hall', 'act3.fail.scream', 'act3.fail.confront', 'act3.fail.freeze',
    'act3.fail.look',
  ];

  function lerpAngle(a, b, k) {
    var d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d * k;
  }

  OC.acts.act3 = {
    id: 'act3',
    night: 2,
    spawn: 'guestBed',
    clockDef: { startMin: 24 * 60 + 30, endMin: 24 * 60 + 36, durationSec: 360 },
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var cooper = g.cooper;
      var ctl = g.ctl;
      var phone = g.phone;
      var none = { stop: function () {} };
      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      function tension(v) {
        if (g.drone && g.drone.setTension) g.drone.setTension(v);
      }
      var EYE = props.closet.eyeAt;

      // the house, past midnight on night two
      props.setLights({ living: 0, kitchen: 0, foyer: 0, hall: 0.15, porch: 1.0, laundry: 0.9, guest: 0.55, tv: 0, phoneglow: 0, yard: 0 });
      props.closet.reset();
      props.floorPhone.set(false);
      props.frontDoor.close();
      props.slider.setOpen(0);
      if (props.broom.where !== 'track') props.broom.set('track');
      props.hatch.setPadlock(false);
      props.master.setStage('off');
      props.car.headlights(false);
      if (ctl.nav) ctl.nav.rebuild();
      cooper.setPos(4.0, 16.4);
      cooper.stare(EYE);
      ctl.light.on = false;
      ctl.seat(1.6, 15.7, -Math.PI / 2, -0.5);
      phone.close();
      phone.enabled = false;
      tension(0.4);

      var flags = { elapsed: 0, phase: 'call', room: 'guest', ending: false, creaked: false, hallSaid: false };
      var queue = [];
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      var beat = none;
      var stare = OC.bluff.createStareRule(1.2);
      // narrowing the field of view during the reveal, like eyes focusing
      var fovTarget = 72;
      function zoomTo(fov) {
        fovTarget = fov;
      }
      var tween = null;
      function tweenTo(to, seconds, done) {
        tween = {
          from: { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw, pitch: ctl.pitch, eye: ctl.eyeOffset },
          to: to,
          t: 0,
          d: seconds,
          done: done,
        };
      }

      // ---- the call --------------------------------------------------------------------------------
      phone.startCall('Ethan');
      CALL.forEach(function (c) {
        later(c[0], function () { phone.callLine(c[1], t(c[2])); });
      });
      later(1.5, function () { hud.say(t('act3.vo.open'), 7000); });
      later(13.5, function () { hud.say(t('act3.thought.cooper')); });
      later(26.5, function () {
        hud.say(t('act3.thought.charger'));
        flags.phase = 'charger';
      });

      // ---- outcomes --------------------------------------------------------------------------------
      function fail(reason) {
        if (flags.phase === 'fail') return;
        flags.phase = 'fail';
        g.state.cutscene = true;
        zoomTo(72);
        hud.setCrosshair(true);
        props.closet.burst();
        beat.stop();
        sfx('thud', { pos: EYE, gain: 1.6 });
        sfx('sting', { gain: 0.9 });
        phone.endCall();
        tension(1);
        setTimeout(function () {
          hud.failScreen("YOU DIDN'T MAKE IT", t('act3.fail.' + reason), function () {
            hud.fadeIn();
            if (g.onEnd) g.onEnd('act3', 'retry');
          });
        }, 700);
      }

      function survive() {
        flags.phase = 'stand';
        zoomTo(72);
        hud.setCrosshair(true);
        phone.callLine('Mason', t('act3.choice.c'));
        later(2.6, function () { phone.callLine('Ethan', t('act3.call.e7')); });
        later(5.0, function () { phone.endCall(); });
        later(1.2, function () {
          props.floorPhone.set(false);
          props.setLights({ phoneglow: 0 });
          tweenTo({ x: 2.4, z: 16.0, yaw: -Math.PI / 2, pitch: 0, eye: 0 }, 1.6, function () {
            ctl.stand();
            ctl.teleport(2.4, 16.0, -Math.PI / 2, 0);
            ctl.light.available = true;
            phone.enabled = true;
            cooper.stare(null);
            flags.phase = 'walk';
            hud.say(t('act3.thought.walk'));
          });
        });
      }

      function reveal() {
        flags.phase = 'reveal';
        props.closet.showEye(true);
        // lean over the edge of the bed, face to face with the gap (about 0.6 m away), and focus on it
        hud.setCrosshair(false);
        zoomTo(46);
        tweenTo({ x: 1.07, z: 16.98, yaw: 3.025, pitch: 0.227, eye: -0.93 }, 1.4, function () {
          flags.phase = 'eye';
          later(1.4, function () {
            sfx('whisper', { pos: EYE, gain: 1.3, ref: 1 });
            hud.say(t('act3.whisper'), 4800);
            beat = sfx('heartbeat', { gain: 0.9 });
            tension(1);
          });
          later(6.2, function () { phone.callLine('Ethan', t('act3.call.e6')); });
          later(6.8, function () {
            flags.phase = 'choice';
            phone
              .choice({
                prompt: t('act3.choice.prompt') + '   (press 1, 2 or 3)',
                options: [
                  { id: 'a', text: t('act3.choice.a') },
                  { id: 'b', text: t('act3.choice.b') },
                  { id: 'c', text: t('act3.choice.c') },
                ],
                seconds: 8,
              })
              .then(function (id) {
                var result = OC.bluff.outcome(id);
                if (result === 'survive') survive();
                else fail(result);
              });
          });
        });
      }

      // ---- what can be used ------------------------------------------------------------------------
      var items = [
        {
          id: 'charger', x: 0.33, y: 0.62, z: 14.5, radius: 0.45,
          label: 'Plug in your phone',
          enabled: function () { return flags.phase === 'charger'; },
          onUse: function () {
            flags.phase = 'dropped';
            props.floorPhone.set(true);
            props.setLights({ phoneglow: 1.3 });
            ctl.light.on = false;
            ctl.light.available = false;
            sfx('thud', { pos: { x: 1.3, y: 0.05, z: 16.85 }, gain: 0.35 });
            hud.say(t('act3.thought.drop'));
            later(1.4, function () { phone.callLine('Ethan', t('act3.call.e5')); });
          },
        },
        {
          id: 'phone', x: 1.3, y: 0.05, z: 16.85, radius: 0.45,
          label: 'Reach down for the phone',
          enabled: function () { return flags.phase === 'dropped'; },
          onUse: reveal,
        },
      ];
      items.forEach(function (it) { g.interact.add(it); });

      function finish() {
        flags.ending = true;
        beat.stop();
        g.state.cutscene = true;
        hud.fadeOut('12:35 AM');
        setTimeout(function () { if (g.onEnd) g.onEnd('act3'); }, 2600);
      }

      return {
        flags: flags,
        items: items,
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) queue.splice(i, 1)[0].fn();
          }
          var cam3 = g.camera;
          if (Math.abs(cam3.fov - fovTarget) > 0.05) {
            cam3.fov += (fovTarget - cam3.fov) * Math.min(1, dt * 2.5);
            cam3.updateProjectionMatrix();
          }
          if (tween) {
            tween.t += dt;
            var k = Math.min(1, tween.t / tween.d);
            var e = k * k * (3 - 2 * k);
            var f = tween.from;
            var to = tween.to;
            ctl.teleport(f.x + (to.x - f.x) * e, f.z + (to.z - f.z) * e, lerpAngle(f.yaw, to.yaw, e), f.pitch + (to.pitch - f.pitch) * e);
            ctl.eyeTarget = ctl.eyeOffset = f.eye + (to.eye - f.eye) * e;
            if (k >= 1) {
              var done = tween.done;
              tween = null;
              if (done) done();
            }
          }
          if (flags.phase === 'walk' && !flags.ending) {
            // don't look back at the closet
            if (flags.room === 'guest') {
              var cam = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
              var looking = OC.sightline.inView(cam, EYE, 0.3) && OC.sightline.lineOfSight(ctl.boxes, cam, EYE, 0.9);
              if (stare.update(looking, dt)) fail('look');
            }
            if (flags.room === 'hall' && !flags.creaked) {
              flags.creaked = true;
              sfx('creak', { pos: EYE, gain: 0.6 });
              later(1.5, function () { hud.say(t('act3.thought.hall')); });
            }
            if (flags.room === 'bath') finish();
          }
        },
      };
    },
  };
})();
