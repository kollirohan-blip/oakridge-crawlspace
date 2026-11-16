// Dinner as a personality test: five choices, each cooked its own way. Pure logic.
// States: fridge -> holding -> (preheating -> preheated) -> cooking -> ready -> served -> eaten.
// Cereal goes straight from the fridge to ready (and the milk is three weeks out of date).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else {
    root.OC = root.OC || {};
    root.OC.food = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  var MICROWAVE_RATE = 10; // keypad seconds per real second
  var MAX_KEYPAD = 900; // over 15:00 the microwave (and Mason) refuse
  var EPS = 1e-9;

  var DISHES = {
    lasagna: { appliance: 'microwave', keypad: true, good: [120, 300] },
    pizza: { appliance: 'oven', preheat: 12, cook: 18 },
    mac: { appliance: 'kettle', cook: 10 },
    cereal: { appliance: null, addsToList: 'milk' },
    tupperware: { appliance: 'microwave', keypad: true, good: [60, 240], gag: true },
  };

  // Microwave keypads read the last two digits as seconds and the rest as minutes: 130 is 1:30.
  function parseKeypad(str) {
    var digits = String(str || '').replace(/\D/g, '').slice(-4);
    if (!digits) return 0;
    if (digits.length <= 2) return Number(digits);
    return Number(digits.slice(0, -2)) * 60 + Number(digits.slice(-2));
  }

  function cookResult(dishId, seconds) {
    if (seconds > MAX_KEYPAD) return 'refuse';
    var d = DISHES[dishId];
    if (!d || !d.good) return 'good';
    if (seconds < d.good[0]) return 'cold';
    if (seconds > d.good[1]) return 'lava';
    return 'good';
  }

  function createDinner() {
    var list = [];
    var left = 0;
    var total = 0; // keypad seconds so far (a cold dish can go back in)
    var api = { state: 'fridge', dish: null, result: null, lastError: null };

    function fail(reason) {
      api.lastError = reason;
      return false;
    }

    api.choose = function (id) {
      if (!DISHES[id]) throw new Error('unknown dish: ' + id);
      if (api.state !== 'fridge') return fail('badState');
      api.dish = id;
      if (DISHES[id].appliance === null) {
        api.state = 'ready';
        api.result = 'good';
        if (DISHES[id].addsToList) list.push(DISHES[id].addsToList);
      } else {
        api.state = 'holding';
      }
      return true;
    };

    api.preheat = function () {
      if (!api.dish) return fail('badState');
      if (DISHES[api.dish].appliance !== 'oven') return fail('wrongAppliance');
      if (api.state !== 'holding') return fail('badState');
      api.state = 'preheating';
      left = DISHES[api.dish].preheat;
      return true;
    };

    api.startCook = function (appliance, keypadSeconds) {
      var d = api.dish && DISHES[api.dish];
      var reheat = api.state === 'ready' && api.result === 'cold';
      if (!d || (api.state !== 'holding' && api.state !== 'preheated' && api.state !== 'preheating' && !reheat)) {
        return fail('badState');
      }
      if (d.appliance !== appliance) return fail('wrongAppliance');
      if (appliance === 'oven' && api.state !== 'preheated') return fail('needPreheat');
      if (d.keypad) {
        if (!(keypadSeconds > 0)) return fail('noKeypad');
        if (cookResult(api.dish, total + keypadSeconds) === 'refuse') return fail('refuse');
        total += keypadSeconds;
        left = keypadSeconds / MICROWAVE_RATE;
      } else {
        left = d.cook;
      }
      api.state = 'cooking';
      api.lastError = null;
      return true;
    };

    api.tick = function (dt) {
      if (api.state !== 'preheating' && api.state !== 'cooking') return null;
      left -= dt;
      if (left > EPS) return null;
      if (api.state === 'preheating') {
        api.state = 'preheated';
        return 'preheated';
      }
      api.state = 'ready';
      api.result = DISHES[api.dish].keypad ? cookResult(api.dish, total) : 'good';
      return 'ready';
    };

    // carry it to the table
    api.serve = function () {
      if (api.state !== 'ready') return fail('badState');
      api.state = 'served';
      return true;
    };

    api.eat = function () {
      if (api.state !== 'served') {
        api.lastError = 'badState';
        return null;
      }
      api.state = 'eaten';
      return { dish: api.dish, result: api.result, gag: !!DISHES[api.dish].gag };
    };

    api.shoppingList = function () {
      return list.slice();
    };
    return api;
  }

  return {
    DISHES: DISHES,
    MICROWAVE_RATE: MICROWAVE_RATE,
    MAX_KEYPAD: MAX_KEYPAD,
    parseKeypad: parseKeypad,
    cookResult: cookResult,
    createDinner: createDinner,
  };
});
