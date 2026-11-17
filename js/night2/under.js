// Night two, under the house (optional: down the open hatch). On your belly, with a light, between
// the piers. His things are under the guest bed: the sleeping bag, Dave's soup, the Tupperware, a
// family photo with the father scratched out, 46 tally marks, and a notebook with your name on it:
// last night in his handwriting, built from what you really did, and TONIGHT'S PLAN. Photograph it,
// take it, or leave it. Then footsteps overhead that stop when you stop; someone sits down on the
// floor right above you and dust comes through the boards; and the house phone starts to ring.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night2 = OC.night2 || {};

  var TEXT = [
    'n2.crawl.in', 'n2.crawl.padlock', 'n2.crawl.vent', 'n2.crawl.glow', 'n2.crawl.nest', 'n2.crawl.soup',
    'n2.crawl.tupperware', 'n2.crawl.kibble', 'n2.crawl.photoTitle', 'n2.crawl.photo', 'n2.crawl.tally', 'n2.crawl.up',
    'n2.crawl.moon', 'n2.crawl.notebookTitle', 'n2.crawl.notebookThought', 'n2.crawl.bookPrompt', 'n2.crawl.bookPhoto',
    'n2.crawl.bookTake', 'n2.crawl.bookLeave', 'n2.crawl.bookPhotoDone', 'n2.crawl.bookTaken', 'n2.crawl.bookLeft',
    'n2.crawl.steps', 'n2.crawl.stepsStop', 'n2.crawl.sit', 'n2.crawl.ring', 'n2.crawl.gone', 'n2.crawl.out',
    'n2.crawl.lightDies', 'n2.crawl.lightBack', 'n2.crawl.nestPhoto',
  ];

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var cooper = g.cooper;
    var ctl = g.ctl;
    var phone = g.phone;
    var C = OC.crawl;
    var crawl = g.crawl;
    var A = crawl.at;
    var EYE = OC.controller.PRONE_EYE;
    var flags = ctx.flags;
    var say = ctx.say;
    var scene = g.render.scene;

    var st = {
      visits: 0, enteredAt: 0, moving: false, glowSaid: false, nestSaid: false, read: false, book: null, // 'photo' | 'took' | 'left'
      seen: {}, stepsSaid: false, stopSaid: false, sat: false, rang: false, dripT: 3, busy: false,
    };
    var overhead = OC.overhead.createOverhead();
    var walker = { x: C.DX + 5.9, z: 10.5 }; // whoever is up there: starts at the laundry door
    crawl.showNotebook(true);

    function down() {
      return flags.inCrawl;
    }
    function seen(id) {
      if (st.seen[id]) return false;
      st.seen[id] = true;
      ctx.log('crawl', { kind: id });
      return true;
    }
    function look(id, at, radius, label, textId, ms) {
      return {
        id: 'crawl.' + id, x: at.x, y: at.y, z: at.z, radius: radius, eye: EYE,
        label: label,
        enabled: down,
        onUse: function () {
          seen(id);
          say(textId, ms || 6500);
        },
      };
    }

    function enter() {
      if (st.busy || flags.inCrawl) return;
      st.busy = true;
      g.state.cutscene = true;
      hud.fadeOut('');
      ctx.sfx('creak', { pos: { x: 2.5, y: 0.2, z: 10.5 }, gain: 0.8 });
      ctx.later(1.3, function () {
        flags.inCrawl = true;
        st.visits++;
        st.enteredAt = flags.elapsed;
        ctl.teleport(C.ENTRY.x, C.ENTRY.z, C.ENTRY.yaw, 0);
        ctl.setProne(true);
        ctl.light.on = true;
        crawl.lights(true);
        ctx.lights.apply();
        if (scene.fog) scene.fog.density = 0.075;
        ctx.weather.muted = true;
        g.world.setDaylight(0, g.render.renderer);
        if (scene.fog) scene.fog.density = 0.075;
        cooper.stay();
        hud.fadeIn();
        g.state.cutscene = false;
        st.busy = false;
        if (st.visits === 1) {
          ctx.log('wentDown');
          ctx.later(1.6, function () { say('n2.crawl.in'); });
        }
      });
    }
    function exit() {
      if (st.busy || !flags.inCrawl) return;
      st.busy = true;
      g.state.cutscene = true;
      hud.fadeOut('');
      ctx.later(1.3, function () {
        flags.inCrawl = false;
        ctl.setProne(false);
        ctl.stand();
        var s = OC.house.stand.hatch;
        ctl.teleport(s.x, s.z, 0, -0.5);
        crawl.lights(false);
        ctx.lights.apply();
        ctx.weather.muted = false;
        g.world.setDaylight(0, g.render.renderer);
        cooper.follow();
        cooper.ears(true);
        hud.fadeIn();
        g.state.cutscene = false;
        st.busy = false;
        if (ctx.mods.dread) ctx.mods.dread.onCrawlExit(st.sat);
        if (st.sat && !st.outSaid) {
          st.outSaid = true;
          ctx.later(1.4, function () { say('n2.crawl.out', 7000); });
        }
      });
    }

    function notebookPages() {
      return OC.habits.notebookPages(g.habits.entries(), 9).map(function (p) {
        return { title: p.title, body: p.lines.join('\n') };
      });
    }
    function afterBook(id) {
      if (st.book) return;
      if (id === 'photo') {
        st.book = 'photo';
        if (g.photo && g.photo.shoot) g.photo.shoot();
        say('n2.crawl.bookPhotoDone', 6000);
      } else if (id === 'take') {
        st.book = 'took';
        crawl.showNotebook(false);
        ctx.sfx('rustle', { gain: 0.5 });
        say('n2.crawl.bookTaken', 6000);
      } else {
        st.book = 'left';
        say('n2.crawl.bookLeft', 5000);
      }
      ctx.log('notebook', { kind: st.book });
      ctx.later(3.5, function () { overhead.start(); });
    }

    var items = [
      {
        id: 'crawl.climb', x: A.climb.x, y: A.climb.y, z: A.climb.z, radius: 0.55, eye: EYE,
        label: 'Climb out',
        hold: 0.8,
        enabled: function () { return down() && !st.busy; },
        onUse: exit,
      },
      look('padlock', A.padlock, 0.22, 'Look at the padlock', 'n2.crawl.padlock', 7000),
      look('vent', A.vent, 0.4, 'Look out the vent', 'n2.crawl.vent', 7500),
      look('soup', A.soup, 0.25, 'Look at the cans', 'n2.crawl.soup', 7000),
      look('tupperware', A.tupperware, 0.2, 'Look at the Tupperware', 'n2.crawl.tupperware'),
      look('kibble', A.kibble, 0.18, 'Look at the bag', 'n2.crawl.kibble', 8000),
      look('tally', A.tally, 0.45, 'Count the marks', 'n2.crawl.tally', 7500),
      look('up', A.up, 0.4, 'Look up', 'n2.crawl.up', 9000),
      look('moon', A.moon, 0.14, 'Look at the night light', 'n2.crawl.moon'),
      {
        id: 'crawl.photo', x: A.photo.x, y: A.photo.y, z: A.photo.z, radius: 0.18, eye: EYE,
        label: 'Look at the photo',
        enabled: down,
        onUse: function () {
          g.read(t('n2.crawl.photoTitle'), t('n2.crawl.photo'), function () { seen('photo'); });
        },
      },
      {
        id: 'crawl.notebook', x: A.notebook.x, y: A.notebook.y, z: A.notebook.z, radius: 0.2, eye: EYE,
        label: 'Read the notebook',
        enabled: function () { return down() && st.book !== 'took' && !phone.choosing(); },
        onUse: function () {
          g.read(t('n2.crawl.notebookTitle'), notebookPages(), function () {
            if (st.read) return;
            st.read = true;
            ctx.log('readNotebook');
            ctx.tension.peak(7);
            say('n2.crawl.notebookThought', 6500);
            ctx.later(6.8, function () {
              if (!flags.inCrawl) return afterBook('leave');
              phone
                .choice({
                  prompt: t('n2.crawl.bookPrompt'),
                  options: [
                    { id: 'photo', text: t('n2.crawl.bookPhoto') },
                    { id: 'take', text: t('n2.crawl.bookTake') },
                    { id: 'leave', text: t('n2.crawl.bookLeave') },
                  ],
                })
                .then(afterBook);
            });
          }, { style: 'notebook' });
        },
      },
    ];

    function onOverhead(type) {
      if (type === 'step') {
        // he keeps a little behind you, over your legs
        var dx = ctl.pos.x - walker.x;
        var dz = ctl.pos.z - walker.z;
        var d = Math.hypot(dx, dz);
        if (d > 0.7) {
          var step = Math.min(d - 0.5, 0.75);
          walker.x += (dx / d) * step;
          walker.z += (dz / d) * step;
        }
        ctx.sfx('overstep', { pos: { x: walker.x, y: 1.3, z: walker.z }, gain: 1.5, ref: 2.5 });
        if (!st.stepsSaid) {
          st.stepsSaid = true;
          ctx.tension.peak(7);
          ctx.later(1.4, function () { say('n2.crawl.steps', 6000); });
        } else if (!st.stopSaid && overhead.stops() >= 1 && !ctl.moving) {
          st.stopSaid = true;
          ctx.later(1.6, function () { say('n2.crawl.stepsStop', 5000); });
        }
      } else if (type === 'sit') {
        st.sat = true;
        walker.x = ctl.pos.x;
        walker.z = ctl.pos.z;
        ctx.sfx('sitDown', { pos: { x: ctl.pos.x, y: 1.25, z: ctl.pos.z + 0.15 }, gain: 1.7, ref: 2.5 });
        ctx.later(1.45, function () {
          crawl.dustFall(ctl.pos.x, ctl.pos.z);
          var faltered = ctx.mods.dread && ctx.mods.dread.state.faltered;
          if (ctx.plan.gates.lightFalters && !faltered) {
            // tonight of all nights
            ctx.mods.dread.state.faltered = true;
            ctl.light.falter(3.4);
            ctx.log('lightFaltered', { kind: 'crawl' });
            ctx.later(0.7, function () { say('n2.crawl.lightDies', 2600); });
            ctx.later(3.6, function () { say('n2.crawl.lightBack', 2400); });
          } else ctl.light.falter(0.5);
        });
        ctx.tension.peak(9);
        ctx.log('satOn');
        ctx.later(ctx.plan.gates.lightFalters ? 6.4 : 3.4, function () { say('n2.crawl.sit', 8000); });
      } else if (type === 'ring') {
        st.rang = true;
        if (ctx.mods.dread) ctx.mods.dread.startRinging();
        ctx.later(1.2, function () { say('n2.crawl.ring', 4000); });
        ctx.later(3.0, function () { ctx.sfx('whine', { pos: { x: C.DX + 5.9, y: 1.3, z: 10.5 }, gain: 1.2 }); });
        // he gets up, and walks away
        ctx.later(5.2, function () {
          ctx.sfx('creak', { pos: { x: walker.x, y: 1.25, z: walker.z }, gain: 1.3 });
          for (var i = 0; i < 6; i++) {
            (function (k) {
              ctx.later(0.9 + k * 0.72, function () {
                ctx.sfx('overstep', { pos: { x: walker.x + 0.9 * (k + 1), y: 1.3, z: walker.z - 0.25 * (k + 1) }, gain: 1.4, ref: 2.5 });
              });
            })(i);
          }
        });
        ctx.later(10.5, function () { say('n2.crawl.gone', 5000); });
      }
    }

    // a photo of the nest is proof the police can use (the epilogue counts it): his things, close enough to see
    var NEST_AT = { x: C.NEST.x, y: 0.1, z: C.NEST.z };
    g.photo.beforeShot = function (cam) {
      if (!flags.inCrawl || st.nestPhoto) return null;
      var near = Math.hypot(cam.x - NEST_AT.x, cam.z - NEST_AT.z) < 3.2;
      return near && OC.sightline.inView(cam, NEST_AT, 0.55) ? { subject: 'nest', flash: 0.55, undo: function () {} } : null;
    };
    g.photo.onPhoto = function (photo) {
      if (photo.subject !== 'nest' || st.nestPhoto) return;
      st.nestPhoto = true;
      ctx.log('photoNest');
      ctx.later(1.2, function () { say('n2.crawl.nestPhoto', 5000); });
    };

    return {
      items: items,
      state: st,
      overhead: overhead,
      enter: enter,
      exit: exit,
      // took the notebook up with him?
      tookNotebook: function () {
        return st.book === 'took';
      },
      update: function (dt) {
        if (!flags.inCrawl) return;
        crawl.ventGlow(ctx.weather.flash);
        // the light, far back; then what it is
        if (!st.glowSaid && ctl.pos.z > 12.7 && ctl.pos.x < C.DX + 5.5) {
          st.glowSaid = true;
          say('n2.crawl.glow', 5500);
        }
        var dn = Math.hypot(ctl.pos.x - C.NEST.x, ctl.pos.z - C.NEST.z);
        if (!st.nestSaid && dn < 2.6 && ctl.pos.z > 13.2) {
          st.nestSaid = true;
          ctx.tension.peak(6);
          ctx.later(st.glowSaid ? 2.5 : 0, function () { say('n2.crawl.nest', 6000); });
        }
        // water finding its way down, somewhere
        st.dripT -= dt;
        if (st.dripT <= 0) {
          st.dripT = 2.5 + Math.random() * 5;
          var a = Math.random() * 6.28;
          ctx.sfx('drip', { pos: { x: ctl.pos.x + Math.cos(a) * 3, y: 0.3, z: ctl.pos.z + Math.sin(a) * 3 }, gain: 0.9 });
        }
        // everyone gets the footsteps, even without the notebook, if they stay long enough
        if (overhead.phase() === 'idle' && flags.elapsed - st.enteredAt > 80 && !phone.choosing() && !hud.isReading()) overhead.start();
        if (!hud.isReading() && !phone.choosing()) overhead.update(dt, ctl.moving).forEach(onOverhead);
      },
      dispose: function () {
        crawl.lights(false);
        crawl.ventGlow(0);
        crawl.showNotebook(true);
      },
    };
  }

  OC.night2.under = { create: create, TEXT: TEXT };
})();
