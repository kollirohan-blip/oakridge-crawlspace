// Act 4: The shower decoy and the car (12:35 AM).
// Lock the bathroom door, turn on the shower so he thinks Mason is in it, climb out the window while a
// knife scrapes the door, run to the car. It will not start. He walks out of the house with a crowbar.
// Get down, stay silent for sixty seconds while Ethan's call reaches the police.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.acts = OC.acts || {};

  var TEXT = [
    'act4.vo.open', 'act4.vo.end',
    'act4.thought.lockDoor', 'act4.thought.shower', 'act4.thought.scrape', 'act4.thought.window', 'act4.thought.outside',
    'act4.thought.inCar', 'act4.thought.dead', 'act4.thought.frontDoor', 'act4.thought.down', 'act4.thought.peek',
    'act4.thought.smash', 'act4.thought.sirens', 'act4.sms.mason1', 'act4.sms.ethan1',
    'act4.fail.door', 'act4.fail.noise', 'act4.fail.seen', 'act4.fail.outside',
  ];
  var DOOR = { x: 5, y: 1.2, z: 21.5 };
  var SHOWER = { x: 0.85, y: 1.4, z: 23.2 };
  var WINDOW_OUT = { x: 11.55, z: -9.95 }; // where he stands, at the driver's window

  OC.acts.act4 = {
    id: 'act4',
    night: 2,
    spawn: 'bathInside',
    clockDef: { startMin: 24 * 60 + 35, endMin: 24 * 60 + 50, durationSec: 300 },
    requiredText: TEXT,

    create: function (g) {
      var hud = g.hud;
      var t = g.t;
      var props = g.props;
      var ctl = g.ctl;
      var phone = g.phone;
      var cooper = g.cooper;
      var him = props.intruder;
      var none = { stop: function () {} };
      function sfx(name, opts) {
        return g.audio ? g.audio.play(name, opts) : none;
      }
      function tension(v) {
        if (g.drone && g.drone.setTension) g.drone.setTension(v);
      }

      // the house at 12:35 AM
      props.setLights({ living: 0, kitchen: 0, foyer: 0, hall: 0.15, porch: 1.0, laundry: 0.9, guest: 0.55, tv: 0, phoneglow: 0, yard: 0.75 });
      props.frontDoor.close();
      props.bathDoor.open();
      props.car.fixWindow();
      props.car.headlights(false);
      props.shards.clear();
      props.closet.reset();
      props.floorPhone.set(false);
      him.show(false);
      him.crouch = 0;
      him.raise = 0;
      cooper.setPos(6.2, 13.5); // shut out in the hall, out of the way
      cooper.follow();
      cooper.stare({ x: 2.5, y: 1, z: 16 });
      if (ctl.nav) ctl.nav.rebuild();
      ctl.sprintAllowed = false;
      ctl.light.available = true;
      ctl.light.on = true;
      phone.enabled = true;
      tension(0.7);

      var flags = {
        elapsed: 0,
        phase: 'bath', // bath -> run -> car -> exposed -> hide -> won | fail
        doorLocked: false,
        doorT: 0,
        showerOn: false,
        outsideT: 0,
        exposedT: 0,
        hideT: 0,
        room: 'bath',
      };
      var queue = [];
      function later(seconds, fn) {
        queue.push({ at: flags.elapsed + seconds, fn: fn });
      }
      var loops = [];
      function loop(name, opts) {
        var h = sfx(name, opts);
        loops.push(h);
        return h;
      }
      function stopLoops() {
        loops.forEach(function (h) { h.stop(); });
        loops = [];
      }
      var noise = OC.noise.createNoiseMeter();
      var route = []; // his walk: [{x, z, then}]
      var walkSpeed = 1.3;
      function walk(points, speed) {
        route = points.slice();
        walkSpeed = speed || 1.3;
      }

      var director = OC.director.createDirector(
        {
          tasks: [
            { id: 'lockDoor', label: 'Lock the bathroom door' },
            { id: 'shower', label: 'Turn on the shower' },
            { id: 'window', label: 'Get out the window' },
            { id: 'car', label: 'Get to the car' },
            { id: 'quiet', label: 'Stay quiet' },
          ],
          advanceWhen: function () { return false; },
        },
        {
          onTask: function () { phone.setTasks(director.list()); },
        }
      );
      phone.setTasks(director.list());
      later(1.2, function () { hud.say(t('act4.vo.open'), 9000); });

      // ---- failing and winning ---------------------------------------------------------------------
      function fail(reason) {
        if (flags.phase === 'fail' || flags.phase === 'won') return;
        flags.phase = 'fail';
        g.state.cutscene = true;
        stopLoops();
        hud.setNoise(null);
        sfx('sting', { gain: 0.9 });
        if (reason === 'door') {
          props.bathDoor.open(true);
          sfx('thud', { pos: DOOR, gain: 1.6 });
        } else if (reason === 'noise' || reason === 'seen') {
          sfx('glassSmash', { pos: { x: 11, y: 1.2, z: -9.9 }, gain: 1.2 });
          props.car.breakWindow();
        }
        tension(1);
        setTimeout(function () {
          hud.failScreen("YOU DIDN'T MAKE IT", t('act4.fail.' + reason), function () {
            hud.fadeIn();
            if (g.onEnd) g.onEnd('act4', 'retry');
          });
        }, 700);
      }

      function win() {
        flags.phase = 'won';
        director.complete('quiet');
        hud.setNoise(null);
        tension(0.2);
        var flash = 0;
        var porch = g.world.lightById.porch;
        var timer = setInterval(function () {
          flash++;
          if (porch) {
            porch.color.setHex(flash % 2 ? 0xff2a2a : 0x2a4dff);
            porch.intensity = 1.6;
          }
        }, 380);
        later(4, function () {
          clearInterval(timer);
          if (porch) {
            porch.color.setHex(0xffd9a0);
            porch.intensity = 1.0;
          }
          g.state.cutscene = true;
          stopLoops();
          hud.fadeOut('');
          setTimeout(function () { hud.setFadeText(t('act4.vo.end')); }, 1500);
          setTimeout(function () { if (g.onEnd) g.onEnd('act4'); }, 9500);
        });
      }

      // ---- the escape --------------------------------------------------------------------------------
      function climbOut() {
        g.state.cutscene = true;
        hud.fadeOut('');
        director.complete('window');
        sfx('thud', { pos: { x: 0, y: 1.4, z: 21.5 }, gain: 0.6 });
        setTimeout(function () {
          ctl.stand();
          ctl.teleport(-1.0, 21.5, 0, 0);
          ctl.sprintAllowed = true;
          flags.phase = 'run';
          g.state.cutscene = false;
          hud.fadeIn();
          hud.toast('Hold Shift to run', 4000);
          hud.say(t('act4.thought.outside'));
          tension(0.85);
        }, 1700);
      }

      function getDown() {
        flags.phase = 'hide';
        flags.hideT = 0;
        if (ctl.light.on) {
          ctl.light.on = false; // Mason kills the light as he drops; turning it back on is a mistake
          sfx('click', { gain: 0.5 });
        }
        hud.say(t('act4.thought.down'));
        hud.setNoise(0);
        // slumped down below the dash, looking up at the driver's window
        ctl.eyeTarget = -0.73;
        ctl.teleport(10.3, -9.95, -Math.PI / 2, 0.22);
        later(1.5, function () { phone.send('ethan', t('act4.sms.mason1')); });
        later(6, function () { phone.deliver('ethan', 'Ethan', t('act4.sms.ethan1')); });
        // his walk: down the drive, once slowly round the car, then to the driver's window
        walk(
          [
            { x: 7.6, z: -6.4 },
            { x: 11.8, z: -7.4 },
            { x: 11.9, z: -12.5 },
            { x: 8.1, z: -12.4 },
            { x: 8.1, z: -7.4 },
            { x: 11.8, z: -7.4 },
            { x: WINDOW_OUT.x, z: WINDOW_OUT.z, then: 'arrive' },
          ],
          1.4
        );
        // what happens while Mason lies there (seconds after getting down)
        later(26, function () {
          him.faceTo(10.3, -9.95);
          him.crouch = 1;
          hud.say(t('act4.thought.peek'));
          tension(1);
        });
        later(31, function () { him.crouch = 0; him.raise = 1; });
        later(32.2, function () {
          him.raise = 0.2;
          props.car.breakWindow();
          props.shards.burst(10.85, 1.15, -9.8);
          sfx('glassSmash', { pos: { x: 10.9, y: 1.15, z: -9.9 }, gain: 1.4 });
          sfx('crowbar', { pos: { x: 10.9, y: 1.15, z: -9.9 } });
        });
        later(33.5, function () { him.crouch = 0.6; him.raise = 0; });
        later(35, function () { hud.say(t('act4.thought.smash')); });
        later(47, function () { loop('siren', { pos: { x: -25, y: 2, z: -30 }, gain: 0.5 }); });
        later(51, function () { hud.say(t('act4.thought.sirens')); });
        later(54, function () { loop('siren', { pos: { x: 0, y: 2, z: -24 }, gain: 1.0 }); });
        later(56, function () {
          him.crouch = 0;
          walk([{ x: 16, z: -14 }, { x: 30, z: -26, then: 'gone' }], 4.5);
        });
        later(60, function () { if (flags.phase === 'hide') win(); });
      }

      var items = [
        {
          id: 'bathDoor', x: 4.95, y: 1.0, z: 21.5, radius: 0.55,
          label: 'Close and lock the door',
          hold: 0.8,
          enabled: function () { return flags.phase === 'bath' && !flags.doorLocked; },
          onUse: function () {
            flags.doorLocked = true;
            props.bathDoor.close();
            sfx('doorLock', { pos: DOOR });
            director.complete('lockDoor');
            hud.say(t('act4.thought.lockDoor'));
            later(4, function () {
              if (flags.phase !== 'bath') return;
              loop('scrape', { pos: DOOR, gain: 0.9 });
              later(2.5, function () { hud.say(t('act4.thought.scrape')); });
            });
          },
        },
        {
          id: 'shower', x: 0.85, y: 1.3, z: 22.45, radius: 0.5,
          label: 'Turn on the shower',
          hold: 0.8,
          enabled: function () { return flags.phase === 'bath' && !flags.showerOn; },
          onUse: function () {
            flags.showerOn = true;
            loop('shower', { pos: SHOWER, gain: 1 });
            director.complete('shower');
            hud.say(t('act4.thought.shower'));
          },
        },
        {
          id: 'window', x: 0.15, y: 1.5, z: 21.5, radius: 0.45,
          label: 'Climb out the window',
          hold: 1.4,
          enabled: function () { return flags.phase === 'bath' && flags.doorLocked && flags.showerOn; },
          onUse: function () {
            hud.say(t('act4.thought.window'));
            climbOut();
          },
        },
        {
          id: 'car', x: 11.1, y: 1.0, z: -9.8, radius: 0.6,
          label: 'Get in the car',
          enabled: function () { return flags.phase === 'run'; },
          onUse: function () {
            flags.phase = 'car';
            director.complete('car');
            ctl.sprintAllowed = false;
            ctl.seat(10.4, -9.95, Math.PI, -0.6); // facing the house, through the windshield
            sfx('doorLock', { pos: { x: 10.9, y: 1, z: -9.9 } });
            hud.say(t('act4.thought.inCar'));
          },
        },
        {
          id: 'ignition', x: 10.4, y: 0.95, z: -8.85, radius: 0.35,
          label: 'Start the car',
          enabled: function () { return flags.phase === 'car'; },
          onUse: function () {
            flags.phase = 'cranking';
            sfx('engineSputter', { pos: { x: 10, y: 0.6, z: -8 } });
            later(3.1, function () { hud.say(t('act4.thought.dead')); });
            later(5.5, function () {
              props.frontDoor.open();
              sfx('creak', { pos: { x: 2.5, y: 1, z: 0 }, gain: 1.2 });
              him.setPos(2.5, 0.6);
              him.heading = Math.PI; // walking out, toward the drive (-z)
              him.show(true);
              hud.say(t('act4.thought.frontDoor'));
              flags.phase = 'exposed';
              flags.exposedT = 0;
              walk([{ x: 2.5, z: -2.6 }, { x: 7.6, z: -6.4 }], 1.0);
            });
          },
        },
        {
          id: 'down', x: 10.4, y: 0.75, z: -8.9, radius: 0.9,
          label: 'Get down!',
          enabled: function () { return flags.phase === 'exposed'; },
          onUse: getDown,
        },
      ];
      items.forEach(function (it) { g.interact.add(it); });

      // movement makes noise while hiding
      function onMouse(e) {
        if (flags.phase !== 'hide' || !ctl.locked) return;
        noise.poke((Math.abs(e.movementX || 0) + Math.abs(e.movementY || 0)) * 0.0014);
      }
      function onKey(e) {
        if (flags.phase !== 'hide' || !ctl.locked || e.repeat) return;
        noise.poke(0.16);
      }
      document.addEventListener('mousemove', onMouse);
      window.addEventListener('keydown', onKey);

      return {
        director: director,
        flags: flags,
        noise: noise,
        items: items,
        dispose: function () {
          stopLoops();
          hud.setNoise(null);
          him.show(false);
          ctl.sprintAllowed = false;
          document.removeEventListener('mousemove', onMouse);
          window.removeEventListener('keydown', onKey);
        },
        update: function (dt) {
          if (!ctl.locked) return;
          flags.elapsed += dt;
          flags.room = OC.layout.roomAt(OC.house, ctl.pos.x, ctl.pos.z);
          for (var i = queue.length - 1; i >= 0; i--) {
            if (queue[i].at <= flags.elapsed) queue.splice(i, 1)[0].fn();
          }
          // his walk
          if (route.length && him.visible()) {
            var p = route[0];
            if (him.stepTo(p.x, p.z, walkSpeed, dt)) {
              route.shift();
              if (p.then === 'arrive') him.faceTo(10.3, -9.95);
              if (p.then === 'gone') him.show(false);
            }
            if (Math.random() < dt * 1.8) sfx('step', { surface: 'grass', pos: { x: him.pos.x, y: 0, z: him.pos.z }, gain: 0.9 });
          }

          if (flags.phase === 'bath' && flags.doorLocked) {
            flags.doorT += dt;
            if (flags.doorT > 45) fail('door');
          } else if (flags.phase === 'run') {
            flags.outsideT += dt;
            if (flags.outsideT > 60) fail('outside');
          } else if (flags.phase === 'exposed') {
            flags.exposedT += dt;
            if (flags.exposedT > 7) fail('seen');
          } else if (flags.phase === 'hide') {
            flags.hideT += dt;
            if (ctl.light.on) noise.poke(0.6 * dt + 0.02); // a lit phone screen on the floor of a dark car
            noise.tick(dt);
            hud.setNoise(noise.level());
            if (noise.exceeded()) fail('noise');
          }
          director.tick(dt, flags);
        },
      };
    },
  };
})();
