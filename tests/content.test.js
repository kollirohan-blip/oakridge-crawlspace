const test = require('node:test');
const assert = require('node:assert/strict');
const { createContent } = require('../js/engine/content.js');

test('t() returns text for a known id', () => {
  const c = createContent({ 'act1.sms.a': 'hello' }, []);
  assert.equal(c.t('act1.sms.a'), 'hello');
});

test('t() throws "missing text: <id>" for an unknown id', () => {
  const c = createContent({}, []);
  assert.throws(() => c.t('x'), /missing text: x/);
});

test('t() treats an empty string as missing', () => {
  const c = createContent({ a: '' }, []);
  assert.throws(() => c.t('a'), /missing text: a/);
});

test('missing() lists required ids that are absent from the data', () => {
  const c = createContent({ a: 'x' }, ['a', 'b', 'c']);
  assert.deepEqual(c.missing(), ['b', 'c']);
});
