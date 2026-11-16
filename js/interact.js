// Interaction: finds what the player is looking at (OC.pick), shows its prompt, and runs it when
// E is pressed (or held, for items with `hold` seconds).
// item = { id, x, y, z, radius?, label: string|fn, hold?: number|fn, enabled?: bool|fn, onUse() }
(function () {
  var OC = (window.OC = window.OC || {});

  function val(v) {
    return typeof v === 'function' ? v() : v;
  }

  function create(ctl, camera) {
    var items = [];
    var pressed = false; // an E press waiting to be handled this frame
    var down = false;
    var holding = null; // { item, t }
    var consumed = false; // a hold already fired: wait for E to be released
    var suspended = false;

    window.addEventListener('keydown', function (e) {
      if (e.code !== 'KeyE' || e.repeat || !ctl.locked) return;
      pressed = true;
      down = true;
    });
    window.addEventListener('keyup', function (e) {
      if (e.code !== 'KeyE') return;
      down = false;
      consumed = false;
    });

    var api = {
      items: items,
      target: null,
      add: function (item) {
        items.push(item);
        return item;
      },
      clear: function () {
        items.length = 0;
        holding = null;
      },
      remove: function (id) {
        for (var i = items.length - 1; i >= 0; i--) if (items[i].id === id) items.splice(i, 1);
      },
      // set pieces and menus switch interaction off while they run
      suspend: function (v) {
        suspended = !!v;
      },
      update: function (dt) {
        if (!ctl.locked || suspended) {
          api.target = null;
          holding = null;
          pressed = false;
          OC.hud.setPrompt('');
          OC.hud.setHold(null);
          return;
        }
        var cam = {
          x: ctl.pos.x,
          y: camera.position.y,
          z: ctl.pos.z,
          yaw: ctl.yaw,
          pitch: ctl.pitch,
        };
        var target = OC.pick.pickTarget(cam, items, ctl.boxes);
        api.target = target;
        if (!target) {
          holding = null;
          OC.hud.setPrompt('');
          OC.hud.setHold(null);
          pressed = false;
          return;
        }
        var hold = val(target.hold) || 0;
        OC.hud.setPrompt('[E] ' + val(target.label) + (hold ? ' (hold)' : ''));
        if (!hold) {
          OC.hud.setHold(null);
          if (pressed) target.onUse();
          pressed = false;
          return;
        }
        pressed = false;
        if (down && !consumed) {
          if (!holding || holding.item !== target) holding = { item: target, t: 0 };
          holding.t += dt;
          OC.hud.setHold(holding.t / hold);
          if (holding.t >= hold) {
            holding = null;
            consumed = true;
            OC.hud.setHold(null);
            target.onUse();
          }
        } else {
          holding = null;
          OC.hud.setHold(null);
        }
      },
    };
    return api;
  }

  OC.interact = { create: create };
})();
