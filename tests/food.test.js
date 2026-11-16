const test = require('node:test');
const assert = require('node:assert/strict');
const { DISHES, MICROWAVE_RATE, MAX_KEYPAD, parseKeypad, cookResult, createDinner } = require('../js/engine/food.js');

function tickFor(d, seconds) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += 0.1) {
    const ev = d.tick(0.1);
    if (ev) events.push(ev);
  }
  return events;
}

test('the five dishes and their appliances', () => {
  assert.deepEqual(Object.keys(DISHES).sort(), ['cereal', 'lasagna', 'mac', 'pizza', 'tupperware']);
  assert.equal(DISHES.lasagna.appliance, 'microwave');
  assert.equal(DISHES.pizza.appliance, 'oven');
  assert.equal(DISHES.mac.appliance, 'kettle');
  assert.equal(DISHES.cereal.appliance, null);
  assert.equal(DISHES.tupperware.gag, true);
  assert.equal(MICROWAVE_RATE, 10);
  assert.equal(MAX_KEYPAD, 900);
});

test('parseKeypad reads digits the way a microwave does', () => {
  assert.equal(parseKeypad('130'), 90);
  assert.equal(parseKeypad('90'), 90);
  assert.equal(parseKeypad('230'), 150);
  assert.equal(parseKeypad('2000'), 1200);
  assert.equal(parseKeypad(''), 0);
  assert.equal(parseKeypad('1a3b0'), 90);
  assert.equal(parseKeypad('123456'), parseKeypad('3456'));
});

test('cookResult boundaries for the lasagna', () => {
  assert.equal(cookResult('lasagna', 119), 'cold');
  assert.equal(cookResult('lasagna', 120), 'good');
  assert.equal(cookResult('lasagna', 300), 'good');
  assert.equal(cookResult('lasagna', 301), 'lava');
  assert.equal(cookResult('lasagna', 900), 'lava');
  assert.equal(cookResult('lasagna', 901), 'refuse');
});

test('a dish can be chosen once; an unknown dish is an error', () => {
  const d = createDinner();
  assert.equal(d.state, 'fridge');
  assert.equal(d.choose('lasagna'), true);
  assert.equal(d.state, 'holding');
  assert.equal(d.dish, 'lasagna');
  assert.equal(d.choose('pizza'), false);
  assert.equal(d.lastError, 'badState');
  assert.throws(() => createDinner().choose('soup'), /unknown dish: soup/);
});

test('the wrong appliance is refused', () => {
  const d = createDinner();
  d.choose('lasagna');
  assert.equal(d.startCook('oven'), false);
  assert.equal(d.lastError, 'wrongAppliance');
  assert.equal(d.state, 'holding');
});

test('the microwave needs a time on the keypad', () => {
  const d = createDinner();
  d.choose('lasagna');
  assert.equal(d.startCook('microwave'), false);
  assert.equal(d.lastError, 'noKeypad');
  assert.equal(d.startCook('microwave', 0), false);
  assert.equal(d.lastError, 'noKeypad');
});

test('2:30 in the microwave cooks in 15 real seconds, then it is ready and good', () => {
  const d = createDinner();
  d.choose('lasagna');
  assert.equal(d.startCook('microwave', 150), true);
  assert.equal(d.state, 'cooking');
  assert.deepEqual(tickFor(d, 14.8), []);
  assert.deepEqual(tickFor(d, 0.4), ['ready']);
  assert.equal(d.state, 'ready');
  assert.equal(d.result, 'good');
});

test('twenty minutes is refused and the food stays in your hand', () => {
  const d = createDinner();
  d.choose('lasagna');
  assert.equal(d.startCook('microwave', 1200), false);
  assert.equal(d.lastError, 'refuse');
  assert.equal(d.state, 'holding');
});

test('a cold lasagna can go back in, and the times add up', () => {
  const d = createDinner();
  d.choose('lasagna');
  d.startCook('microwave', 60);
  tickFor(d, 6.2);
  assert.equal(d.state, 'ready');
  assert.equal(d.result, 'cold');
  assert.equal(d.startCook('microwave', 90), true);
  tickFor(d, 9.2);
  assert.equal(d.result, 'good');
});

test('a good dish cannot go back in', () => {
  const d = createDinner();
  d.choose('lasagna');
  d.startCook('microwave', 150);
  tickFor(d, 15.2);
  assert.equal(d.startCook('microwave', 30), false);
  assert.equal(d.lastError, 'badState');
});

test('the oven must be preheated: preheated, then ready', () => {
  const d = createDinner();
  d.choose('pizza');
  assert.equal(d.startCook('oven'), false);
  assert.equal(d.lastError, 'needPreheat');
  assert.equal(d.preheat(), true);
  assert.equal(d.state, 'preheating');
  assert.deepEqual(tickFor(d, 12.2), ['preheated']);
  assert.equal(d.startCook('oven'), true);
  assert.deepEqual(tickFor(d, 18.2), ['ready']);
  assert.equal(d.result, 'good');
});

test('only oven dishes preheat', () => {
  const d = createDinner();
  d.choose('mac');
  assert.equal(d.preheat(), false);
  assert.equal(d.lastError, 'wrongAppliance');
});

test('the kettle makes the mac and cheese in 10 s', () => {
  const d = createDinner();
  d.choose('mac');
  assert.equal(d.startCook('kettle'), true);
  assert.deepEqual(tickFor(d, 10.2), ['ready']);
});

test('cereal is ready at once and puts milk on the shopping list', () => {
  const d = createDinner();
  assert.deepEqual(d.shoppingList(), []);
  d.choose('cereal');
  assert.equal(d.state, 'ready');
  assert.deepEqual(d.shoppingList(), ['milk']);
});

test('you cannot eat before the plate is on the table', () => {
  const d = createDinner();
  d.choose('lasagna');
  assert.equal(d.eat(), null);
  assert.equal(d.lastError, 'badState');
  assert.equal(d.serve(), false);
  d.startCook('microwave', 150);
  tickFor(d, 15.2);
  assert.equal(d.serve(), true);
  assert.equal(d.state, 'served');
  assert.deepEqual(d.eat(), { dish: 'lasagna', result: 'good', gag: false });
  assert.equal(d.state, 'eaten');
  assert.equal(d.eat(), null);
});

test('eating the Tupperware is the gag ending', () => {
  const d = createDinner();
  d.choose('tupperware');
  d.startCook('microwave', 120);
  tickFor(d, 12.2);
  d.serve();
  assert.equal(d.eat().gag, true);
});

test('ticking with nothing cooking does nothing', () => {
  const d = createDinner();
  assert.deepEqual(tickFor(d, 5), []);
  d.choose('lasagna');
  assert.deepEqual(tickFor(d, 5), []);
});
