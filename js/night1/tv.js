// Night one's TV: the remote, four channels with closed captions, the emergency alert that interrupts
// every channel once and vanishes, and (after the settled-in gate) the channel change whose black
// frame shows someone standing behind the couch where you are not. Schedule logic is in
// js/engine/tvSchedule.js; this draws it on the 64x36 screen and in the caption box.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var TEXT = ['n1.tv.on', 'n1.tv.sit', 'n1.tv.done', 'n1.tv.alertGone', 'n1.tv.reflection', 'n1.tv.reflection2'];
  var TV = { x: 19.5, y: 0.95, z: 0.5 };
  var COUCH_BACK = { x: 19.3, y: 1.0, z: 5.2 };

  function px(g, color, x, y, w, h) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }
  function snow(g, n, lo, hi) {
    for (var i = 0; i < n; i++) {
      var v = (lo + Math.random() * (hi - lo)) | 0;
      g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
      g.fillRect((Math.random() * 64) | 0, (Math.random() * 36) | 0, 1, 1);
    }
  }
  var PAINT = {
    news: function (g, t) {
      px(g, '#16233f', 0, 0, 64, 36);
      px(g, '#2b3d66', 6, 5, 22, 21); // the map behind the anchor
      px(g, '#5f6e3a', 9, 9, 8, 6);
      px(g, '#c2a58a', 38, 9, 8, 8); // the anchor
      px(g, '#1d1f2b', 35, 17, 14, 11);
      px(g, '#c9cdd6', 0, 28, 64, 5);
      px(g, '#7d1f1f', 0, 28, 14, 5);
      px(g, '#ffffff', 16 + ((t * 9) % 40), 30, 6, 1);
      snow(g, 60, 60, 180);
    },
    shop: function (g, t) {
      var flash = Math.floor(t * 3) % 2;
      px(g, flash ? '#d6299a' : '#f3c62a', 0, 0, 64, 36);
      px(g, '#ffffff', 8, 8, 18, 18); // the product, spinning (a spoon)
      var a = t * 2.2;
      px(g, '#8a8f99', 16 + Math.cos(a) * 5, 10, 2, 13);
      px(g, '#c33', 15 + Math.cos(a) * 5, 9, 4, 3);
      px(g, flash ? '#f3c62a' : '#d6299a', 34, 10, 24, 7); // CALL NOW
      px(g, '#ffffff', 36, 12, 20, 3);
      px(g, '#1a1a1a', 34, 22, 24, 6); // $19.99
      px(g, '#f3c62a', 36, 24, 3, 2);
      px(g, '#f3c62a', 41, 24, 3, 2);
      px(g, '#f3c62a', 46, 24, 3, 2);
      snow(g, 40, 120, 220);
    },
    nature: function (g, t) {
      px(g, '#7aa0c8', 0, 0, 64, 12);
      px(g, '#9c8a4a', 0, 12, 64, 24);
      px(g, '#6b5a2c', 0, 12, 64, 2);
      px(g, '#2a1f10', 26, 18, 12, 8); // the burrow
      px(g, '#1a1208', 28, 20, 8, 6);
      var out = (Math.sin(t * 0.9) + 1) / 2; // an owl leaning out, and back in
      px(g, '#8a6a3c', 29, 21 - out * 5, 6, 5);
      px(g, '#f0d050', 30, 22 - out * 5, 1, 1);
      px(g, '#f0d050', 33, 22 - out * 5, 1, 1);
      snow(g, 40, 80, 180);
    },
    weather: function (g, t) {
      px(g, '#2c5a2a', 0, 0, 64, 36);
      px(g, '#3e7a3a', 10, 6, 30, 22);
      px(g, '#1d3d74', 44, 0, 20, 36);
      var x = 50 - ((t * 2) % 40); // the storm, crawling in from the west
      px(g, '#d9d9e6', x, 8, 14, 8);
      px(g, '#9a9ab0', x + 2, 14, 10, 4);
      px(g, '#d23c2a', x + 3, 18, 8, 3);
      px(g, '#ffffff', 2, 2, 12, 4);
      snow(g, 40, 80, 180);
    },
    alert: function (g, t) {
      px(g, '#000000', 0, 0, 64, 36);
      px(g, '#b51212', 0, 0, 64, 9);
      px(g, '#b51212', 0, 27, 64, 9);
      g.fillStyle = '#ffffff';
      g.font = '5px monospace';
      g.fillText('EMERGENCY ALERT', 12, 6);
      var x = 64 - ((t * 18) % 160);
      g.fillText('PROWLER ROUTE 9 - LOCK ALL DOORS - DO NOT APPROACH', x, 20);
      if (Math.floor(t * 2) % 2) px(g, '#ffffff', 2, 30, 4, 3);
    },
    black: function (g) {
      px(g, '#020203', 0, 0, 64, 36);
    },
    // the black screen as a mirror: the room behind you, and someone standing behind the couch
    reflection: function (g) {
      px(g, '#0e1114', 0, 0, 64, 36);
      px(g, '#1c2026', 0, 23, 64, 13); // the floor
      px(g, '#20262d', 46, 3, 12, 8); // a window
      px(g, '#3a3f46', 12, 10, 4, 4); // the lamp shade
      px(g, '#2f363e', 8, 18, 46, 8); // the couch back, where you are not sitting
      px(g, '#040405', 33, 2, 9, 7); // his hood, head tilted
      px(g, '#040405', 30, 8, 15, 11); // his shoulders, above the couch
      px(g, '#77746c', 36, 4, 4, 3); // a pale face in the hood
      px(g, '#040405', 37, 5, 1, 1);
      px(g, '#040405', 39, 5, 1, 1);
    },
  };

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
      if (st.special) return PAINT[st.special](g2, time);
      if (tv.alerting()) return PAINT.alert(g2, time);
      PAINT[tv.channel().id](g2, time);
    };

    function power(on) {
      tv.power(on);
      props.tv.setOn(on);
      if (on) {
        sound = ctx.sfx('tv', { pos: { x: 19.5, y: 1, z: 0.5 }, gain: 0.8 });
        ctx.log('tvOn');
        hud.toast('CH ' + tv.channel().n + '  ' + tv.channel().name);
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
          hud.toast('CH ' + tv.channel().n + '  ' + tv.channel().name);
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
