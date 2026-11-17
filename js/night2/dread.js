// Night two's dread. The storm builds once the house is locked up. The tension Director spends the
// scare pool (the fish singing to an empty hall, the lights going off behind you, breathing at a
// vent that stops when you come close, three knocks, Cooper's ball rolling out of the dark, a sound
// from your own evening last night, someone at the end of the hall in the lightning). The habit gates
// punish how you spent night one: the breaker (reset it with your back to the hatch), the light that
// falters, the black TV that shows the slider open. Then the house phone rings, and it is only Dave.
// Then bed: a chair in the hall facing your door, and the pet cam going offline at 11:58.
// Every beat has a fallback, so a player who stands still all night still reaches bed.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night2 = OC.night2 || {};

  var TEXT = [
    'n2.storm.start', 'n2.gate.breaker', 'n2.gate.breaker2', 'n2.gate.breath', 'n2.gate.breakerDone', 'n2.gate.hatchOpenAgain',
    'n2.gate.tv1', 'n2.gate.tv2', 'n2.crawl.lightDies', 'n2.crawl.lightBack',
    'n2.scare.fish', 'n2.scare.follow1', 'n2.scare.follow2', 'n2.scare.breath', 'n2.scare.knocks', 'n2.scare.knocks2',
    'n2.scare.ball', 'n2.scare.mirror', 'n2.scare.familiar.microwave', 'n2.scare.familiar.kettle', 'n2.scare.familiar.oven',
    'n2.scare.familiar.tv', 'n2.scare.sighting', 'n2.scare.door', 'n2.scare.silence', 'n2.scare.idle',
    'n2.thought.ring', 'n2.thought.afterCall', 'n2.thought.hum', 'n2.sms.ethan1', 'n2.sms.mason1', 'n2.sms.ethan2',
    'n2.sms.ethan3', 'n2.sms.mom', 'n2.thought.late', 'n2.thought.chairHall', 'n2.vo.bed', 'n2.thought.pillowTitle',
    'n2.thought.pillowBook', 'n2.thought.pillow', 'n2.notify.petcam', 'n2.thought.petcam', 'act2.thought.cooperStares',
  ];
  var HATCH = { x: 2.5, y: 0.15, z: 10.5 };
  var HALL_END = { x: 6, y: 1.5, z: 23.0 };
  var TV = { x: 19.5, y: 1.25, z: 0.5 };
  var SLIDER = { x: 19.5, y: 1.0, z: 8.0 };
  var PHONE_AT = { x: 7.5, y: 1.4, z: 7.8 };
  var BED = { x: 1.1, y: 0.6, z: 15.6 };
  var GUEST_DOOR = { x: 5, y: 1.0, z: 16 };
  var CHAIR_HALL = { x: 6.45, y: 1.3, z: 16 }; // just over the chair's back
  var NORTH = ['foyer', 'kitchen', 'living'];
  var FAMILIAR_ROOM = { microwave: 'kitchen', kettle: 'kitchen', oven: 'kitchen', tv: 'living' };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var cooper = g.cooper;
    var ctl = g.ctl;
    var phone = g.phone;
    var ch = props.changes;
    var decor = props.decor;
    var wes = props.intruder;
    var flags = ctx.flags;
    var tension = ctx.tension;
    var weather = ctx.weather;
    var plan = ctx.plan;
    var say = ctx.say;
    var pool = OC.scarePool.createScarePool(OC.scares.items);

    var st = {
      stormed: false, mom: false,
      breaker: plan.gates.breaker ? 'armed' : 'none', // 'armed' | 'tripped' | 'done' | 'none'
      breathing: null, breathSaid: false, hatchWasShut: false,
      tv: plan.gates.tvReflection ? 'armed' : 'none', tvT: 0, tvLook: 0,
      faltered: false,
      mirror: 'none', mirrorT: 0,
      follow: 0, followLast: null, followPending: null,
      breath: null, sight: null, familiar: null, knockSaid: false, silenceSaid: false, lastFired: null,
      ring: null, ringAt: -1, called: false, callEndAt: -1, hummed: false, texted: false,
      chairMoved: false, chairSaid: false, bedOpen: false, pillowRead: false, sleeping: false, outPrints: false,
    };

    function since(at) {
      return at < 0 ? -1 : flags.elapsed - at;
    }
    function secured() {
      return flags.securedAt >= 0;
    }
    function cam() {
      return { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
    }
    function sees(p, cone) {
      // the line from his eyes to the thing passes over low furniture: test it at the height between them
      var h = (OC.controller.EYE + (p.y || 1.2)) / 2;
      return OC.sightline.inView(cam(), p, cone || 0.6) && OC.sightline.lineOfSight(ctl.boxes, cam(), p, h);
    }
    // may a scripted beat go now?
    function beatReady() {
      return !tension.inRelief() && ctx.free() && ctx.indoors() && !flags.inCrawl && !st.sleeping;
    }
    function cooperAt() {
      return { x: cooper.pos.x, y: 0.6, z: cooper.pos.z };
    }

    // ---- the house's own sounds, so they can stop --------------------------------------------------
    var house = {};
    function startHouse() {
      if (!ctx.lights.hasPower()) return;
      stopHouse();
      house.hum = ctx.loop('fridgeHum', { pos: { x: 12.55, y: 1.0, z: 0.5 }, gain: 0.9 });
      house.clock = ctx.loop('clockTick', { pos: { x: 25.7, y: 1.9, z: 1.5 }, gain: 0.8 });
    }
    function stopHouse() {
      if (house.hum) house.hum.stop();
      if (house.clock) house.clock.stop();
      house.hum = house.clock = null;
    }
    startHouse();

    // ---- the mirror: what it shows that the room does not ---------------------------------------------
    g.mirror.beforeRender = function () {
      if (st.mirror !== 'showing') return;
      wes.setPos(4.3, 21.25);
      wes.faceTo(ctl.pos.x, ctl.pos.z);
      wes.crouch = 0;
      wes.raise = 0;
      wes.pose('tilt', true);
      wes.update(0.001);
      wes.show(true);
    };
    g.mirror.afterRender = function () {
      if (st.mirror === 'showing') wes.show(false);
    };

    // ---- the scare pool ----------------------------------------------------------------------------------
    var ROOM_SPOTS = OC.house.rooms.map(function (r) { return { id: r.id, x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2 }; });
    function nearestVent() {
      var best = null;
      ch.vents.forEach(function (v) {
        var d = Math.hypot(v.x - ctl.pos.x, v.z - ctl.pos.z);
        if (d > 2.2 && d < 9 && (!best || d < best.d)) best = { v: v, d: d };
      });
      return best ? best.v : null;
    }
    var can = {
      iceMaker: function () { return ctx.lights.hasPower(); },
      cooperEars: function () { return cooper.mode === 'follow'; },
      heldBreath: function () { return !st.breath && !!nearestVent(); },
      emptyFetch: function () { return (flags.room === 'kitchen' || flags.room === 'living') && cooper.mode === 'follow' && Math.hypot(cooper.pos.x - ctl.pos.x, cooper.pos.z - ctl.pos.z) < 4; },
      wrongReflection: function () { return st.mirror === 'none'; },
      followingLight: function () {
        return ctx.lights.hasPower() && ['foyer', 'kitchen', 'living', 'hall', 'bath'].some(function (id) { return ctx.lights.wanted(id); });
      },
      familiarSound: function () { return ctx.lights.hasPower() && !st.familiar && flags.room !== FAMILIAR_ROOM[plan.familiar]; },
      almostSighting: function () {
        return secured() && weather.storm.level() > 0.5 && !st.sight && st.mirror !== 'showing' && (flags.room === 'kitchen' || flags.room === 'hall') && Math.hypot(ctl.pos.x - HALL_END.x, ctl.pos.z - HALL_END.z) > 6 && sees(HALL_END, 0.5);
      },
      blockedRoute: function () { return !props.laundryDoor.closed && NORTH.indexOf(flags.room) >= 0; },
      changedNote: function () { return flags.room !== 'kitchen' && !ch.pipesNote.changed; },
      fish: function () {
        var f = decor.fish.at;
        return Math.hypot(ctl.pos.x - f.x, ctl.pos.z - f.z) > 5 && Math.hypot(cooper.pos.x - f.x, cooper.pos.z - f.z) > 4;
      },
    };
    var handlers = {
      creak: function () {
        var spots = ROOM_SPOTS.filter(function (s) { return s.id !== flags.room; });
        var s = spots[Math.floor(Math.random() * spots.length)];
        ctx.sfx('creak', { pos: { x: s.x, y: 2.3, z: s.z }, gain: 0.8 });
      },
      iceMaker: function () {
        ctx.sfx('ice', { pos: { x: 12.55, y: 1.2, z: 0.5 } });
      },
      // his tell has changed: yesterday he wagged at the hatch
      cooperEars: function () {
        cooper.stare(Math.random() < 0.6 ? HATCH : HALL_END);
        cooper.ears(true);
        ctx.sfx('growl', { pos: cooperAt(), duration: 2.0, gain: 0.8 });
        ctx.later(4, function () { cooper.stare(null); });
      },
      suddenSilence: function () {
        stopHouse();
        weather.hush(3.4);
        phone.stopMusic();
        if (!st.silenceSaid) {
          st.silenceSaid = true;
          ctx.later(1.2, function () { say('n2.scare.silence', 3500); });
        }
        ctx.later(3.4, startHouse);
      },
      idlePunish: function () {
        var bx = ctl.pos.x + Math.sin(ctl.yaw) * 3;
        var bz = ctl.pos.z + Math.cos(ctl.yaw) * 3;
        ctx.sfx(Math.random() < 0.5 ? 'creak' : 'knock', { pos: { x: bx, y: 0.3, z: bz }, count: 1, gain: 0.7 });
        ctx.later(2.5, function () {
          if (cooper.mode !== 'follow' && cooper.mode !== 'idle') return;
          cooper.goTo(ctl.pos.x + Math.sin(ctl.yaw) * -0.8, ctl.pos.z + Math.cos(ctl.yaw) * -0.8, function () {
            cooper.follow();
            cooper.ears(true);
            say('n2.scare.idle');
          });
        });
      },
      // his calling card, from under the floor; then again, closer, wherever you went
      repeatedKnocks: function () {
        ctx.sfx('knock', { pos: { x: ctl.pos.x + 1.6, y: -0.2, z: ctl.pos.z + 1.1 }, count: 3, gain: 1.0 });
        ctx.later(1.8, function () { say('n2.scare.knocks', 4000); });
        ctx.later(8, function () {
          ctx.sfx('knock', { pos: { x: ctl.pos.x + 0.4, y: -0.2, z: ctl.pos.z + 0.3 }, count: 3, gain: 1.3 });
          cooper.stare({ x: ctl.pos.x, y: 0, z: ctl.pos.z });
          ctx.later(1.6, function () { say('n2.scare.knocks2', 5000); });
          ctx.later(5, function () { cooper.stare(null); });
        });
        tension.peak(6);
        ctx.log('knocks', { night: 2 });
      },
      heldBreath: function () {
        var v = nearestVent();
        st.breath = { at: v, t: 0, handle: ctx.sfx('breath', { pos: v, count: 8, gain: 1.6, ref: 1.2 }) };
      },
      // Cooper's ball comes rolling out of the dark hall. Cooper is right here
      emptyFetch: function () {
        var b = decor.ball;
        var from = { x: 6, z: 9.4 };
        var dx = ctl.pos.x - from.x;
        var dz = ctl.pos.z - from.z;
        var d = Math.hypot(dx, dz) || 1;
        b.pos = { x: from.x, y: 0.1, z: from.z };
        b.vel = { x: (dx / d) * 3.4, y: 0.6, z: (dz / d) * 3.4 };
        b.held = false;
        b.moving = true;
        ctx.sfx('bounce', { pos: { x: from.x, y: 0.1, z: from.z }, gain: 0.9 });
        cooper.stare({ x: 6, y: 0.6, z: 11 });
        ctx.sfx('growl', { pos: cooperAt(), duration: 2.6, delay: 1.0 });
        ctx.later(3.0, function () { say('n2.scare.ball', 7000); });
        ctx.later(8, function () { cooper.stare(null); });
        tension.peak(6);
        ctx.log('ballRolled');
      },
      wrongReflection: function () {
        st.mirror = 'armed';
      },
      // the lights he turned on go off behind him, room by room
      followingLight: function () {
        st.follow = 2;
        st.followLast = flags.room;
      },
      // a sound from his own evening, last night, from another room
      familiarSound: function () {
        var kind = plan.familiar;
        st.familiar = { kind: kind, t: 0, said: false, sounds: [] };
        if (kind === 'microwave') {
          props.microwave.setGlow(true);
          decor.microwaveScreen('cook');
          st.familiar.sounds.push(ctx.sfx('hum', { pos: { x: 6.3, y: 1.1, z: 0.5 }, gain: 1.1 }));
        } else if (kind === 'kettle') {
          decor.kettleLight(true);
          ctx.sfx('kettle', { pos: { x: 10.8, y: 1.0, z: 0.45 }, duration: 5, gain: 1.1 });
        } else if (kind === 'oven') {
          decor.stoveGlow(true);
          ctx.sfx('click', { pos: { x: 7.3, y: 0.9, z: 0.5 }, gain: 1.0 });
          st.familiar.sounds.push(ctx.sfx('hum', { pos: { x: 7.3, y: 0.5, z: 0.5 }, gain: 0.7 }));
        } else {
          // the channel he had on last night, picking up where it left off
          var last = g.habits.entries().filter(function (e) { return e.action === 'watchedTv' || e.action === 'channel'; }).pop();
          var n = last && last.detail && Number(last.detail.kind);
          var ch = (OC.tvData.channels.filter(function (c) { return c.n === n; })[0] || OC.tvData.channels[0]).id;
          var showT = 0;
          var painter = function (g2, time) {
            showT = time;
            OC.tvShows.draw(ch, g2, time, Math.floor(showT / 5) % 5, showT % 5);
          };
          painter.hires = true;
          props.tv.painter = painter;
          props.tv.setOn(true);
          st.familiar.sounds.push(ctx.sfx('tv', { pos: TV, gain: 0.9 }));
        }
        ctx.log('familiar', { kind: kind });
      },
      // in the lightning, at the end of the hall, his head tilted over like a dog listening
      almostSighting: function () {
        st.sight = { t: 0, seen: false };
        wes.setPos(HALL_END.x, HALL_END.z);
        wes.faceTo(ctl.pos.x, ctl.pos.z);
        wes.crouch = 0;
        wes.raise = 0;
        wes.redEye(false);
        wes.pose('tilt', true);
        weather.strike(1, 0.35);
      },
      blockedRoute: function () {
        if (!props.laundryDoor.close(ctl.pos)) return;
        if (ctl.nav) ctl.nav.rebuild();
        ctx.sfx('thud', { pos: { x: 5, y: 1, z: 10.5 }, gain: 1.2 });
        ctx.later(1.2, function () { say('n2.scare.door', 4000); });
        ctx.log('doorShut');
      },
      changedNote: function () {
        ch.pipesNote.set(true);
      },
      fish: function () {
        decor.fish.sing();
        ctx.sfx('fish', { pos: decor.fish.at, gain: 1.0 });
        ctx.later(3.4, function () { say('n2.scare.fish', 6000); });
        tension.peak(5);
        ctx.log('fishSang');
      },
    };
    // every night-two pool item must have something to do
    (function check() {
      var need = {};
      for (var f = 1; f <= 10; f++) pool.eligible({ night: 2, fear: f, now: 0 }).forEach(function (i) { need[i.id] = true; });
      Object.keys(need).forEach(function (id) {
        if (!handlers[id]) throw new Error('Night 2 scare pool item has no handler: ' + id);
      });
    })();
    function choose(kind) {
      var list = pool.eligible({ night: 2, fear: ctx.fear(), now: flags.elapsed, kind: kind }).filter(function (it) {
        return it.id !== st.lastFired && (!can[it.id] || can[it.id]());
      });
      return list.length ? list[Math.floor(Math.random() * list.length)] : null;
    }
    function fire(kind) {
      var item = null;
      if (kind === 'idle') item = choose('idle');
      else {
        if (secured() ? Math.random() < 0.6 : Math.random() < 0.25) item = choose('scare');
        if (!item) item = choose('ambient');
      }
      if (!item) return null;
      pool.fire(item.id, flags.elapsed);
      st.lastFired = item.id;
      handlers[item.id]();
      return item.id;
    }

    // ---- the gates ------------------------------------------------------------------------------------
    function tripBreaker() {
      st.breaker = 'tripped';
      st.hatchWasShut = !props.hatch.ajar;
      weather.strike(1, 0.15);
      ctx.later(0.25, function () {
        ctx.lights.power(false);
        stopHouse();
        props.tv.setOn(false);
        props.microwave.setGlow(false);
        ch.breaker.set(true);
        ctx.sfx('breaker', { pos: ch.breaker.at, gain: 1.4, ref: 3 });
        if (g.state.tvSound) g.state.tvSound.stop();
      });
      ctx.later(2.2, function () { say('n2.gate.breaker', 4000); });
      ctx.later(7, function () {
        ctx.reveal('breaker');
        say('n2.gate.breaker2', 7000);
      });
      tension.spend();
      ctx.log('breakerTripped');
    }
    function resetBreaker() {
      if (st.breathing) st.breathing.stop();
      st.breathing = null;
      st.breaker = 'done';
      ch.breaker.set(false);
      ctx.sfx('breaker', { pos: ch.breaker.at, gain: 1.2 });
      ctx.lights.power(true);
      startHouse();
      ctx.complete('breaker');
      ctx.log('breakerReset');
      tension.peak(7);
      say('n2.gate.breakerDone', 3000);
      showOutPrints();
      if (st.hatchWasShut && !props.hatch.ajar) {
        props.hatch.setAjar(true);
        ctx.later(3.2, function () { say('n2.gate.hatchOpenAgain', 5000); });
      }
      ctx.later(1.0, function () { ctx.sfx('bark', { pos: { x: 5.9, y: 0.6, z: 10.5 }, count: 3 }); });
    }
    // fresh wet prints, coming up out of the hatch this time
    function showOutPrints() {
      if (st.outPrints) return;
      st.outPrints = true;
      ch.prints.show('both');
    }

    // ---- the house phone ---------------------------------------------------------------------------------
    function ringPos() {
      return flags.inCrawl ? { x: PHONE_AT.x + OC.crawl.DX, y: 1.5, z: PHONE_AT.z } : PHONE_AT;
    }
    function startRinging() {
      if (st.ring || st.called) return;
      st.ringAt = flags.elapsed;
      st.ring = ctx.loop('landline', { pos: ringPos(), gain: 1.5, ref: 3 });
      ctx.reveal('landline');
      if (!flags.inCrawl) ctx.later(2.5, function () { say('n2.thought.ring', 4500); });
    }
    function stopRinging() {
      if (st.ring) st.ring.stop();
      st.ring = null;
    }
    function afterCall() {
      st.called = true;
      st.callEndAt = flags.elapsed;
      ch.landline.lift(false);
      ctx.complete('landline');
      ctx.log('daveLandline');
      ctx.setStage('late');
      tension.relieve(14);
      ctx.later(2.5, function () { say('n2.thought.afterCall', 9000); });
    }
    function openBed() {
      if (st.bedOpen) return;
      st.bedOpen = true;
      ctx.setStage('bed');
      ctx.reveal('bed');
      if (ctx.mods.under.tookNotebook()) ch.bed.showNotebook(true);
      say('n2.thought.late', 6000);
    }
    function sleep() {
      st.sleeping = true;
      g.state.cutscene = true;
      stopRinging();
      ctl.seat(1.3, 15.6, -Math.PI / 2, -0.95);
      ctx.log('bed', { night: 2, lights: ctx.lights.count() });
      cooper.goTo(5.9, 16.6, function () {
        cooper.pose('lie');
        cooper.stay();
        cooper.headTo(GUEST_DOOR);
      });
      ctx.later(2.2, function () {
        phone.notify('Pet Cam', t('n2.notify.petcam'));
        if (g.audio) g.audio.play('buzz', { gain: 0.8 });
      });
      ctx.later(4.4, function () { say('n2.thought.petcam', 6000); });
      ctx.later(11, function () { hud.say(t('n2.vo.bed'), 13000); });
      ctx.later(24.5, function () { ctx.finish(); });
    }

    var items = [
      {
        id: 'breaker', x: ch.breaker.at.x, y: ch.breaker.at.y, z: ch.breaker.at.z, radius: 0.3,
        label: 'Reset the breaker',
        hold: 1.8,
        enabled: function () { return st.breaker === 'tripped'; },
        onUse: resetBreaker,
      },
      {
        id: 'landline', x: ch.landline.at.x, y: ch.landline.at.y, z: ch.landline.at.z, radius: 0.3,
        label: 'Answer the phone',
        enabled: function () { return !!st.ring && !flags.inCrawl && !ctx.talking(); },
        onUse: function () {
          stopRinging();
          ch.landline.lift(true);
          ctx.sfx('click', { pos: PHONE_AT, gain: 0.8 });
          ctx.talk('daveLandline', { call: 'The house phone', onEnd: afterCall });
        },
      },
      {
        id: 'bed', x: BED.x, y: BED.y, z: BED.z, radius: 0.7,
        label: function () { return ch.bed.made && ctx.mods.under.tookNotebook() && !st.pillowRead ? 'Pick up the notebook' : 'Go to bed'; },
        enabled: function () { return st.bedOpen && !st.sleeping && !flags.ending; },
        onUse: function () {
          if (ctx.mods.under.tookNotebook() && !st.pillowRead) {
            st.pillowRead = true;
            g.read(t('n2.thought.pillowTitle'), t('n2.thought.pillowBook'), function () {
              ch.bed.showNotebook(false);
              ctx.log('gotNoteBack');
              tension.peak(8);
              say('n2.thought.pillow', 6000);
            }, { style: 'notebook' });
            return;
          }
          sleep();
        },
      },
    ];

    return {
      items: items,
      state: st,
      pool: pool,
      fire: fire,
      handlers: handlers,
      can: can,
      startRinging: startRinging,
      tripBreaker: tripBreaker,
      // a switch was thrown by hand: it is not the house doing it
      onSwitch: function () {
        st.followPending = null;
      },
      onCrawlExit: function (afterSit) {
        if (st.ring) {
          // the same ringing, heard from the house now
          st.ring.stop();
          st.ring = ctx.loop('landline', { pos: PHONE_AT, gain: 1.5, ref: 3 });
        }
        if (afterSit) showOutPrints();
        tension.relieve(8);
      },
      stage: function () {
        return flags.stage;
      },
      update: function (dt) {
        if (!ctx.done('inside') || st.sleeping) return;
        var e = flags.elapsed;

        // ---- the storm comes in once the house is shut (or late, whatever he does) -------------------
        if (!st.stormed && ((secured() && since(flags.securedAt) > 7) || since(flags.insideAt) > 260)) {
          st.stormed = true;
          weather.setLevel(1);
          weather.strike(0.9, 0.7);
          if (!flags.inCrawl) ctx.later(1.4, function () { say('n2.storm.start', 3000); });
        }
        if (!st.mom && secured() && since(flags.securedAt) > 24 && !flags.inCrawl) {
          st.mom = true;
          phone.deliver('mom', 'Mom', t('n2.sms.mom'));
        }

        // ---- the Director ---------------------------------------------------------------------------
        var ev = tension.update(dt, ctx.signs || { turnRate: 0, moving: false, backingUp: false, sprinting: false, lightOn: false });
        if (ev && !flags.inCrawl && ctx.free()) fire(ev.kind);

        // ---- gate: the breaker ------------------------------------------------------------------------
        if (st.breaker === 'armed' && secured() && since(flags.securedAt) > 40 && beatReady()) tripBreaker();
        if (st.breaker === 'tripped' && !st.breathSaid && Math.hypot(ctl.pos.x - ch.breaker.at.x, ctl.pos.z - ch.breaker.at.z) < 1.5) {
          // at the panel, facing the wall, with the hatch at your back
          st.breathSaid = true;
          st.breathing = ctx.sfx('breath', { pos: { x: 2.4, y: 0.25, z: 10.5 }, count: 6, gain: 1.8, ref: 1.2 });
          ctx.later(1.6, function () { if (st.breaker === 'tripped') say('n2.gate.breath', 6000); });
          ctx.log('breathBehind');
        }

        // ---- gate: the black TV -----------------------------------------------------------------------
        if (st.tv === 'armed' && secured() && since(flags.securedAt) > 15 && flags.room === 'living' && !props.tv.on && beatReady()) {
          var dTv = Math.hypot(ctl.pos.x - TV.x, ctl.pos.z - TV.z);
          st.tvLook = dTv < 7.5 && sees(TV, 0.3) ? st.tvLook + dt : 0;
          if (st.tvLook > 0.45) {
            st.tv = 'showing';
            st.tvT = 0;
            var slider = function (g2) { OC.tvShows.draw('slider', g2, 0); };
            slider.hires = true;
            props.tv.glimpse(slider);
            tension.peak(7);
            ctx.log('sawReflection', { night: 2 });
            ctx.later(1.1, function () { say('n2.gate.tv1', 5500); });
            ctx.later(2.2, function () { cooper.stare(SLIDER); });
            ctx.later(7.2, function () {
              cooper.stare(null);
              say('n2.gate.tv2', 5000);
            });
          }
        } else if (st.tv === 'showing') {
          st.tvT += dt;
          // it lasts as long as he keeps looking, and not a moment after he turns around
          if (st.tvT > 2.4 || (st.tvT > 0.7 && !sees(TV, 0.75))) {
            st.tv = 'done';
            if (!props.tv.on) props.tv.clear();
          }
        }

        // ---- gate: the light that falters -----------------------------------------------------------------
        if (plan.gates.lightFalters && !st.faltered && secured() && since(flags.securedAt) > 30 && ctl.light.on && !flags.inCrawl && flags.room && !ctx.lights.on(flags.room) && beatReady()) {
          st.faltered = true;
          ctl.light.falter(3.2);
          tension.peak(6);
          ctx.log('lightFaltered', { kind: 'house' });
          ctx.later(0.7, function () { say('n2.crawl.lightDies', 2600); });
          ctx.later(3.5, function () { say('n2.crawl.lightBack', 2400); });
        }

        // ---- the mirror -----------------------------------------------------------------------------------
        if (st.mirror === 'armed') {
          st.mirrorT = g.mirror.active ? st.mirrorT + dt : 0;
          if (st.mirrorT > 0.5) {
            st.mirror = 'showing';
            st.mirrorT = 0;
          }
        } else if (st.mirror === 'showing') {
          st.mirrorT += dt;
          if (st.mirrorT > 1.3 || !g.mirror.active) {
            st.mirror = 'done';
            wes.show(false);
            tension.peak(7);
            ctx.log('sawMirror');
            ctx.later(0.5, function () { say('n2.scare.mirror', 6000); });
          }
        }

        // ---- the lights going off behind him ------------------------------------------------------------------
        if (st.follow > 0 && flags.room && flags.room !== st.followLast) {
          var left = st.followLast;
          st.followLast = flags.room;
          if (left && left !== 'laundry' && ctx.lights.wanted(left) && ctx.lights.hasPower()) {
            st.followPending = { room: left, at: e + 2.6 };
          }
        }
        if (st.followPending && e >= st.followPending.at) {
          var room = st.followPending.room;
          st.followPending = null;
          if (flags.room !== room && ctx.lights.wanted(room)) {
            ctx.lights.set(room, false);
            var sw = OC.house.switches.filter(function (s) { return s.light === room; })[0];
            if (sw) ctx.sfx('switch', { pos: { x: sw.x, y: sw.y, z: sw.z }, gain: 1.3 });
            st.follow--;
            ctx.log('lightOff', { kind: room });
            var line = st.follow === 1 ? 'n2.scare.follow1' : 'n2.scare.follow2';
            ctx.later(1.3, function () { say(line, 5000); });
            if (st.follow === 0) tension.peak(6);
          }
        }

        // ---- breathing at a vent: it stops when he comes close ---------------------------------------------------
        if (st.breath) {
          st.breath.t += dt;
          var dv = Math.hypot(ctl.pos.x - st.breath.at.x, ctl.pos.z - st.breath.at.z);
          if (dv < 1.3) {
            st.breath.handle.stop();
            st.breath = null;
            tension.peak(6);
            ctx.log('heldBreath');
            ctx.later(1.2, function () { say('n2.scare.breath', 6000); });
          } else if (st.breath.t > 25) st.breath = null;
        }

        // ---- the figure in the lightning ---------------------------------------------------------------------------
        if (st.sight) {
          st.sight.t += dt;
          var lit = weather.flash > 0.05;
          wes.show(lit);
          if (lit && sees(HALL_END, 0.7)) st.sight.seen = true;
          if (st.sight.t > 1.0 && !lit) {
            var saw = st.sight.seen;
            st.sight = null;
            wes.show(false);
            if (saw) {
              tension.peak(8);
              ctx.log('sawHallFigure');
              ctx.later(1.0, function () { say('n2.scare.sighting', 7000); });
              ctx.later(0.6, function () { ctx.sfx('bark', { pos: cooperAt(), count: 3 }); });
            }
          }
        }

        // ---- the sound from last night -----------------------------------------------------------------------------
        if (st.familiar) {
          var F = st.familiar;
          F.t += dt;
          if (!F.said && flags.room === FAMILIAR_ROOM[F.kind] && ctx.free()) {
            F.said = true;
            tension.peak(5);
            say('n2.scare.familiar.' + F.kind, 6000);
          }
          if (F.t > (F.said ? 7 : 26) && !F.off) {
            F.off = true;
            F.sounds.forEach(function (h) { h.stop(); });
            if (F.kind === 'microwave') {
              props.microwave.setGlow(false);
              decor.microwaveScreen('off');
              ctx.sfx('beep', { pos: { x: 6.3, y: 1.1, z: 0.5 } });
            } else if (F.kind === 'kettle') decor.kettleLight(false);
            else if (F.kind === 'oven') decor.stoveGlow(false);
            else {
              props.tv.setOn(false);
              props.tv.painter = null;
            }
          }
        }

        // ---- the house phone: after the crawl (it starts down there), or late, whatever he does -----------------
        if (!st.ring && !st.called && !flags.inCrawl && ctx.free()) {
          var due = (secured() && since(flags.securedAt) > 150 && st.breaker !== 'tripped') || since(flags.insideAt) > 430;
          if (due) startRinging();
        }
        // nobody answers: Dave gives up, and the night goes on without the call
        if (st.ring && !flags.inCrawl && since(st.ringAt) > 95 && !ctx.talking()) {
          stopRinging();
          st.called = true;
          st.callEndAt = e;
          ctx.complete('landline');
          ctx.setStage('late');
        }

        // ---- after the call: the humming, Ethan, the chair, and bed ------------------------------------------------
        if (st.called && !flags.inCrawl) {
          var c = since(st.callEndAt);
          if (!st.hummed && c > 13 && ctx.free()) {
            st.hummed = true;
            ctx.sfx('lullaby', { pos: { x: 6.6, y: 0.1, z: 13.45 }, gain: 1.3, ref: 4 });
            ctx.later(4.5, function () { say('n2.thought.hum', 6000); });
            ctx.log('heardLullaby');
          }
          if (!st.texted && c > 27) {
            st.texted = true;
            phone.deliver('ethan', 'Ethan', t('n2.sms.ethan1'));
            ctx.later(6, function () { phone.send('ethan', t('n2.sms.mason1')); });
            ctx.later(12, function () { phone.deliver('ethan', 'Ethan', t('n2.sms.ethan2')); });
            ctx.later(34, function () { phone.deliver('ethan', 'Ethan', t('n2.sms.ethan3')); });
          }
          // the kitchen chair, moved again, where he cannot see it happen
          var seat = ch.chair.at();
          var chairNow = { x: seat.x, y: 1.3, z: seat.z };
          if (!st.chairMoved && c > 20 && flags.room !== 'hall' && flags.room !== 'guest' && flags.room !== 'kitchen' && !sees(CHAIR_HALL, 1.2)) {
            st.chairMoved = true;
            ch.chair.set('hall');
            if (ctl.nav) ctl.nav.rebuild();
          } else if (!st.chairMoved && c > 70 && !sees(CHAIR_HALL, 1.2) && !sees(chairNow, 1.2)) {
            st.chairMoved = true;
            ch.chair.set('hall');
            if (ctl.nav) ctl.nav.rebuild();
          }
          if (!st.bedOpen && c > 42 && ctx.free()) openBed();
        }
        if (st.chairMoved && !st.chairSaid && flags.room === 'hall' && Math.hypot(ctl.pos.x - CHAIR_HALL.x, ctl.pos.z - CHAIR_HALL.z) < 7 && sees(CHAIR_HALL, 0.6) && ctx.free()) {
          st.chairSaid = true;
          tension.peak(7);
          ctx.log('sawChairHall');
          say('n2.thought.chairHall', 8000);
          cooper.stare(GUEST_DOOR);
          ctx.sfx('growl', { pos: cooperAt(), duration: 2.4 });
          ctx.later(9, function () {
            cooper.stare(null);
            say('act2.thought.cooperStares', 5000);
          });
        }
      },
      dispose: function () {
        stopHouse();
        stopRinging();
        if (st.breathing) st.breathing.stop();
        if (st.breath) st.breath.handle.stop();
        if (st.familiar) st.familiar.sounds.forEach(function (h) { h.stop(); });
        wes.show(false);
        props.tv.clear();
        props.tv.setOn(false);
      },
    };
  }

  OC.night2.dread = { create: create, TEXT: TEXT };
})();
