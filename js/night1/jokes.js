// Night one, the house's running jokes: Dave's passive-aggressive sticky notes and his terrible pun
// magnets (collectible: "Dave-isms"), his note on the fridge, the singing fish on the hall wall (a
// motion sensor: it teaches you that the fish means something moved), and the small note in Dave's
// handwriting, mostly, that says the scratching is the pipes.
(function () {
  var OC = (window.OC = window.OC || {});
  OC.night1 = OC.night1 || {};

  var STICKY_IDS = ['sink', 'thermostat', 'remote', 'mirror', 'dryer', 'frontDoor', 'kibble', 'pipes'];
  var TEXT = STICKY_IDS.map(function (id) { return 'sticky.' + id; }).concat([
    'act1.note.fridge', 'n1.joke.stickyTitle', 'n1.joke.pipesTitle', 'n1.joke.pipesThought', 'n1.joke.magnetsTitle',
    'n1.joke.magnets', 'n1.joke.magnetsThought', 'n1.joke.fish1', 'n1.joke.fishCooper', 'n1.joke.allFound',
  ]);
  var TOTAL = STICKY_IDS.length + 1; // and the magnets

  function create(g, ctx) {
    var t = g.t;
    var hud = g.hud;
    var decor = g.props.decor;
    var cooper = g.cooper;
    var ctl = g.ctl;

    var found = {};
    var fishCool = 0;
    var fishCount = 0;
    var fishCooperSaid = false;
    function say(id, ms) {
      hud.say(t(id), ms);
    }
    function count() {
      return Object.keys(found).length;
    }
    function collect(id) {
      if (found[id]) return;
      found[id] = true;
      ctx.log('collected', { kind: id });
      g.phone.setCollected(count(), TOTAL);
      if (count() === TOTAL) ctx.later(1, function () { say('n1.joke.allFound', 6000); });
    }
    g.phone.setCollected(0, TOTAL);

    var items = [
      {
        id: 'note', x: 12.55, y: 1.4, z: 0.9, radius: 0.22,
        label: 'Read the note',
        onUse: function () { g.read('Note on the fridge', t('act1.note.fridge')); },
      },
      {
        id: 'magnets', x: 12.74, y: 1.66, z: 0.87, radius: 0.1,
        label: "Read Dave's magnets",
        onUse: function () {
          g.read(t('n1.joke.magnetsTitle'), t('n1.joke.magnets'), function () {
            if (!found.magnets) say('n1.joke.magnetsThought');
            collect('magnets');
          });
        },
      },
    ];
    OC.house.stickies.forEach(function (n) {
      items.push({
        id: 'sticky.' + n.id, x: n.x, y: n.y, z: n.z, radius: 0.1,
        label: n.id === 'pipes' ? 'Read the small note' : 'Read the sticky note',
        onUse: function () {
          var pipes = n.id === 'pipes';
          g.read(t(pipes ? 'n1.joke.pipesTitle' : 'n1.joke.stickyTitle'), t('sticky.' + n.id), function () {
            if (pipes && !found.pipes) {
              say('n1.joke.pipesThought', 7500);
              ctx.log('readPipes');
            }
            collect(n.id);
          }, { shaky: pipes });
        },
      });
    });

    var api = {
      items: items,
      collected: count,
      total: TOTAL,
      update: function (dt) {
        fishCool = Math.max(0, fishCool - dt);
        if (fishCool > 0) return;
        var f = decor.fish.at;
        var byMason = Math.hypot(ctl.pos.x - f.x, ctl.pos.z - f.z) < 1.8;
        var byCooper = Math.hypot(cooper.pos.x - f.x, cooper.pos.z - f.z) < 1.8;
        if (!byMason && !byCooper) return;
        fishCool = 25;
        fishCount++;
        decor.fish.sing();
        ctx.sfx('fish', { pos: f, gain: 0.9 });
        if (fishCount === 1) {
          ctx.later(3.2, function () { say('n1.joke.fish1', 6000); });
          ctx.log('fish');
        } else if (byCooper && !byMason && !fishCooperSaid && Math.hypot(ctl.pos.x - f.x, ctl.pos.z - f.z) > 4) {
          fishCooperSaid = true;
          ctx.later(3.2, function () { say('n1.joke.fishCooper', 6000); });
        }
      },
      dispose: function () {},
    };
    return api;
  }

  OC.night1.jokes = { create: create, TEXT: TEXT, TOTAL: TOTAL };
})();
