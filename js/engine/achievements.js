// Achievements, earned from marks: one per kind of thing Mason did (the habit log's action, and
// action:kind when it has a kind), plus one per ending. Marks pile up across playthroughs, so "every
// dinner" and "every ending" can take more than one run. main.js saves them in localStorage. Pure logic.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.achievements = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var ENDINGS = ['ending:strong', 'ending:partial', 'ending:little', 'ending:ray', 'ending:bad', 'ending:gag'];
  var LIST = [
    { id: 'twoScoops', title: 'Two Scoops', desc: 'Give Cooper two scoops. Dave said one.', all: ['twoScoops'] },
    { id: 'foodCritic', title: 'Food Critic', desc: 'Eat every dinner in the house. Every one.', all: ['dinner:lasagna', 'dinner:pizza', 'dinner:mac', 'dinner:cereal', 'dinner:tupperware'] },
    { id: 'goodBoy', title: 'Good Boy', desc: 'Pet Cooper, throw his ball and teach him a trick.', all: ['petCooper', 'fetch', 'trick'] },
    { id: 'daveisms', title: 'Dave-isms', desc: "Find every one of Dave's sticky notes, and read his magnets.", all: ['collectedAll'] },
    { id: 'sayCheese', title: 'Say Cheese', desc: 'Get his picture on the first night.', all: ['photoWes'] },
    { id: 'stayOnTheLine', title: 'Stay on the Line', desc: 'Ask Mom to stay on the phone.', all: ['stayedOnWithMom'] },
    { id: 'sixteen', title: 'He Was Sixteen', desc: 'Find the poster at the Gas-N-Go.', all: ['sawPoster'] },
    { id: 'phrogged', title: 'Phrogged', desc: 'Find out where he lives.', hint: 'Where does he go in the daytime?', all: ['wentDown'] },
    { id: 'pageTurner', title: 'Page Turner', desc: 'Read the notebook with your name on the front.', hint: 'He writes everything down.', all: ['readNotebook'] },
    { id: 'holdStill', title: 'Hold Your Breath', desc: 'Go quiet in the dark when he is close.', all: ['heldBreath'] },
    { id: 'birdDog', title: 'Bird Dog', desc: 'Score 10 in Flappy Cooper.', all: ['flappyTen'] },
    { id: 'endStrong', title: 'What Can Be Proven', desc: 'Give the police enough to put a name to him.', all: ['ending:strong'] },
    { id: 'endPartial', title: 'Trespassing', desc: 'Give the police something. Not enough.', all: ['ending:partial'] },
    { id: 'endLittle', title: 'Panic and Exhaustion', desc: 'Make it out with nothing to show for it.', all: ['ending:little'] },
    { id: 'endRay', title: "It's Ray", desc: 'Call the deputy in the daytime, then make it to the car.', hint: 'Make a call in the daytime.', all: ['ending:ray'] },
    { id: 'endBad', title: "Tonight's Plan: Done", desc: 'Open the closet.', hint: 'Some doors should stay shut.', all: ['ending:bad'] },
    { id: 'endGag', title: 'The Soup Was Gone', desc: 'Eat from the blue Tupperware.', hint: 'Not everything in the fridge is yours.', all: ['ending:gag'] },
    { id: 'allEndings', title: 'Every Ending', desc: 'See all six endings.', all: ENDINGS },
  ];

  function marksFor(e) {
    if (!e || typeof e.action !== 'string' || !e.action) return [];
    var out = [e.action];
    if (e.detail && typeof e.detail.kind === 'string' && e.detail.kind) out.push(e.action + ':' + e.detail.kind);
    return out;
  }

  // saved = { marks: [...], unlocked: { id: when } }
  function createAchievements(saved) {
    var marks = {};
    var unlocked = {};
    if (saved) {
      (saved.marks || []).forEach(function (m) { marks[m] = true; });
      Object.keys(saved.unlocked || {}).forEach(function (id) { unlocked[id] = saved.unlocked[id]; });
    }
    function note(list) {
      if (typeof list === 'string') list = [list];
      (list || []).forEach(function (m) {
        if (typeof m === 'string' && m) marks[m] = true;
      });
      var fresh = [];
      LIST.forEach(function (a) {
        if (unlocked[a.id]) return;
        if (a.all.every(function (m) { return marks[m]; })) {
          unlocked[a.id] = new Date().toISOString();
          fresh.push({ id: a.id, title: a.title, desc: a.desc });
        }
      });
      return fresh;
    }
    return {
      note: note,
      noteEntry: function (e) { return note(marksFor(e)); },
      has: function (id) { return !!unlocked[id]; },
      unlocked: function () { return LIST.filter(function (a) { return unlocked[a.id]; }).map(function (a) { return a.id; }); },
      marks: function () { return Object.keys(marks); },
      list: function () {
        return LIST.map(function (a) {
          return { id: a.id, title: a.title, desc: a.desc, hint: a.hint || null, unlocked: !!unlocked[a.id], at: unlocked[a.id] || null };
        });
      },
      serialize: function () { return { v: 1, marks: Object.keys(marks), unlocked: Object.assign({}, unlocked) }; },
    };
  }

  // anything that is not a good save (missing, old, hand-edited) starts fresh
  function restore(obj) {
    if (!obj || typeof obj !== 'object' || obj.v !== 1 || !Array.isArray(obj.marks)) return createAchievements();
    if (obj.unlocked !== undefined && (typeof obj.unlocked !== 'object' || obj.unlocked === null || Array.isArray(obj.unlocked))) return createAchievements();
    return createAchievements({ marks: obj.marks.filter(function (m) { return typeof m === 'string'; }), unlocked: obj.unlocked || {} });
  }

  return { LIST: LIST, ENDINGS: ENDINGS, marksFor: marksFor, createAchievements: createAchievements, restore: restore };
});
