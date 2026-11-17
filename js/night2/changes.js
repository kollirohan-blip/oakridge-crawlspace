// Night two, what changed while Mason was at the store. Seven things, none of them big: a chair pulled
// out and turned to face the hall, the toilet seat up, the family photo face down, the guest bed made
// with tight corners, "milk" finger-written on Dave's tablet, a sticky note on the guest room door in
// Dave's handwriting, and wet bare footprints that go to the hatch and do not come back. Also here:
// the light switches, the patio slider (open three inches; its latch only spins, so the broom goes in
// the track), the laundry room door, Dave's empty key hook, and the hatch itself.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night2 = OC.night2 || {};

  var TEXT = [
    'n2.wrong.label', 'n2.wrong.chair', 'n2.wrong.seat', 'n2.wrong.photo', 'n2.wrong.photoUp', 'n2.wrong.bed',
    'n2.wrong.tabletTitle', 'n2.wrong.tablet', 'n2.wrong.tabletCereal', 'n2.wrong.tabletOther',
    'n2.wrong.doorNoteTitle', 'n2.wrong.doorNote', 'n2.wrong.doorNoteThought', 'n2.wrong.prints', 'n2.wrong.printsOut',
    'n2.wrong.keyHook', 'n2.wrong.pipes', 'n2.wrong.pipesThought', 'n2.wrong.all', 'sticky.pipes', 'n1.joke.pipesTitle',
    'act2.thought.laundryLight', 'act2.thought.hatch', 'act2.thought.hatchClosed', 'act2.thought.slider',
    'act2.thought.sliderClosed', 'act2.thought.latchBroken', 'act2.thought.broomTake', 'act2.thought.broom',
    'n2.hatch.prompt', 'n2.hatch.promptShut', 'n2.hatch.close', 'n2.hatch.down', 'n2.hatch.open', 'n2.hatch.leave',
    'n2.thought.noLight', 'n2.thought.cooperHatch',
  ];
  var WRONG = ['chair', 'seat', 'photo', 'bed', 'tablet', 'doorNote', 'prints'];
  var SLIDER = { x: 19.5, y: 1.0, z: 8.1 };
  var HATCH = { x: 2.5, y: 0.25, z: 10.5 };
  var LAUNDRY = { x0: 0, z0: 8, x1: 5, z1: 13 };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var cooper = g.cooper;
    var ctl = g.ctl;
    var phone = g.phone;
    var ch = props.changes;
    var flags = ctx.flags;
    var say = ctx.say;

    var st = { found: {}, latchTried: false, hasBroom: false, barred: false, hatchSeen: false, laundrySaid: false, sliderSaid: false, cooperHatchSaid: false, outSeen: false };
    var hadCereal = g.habits.entries().some(function (e) { return e.action === 'dinner' && e.detail && e.detail.kind === 'cereal'; });

    // the house, changed
    ch.chair.set('out');
    ch.toiletSeat(true);
    ch.photo.set(true);
    ch.bed.set(true);
    ch.tablet.setScrawl(true);
    ch.doorNote.show(true);
    ch.prints.show('in');
    // Cooper will not go into the laundry room tonight
    cooper.setAvoid(LAUNDRY, { x: 5.9, z: 10.5 });

    function count() {
      return Object.keys(st.found).length;
    }
    function noticed(id) {
      if (st.found[id]) return false;
      st.found[id] = true;
      ctx.log('noticed', { kind: id });
      phone.setCollected(count(), WRONG.length, t('n2.wrong.label'));
      ctx.tension.peak(3);
      if (count() === WRONG.length) ctx.later(7, function () { say('n2.wrong.all', 7000); });
      return true;
    }
    phone.setCollected(0, WRONG.length, t('n2.wrong.label'));

    function look(id, x, y, z, radius, label, textId, ms) {
      return {
        id: id, x: x, y: y, z: z, radius: radius,
        label: label,
        enabled: function () { return ctx.done('inside'); },
        onUse: function () {
          noticed(id);
          say(textId, ms || 6500);
        },
      };
    }

    var chairAt = ch.chair.at();
    var items = [
      look('chair', chairAt.x, chairAt.y, chairAt.z, 0.4, 'Look at the chair', 'n2.wrong.chair', 7000),
      look('seat', ch.seatAt.x, ch.seatAt.y, ch.seatAt.z, 0.35, 'Look at the toilet', 'n2.wrong.seat'),
      look('bed2', ch.bed.at.x, ch.bed.at.y, ch.bed.at.z, 0.6, 'Look at the bed', 'n2.wrong.bed', 7000),
      {
        id: 'photo', x: ch.photo.at.x, y: ch.photo.at.y, z: ch.photo.at.z, radius: 0.25,
        label: function () { return ch.photo.down ? 'Pick up the photo' : 'Look at the photo'; },
        enabled: function () { return ctx.done('inside'); },
        onUse: function () {
          if (ch.photo.down) {
            noticed('photo');
            say('n2.wrong.photo', 7000);
            ctx.later(7.2, function () {
              ch.photo.set(false);
              ctx.sfx('click', { pos: ch.photo.at, gain: 0.4 });
              say('n2.wrong.photoUp', 3000);
            });
          } else say('n2.wrong.photoUp', 3000);
        },
      },
      {
        id: 'tablet', x: ch.tablet.at.x, y: ch.tablet.at.y, z: ch.tablet.at.z, radius: 0.25,
        label: "Read Dave's list",
        enabled: function () { return ctx.done('inside') && ctx.lights.hasPower(); },
        onUse: function () {
          g.read(t('n2.wrong.tabletTitle'), t('n2.wrong.tablet'), function () {
            if (noticed('tablet')) say(hadCereal ? 'n2.wrong.tabletCereal' : 'n2.wrong.tabletOther', 7000);
          }, { style: 'screen' });
        },
      },
      {
        id: 'doorNote', x: ch.doorNote.at.x, y: ch.doorNote.at.y, z: ch.doorNote.at.z, radius: 0.16,
        label: 'Read the sticky note',
        enabled: function () { return ctx.done('inside'); },
        onUse: function () {
          g.read(t('n2.wrong.doorNoteTitle'), t('n2.wrong.doorNote'), function () {
            if (noticed('doorNote')) say('n2.wrong.doorNoteThought', 7000);
          });
        },
      },
      look('prints', ch.prints.hatchEnd.x, ch.prints.hatchEnd.y, ch.prints.hatchEnd.z, 0.45, 'Look at the footprints', 'n2.wrong.prints', 7000),
      {
        id: 'printsOut', x: ch.prints.outEnd.x, y: ch.prints.outEnd.y, z: ch.prints.outEnd.z, radius: 0.45,
        label: 'Look at the new footprints',
        enabled: function () { return ch.prints.showing() === 'both'; },
        onUse: function () {
          if (!st.outSeen) {
            st.outSeen = true;
            ctx.log('sawPrintsOut');
            ctx.tension.peak(7);
          }
          say('n2.wrong.printsOut', 8000);
        },
      },
      {
        id: 'keyHook', x: ch.keyHook.x, y: ch.keyHook.y, z: ch.keyHook.z, radius: 0.2,
        label: "Look at Dave's key hook",
        enabled: function () { return ctx.done('inside'); },
        onUse: function () {
          ctx.log('sawKeyHook');
          say('n2.wrong.keyHook', 7000);
        },
      },
      {
        // the small note about the pipes: tonight it may say something else
        id: 'sticky.pipes', x: 12.36, y: 1.12, z: 0.87, radius: 0.1,
        label: 'Read the small note',
        enabled: function () { return ctx.done('inside'); },
        onUse: function () {
          var changed = ch.pipesNote.changed;
          g.read(t('n1.joke.pipesTitle'), t(changed ? 'n2.wrong.pipes' : 'sticky.pipes'), function () {
            if (changed && !st.pipesSeen) {
              st.pipesSeen = true;
              ctx.log('sawPipesChanged');
              say('n2.wrong.pipesThought');
            }
          }, { shaky: true });
        },
      },
      // ---- the slider, the broom ---------------------------------------------------------------------
      {
        id: 'broom', x: 4.75, y: 0.8, z: 12.7, radius: 0.4,
        label: 'Take the broom',
        enabled: function () { return props.broom.where === 'corner' && st.latchTried; },
        onUse: function () {
          props.broom.set('held');
          st.hasBroom = true;
          say('act2.thought.broomTake');
        },
      },
      {
        id: 'slider', x: 19.5, y: 1.0, z: 7.85, radius: 0.6,
        label: function () {
          if (props.slider.open > 0) return 'Close the patio door';
          if (st.hasBroom) return 'Jam the broom in the track';
          return 'Lock the patio door';
        },
        hold: function () { return props.slider.open > 0 ? 1.0 : st.hasBroom ? 1.5 : 1.0; },
        enabled: function () { return !st.barred && ctx.done('inside'); },
        onUse: function () {
          if (props.slider.open > 0) {
            props.slider.setOpen(0);
            ctx.sfx('slide', { pos: SLIDER });
            say('act2.thought.sliderClosed');
            return;
          }
          if (!st.hasBroom) {
            st.latchTried = true;
            ctx.sfx('click', { pos: SLIDER });
            ctx.sfx('click', { pos: SLIDER, delay: 0.25 });
            say('act2.thought.latchBroken');
            return;
          }
          st.barred = true;
          props.broom.set('track');
          ctx.sfx('thud', { pos: SLIDER, gain: 0.4 });
          say('act2.thought.broom');
          ctx.complete('secure');
          flags.securedAt = flags.elapsed;
          ctx.setStage('secured');
        },
      },
      {
        id: 'laundryDoor', x: 5, y: 1.0, z: 10.5, radius: 0.55,
        label: function () { return props.laundryDoor.closed ? 'Open the laundry room door' : 'Close the laundry room door'; },
        enabled: function () { return props.laundryDoor.closed; },
        onUse: function () {
          props.laundryDoor.open();
          if (ctl.nav) ctl.nav.rebuild();
          ctx.sfx('creak', { pos: { x: 5, y: 1, z: 10.5 }, gain: 0.7 });
        },
      },
      // ---- the hatch ----------------------------------------------------------------------------------
      {
        id: 'hatch', x: HATCH.x, y: HATCH.y, z: HATCH.z, radius: 0.6,
        label: function () { return props.hatch.ajar ? 'The open hatch' : 'The hatch'; },
        enabled: function () { return ctx.done('inside') && !phone.choosing() && !flags.inCrawl; },
        onUse: function () {
          var open = props.hatch.ajar;
          var options = open
            ? [{ id: 'close', text: t('n2.hatch.close') }, { id: 'down', text: t('n2.hatch.down') }, { id: 'leave', text: t('n2.hatch.leave') }]
            : [{ id: 'down', text: t('n2.hatch.open') }, { id: 'leave', text: t('n2.hatch.leave') }];
          phone.choice({ prompt: t(open ? 'n2.hatch.prompt' : 'n2.hatch.promptShut'), options: options }).then(function (id) {
            if (id === 'close') {
              props.hatch.setAjar(false);
              ctx.sfx('thud', { pos: { x: 2.5, y: 0.1, z: 10.5 }, gain: 0.5 });
              say('act2.thought.hatchClosed');
              ctx.log('closedHatch');
            } else if (id === 'down') {
              if (!ctl.light.available || ctl.light.battery <= 0.02) {
                say('n2.thought.noLight');
                return;
              }
              props.hatch.setAjar(true);
              ctx.mods.under.enter();
            }
          });
        },
      },
    ];
    // the light switches
    OC.house.switches.forEach(function (s) {
      items.push({
        id: 'switch.' + s.light, x: s.x, y: s.y, z: s.z, radius: 0.12,
        label: function () { return (ctx.lights.wanted(s.light) ? 'Turn off the ' : 'Turn on the ') + s.label + ' light'; },
        enabled: function () { return ctx.done('inside'); },
        onUse: function () {
          ctx.lights.set(s.light, !ctx.lights.wanted(s.light));
          ctx.sfx('switch', { pos: { x: s.x, y: s.y, z: s.z } });
          if (ctx.mods.dread) ctx.mods.dread.onSwitch(s.light, ctx.lights.wanted(s.light));
        },
      });
    });

    return {
      items: items,
      state: st,
      noticed: noticed,
      count: count,
      total: WRONG.length,
      update: function () {
        if (!ctx.done('inside') || flags.inCrawl) return;
        if (!st.laundrySaid && (flags.room === 'kitchen' || flags.room === 'hall') && flags.elapsed - flags.insideAt > 14 && ctx.free()) {
          st.laundrySaid = true;
          say('act2.thought.laundryLight');
        }
        if (!st.hatchSeen && flags.room === 'laundry') {
          st.hatchSeen = true;
          say('act2.thought.hatch', 6000);
          ctx.tension.peak(5);
          ctx.sfx('growl', { pos: { x: cooper.pos.x, y: 0.6, z: cooper.pos.z }, duration: 2.4 });
        }
        if (st.hatchSeen && !st.cooperHatchSaid && flags.room === 'laundry' && flags.elapsed - flags.insideAt > 6 && cooper.waiting && ctx.free()) {
          st.cooperHatchSaid = true;
          ctx.later(5, function () { say('n2.thought.cooperHatch', 7000); });
        }
        if (!st.sliderSaid && flags.room === 'living' && props.slider.open > 0) {
          st.sliderSaid = true;
          ctx.later(1.2, function () { say('act2.thought.slider', 6500); });
          cooper.stare(SLIDER);
          ctx.later(6, function () { cooper.stare(null); });
        }
      },
      dispose: function () {},
    };
  }

  OC.night2.changes = { create: create, TEXT: TEXT, WRONG: WRONG };
})();
