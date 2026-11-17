// Day 2, the afternoon, in calm time: the story of the house, for whoever looks. Pencil marks on the
// guest closet's frame, WES 6 to WES 15, and one fresh line at a grown man's height: "WES, home". The
// shed: the Hale boxes, a Little League photo, a yearbook, an empty crowbar hook, and Cooper's food
// bag, empty, its top rolled down neat. Dave's office: his email to the exterminator.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.day2 = OC.day2 || {};

  OC.day2.lore = {
    TEXT: [
      'day2.thought.closet', 'day2.note.growthTitle', 'day2.note.growth', 'day2.thought.growth',
      'day2.note.boxesTitle', 'day2.note.boxes', 'day2.note.photoTitle', 'day2.note.photo',
      'day2.note.yearbookTitle', 'day2.note.yearbook', 'day2.thought.hook', 'day2.thought.kibble',
      'day2.note.emailTitle', 'day2.note.email', 'day2.thought.email',
    ],
    create: function (g, ctx) {
      var t = g.t;
      var hud = g.hud;
      var decor = g.props.decor;
      var S = decor.shed;
      var seen = {};
      function once(id, action) {
        if (seen[id]) return false;
        seen[id] = true;
        ctx.log(action || 'lore', { kind: id });
        return true;
      }
      function afternoon() {
        return ctx.phase() !== 'morning';
      }

      var items = [
        {
          id: 'closet',
          x: 1.0, y: 1.2, z: 17.55, radius: 0.6,
          label: 'Hang up your clothes',
          enabled: function () { return !ctx.done('unpack'); },
          onUse: function () {
            ctx.sfx('creak', { pos: { x: 1.0, y: 1.2, z: 17.6 }, gain: 0.5 });
            ctx.complete('unpack');
            ctx.later(1.2, function () { hud.say(t('day2.thought.closet')); });
          },
        },
        {
          id: 'growth',
          x: decor.growth.at.x, y: decor.growth.at.y, z: decor.growth.at.z, radius: 0.22,
          label: 'Look at the pencil marks',
          onUse: function () {
            g.read(t('day2.note.growthTitle'), t('day2.note.growth'), function () {
              if (once('growth', 'sawGrowthMarks')) hud.say(t('day2.thought.growth'), 6500);
              ctx.complete('unpack');
            });
          },
        },
        {
          id: 'haleBoxes',
          x: S.boxes.x, y: S.boxes.y, z: S.boxes.z, radius: 0.4,
          label: 'Look in the boxes',
          onUse: function () {
            g.read(t('day2.note.boxesTitle'), t('day2.note.boxes'), function () { once('boxes'); });
          },
        },
        {
          id: 'photo',
          x: S.photo.x, y: S.photo.y, z: S.photo.z, radius: 0.16,
          label: 'Look at the photo',
          onUse: function () {
            g.read(t('day2.note.photoTitle'), t('day2.note.photo'), function () { once('photo'); });
          },
        },
        {
          id: 'yearbook',
          x: S.yearbook.x, y: S.yearbook.y, z: S.yearbook.z, radius: 0.16,
          label: 'Open the yearbook',
          onUse: function () {
            g.read(t('day2.note.yearbookTitle'), t('day2.note.yearbook'), function () { once('yearbook'); });
          },
        },
        {
          id: 'hook',
          x: S.hook.x, y: S.hook.y, z: S.hook.z, radius: 0.25,
          label: 'Look at the hook',
          onUse: function () {
            hud.say(t('day2.thought.hook'), 5000);
            once('hook', 'sawHook');
          },
        },
        {
          id: 'kibble',
          x: S.kibble.x, y: S.kibble.y, z: S.kibble.z, radius: 0.3,
          label: 'Get the dog food',
          enabled: function () { return afternoon() && !ctx.done('dogFood'); },
          onUse: function () {
            ctx.sfx('rustle', { pos: { x: S.kibble.x, y: 0.3, z: S.kibble.z } });
            ctx.complete('dogFood');
            ctx.log('emptyBag');
            hud.say(t('day2.thought.kibble'), 6500);
          },
        },
        {
          id: 'computer',
          x: 9.3, y: 1.0, z: 8.42, radius: 0.3,
          label: "Check Dave's email",
          enabled: function () { return afternoon(); },
          onUse: function () {
            g.read(t('day2.note.emailTitle'), t('day2.note.email'), function () {
              if (!ctx.done('email')) {
                ctx.complete('email');
                hud.say(t('day2.thought.email'), 6000);
              }
            }, { style: 'screen' });
          },
        },
      ];

      return {
        items: items,
        update: function () {},
      };
    },
  };
})();
