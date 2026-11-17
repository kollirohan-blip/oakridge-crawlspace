// Night one's TV: the remote, four channels with closed captions, the emergency alert that interrupts
// every channel once and vanishes, and (after the settled-in gate) the channel change whose black
// frame shows someone standing behind the couch where you are not. Schedule logic is in
// js/engine/tvSchedule.js; the shows are js/tvshows.js. This runs them and the caption box.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var TEXT = ['n1.tv.on', 'n1.tv.sit', 'n1.tv.done', 'n1.tv.alertGone', 'n1.tv.reflection', 'n1.tv.reflection2'];
  var TV = { x: 19.5, y: 1.25, z: 0.5 };
  var COUCH_BACK = { x: 19.3, y: 1.0, z: 5.2 };

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var props = g.props;
    var ctl = g.ctl;
    var cooper = g.cooper;
    var tv = OC.tvSchedule.createTv(OC.tvData);
    var st = { seated: false, seatT: 0, watched: false, special: null, specialT: 0, alertSeen: false, sawReflection: false, onSaid: false };
    var sound = null;
    var alarm = null;
    function say(id, ms) {
      hud.say(t(id), ms);
    }
    function stopSound() {
      if (sound) sound.stop();
      sound = null;
      if (alarm) alarm.stop();
      alarm = null;
    }

    props.tv.painter = function (g2, time) {
      if (st.special) return OC.tvShows.draw(st.special, g2, time);
      if (tv.alerting()) return OC.tvShows.draw('alert', g2, time);
      OC.tvShows.draw(tv.channel().id, g2, time, tv.lineIndex(), tv.lineTime());
    };
    props.tv.painter.hires = true;

    function power(on) {
      tv.power(on);
      props.tv.setOn(on);
      if (on) {
        sound = ctx.sfx('tv', { pos: { x: 19.5, y: 1, z: 0.5 }, gain: 0.8 });
        ctx.log('tvOn');
        hud.toast(tv.channel().name);
        if (!st.onSaid) say('n1.tv.on');
        st.onSaid = true;
      } else {
        stopSound();
        hud.cc(null);
      }
    }

    function watching() {
      if (!tv.on || ctx.flags.room !== 'living') return false;
      var cam = { x: ctl.pos.x, z: ctl.pos.z, yaw: ctl.yaw };
      return OC.sightline.inView(cam, TV, 0.85) && Math.hypot(ctl.pos.x - TV.x, ctl.pos.z - TV.z) < 10;
    }

    function reflectionBeat() {
      st.sawReflection = true;
      ctx.log('sawReflection');
      ctx.tension.peak(4);
      ctx.later(1.1, function () { say('n1.tv.reflection', 5000); });
      ctx.later(2.0, function () {
        if (cooper.mode === 'follow') {
          cooper.stare(COUCH_BACK);
          ctx.later(5, function () { cooper.stare(null); });
        }
      });
      ctx.later(6.5, function () { say('n1.tv.reflection2', 5500); });
    }

    var items = [
      {
        id: 'tv', x: 19.5, y: 0.95, z: 0.7, radius: 0.5,
        label: function () { return tv.on ? 'Turn off the TV' : 'Turn on the TV'; },
        enabled: function () { return !st.seated; },
        onUse: function () { power(!tv.on); },
      },
      {
        id: 'remote', x: 19.55, y: 0.43, z: 2.35, radius: 0.16,
        label: 'Change the channel',
        enabled: function () { return tv.on && !st.special; },
        onUse: function () {
          var res = tv.next();
          if (!res) return;
          ctx.sfx('click', { pos: { x: 19.55, y: 0.5, z: 2.35 }, gain: 0.6 });
          st.special = res.reflection ? 'reflection' : 'black';
          st.specialT = res.reflection ? 0.32 : 0.12;
          ctx.log('channel', { kind: String(tv.channel().n) });
          hud.toast(tv.channel().name);
          if (res.reflection) reflectionBeat();
        },
      },
      {
        id: 'couch', x: 19.25, y: 0.55, z: 4.0, radius: 0.6,
        label: 'Sit and watch TV',
        enabled: function () { return tv.on && !st.seated && !st.watched; },
        onUse: function () {
          st.seated = true;
          st.seatT = 0;
          ctl.seat(19.25, 3.95, 0, -0.5);
          say('n1.tv.sit');
        },
      },
    ];

    var api = {
      items: items,
      tv: tv,
      state: st,
      armAlert: function () { tv.arm('alert'); },
      armReflection: function () { tv.arm('reflection'); },
      // get up from the couch early (a beat needs Mason on his feet)
      standUp: function () {
        if (!st.seated) return;
        st.seated = false;
        ctl.stand();
        ctl.teleport(OC.house.stand.couch.x, OC.house.stand.couch.z);
      },
      update: function (dt) {
        if (st.special) {
          st.specialT -= dt;
          if (st.specialT <= 0) st.special = null;
        }
        var ev = tv.tick(dt);
        if (ev === 'alertStart') {
          alarm = ctx.sfx('alertTone', { pos: { x: 19.5, y: 1, z: 0.5 }, duration: 8 });
          ctx.tension.peak(3);
        } else if (ev === 'alertEnd' && st.alertSeen) {
          ctx.later(1.5, function () { say('n1.tv.alertGone', 5000); });
        }
        if (watching() && !st.special) {
          hud.cc(tv.caption(), tv.alerting());
          if (tv.alerting() && !st.alertSeen) {
            st.alertSeen = true;
            ctx.log('sawAlert');
          }
        } else hud.cc(null);
        if (st.seated) {
          st.seatT += dt;
          if (st.seatT >= 20) {
            api.standUp();
            st.watched = true;
            say('n1.tv.done');
            ctx.complete('watchTv');
            ctx.log('watchedTv', { kind: String(tv.channel().n) });
          }
        }
      },
      dispose: function () {
        stopSound();
        hud.cc(null);
        props.tv.painter = null;
      },
    };
    return api;
  }

  OC.night1.tv = { create: create, TEXT: TEXT };
})();
