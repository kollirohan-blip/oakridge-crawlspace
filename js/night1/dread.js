// Night one's dread. The tension Director (js/engine/tension.js) runs all night and spends ambient
// events from the scare pool; after the settled-in gate (4 routine tasks or 8 minutes) the scripted
// beats go in order, each waiting for the Director to be ready (no relief window, no cooldown):
//   the hallway photo (a hooded shoulder, red-eye in the flash; looking up, nothing),
//   the scratching that travels under the floor and stops under your feet (three choices),
//   Dave's lamp and the shape behind the blinds that only moves when you look away,
//   the laundry door, closed, Cooper staring at it, three soft knocks; empty when you open it,
//   relief (lights, Cooper beside you, a dumb text from Ethan), then bed, and the pet cam at 2:13 AM.
// Every beat has a fallback, so a player who skips or idles still reaches bed.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var TEXT = [
    'n1.sms.ethanPhoto', 'n1.sms.masonPhoto', 'n1.sms.ethanWall', 'n1.sms.ethanWho', 'n1.sms.ethanEdit', 'n1.sms.ethanNvm',
    'n1.dread.photoEmpty', 'n1.dread.photoCooper', 'n1.dread.scratchStart', 'n1.dread.scratchPrompt',
    'n1.dread.optLights', 'n1.dread.optCooper', 'n1.dread.optHatch', 'n1.dread.lights1', 'n1.dread.lights2',
    'n1.dread.cooper1', 'n1.dread.cooper2', 'n1.dread.hatch1', 'n1.dread.hatch2', 'n1.dread.froze',
    'act1.thought.hatch', 'act1.thought.lampOn', 'act1.thought.silhouette1', 'act1.thought.silhouette2',
    'act1.thought.lampOff', 'act1.thought.masterEmpty', 'act1.vo.silhouette',
    'n1.dread.cooperDoor', 'n1.dread.knocks1', 'n1.dread.empty', 'n1.dread.openedItself',
    'n1.sms.ethanRelief', 'n1.sms.masonRelief', 'n1.dread.relief', 'n1.petcam.alert', 'n1.dread.idleRelief',
  ];
  var SOUTH_WING = ['hall', 'laundry', 'guest', 'bath', 'office', 'master'];
  var HATCH = { x: 2.5, y: 0.15, z: 10.5 };
  var HALL_END = { x: 6, y: 1.5, z: 23.2 };
  var WES_PEEK = { x: 5.32, z: 16.15 }; // leaning out of the guest room doorway (his old bedroom)
  var LAUNDRY_DOOR = { x: 5, y: 1.0, z: 10.5 };
  var COOPER_AT_DOOR = { x: 5.95, z: 10.5 };
  var KNOCK_AT = { x: 4.3, y: 1.1, z: 10.5 };
  var BED = { x: 1.1, y: 0.6, z: 15.6 };
  var FEAR = { routine: 2, photo: 3, scratchWait: 3, scratch: 4, scratchChoice: 4, windowWait: 4, window: 5, knocksWait: 5, knocks: 6, knocked: 6, opened: 5, relief: 2, bed: 1, asleep: 1 };
  var BOOST = { routine: 0, photo: 0.12, scratchWait: 0.15, scratch: 0.35, scratchChoice: 0.4, windowWait: 0.25, window: 0.5, knocksWait: 0.45, knocks: 0.6, knocked: 0.6, opened: 0.5, relief: 0, bed: 0, asleep: 0 };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var cooper = g.cooper;
    var ctl = g.ctl;
    var phone = g.phone;
    var flags = ctx.flags;
    var tension = ctx.tension;
    var pool = OC.scarePool.createScarePool(OC.scares.items);

    var st = {
      stage: 'routine',
      at: 0, // when the current stage began
      photoAsked: -1,
      photoTaken: false,
      wallSaid: false,
      scratchPos: null,
      scratchBurst: 0,
      scratchT: 0,
      hatchCheck: false,
      hatchChecked: false,
      seenWindow: false,
      lastWindowLog: -99,
      lampHidden: false,
      knocked: false,
      lightSec: 0,
      lateSaid: false,
      masterSaid: false,
    };
    function say(id, ms) {
      hud.say(t(id), ms);
    }
    function stage(name) {
      st.stage = name;
      st.at = flags.elapsed;
    }
    function since() {
      return flags.elapsed - st.at;
    }
    function indoors() {
      return flags.room !== null;
    }
    // may the next scripted beat go? Only a relief window holds it back: the ambient cooldown does not,
    // or ambient sounds firing the moment each cooldown ends would starve the beats for good
    function beatReady() {
      return !tension.inRelief();
    }
    function free() {
      // nothing else has Mason: not sitting, reading, choosing or in a modal
      return !ctl.frozen && !g.state.modal && !phone.choosing() && !hud.isReading() && !g.state.cutscene;
    }

    // ---- the house's own sounds, so they can stop -----------------------------------------------
    var house = {};
    function startHouse() {
      house.hum = ctx.loop('fridgeHum', { pos: { x: 12.55, y: 1.0, z: 0.5 }, gain: 0.9 });
      house.clock = ctx.loop('clockTick', { pos: { x: 25.7, y: 1.9, z: 1.5 }, gain: 0.8 });
    }
    startHouse();

    // ---- ambient handlers for the Night 1 scare pool --------------------------------------------
    var ROOM_SPOTS = OC.house.rooms.map(function (r) { return { id: r.id, x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }; });
    var handlers = {
      creak: function () {
        var spots = ROOM_SPOTS.filter(function (s) { return s.id !== flags.room; });
        var s = spots[Math.floor(Math.random() * spots.length)];
        ctx.sfx('creak', { pos: { x: s.x, y: 2.3, z: s.z }, gain: 0.8 });
      },
      iceMaker: function () {
        ctx.sfx('ice', { pos: { x: 12.55, y: 1.2, z: 0.5 } });
      },
      cooperEars: function () {
        if (cooper.mode !== 'follow') return;
        // before the house turns, he looks at the hatch and wags: he knows who is down there
        var target = st.stage === 'routine' ? HATCH : Math.random() < 0.5 ? HATCH : HALL_END;
        cooper.stare(target);
        if (st.stage === 'routine') cooper.wag(0.4);
        ctx.later(3.5, function () {
          cooper.stare(null);
          cooper.wag(null);
        });
      },
      suddenSilence: function () {
        if (house.hum) house.hum.stop();
        if (house.clock) house.clock.stop();
        phone.stopMusic();
        ctx.later(3, startHouse);
      },
      idlePunish: function () {
        var bx = ctl.pos.x + Math.sin(ctl.yaw) * 3;
        var bz = ctl.pos.z + Math.cos(ctl.yaw) * 3;
        ctx.sfx(Math.random() < 0.5 ? 'creak' : 'knock', { pos: { x: bx, y: 0.3, z: bz }, count: 1, gain: 0.7 });
        // and the relief: Cooper comes and leans on you
        ctx.later(2.5, function () {
          if (cooper.mode !== 'follow' && cooper.mode !== 'idle') return;
          cooper.goTo(ctl.pos.x + Math.sin(ctl.yaw) * -0.8, ctl.pos.z + Math.cos(ctl.yaw) * -0.8, function () {
            cooper.follow();
            cooper.wag(0.5, 1.5);
            say('n1.dread.idleRelief');
            ctx.later(4, function () { cooper.wag(null); });
          });
        });
      },
    };
    // every Night 1 pool item must have something to do
    (function check() {
      var need = {};
      for (var f = 1; f <= 10; f++) pool.eligible({ night: 1, fear: f, now: 0 }).forEach(function (i) { need[i.id] = true; });
      Object.keys(need).forEach(function (id) {
        if (!handlers[id]) throw new Error('Night 1 scare pool item has no handler: ' + id);
      });
    })();
    function fireAmbient(kind) {
      var ctxP = { night: 1, fear: FEAR[st.stage] || 2, now: flags.elapsed };
      var item = null;
      if (kind === 'idle') {
        item = pool.pick(Object.assign({ kind: 'idle' }, ctxP));
      } else {
        if (Math.random() < 0.3) item = pool.pick(Object.assign({ kind: 'scare' }, ctxP));
        if (!item) item = pool.pick(Object.assign({ kind: 'ambient' }, ctxP));
      }
      if (!item) return;
      pool.fire(item.id, flags.elapsed);
      handlers[item.id]();
    }

    // ---- the settled-in gate ----------------------------------------------------------------------
    function settle() {
      stage('photo');
      ctx.mods.tv.armAlert();
      ctx.mods.tv.armReflection();
      ctx.later(6, function () {
        phone.deliver('ethan', 'Ethan', t('n1.sms.ethanPhoto'));
        ctx.reveal('photo');
        st.photoAsked = flags.elapsed;
        ctx.later(5, function () { phone.send('ethan', t('n1.sms.masonPhoto')); });
      });
    }

    // ---- beat 1: the hallway photo ----------------------------------------------------------------
    g.photo.beforeShot = function (cam) {
      if (st.stage !== 'photo' || st.photoTaken || st.photoAsked < 0) return null;
      var far = Math.hypot(cam.x - HALL_END.x, cam.z - HALL_END.z) > 6;
      var sees = far && OC.sightline.inView(cam, HALL_END, 0.45) && OC.sightline.lineOfSight(ctl.boxes, cam, HALL_END, 1.5);
      if (!sees) return { subject: null, undo: function () {} };
      var w = props.intruder;
      w.setPos(WES_PEEK.x, WES_PEEK.z);
      w.faceTo(cam.x, cam.z);
      w.crouch = 0.15;
      w.raise = 0;
      w.update();
      w.show(true);
      w.redEye(true);
      return {
        subject: 'wesShoulder',
        undo: function () {
          w.show(false);
          w.redEye(false);
          w.crouch = 0;
        },
      };
    };
    g.photo.onPhoto = function (photo) {
      if (st.stage !== 'photo' || st.photoTaken || st.photoAsked < 0) return;
      if (photo.subject === 'wesShoulder') {
        st.photoTaken = true;
        ctx.log('photoWes');
        ctx.complete('photo');
        tension.peak(5);
        ctx.later(1.2, function () { phone.send('ethan', '[photo]'); });
        ctx.later(2.5, function () { say('n1.dread.photoEmpty', 6500); });
        ctx.later(5, function () { phone.deliver('ethan', 'Ethan', t('n1.sms.ethanWho')); });
        ctx.later(9.5, function () {
          if (cooper.mode === 'follow') {
            cooper.stare(HALL_END);
            cooper.wag(0.3, 0.6);
            say('n1.dread.photoCooper', 5500);
            ctx.later(5, function () {
              cooper.stare(null);
              cooper.wag(null);
            });
          }
        });
        ctx.later(16, function () { phone.deliver('ethan', 'Ethan', t('n1.sms.ethanEdit')); });
        ctx.later(17, function () { stage('scratchWait'); });
      } else {
        ctx.log('photo');
        if (!st.wallSaid) {
          st.wallSaid = true;
          ctx.later(3, function () { phone.deliver('ethan', 'Ethan', t('n1.sms.ethanWall')); });
        }
      }
    };

    // ---- beat 2: the scratching that travels ------------------------------------------------------
    function startScratch() {
      stage('scratch');
      tension.spend();
      st.scratchPos = { x: HATCH.x, z: HATCH.z };
      st.scratchBurst = 0;
      st.scratchT = 0;
      ctx.mods.tv.standUp();
      say('n1.dread.scratchStart', 4500);
    }
    function updateScratch(dt) {
      if (!indoors()) return; // it waits for you to come back in
      st.scratchT += dt;
      var p = st.scratchPos;
      var dx = ctl.pos.x - p.x;
      var dz = ctl.pos.z - p.z;
      var d = Math.hypot(dx, dz);
      if (d > 0.5 && st.scratchT < 40) {
        var step = Math.min(d, 0.9 * dt);
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
        st.scratchBurst -= dt;
        if (st.scratchBurst <= 0) {
          st.scratchBurst = 0.7;
          ctx.sfx('scratch', { pos: { x: p.x, y: -0.15, z: p.z }, gain: 1.3, duration: 0.8 });
        }
        return;
      }
      // right under your feet
      stage('scratchChoice');
      ctx.later(1.3, function () {
        cooper.stare({ x: ctl.pos.x, y: 0, z: ctl.pos.z });
        ctx.sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, duration: 2.4 });
      });
      ctx.later(2.2, function () {
        phone.choice({
          prompt: t('n1.dread.scratchPrompt'),
          seconds: 20,
          options: [
            { id: 'lights', text: t('n1.dread.optLights') },
            { id: 'cooper', text: t('n1.dread.optCooper') },
            { id: 'hatch', text: t('n1.dread.optHatch') },
          ],
        }).then(scratchChoice);
      });
    }
    function scratchChoice(id) {
      cooper.stare(null);
      var kind = id === 'timeout' ? 'froze' : id;
      ctx.log('scratch', { kind: kind });
      tension.peak(5);
      if (kind === 'lights') {
        ctx.mods.chores.allLightsOn();
        ctx.sfx('switch', { gain: 0.8 });
        say('n1.dread.lights1');
        ctx.later(3.5, function () { say('n1.dread.lights2', 6000); });
      } else if (kind === 'cooper') {
        say('n1.dread.cooper1');
        var at = { x: ctl.pos.x, z: ctl.pos.z };
        cooper.sniff({ x: at.x + 0.6, z: at.z }, function () {
          cooper.wag(0.3, 0.6);
          cooper.pose('lie');
          cooper.stay();
          say('n1.dread.cooper2', 7500);
          ctx.later(8, function () {
            cooper.wag(null);
            cooper.follow();
          });
        });
      } else if (kind === 'hatch') {
        st.hatchCheck = true;
        ctx.reveal('hatch');
        say('n1.dread.hatch1');
      } else {
        say('n1.dread.froze', 5500);
      }
      ctx.later(4, function () { stage('windowWait'); });
    }

    // ---- beat 3: Dave's lamp, and the shape behind the blinds -------------------------------------
    var figure = OC.silhouette.createSilhouette(['lampOn', 'figureA', 'figureB', 'gone']);
    var saidSilhouette = false;
    function voSilhouette() {
      if (saidSilhouette) return;
      saidSilhouette = true;
      hud.say(t('act1.vo.silhouette'), 9000);
    }
    function stareFor(target, seconds) {
      cooper.stare(target);
      ctx.later(seconds, function () { cooper.stare(null); });
    }
    function onSighted(s) {
      if (s === 'lampOn') {
        say('act1.thought.lampOn');
      } else if (s === 'figureA') {
        ctx.sfx('sting', { gain: 0.45 });
        say('act1.thought.silhouette1');
        stareFor(props.master.windows[0], 7);
        ctx.sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, duration: 2.2 });
      } else if (s === 'figureB') {
        say('act1.thought.silhouette2');
        var beat = ctx.sfx('heartbeat', { gain: 0.7 });
        ctx.later(8, function () { beat.stop(); });
        stareFor(props.master.windows[1], 7);
      } else if (s === 'gone') {
        windowGone();
      }
    }
    function windowGone() {
      if (st.stage !== 'window') return;
      say('act1.thought.lampOff');
      ctx.later(5, voSilhouette);
      tension.peak(6);
      stage('knocksWait');
    }
    // can Mason see Dave's window right now?
    function seesWindow() {
      var room = flags.room;
      var cam = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
      var target = props.master.focus();
      var vantage = room === 'living' || (room === null && ctl.pos.x > 13 && ctl.pos.z > 8);
      var dist = Math.hypot(ctl.pos.x - target.x, ctl.pos.z - target.z);
      var faceOn = (ctl.pos.x - target.x) / dist >= 0.34;
      return vantage && faceOn && OC.sightline.inView(cam, target, 0.42) && OC.sightline.lineOfSight(ctl.boxes, cam, target, 1.5);
    }
    function updateFigure(dt, seen) {
      var inSouthWing = SOUTH_WING.indexOf(flags.room) >= 0;
      if (inSouthWing) {
        // walking toward Dave's room: the lamp goes dark, and if someone was there, they are gone
        if (figure.index() === 0 && props.master.stage === 'lampOn') {
          props.master.setStage('off');
          st.lampHidden = true;
        } else if (figure.index() === 1 || figure.index() === 2) {
          props.master.setStage('gone');
          windowGone();
        }
        return;
      }
      if (st.lampHidden && !seen) {
        props.master.setStage(figure.stage());
        st.lampHidden = false;
      }
      var ev = figure.update(seen, dt);
      if (ev && ev.advancedTo) props.master.setStage(ev.advancedTo);
      if (ev && ev.sighted) onSighted(ev.sighted);
    }

    // ---- beat 4: the laundry door, the knocks -----------------------------------------------------
    function doorOutOfSight() {
      var cam = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
      var far = Math.hypot(ctl.pos.x - LAUNDRY_DOOR.x, ctl.pos.z - LAUNDRY_DOOR.z) > 4;
      var visible = OC.sightline.inView(cam, LAUNDRY_DOOR, 0.8) && OC.sightline.lineOfSight(ctl.boxes, cam, LAUNDRY_DOOR, 1.0);
      return far && !visible;
    }
    function closeLaundryDoor() {
      if (!props.laundryDoor.close(ctl.pos, true)) return false;
      if (ctl.nav) ctl.nav.rebuild();
      cooper.setAvoid(null);
      cooper.goTo(COOPER_AT_DOOR.x, COOPER_AT_DOOR.z, function () {
        cooper.stare(LAUNDRY_DOOR);
        cooper.wag(0);
        ctx.later(2, function () { ctx.sfx('whine', { pos: { x: COOPER_AT_DOOR.x, y: 0.6, z: COOPER_AT_DOOR.z } }); });
      });
      ctx.reveal('findCooper');
      ctx.later(4, function () { say('n1.dread.cooperDoor', 6500); });
      stage('knocks');
      return true;
    }
    function knock() {
      st.knocked = true;
      ctx.sfx('knock', { pos: KNOCK_AT, count: 3, gain: 0.5 });
      ctx.complete('findCooper');
      tension.peak(6);
      ctx.later(2.2, function () { say('n1.dread.knocks1', 6500); });
      stage('knocked');
    }
    function laundryOpened(byItself) {
      if (st.stage !== 'knocked') return;
      props.laundryDoor.open(true);
      if (ctl.nav) ctl.nav.rebuild();
      ctx.sfx('creak', { pos: LAUNDRY_DOOR, gain: 0.9 });
      cooper.stare(null);
      if (byItself) say('n1.dread.openedItself', 6000);
      else {
        ctx.log('knocksOpened');
        ctx.later(1.5, function () { say('n1.dread.empty', 7000); });
      }
      stage('opened');
      ctx.later(byItself ? 5 : 8, relief);
    }

    // ---- relief, then bed ---------------------------------------------------------------------------
    function relief() {
      stage('relief');
      ctx.mods.chores.allLightsOn();
      tension.relieve(90);
      cooper.setAvoid({ x0: 0, x1: 5, z0: 8, z1: 13 }, { x: 5.7, z: 10.5 });
      cooper.follow();
      cooper.wag(0.45);
      ctx.later(3, function () {
        cooper.goTo(ctl.pos.x + 0.7, ctl.pos.z + 0.4, function () {
          cooper.pose('lie');
          cooper.stay();
          ctx.later(10, function () {
            cooper.wag(null);
            cooper.follow();
          });
        });
      });
      ctx.later(4, function () { phone.deliver('ethan', 'Ethan', t('n1.sms.ethanRelief')); });
      ctx.later(9, function () { phone.send('ethan', t('n1.sms.masonRelief')); });
      ctx.later(11, function () {
        say('n1.dread.relief', 7500);
        ctx.reveal('bed');
        stage('bed');
      });
    }

    function goToBed() {
      ctx.log('bed', { lights: ctx.mods.chores.lightsOn() });
      ctx.log('phoneLight', { sec: Math.round(st.lightSec) });
      ctx.complete('bed');
      if (g.state.gag) return ctx.finish('gag');
      stage('asleep');
      g.state.cutscene = true;
      phone.close();
      phone.stopMusic();
      ctl.seat(2.4, 15.2, -Math.PI / 2, -1.0);
      hud.fadeOut('');
      ctx.later(1.8, function () {
        hud.setFadeText('2:13 AM');
        // the clock stops on 2:13
        g.clock = { tick: function () {}, minutes: function () { return 26 * 60 + 13; }, label: function () { return '2:13 AM'; }, finished: function () { return true; } };
        cooper.setPos(props.decor.dogBed.x, props.decor.dogBed.z);
        cooper.heading = 2.6; // lying on his bed, facing into the room
        cooper.stay();
        cooper.pose('lie');
        cooper.wag(0);
        cooper.headTo(null);
      });
      ctx.later(4.5, function () {
        hud.setFadeText('');
        ctx.sfx('buzz', { gain: 0.8 });
        phone.notify('PetCam', t('n1.petcam.alert'));
        phone.raise(true);
        phone.open();
        phone.app('petcam');
        g.state.petcamForce = true;
      });
      ctx.later(7, function () { cooper.headTo({ x: 13, z: 4 }); }); // he lifts his head toward the hall...
      ctx.later(9.5, function () { cooper.wag(0.55, 1.4); }); // ...and wags
      ctx.later(16, function () {
        phone.raise(false);
        phone.close();
        g.state.petcamForce = false;
        ctx.finish('normal');
      });
    }

    var items = [
      {
        id: 'hatch', x: 2.5, y: 0.08, z: 10.5, radius: 0.5,
        label: function () { return st.hatchCheck && !st.hatchChecked ? 'Check the hatch' : 'Look at the hatch'; },
        onUse: function () {
          if (st.hatchCheck && !st.hatchChecked) {
            st.hatchChecked = true;
            props.hatch.swing();
            ctx.complete('hatch');
            say('n1.dread.hatch2', 7000);
            return;
          }
          say('act1.thought.hatch');
        },
      },
      {
        id: 'laundryDoor', x: LAUNDRY_DOOR.x, y: LAUNDRY_DOOR.y, z: LAUNDRY_DOOR.z, radius: 0.45,
        label: 'Open the laundry door',
        hold: 0.8,
        enabled: function () { return props.laundryDoor.closed; },
        onUse: function () {
          if (st.stage === 'knocked') return laundryOpened(false);
          props.laundryDoor.open();
          if (ctl.nav) ctl.nav.rebuild();
        },
      },
      {
        id: 'bed', x: BED.x, y: BED.y, z: BED.z, radius: 0.7,
        label: 'Go to bed',
        enabled: function () { return st.stage === 'bed' && !flags.ending; },
        onUse: goToBed,
      },
    ];

    var api = {
      items: items,
      state: st,
      stage: function () {
        return st.stage;
      },
      pool: pool,
      update: function (dt) {
        if (ctl.light.on) st.lightSec += dt;

        // Dave's window: every look from the living room goes in the log (next night reads it)
        var seen = seesWindow();
        if (seen && !st.seenWindow && flags.elapsed - st.lastWindowLog > 3) {
          st.lastWindowLog = flags.elapsed;
          ctx.log('windowLook');
        }
        st.seenWindow = seen;

        // the Director: ambient sounds from the pool
        if (st.stage !== 'asleep' && !g.state.cutscene) {
          var ev = tension.update(dt, ctx.signs || { turnRate: 0, moving: true });
          if (ev) fireAmbient(ev.kind);
        }
        if (g.drone && g.drone.setTension) g.drone.setTension(Math.min(1, 0.06 + tension.menace() * 0.3 + (BOOST[st.stage] || 0)));

        if (g.clock && g.clock.finished && g.clock.finished() && !st.lateSaid && st.stage !== 'bed' && st.stage !== 'asleep') {
          st.lateSaid = true;
          say('act1.thought.late');
        }

        switch (st.stage) {
          case 'routine':
            if (OC.habits.settledIn({ tasksDone: ctx.routineDone(), elapsed: flags.elapsed })) settle();
            break;
          case 'photo':
            if (st.photoAsked >= 0 && !st.photoTaken && flags.elapsed - st.photoAsked > 90) {
              phone.deliver('ethan', 'Ethan', t('n1.sms.ethanNvm'));
              ctx.complete('photo');
              stage('scratchWait');
            }
            break;
          case 'scratchWait':
            if (beatReady() && indoors() && free() && since() > 5) startScratch();
            break;
          case 'scratch':
            updateScratch(dt);
            break;
          case 'windowWait':
            if (beatReady() && SOUTH_WING.indexOf(flags.room) < 0 && !seen && since() > 5) {
              props.master.setStage('lampOn');
              tension.spend();
              stage('window');
            } else if (since() > 90) {
              stage('knocksWait'); // never a moment to show it (always watching, or in the south wing): skip it
            }
            break;
          case 'window':
            updateFigure(dt, seen);
            // nobody is watching: after a minute the lamp just goes off
            if (st.stage === 'window' && since() > 60 && figure.index() === 0 && !seen) {
              props.master.setStage('off');
              windowGone();
            }
            // it is gone and Mason never looked back, or he stopped watching halfway: move on
            if (st.stage === 'window' && figure.stage() === 'gone') {
              st.goneT = (st.goneT || 0) + dt;
              if (st.goneT > 12) windowGone();
            }
            if (st.stage === 'window' && since() > 120) {
              props.master.setStage('gone');
              windowGone();
            }
            break;
          case 'knocksWait':
            if (since() > 4 && doorOutOfSight()) closeLaundryDoor();
            break;
          case 'knocks':
            if (Math.hypot(ctl.pos.x - COOPER_AT_DOOR.x, ctl.pos.z - COOPER_AT_DOOR.z) < 4.5 || since() > 45) knock();
            break;
          case 'knocked':
            if (since() > 60) laundryOpened(true);
            break;
        }
        if (st.stage !== 'window' && props.master.stage === 'gone' && flags.room === 'master' && !st.masterSaid) {
          st.masterSaid = true;
          say('act1.thought.masterEmpty');
          ctx.later(5, voSilhouette);
        }
      },
      dispose: function () {
        g.photo.beforeShot = null;
        g.photo.onPhoto = null;
        props.intruder.show(false);
        props.intruder.redEye(false);
      },
    };
    return api;
  }

  OC.night1.dread = { create: create, TEXT: TEXT };
})();
