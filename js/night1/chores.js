// Night one's chores, which double as exploring: the front door, the mail (an exterminator's invoice,
// and a church newsletter for "the Hale family or current resident"), the trash (the first time
// outside, the treeline, and a light that blinks once between the trees), the dishes (the kitchen
// sink is clogged, so they get done in the laundry room with your back to the hatch), brushing your
// teeth (somebody leans into the doorway behind you, in the mirror only), the patio latch, and the
// light switches.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var TEXT = [
    'n1.chore.doorStuck', 'n1.mail.invoiceTitle', 'n1.mail.invoice', 'n1.mail.newsTitle', 'n1.mail.news', 'n1.chore.mailDone',
    'n1.chore.bag', 'n1.chore.binned', 'n1.chore.trees', 'n1.chore.treeLight', 'n1.chore.treeLight2',
    'n1.chore.washStart', 'n1.chore.washed', 'n1.chore.brushStart', 'n1.chore.brush1', 'n1.chore.brush2', 'n1.chore.brushDone',
    'n1.chore.latch',
  ];
  var BINS = { x: -1.4, y: 1.0, z: -0.7 };
  var HATCH = { x: 2.5, y: 0.15, z: 10.5 };
  // while you brush, somebody leans into the open bathroom door behind you, seen only in the glass: from
  // the hall beside the door (hidden by the wall), into the doorway, a look, and back
  var PEEK_HIDE = { x: 5.6, z: 21.6 };
  var PEEK_IN = { x: 5.06, z: 21.6 };
  var PEEK_SPEED = 1.3;
  var PEEK_HOLD = 0.9;
  var BATH_DOOR = { x: 5, y: 1.0, z: 21.5 };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var decor = props.decor;
    var ctl = g.ctl;
    var cooper = g.cooper;
    var wes = props.intruder;

    var st = {
      mail: false, bag: 'can', treeSeen: false, treeLookT: 0, binnedAt: -1, treesSaid: false, washing: false, washed: false, brushing: false, brushed: false,
      pass: 'none', passT: 0, passFrames: 0, // 'none' | 'waiting' | 'in' | 'hold' | 'out' | 'done' | 'missed'
    };
    var passShowing = false;
    var glance = null; // the view turning over his shoulder and back: { t, yaw0, pitch0, yaw1, pitch1 }
    function turnBy(a, b) {
      var d = b - a;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      return d;
    }
    var lights = {};
    var water = null;
    function say(id, ms) {
      hud.say(t(id), ms);
    }
    function stopWater() {
      if (water) water.stop();
      water = null;
    }
    function setLight(id, on) {
      var sw = OC.house.switches.filter(function (s) { return s.light === id; })[0];
      lights[id] = !!on;
      var lv = {};
      lv[id] = on ? sw.on : 0;
      props.setLights(lv);
    }

    // the light switches, starting from however the act set the lights
    OC.house.switches.forEach(function (s) {
      var l = g.world.lightById[s.light];
      lights[s.light] = !!(l && l.intensity > 0);
    });

    var items = [
      {
        id: 'frontDoor', x: 2.5, y: 1.0, z: 0, radius: 0.5,
        label: function () { return props.frontDoor.isOpen ? 'Close the front door' : 'Open the front door'; },
        onUse: function () {
          if (props.frontDoor.isOpen) {
            if (!props.frontDoor.close(ctl.pos)) return say('n1.chore.doorStuck');
          } else props.frontDoor.open();
          ctx.sfx('slide', { pos: { x: 2.5, y: 1, z: 0 }, gain: 0.6 });
          if (ctl.nav) ctl.nav.rebuild();
        },
      },
      {
        id: 'mailbox', x: 7.07, y: 1.22, z: -13.4, radius: 0.3,
        label: function () { return st.mail ? 'Read the mail again' : 'Get the mail'; },
        onUse: function () {
          ctx.sfx('creak', { pos: { x: 7.07, y: 1.2, z: -13.4 }, gain: 0.5 });
          g.read(t('n1.mail.invoiceTitle'), t('n1.mail.invoice'), function () {
            g.read(t('n1.mail.newsTitle'), t('n1.mail.news'), function () {
              if (st.mail) return;
              st.mail = true;
              ctx.complete('mail');
              ctx.log('mail');
              say('n1.chore.mailDone', 6500);
            });
          });
        },
      },
      {
        id: 'trashBag', x: 7.7, y: 0.7, z: 7.52, radius: 0.3,
        label: 'Take out the trash',
        enabled: function () { return st.bag === 'can'; },
        onUse: function () {
          st.bag = 'held';
          decor.bag('held');
          ctx.sfx('rustle', { gain: 0.7 });
          say('n1.chore.bag');
        },
      },
      {
        id: 'bins', x: BINS.x, y: BINS.y, z: BINS.z, radius: 0.45,
        label: 'Throw the bag in the bin',
        enabled: function () { return st.bag === 'held'; },
        onUse: function () {
          st.bag = 'out';
          decor.bag('out');
          ctx.sfx('thud', { pos: BINS, gain: 0.5 });
          st.binnedAt = ctx.flags.elapsed;
          ctx.complete('trash');
          ctx.log('trash');
          say('n1.chore.binned');
        },
      },
      {
        id: 'laundrySink', x: 1.55, y: 0.95, z: 8.4, radius: 0.35,
        label: 'Wash the dishes',
        enabled: function () { return !st.washed && !st.washing && ctx.dinnerEaten(); },
        onUse: function () {
          st.washing = true;
          ctl.seat(1.55, 9.25, 0, 0);
          decor.plate('sink');
          water = ctx.sfx('water', { pos: { x: 1.55, y: 1, z: 8.3 } });
          say('n1.chore.washStart', 3600);
          // the hatch is right behind you: it creaks, and he looks back over his shoulder at it. It's shut.
          // The padlock's still. He looks at it a little too long, and goes back to the plate.
          ctx.later(3.2, function () {
            ctx.sfx('creak', { pos: HATCH, gain: 0.45 });
          });
          ctx.later(3.5, function () {
            if (!st.washing) return;
            var dx = HATCH.x - ctl.pos.x;
            var dz = HATCH.z - ctl.pos.z;
            glance = { t: 0, yaw0: ctl.yaw, pitch0: ctl.pitch, yaw1: Math.atan2(-dx, -dz), pitch1: -0.62 };
          });
          ctx.later(7, function () {
            stopWater();
            st.washing = false;
            st.washed = true;
            ctl.stand();
            decor.plate('none');
            ctx.complete('washUp');
            ctx.log('washedUp');
            say('n1.chore.washed', 6000);
          });
        },
      },
      {
        id: 'vanity', x: 3.95, y: 0.95, z: 23.45, radius: 0.35,
        label: 'Brush your teeth',
        enabled: function () { return !st.brushing && !st.brushed; },
        onUse: function () {
          st.brushing = true;
          if (!lights.bath) {
            setLight('bath', true);
            ctx.sfx('switch', { pos: { x: 4.88, y: 1.25, z: 20.9 } });
          }
          // at the west end of the vanity, turned to the glass, so it shows the open door behind him
          ctl.seat(3.6, 22.8, -2.83, 0);
          water = ctx.sfx('water', { pos: { x: 3.95, y: 0.9, z: 23.5 }, gain: 0.6 });
          say('n1.chore.brushStart');
          ctx.later(1.5, stopWater);
          // somebody leans into the doorway behind you, in the mirror (see update)
          st.pass = 'waiting';
          st.passT = 0;
          ctx.later(8.5, function () {
            st.brushing = false;
            st.brushed = true;
            ctl.stand();
            ctx.complete('brushTeeth');
            ctx.log('brushedTeeth');
            say('n1.chore.brushDone');
          });
        },
      },
      {
        id: 'latch', x: 19.52, y: 1.05, z: 7.9, radius: 0.35,
        label: 'Lock the patio door',
        hold: 1.2,
        enabled: function () { return !props.slider.locked; },
        onUse: function () {
          props.slider.setLocked(true);
          ctx.sfx('doorLock', { pos: { x: 19.5, y: 1.05, z: 8 } });
          say('n1.chore.latch');
          ctx.complete('lockPatio');
          ctx.log('lockedPatio');
        },
      },
    ];
    OC.house.switches.forEach(function (s) {
      items.push({
        id: 'switch.' + s.light, x: s.x, y: s.y, z: s.z, radius: 0.12,
        label: function () { return (lights[s.light] ? 'Turn off the ' : 'Turn on the ') + s.label + ' light'; },
        onUse: function () {
          setLight(s.light, !lights[s.light]);
          ctx.sfx('switch', { pos: { x: s.x, y: s.y, z: s.z } });
          ctx.log('switch', { kind: s.light });
        },
      });
    });

    // the man in the hall exists only for the mirror's camera: the room behind you is empty
    g.mirror.beforeRender = function () {
      if (['in', 'hold', 'out'].indexOf(st.pass) < 0 || wes.visible()) return;
      passShowing = true;
      st.passFrames++;
      wes.spill(1);
      wes.show(true);
    };
    g.mirror.afterRender = function () {
      if (!passShowing) return;
      passShowing = false;
      wes.show(false);
      wes.spill(0);
    };

    var api = {
      items: items,
      state: st,
      lightsOn: function () {
        return Object.keys(lights).filter(function (k) { return lights[k]; }).length;
      },
      allLightsOn: function () {
        OC.house.switches.forEach(function (s) { setLight(s.light, true); });
      },
      setLight: setLight,
      update: function (dt) {
        // the dishes: over his shoulder at the hatch (0.7 s), a long look (1.5 s), and back to the sink (0.8 s)
        if (glance) {
          glance.t += dt;
          var gt = glance.t;
          var k = gt < 0.7 ? gt / 0.7 : gt < 2.2 ? 1 : Math.max(0, 1 - (gt - 2.2) / 0.8);
          var e = k * k * (3 - 2 * k);
          ctl.yaw = glance.yaw0 + turnBy(glance.yaw0, glance.yaw1) * e;
          ctl.pitch = glance.pitch0 + (glance.pitch1 - glance.pitch0) * e;
          if (gt >= 3.0) glance = null;
        }
        // brushing: once he has been looking at the glass for a moment, somebody leans into the open door
        // behind him, looks, and goes. If he never looks, or the door is shut, or the man is busy elsewhere,
        // nobody comes.
        if (st.pass === 'waiting') {
          st.passT += dt;
          var blocked = (props.bathDoor && props.bathDoor.closed) || wes.visible();
          if (g.mirror.active && st.passT > 1.4 && !blocked) {
            st.pass = 'in';
            wes.setPos(PEEK_HIDE.x, PEEK_HIDE.z);
            wes.crouch = 0;
            wes.raise = 0;
            wes.lift = 0;
            wes.redEye(false);
            wes.pose('stand', true);
          } else if (st.passT > 4.5) st.pass = 'missed';
        } else if (st.pass === 'in') {
          if (wes.stepTo(PEEK_IN.x, PEEK_IN.z, PEEK_SPEED, dt)) {
            st.pass = 'hold';
            st.passT = 0;
            wes.pose('peek');
          }
          wes.faceTo(ctl.pos.x, ctl.pos.z);
        } else if (st.pass === 'hold') {
          st.passT += dt;
          wes.faceTo(ctl.pos.x, ctl.pos.z);
          if (st.passT > PEEK_HOLD) {
            st.pass = 'out';
            wes.pose('stand');
          }
        } else if (st.pass === 'out' && wes.stepTo(PEEK_HIDE.x, PEEK_HIDE.z, PEEK_SPEED, dt)) {
          st.pass = 'done';
          // (if he turned away before he could have seen it, there is no line about it)
          if (st.passFrames >= 8) {
            ctx.log('sawMirrorPass');
            ctx.tension.peak(3);
            ctx.later(0.4, function () { say('n1.chore.brush1', 4500); });
          }
          // Cooper, beside him, turns to the door: so it was not Cooper
          if (st.passFrames >= 8 && cooper.mode === 'follow' && Math.hypot(cooper.pos.x - ctl.pos.x, cooper.pos.z - ctl.pos.z) < 4) {
            cooper.stare(BATH_DOOR);
            cooper.ears(true);
            ctx.later(3.2, function () { say('n1.chore.brush2', 4500); });
            ctx.later(5.5, function () {
              cooper.ears(false);
              if (cooper.mode === 'stare') cooper.stare(null);
            });
          }
        }
        // at the bins, the treeline: one light between the trees, once, when you are looking
        if (st.bag === 'out' && !st.treeSeen && ctx.flags.room === null) {
          var near = Math.hypot(ctl.pos.x - BINS.x, ctl.pos.z - BINS.z) < 4.5;
          if (near) {
            var cam = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
            var looking = OC.sightline.inView(cam, decor.treeLight.at, 0.45);
            st.treeLookT = looking ? st.treeLookT + dt : 0;
            if (st.treeLookT > 0.6) {
              st.treeSeen = true;
              decor.treeLight.blink();
              ctx.log('sawTreeLight');
              ctx.tension.peak(2);
              ctx.later(0.9, function () { say('n1.chore.treeLight', 4500); });
              ctx.later(5.5, function () { say('n1.chore.treeLight2', 6000); });
            } else if (!st.treesSaid && ctx.flags.elapsed - st.binnedAt > 2.5) {
              st.treesSaid = true;
              say('n1.chore.trees', 6000);
            }
          }
        }
      },
      dispose: function () {
        stopWater();
        g.mirror.beforeRender = g.mirror.afterRender = null;
        if (passShowing) wes.show(false);
      },
    };
    return api;
  }

  OC.night1.chores = { create: create, TEXT: TEXT };
})();
