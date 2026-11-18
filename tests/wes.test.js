const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// js/wes.js is a browser script that builds Wes out of Three.js boxes. Run it with the real vendored
// Three.js against a bare window, with a canvas stub that draws nothing (the face texture is not looked at).
function load() {
  const grad = { addColorStop() {} };
  const ctx2d = () =>
    new Proxy({}, {
      get(t, k) {
        if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
        if (k in t) return t[k];
        return () => {};
      },
      set(t, k, v) {
        t[k] = v;
        return true;
      },
    });
  const sandbox = { console };
  sandbox.document = { createElement: () => ({ width: 0, height: 0, style: {}, getContext: ctx2d }), createElementNS: () => ({ style: {} }) };
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../vendor/three.min.js'), 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/wes.js'), 'utf8'), sandbox);
  return sandbox;
}
const S = load();
const THREE = S.THREE;

function posed(name) {
  const scene = new THREE.Scene();
  const wes = S.OC.wes.create(scene);
  wes.show(true);
  wes.pose(name, true);
  wes.update(0.001);
  scene.updateMatrixWorld(true);
  return wes;
}
function world(obj, local) {
  return obj.localToWorld(new THREE.Vector3(local[0], local[1], local[2]));
}
function size(mesh) {
  return mesh.geometry.parameters;
}

test('shush: the finger is held to his lips, not above his head', () => {
  const wes = posed('shush');
  const p = wes.parts;
  const fingerLen = size(p.finger).height;
  const mid = world(p.finger, [0, 0, 0]);
  const tip = world(p.finger, [0, -fingerLen / 2, 0]); // the hand hangs along -y, so the tip is at -y
  const base = world(p.finger, [0, fingerLen / 2, 0]);
  const mouth = world(p.mouth, [0, 0, 0]);
  const forward = world(p.head, [0, 0, 1]).sub(world(p.head, [0, 0, 0])).normalize();
  // across the lips: the finger's middle sits on the mouth, a little in front of the face
  const off = mid.clone().sub(mouth);
  const ahead = off.dot(forward);
  assert.ok(ahead > 0.0 && ahead < 0.06, 'finger in front of the face, touching it (' + ahead.toFixed(3) + ' m ahead)');
  const side = off.clone().sub(forward.clone().multiplyScalar(ahead)).length();
  assert.ok(side < 0.035, 'finger across the mouth (' + side.toFixed(3) + ' m off it)');
  // upright, like a finger held up to lips: the tip points up
  const dir = tip.clone().sub(base).normalize();
  assert.ok(dir.y > 0.8, 'finger points up (' + dir.y.toFixed(2) + ')');
  // and the hand stays below his eyes
  const hand = world(p.hand, [0, -0.09, 0]);
  assert.ok(hand.y < mouth.y + 0.05, 'the hand is below his eyes (' + (hand.y - mouth.y).toFixed(3) + ' m above the mouth)');
});

test('shush: the finger shows only in the shush pose', () => {
  assert.equal(posed('shush').parts.finger.visible, true);
  for (const name of ['stand', 'tilt', 'crouch', 'crawl', 'peek']) assert.equal(posed(name).parts.finger.visible, false, name);
});

test('his face covers the front of his head, so no lit skin rim frames it', () => {
  const p = posed('stand').parts;
  const face = size(p.face);
  const head = size(p.headBox);
  assert.ok(face.width >= head.width - 1e-9, 'face as wide as the head');
  assert.ok(face.height >= head.height - 1e-9, 'face as tall as the head');
  assert.ok(Math.abs(p.face.position.y - p.headBox.position.y) < 1e-9, 'face centred on the head');
});

test('the flashlight lights his face and skin without burning them out to white', () => {
  // the phone light at full power (js/controller.js) barely falls off at arm's length in r128's
  // legacy light mode, so a lit surface reaches colour x 2.4 (+ its own glow). It has to stay under 1.
  const POWER = 2.4;
  const p = posed('stand').parts;
  const check = (mat, label) => {
    assert.ok(!mat.isMeshBasicMaterial, label + ' responds to light');
    const lit = Math.max(mat.color.r, mat.color.g, mat.color.b) * POWER;
    const glow = mat.emissive ? Math.max(mat.emissive.r, mat.emissive.g, mat.emissive.b) * (mat.emissiveIntensity || 1) : 0;
    assert.ok(lit + glow <= 1.0, label + ' stays under white (' + (lit + glow).toFixed(2) + ')');
  };
  check(p.face.material, 'the face');
  check(p.neck.material, 'the skin');
  check(p.headBox.material, 'the head in the hood');
  // the face still glows a little, so it reads in a dark doorway with no light on it
  assert.ok(p.face.material.emissiveMap, 'the face glows with its own picture');
  assert.ok(Math.max(p.face.material.emissive.r, p.face.material.emissive.g, p.face.material.emissive.b) >= 0.25, 'enough glow to read in the dark');
});
