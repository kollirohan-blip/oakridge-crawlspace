const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { embed, parseEmbedded } = require('../tools/embed_models.js');

// a minimal real GLB: header, a JSON chunk, and a BIN chunk
function glb(json, bin) {
  let j = Buffer.from(JSON.stringify(json));
  if (j.length % 4) j = Buffer.concat([j, Buffer.alloc(4 - (j.length % 4), 0x20)]);
  let b = bin || Buffer.alloc(0);
  if (b.length % 4) b = Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]);
  const parts = [Buffer.alloc(12), Buffer.alloc(8), j];
  if (b.length) parts.push(Buffer.alloc(8), b);
  const out = Buffer.concat(parts);
  out.write('glTF', 0, 'ascii');
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(j.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  if (b.length) {
    out.writeUInt32LE(b.length, 20 + j.length);
    out.writeUInt32LE(0x004e4942, 24 + j.length);
  }
  return out;
}
function fakeGlb(tag) {
  return glb({ asset: { version: '2.0' }, extras: { tag } });
}
function chunks(buf) {
  const jl = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jl).toString());
  const bin = buf.length > 20 + jl ? buf.slice(28 + jl, 28 + jl + buf.readUInt32LE(20 + jl)) : Buffer.alloc(0);
  return { json, bin };
}
function tmpDir(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-embed-'));
  for (const [name, data] of Object.entries(files)) fs.writeFileSync(path.join(d, name), data);
  return d;
}

test('embed() turns every .glb into a named base64 entry that decodes to the same bytes', () => {
  const a = fakeGlb('aaa');
  const b = fakeGlb('bbbb');
  const d = tmpDir({ 'zeta.glb': b, 'alpha.glb': a });
  const data = parseEmbedded(embed(d));
  assert.deepEqual(Object.keys(data), ['alpha', 'zeta']);
  assert.ok(data.alpha.equals(a));
  assert.ok(data.zeta.equals(b));
});

test('embed() ignores files that are not .glb', () => {
  const d = tmpDir({ 'a.glb': fakeGlb('x'), 'LICENSE.txt': 'CC0', 'notes.md': '#' });
  assert.deepEqual(Object.keys(parseEmbedded(embed(d))), ['a']);
});

test('embed() refuses a .glb that is not really a GLB', () => {
  const d = tmpDir({ 'broken.glb': Buffer.from('not a model at all') });
  assert.throws(() => embed(d), /not a GLB: broken\.glb/);
});

test('a texture the model points to outside itself is packed inside it', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const model = glb(
    { asset: { version: '2.0' }, buffers: [{ byteLength: 4 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 4 }], images: [{ uri: 'Textures/colormap.png', name: 'colormap' }] },
    Buffer.from([9, 9, 9, 9])
  );
  const d = tmpDir({ 'food.glb': model });
  fs.mkdirSync(path.join(d, 'Textures'));
  fs.writeFileSync(path.join(d, 'Textures', 'colormap.png'), png);
  const out = chunks(parseEmbedded(embed(d)).food);
  const img = out.json.images[0];
  assert.equal(img.uri, undefined);
  assert.equal(img.mimeType, 'image/png');
  const view = out.json.bufferViews[img.bufferView];
  assert.ok(out.bin.slice(view.byteOffset, view.byteOffset + view.byteLength).equals(png));
  assert.ok(out.bin.slice(0, 4).equals(Buffer.from([9, 9, 9, 9])), 'the existing binary data is untouched');
  assert.equal(out.json.buffers[0].byteLength, out.bin.length);
  assert.equal(out.bin.length % 4, 0);
});

test('a texture that is missing is an error naming it', () => {
  const model = glb({ asset: { version: '2.0' }, buffers: [{ byteLength: 0 }], bufferViews: [], images: [{ uri: 'Textures/gone.png' }] });
  const d = tmpDir({ 'food.glb': model });
  assert.throws(() => embed(d), /missing texture Textures\/gone\.png for food\.glb/);
});

test('the output works as a classic script (sets OC.modelData) and as a Node module', () => {
  const d = tmpDir({ 'a.glb': fakeGlb('x') });
  const src = embed(d);
  const sandbox = { self: {} };
  new Function('self', src)(sandbox.self);
  assert.equal(typeof sandbox.self.OC.modelData.a, 'string');
});

test('content/models.js is up to date with assets/models', () => {
  const root = path.join(__dirname, '..');
  const want = parseEmbedded(embed(path.join(root, 'assets', 'models')));
  const have = parseEmbedded(fs.readFileSync(path.join(root, 'content', 'models.js'), 'utf8'));
  assert.deepEqual(Object.keys(have), Object.keys(want), 'run: node tools/embed_models.js');
  for (const k of Object.keys(want)) assert.ok(have[k].equals(want[k]), k + ' is stale: run node tools/embed_models.js');
});
