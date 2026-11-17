// Act 3, 12:30 AM: "The Call".
// Mason is sitting up in the guest bed, the storm on the roof. Dave calls: the exterminator says the
// "droppings" under the house are food wrappers, folded small, and Dave never opened the hatch. The
// storm takes the call. Three soft taps from inside the closet. Leave it, call Cooper, or open it
// (the earned bad end: he is there, unfolding, "This is my room."). The flash photo of the dark gap
// shows an eye at the edge of the frame; looking up, nothing. Ethan calls, and from the closet comes
// the whisper. Only the calm bluff survives. Then Cooper growls at the bedroom door, not the closet,
// handles are tried around the house, there are footsteps under the floor, and Mason walks to the
// bathroom without looking back.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};

  var TEXT = [
    'act3.vo.open', 'act3.call.e1', 'act3.call.m1', 'act3.call.e2', 'act3.call.e6', 'act3.call.e7',
    'act3.whisper', 'act3.choice.prompt', 'act3.choice.a', 'act3.choice.b', 'act3.choice.c',
    'act3.thought.walk', 'act3.thought.hall', 'act3.fail.scream', 'act3.fail.confront', 'act3.fail.freeze', 'act3.fail.look',
    'act3.thought.callLost', 'act3.taps.prompt', 'act3.taps.leave', 'act3.taps.cooper', 'act3.taps.open', 'act3.thought.leave',
    'act3.thought.cooperCloset', 'act3.bad.room', 'act3.thought.photo', 'act3.thought.photoMissed', 'act3.thought.photoAuto',
    'act3.thought.photoNothing', 'act3.thought.door', 'act3.thought.handles', 'act3.thought.under', 'act3.thought.charger2',
    'act3.thought.tookCharger', 'act3.task.photo', 'act3.task.walk',
  ];
  var GUEST_DOOR = { x: 5, y: 1.0, z: 16 };
  var CHARGER = { x: 0.33, y: 0.62, z: 14.5 };

  OC.acts.act3 = {
    id: 'act3',
    night: 2,
    spawn: 'guestBed',
    clockDef: { startMin: 24 * 60 + 30, endMin: 24 * 60 + 36, durationSec: 420 },
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var cooper = g.cooper;
      var ctl = g.ctl;
      var phone = g.phone;
      var wes = props.intruder;
      var none = { stop: function () {} };
      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      function tension(v) {
        if (g.drone && g.drone.setTension) g.drone.setTension(v);
      }
      function say(id, ms) {
        hud.say(t(id), ms);
      }
      var EYE = props.closet.eyeAt;

      // the house, past midnight on night two, with the storm on the roof
      props.setLights({ living: 0, kitchen: 0, foyer: 0, hall: 0.15, porch: 1.0, laundry: 0.9, guest: 0.55, tv: 0, phoneglow: 0, yard: 0, bath: 0 });
      props.closet.reset();
      props.floorPhone.set(false);
      props.frontDoor.close();
      props.slider.setOpen(0);
      if (props.broom.where !== 'track') props.broom.set('track');
      props.hatch.setAjar(true);
      props.hatch.setPadlock(false);
      props.master.setStage('off');
      props.car.headlights(false);
      props.changes.bed.set(true);
      props.changes.chair.set('hall');
      props.changes.prints.show('both');
      props.changes.doorNote.show(true);
      wes.show(false);
      wes.redEye(false);
      if (ctl.nav) ctl.nav.rebuild();
      cooper.setPos(4.0, 16.4);
      cooper.follow();
      cooper.stay();
      cooper.ears(true);
      cooper.stare(EYE);
      ctl.light.on = false;
      ctl.light.available = true;
      ctl.seat(1.6, 15.7, Math.PI * 0.82, -0.35);
      phone.close();
      phone.enabled = true;
      g.photo.reset();
      tension(0.45);
      var weather = OC.weather.create(g, { level: 1 });
      weather.setLevel(1);

      // the dark inside of the closet, for when its door is open
      var dark = (function () {
        g.cache = g.cache || {};
        if (!g.cache.closetDark) {
          var m = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 2.04), new THREE.MeshBasicMaterial({ color: 0x020202 }));
          m.rotation.y = Math.PI;
          m.position.set(1.45, 1.06, 17.596);
          g.render.scene.add(m);
          g.cache.closetDark = m;
        }
        return g.cache.closetDark;
      })();
      dark.visible = false;

      var flags = { elapsed: 0, phase: 'intro', room: 'guest', ending: false, creaked: false, photoAt: -1, tookCharger: false };
      var queue = [];
      var loops = [];
      var talk = null;
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      var beat = none;
      var stare = OC.bluff.createStareRule(1.2);
      var fovTarget = g.baseFov || 72;
      function zoomTo(fov) {
        fovTarget = fov;
      }

      var director = OC.director.createDirector(
        {
          tasks: [
            { id: 'photo', label: t('act3.task.photo') },
            { id: 'walk', label: t('act3.task.walk') },
          ],
          advanceWhen: function () { return false; },
        },
        { onTask: function () { phone.setTasks(visible()); } }
      );
      var revealed = {};
      function visible() {
        return director.list().filter(function (x) { return revealed[x.id]; });
      }
      function reveal(id) {
        revealed[id] = true;
        phone.setTasks(visible());
      }
      phone.setTasks([]);

      // ---- Dave ------------------------------------------------------------------------------------------
      later(1.5, function () { say('act3.vo.open', 8000); });
      later(6.5, function () {
        sfx('buzz', { gain: 0.9 });
        phone.notify('Uncle Dave', 'Incoming call');
      });
      later(8.5, function () {
        flags.phase = 'dave';
        talk = OC.talk.start(g, OC.talkData.daveLate, {
          call: 'Uncle Dave',
          log: function (a) { g.habits.log(a, {}, { clock: g.clock.label(), t: flags.elapsed }); },
          onEnd: function () {
            var hiss = sfx('radio', { gain: 3 });
            later(1.2, function () { hiss.stop(); });
            later(1.6, function () {
              hud.toast('Call failed');
              say('act3.thought.callLost', 4500);
            });
            later(6.5, taps);
          },
        });
      });

      // ---- the taps ----------------------------------------------------------------------------------
      function taps() {
        flags.phase = 'taps';
        sfx('knock', { pos: { x: 1.45, y: 1.2, z: 17.6 }, count: 3, gain: 0.55 });
        tension(0.75);
        later(0.8, function () { sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, duration: 2.6 }); });
        later(2.4, function () {
          phone
            .choice({
              prompt: t('act3.taps.prompt'),
              seconds: 14,
              options: [
                { id: 'leave', text: t('act3.taps.leave') },
                { id: 'cooper', text: t('act3.taps.cooper') },
                { id: 'open', text: t('act3.taps.open') },
              ],
            })
            .then(function (id) {
              if (flags.phase !== 'taps') return;
              if (id === 'open') return badEnd();
              g.habits.log('closetTaps', { kind: id === 'cooper' ? 'cooper' : 'leave' }, { clock: g.clock.label(), t: flags.elapsed });
              if (id === 'cooper') {
                cooper.follow();
                cooper.goTo(2.1, 16.9, function () {
                  cooper.stare(EYE);
                  cooper.ears(true);
                  sfx('growl', { pos: { x: 2.1, y: 0.6, z: 16.9 }, duration: 3 });
                  later(3.2, function () {
                    cooper.goTo(3.0, 15.9, function () {
                      cooper.stay();
                      cooper.stare(EYE);
                    });
                  });
                });
                later(4.5, function () { say('act3.thought.cooperCloset', 6500); });
                later(11, startPhoto);
              } else {
                say('act3.thought.leave', 4500);
                later(6, startPhoto);
              }
            });
        });
      }

      // ---- the photo ---------------------------------------------------------------------------------
      function startPhoto() {
        flags.phase = 'photo';
        flags.photoAt = flags.elapsed;
        reveal('photo');
        say('act3.thought.photo', 7000);
      }
      g.photo.beforeShot = function (cam) {
        if (flags.phase !== 'photo') return null;
        var d = Math.hypot(cam.x - EYE.x, cam.z - EYE.z);
        var sees = d < 4.5 && OC.sightline.inView(cam, EYE, 0.5);
        if (!sees) return { subject: null, undo: function () {} };
        // for the flash alone: the door standing open, and him in the dark behind it, half hidden by the
        // other door, looking straight down the lens. Look up from the phone: the door is shut.
        props.closet.ajar(1.3);
        dark.visible = true;
        wes.setPos(1.3, 17.4);
        wes.faceTo(cam.x, cam.z);
        wes.crouch = 0.12;
        wes.raise = 0;
        wes.lift = 0;
        wes.pose('stand', true);
        wes.update(0.001);
        wes.show(true);
        return {
          subject: 'eye',
          flash: 0.32,
          undo: function () {
            props.closet.ajar(0);
            dark.visible = false;
            wes.show(false);
            wes.crouch = 0;
          },
        };
      };
      g.photo.onPhoto = function (photo) {
        if (flags.phase !== 'photo') return;
        if (photo.subject !== 'eye') {
          later(0.8, function () { say('act3.thought.photoMissed', 4000); });
          return;
        }
        flags.phase = 'photoSeen';
        director.complete('photo');
        g.habits.log('photoEye', {}, { clock: g.clock.label(), t: flags.elapsed });
        phone.close();
        hud.flashImage(photo.url, 1700);
        sfx('sting', { gain: 1.0 });
        tension(1);
        later(2.4, function () { say('act3.thought.photoNothing', 6000); });
        later(8.5, ethan);
      };
      function autoPhoto() {
        // he will not stop shaking; he takes it anyway
        say('act3.thought.photoAuto', 3500);
        later(2.2, function () {
          var dx = EYE.x - ctl.pos.x;
          var dz = EYE.z - ctl.pos.z;
          ctl.yaw = Math.atan2(-dx, -dz);
          ctl.pitch = Math.atan2(EYE.y - g.camera.position.y, Math.hypot(dx, dz));
          if (!phone.isOpen) phone.open();
          phone.app('camera');
          g.photo.shoot();
        });
      }

      // ---- Ethan, and the whisper -----------------------------------------------------------------------
      function ethan() {
        flags.phase = 'ethan';
        phone.close();
        sfx('buzz', { gain: 0.9 });
        later(1.0, function () { phone.startCall('Ethan'); });
        [[1.5, 'Ethan', 'act3.call.e1'], [4.6, 'Mason', 'act3.call.m1'], [7.4, 'Ethan', 'act3.call.e2']].forEach(function (c) {
          later(c[0], function () { phone.callLine(c[1], t(c[2])); });
        });
        later(10.2, function () {
          sfx('whisper', { pos: EYE, gain: 1.4, ref: 1 });
          say('act3.whisper', 4800);
          beat = sfx('heartbeat', { gain: 0.9 });
          zoomTo(54);
          tension(1);
        });
        later(15.4, function () { phone.callLine('Ethan', t('act3.call.e6')); });
        later(16.0, function () {
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
              if (flags.phase !== 'choice') return;
              var result = OC.bluff.outcome(id);
              if (result === 'survive') survive();
              else fail(result);
            });
        });
      }

      // ---- outcomes --------------------------------------------------------------------------------------
      function fail(reason) {
        if (flags.phase === 'fail') return;
        flags.phase = 'fail';
        g.state.cutscene = true;
        zoomTo(g.baseFov || 72);
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
        flags.phase = 'after';
        zoomTo(g.baseFov || 72);
        phone.callLine('Mason', t('act3.choice.c'));
        later(2.6, function () { phone.callLine('Ethan', t('act3.call.e7')); });
        later(5.0, function () { phone.endCall(); });
        g.habits.log('bluffed', {}, { clock: g.clock.label(), t: flags.elapsed });
        // Cooper turns away from the closet, to the bedroom door
        later(3.5, function () {
          cooper.stare(GUEST_DOOR);
          sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, duration: 3.2 });
          say('act3.thought.door', 5000);
        });
        // handles tried around the house, each followed by a pause, then footsteps under the floor
        [[8.5, { x: 7, y: 1, z: 19.5 }], [12.5, { x: 7, y: 1, z: 11.5 }], [16.0, { x: 5, y: 1, z: 21.5 }]].forEach(function (h) {
          later(h[0], function () {
            sfx('click', { pos: h[1], gain: 1.2 });
            sfx('click', { pos: h[1], gain: 1.0, delay: 0.18 });
            sfx('creak', { pos: h[1], gain: 0.5, delay: 0.3 });
          });
        });
        later(10.5, function () { say('act3.thought.handles', 5500); });
        for (var i = 0; i < 6; i++) {
          (function (k) {
            later(18 + k * 0.7, function () { sfx('overstep', { pos: { x: 6 + k * 0.1, y: -0.5, z: 14 - k * 0.6 }, gain: 1.2 }); });
          })(i);
        }
        later(19.5, function () { say('act3.thought.under', 7000); });
        later(27, function () {
          beat.stop();
          ctl.stand();
          ctl.teleport(2.4, 16.0, -Math.PI / 2, 0);
          cooper.follow();
          cooper.stare(null);
          flags.phase = 'walk';
          reveal('walk');
          say('act3.thought.walk');
          later(4, function () { if (!flags.tookCharger && flags.room === 'guest') say('act3.thought.charger2', 4000); });
        });
      }

      // he is there, crouched in the dark of it, and he stands up
      function badEnd() {
        flags.phase = 'bad';
        g.state.cutscene = true;
        g.habits.log('openedCloset', {}, { clock: g.clock.label(), t: flags.elapsed });
        ctl.stand();
        ctl.teleport(1.55, 15.8, Math.PI, 0.2);
        ctl.frozen = true;
        ctl.light.on = true;
        zoomTo(64);
        props.closet.burst();
        dark.visible = true;
        sfx('creak', { pos: EYE, gain: 1.2 });
        wes.setPos(1.2, 17.3);
        wes.faceTo(1.45, 16.35);
        wes.crouch = 0;
        wes.raise = 0;
        wes.lift = 0;
        wes.show(true);
        wes.unfold(function () {
          wes.pose('tilt');
          sfx('whisper', { pos: { x: 1.2, y: 1.9, z: 17.3 }, gain: 1.4, ref: 1 });
          say('act3.bad.room', 3000);
          tension(1);
          setTimeout(function () {
            hud.fadeOut('');
            setTimeout(function () { if (g.onEnd) g.onEnd('act3', 'bad'); }, 2200);
          }, 2300);
        });
        tension(0.9);
      }

      // ---- what can be used ------------------------------------------------------------------------------
      var items = [
        {
          id: 'charger', x: CHARGER.x, y: CHARGER.y, z: CHARGER.z, radius: 0.35,
          label: 'Take the charger',
          enabled: function () { return flags.phase === 'walk' && !flags.tookCharger; },
          onUse: function () {
            flags.tookCharger = true;
            g.habits.log('tookCharger', {}, { clock: g.clock.label(), t: flags.elapsed });
            sfx('rustle', { gain: 0.5 });
            say('act3.thought.tookCharger', 2000);
          },
        },
      ];
      items.forEach(function (it) { g.interact.add(it); });

      function finish() {
        flags.ending = true;
        beat.stop();
        director.complete('walk');
        g.state.cutscene = true;
        hud.fadeOut('12:35 AM');
        setTimeout(function () { if (g.onEnd) g.onEnd('act3'); }, 2600);
      }

      return {
        flags: flags,
        items: items,
        director: director,
        weather: weather,
        badEnd: badEnd,
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) queue.splice(i, 1)[0].fn();
          }
          if (talk) talk.update(dt);
          weather.update(dt);
          var cam3 = g.camera;
          if (Math.abs(cam3.fov - fovTarget) > 0.05) {
            cam3.fov += (fovTarget - cam3.fov) * Math.min(1, dt * 2.5);
            cam3.updateProjectionMatrix();
          }
          if (flags.phase === 'photo' && flags.elapsed - flags.photoAt > 45) {
            flags.photoAt = flags.elapsed + 999;
            autoPhoto();
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
              later(1.5, function () { say('act3.thought.hall'); });
            }
            if (flags.room === 'bath') finish();
          }
        },
        dispose: function () {
          if (talk) talk.stop();
          beat.stop();
          loops.forEach(function (h) { h.stop(); });
          weather.dispose();
          g.world.setDaylight(0, g.render.renderer);
          dark.visible = false;
          wes.show(false);
          g.photo.beforeShot = null;
          g.photo.onPhoto = null;
          phone.cancelChoice();
          phone.endCall();
          var cam3 = g.camera;
          cam3.fov = g.baseFov || 72;
          cam3.updateProjectionMatrix();
        },
      };
    },
  };
})();
