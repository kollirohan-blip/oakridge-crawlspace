// Night one's chores, which double as exploring: the front door, the mail (an exterminator's invoice,
// and a church newsletter for "the Hale family or current resident"), the trash (the first time
// outside, the treeline, and a light that blinks once between the trees), the dishes (the kitchen
// sink is clogged, so they get done in the laundry room with your back to the hatch), brushing your
// teeth (the hall behind you, in the mirror), the patio latch, and the light switches.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var TEXT = [
    'n1.chore.doorStuck', 'n1.mail.invoiceTitle', 'n1.mail.invoice', 'n1.mail.newsTitle', 'n1.mail.news', 'n1.chore.mailDone',
    'n1.chore.bag', 'n1.chore.binned', 'n1.chore.trees', 'n1.chore.treeLight', 'n1.chore.treeLight2',
    'n1.chore.washStart', 'n1.chore.washed', 'n1.chore.brushStart', 'n1.chore.brush1', 'n1.chore.brushDone',
    'n1.chore.latch',
  ];
  var BINS = { x: -1.4, y: 1.0, z: -0.7 };
  var HATCH = { x: 2.5, y: 0.15, z: 10.5 };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var decor = props.decor;
    var ctl = g.ctl;
    var cooper = g.cooper;

    var st = { mail: false, bag: 'can', treeSeen: false, treeLookT: 0, binnedAt: -1, treesSaid: false, washing: false, washed: false, brushing: false, brushed: false };
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
          say('n1.chore.washStart', 6500);
          // the hatch is right behind you
          ctx.later(3.2, function () {
            ctx.sfx('creak', { pos: HATCH, gain: 0.45 });
          });
          ctx.later(6.5, function () {
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
          ctl.seat(3.95, 22.8, Math.PI, 0);
          water = ctx.sfx('water', { pos: { x: 3.95, y: 0.9, z: 23.5 }, gain: 0.6 });
          say('n1.chore.brushStart');
          ctx.later(1.5, stopWater);
          // somebody crosses the hall behind you, in the mirror. It's Cooper.
          ctx.later(2.2, function () {
            if (cooper.mode !== 'follow') return;
            cooper.goTo(6.0, 19.0, function () {
              cooper.goTo(6.0, 23.3, function () {
                cooper.follow();
              });
            });
          });
          ctx.later(3.5, function () { say('n1.chore.brush1', 6000); });
          ctx.later(7, function () {
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
      },
    };
    return api;
  }

  OC.night1.chores = { create: create, TEXT: TEXT };
})();
