// The CC0 models (Kenney kits) embedded in content/models.js. load() parses them all before the game
// boots. Static models are fitted to furniture boxes or placed in the yard, then merged into one mesh
// per material (a whole house of furniture costs a handful of draw calls). instance() gives a live
// copy for things that move. Kenney's bright palette is muted to fit an old house at night.
(function () {
  var OC = (window.OC = window.OC || {});
  var templates = {};
  var boxes = {};
  var statics = [];
  var matCache = {};

  function toBuffer(b64) {
    var bin = atob(b64);
    var u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }

  // muted and a little darker: the house is old, and it is night
  function grade(c) {
    var l = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b;
    c.r = (c.r + (l - c.r) * 0.55) * 0.74;
    c.g = (c.g + (l - c.g) * 0.55) * 0.74;
    c.b = (c.b + (l - c.b) * 0.55) * 0.74;
    return c;
  }
  // Kenney's foliage is teal; these woods are dark green
  var GREENS = { leafsDark: 0x2a4a2c, plant: 0x35583a, grass: 0x3c5a34 };
  function materialFor(src) {
    var color = src.color ? src.color.clone() : new THREE.Color(0xffffff);
    if (src.name && GREENS[src.name] !== undefined) color = new THREE.Color(GREENS[src.name]).multiplyScalar(1.35);
    var key = color.getHexString() + (src.map ? src.map.uuid : '') + (src.transparent ? 't' : '');
    if (!matCache[key]) {
      var m = new THREE.MeshPhongMaterial({ color: src.map ? color : grade(color), map: src.map || null, specular: 0x000000, shininess: 1 });
      if (src.map) {
        m.map.magFilter = THREE.NearestFilter;
        m.color.multiplyScalar(0.85);
      }
      if (src.transparent) {
        m.transparent = true;
        m.opacity = src.opacity;
      }
      matCache[key] = m;
    }
    return matCache[key];
  }

  function load() {
    var data = OC.modelData || {};
    var loader = new THREE.GLTFLoader();
    return Promise.all(Object.keys(data).map(function (name) {
      return new Promise(function (resolve, reject) {
        loader.parse(toBuffer(data[name]), '', function (gltf) {
          gltf.scene.updateMatrixWorld(true);
          templates[name] = gltf.scene;
          boxes[name] = new THREE.Box3().setFromObject(gltf.scene);
          resolve();
        }, function (err) {
          reject(new Error('The model "' + name + '" could not be loaded: ' + (err && err.message ? err.message : err)));
        });
      });
    }));
  }

  function need(name) {
    if (!templates[name]) throw new Error('missing model: ' + name);
  }

  // a matrix that turns the model `rot` quarter turns and stretches it to fill box b = [x0,y0,z0,x1,y1,z1]
  function fitMatrix(name, b, rot) {
    need(name);
    var R = new THREE.Matrix4().makeRotationY((rot || 0) * Math.PI / 2);
    var box = boxes[name].clone().applyMatrix4(R);
    var size = box.getSize(new THREE.Vector3());
    var S = new THREE.Matrix4().makeScale((b[3] - b[0]) / size.x, (b[4] - b[1]) / size.y, (b[5] - b[2]) / size.z);
    return new THREE.Matrix4()
      .makeTranslation(b[0], b[1], b[2])
      .multiply(S)
      .multiply(new THREE.Matrix4().makeTranslation(-box.min.x, -box.min.y, -box.min.z))
      .multiply(R);
  }
  // a matrix that stands the model on the ground at (x, y, z), turned rotY radians, at a given height
  // (or scale), centred on its footprint
  function atMatrix(name, o) {
    need(name);
    var bb = boxes[name];
    var h = bb.max.y - bb.min.y;
    var s = o.height ? o.height / h : o.scale || 1;
    var cx = (bb.min.x + bb.max.x) / 2;
    var cz = (bb.min.z + bb.max.z) / 2;
    return new THREE.Matrix4()
      .makeTranslation(o.x, (o.y || 0) - bb.min.y * s, o.z)
      .multiply(new THREE.Matrix4().makeRotationY(o.rotY || 0))
      .multiply(new THREE.Matrix4().makeScale(s, s, s))
      .multiply(new THREE.Matrix4().makeTranslation(-cx, 0, -cz));
  }

  function mergeGeometries(list) {
    var nv = 0;
    var ni = 0;
    list.forEach(function (g) {
      if (!g.attributes.normal) g.computeVertexNormals();
      nv += g.attributes.position.count;
      ni += g.index ? g.index.count : g.attributes.position.count;
    });
    var pos = new Float32Array(nv * 3);
    var nor = new Float32Array(nv * 3);
    var uv = new Float32Array(nv * 2);
    var idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
    var vo = 0;
    var io = 0;
    list.forEach(function (g) {
      var p = g.attributes.position;
      var n = g.attributes.normal;
      var t = g.attributes.uv;
      for (var i = 0; i < p.count; i++) {
        pos[(vo + i) * 3] = p.getX(i);
        pos[(vo + i) * 3 + 1] = p.getY(i);
        pos[(vo + i) * 3 + 2] = p.getZ(i);
        nor[(vo + i) * 3] = n.getX(i);
        nor[(vo + i) * 3 + 1] = n.getY(i);
        nor[(vo + i) * 3 + 2] = n.getZ(i);
        if (t) {
          uv[(vo + i) * 2] = t.getX(i);
          uv[(vo + i) * 2 + 1] = t.getY(i);
        }
      }
      if (g.index) for (var j = 0; j < g.index.count; j++) idx[io + j] = g.index.getX(j) + vo;
      else for (var k = 0; k < p.count; k++) idx[io + k] = k + vo;
      vo += p.count;
      io += g.index ? g.index.count : p.count;
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(idx, 1));
    out.computeBoundingSphere();
    return out;
  }

  var api = {
    load: load,
    has: function (name) {
      return !!templates[name];
    },
    names: function () {
      return Object.keys(templates);
    },
    size: function (name) {
      need(name);
      return boxes[name].getSize(new THREE.Vector3());
    },
    // static furniture: fills box b, turned rot quarter turns
    fit: function (name, b, rot) {
      statics.push({ name: name, matrix: fitMatrix(name, b, rot) });
    },
    // static scenery: { x, y?, z, rotY?, height? | scale? }
    at: function (name, o) {
      statics.push({ name: name, matrix: atMatrix(name, o) });
    },
    // merge everything placed so far into the group; returns the number of meshes made
    commit: function (group) {
      var byMat = {};
      statics.forEach(function (s) {
        templates[s.name].traverse(function (o) {
          if (!o.isMesh) return;
          var g = o.geometry.clone();
          g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(s.matrix, o.matrixWorld));
          var m = materialFor(o.material);
          (byMat[m.uuid] = byMat[m.uuid] || { mat: m, geos: [] }).geos.push(g);
        });
      });
      var made = 0;
      Object.keys(byMat).forEach(function (k) {
        var mesh = new THREE.Mesh(mergeGeometries(byMat[k].geos), byMat[k].mat);
        mesh.matrixAutoUpdate = false;
        group.add(mesh);
        made++;
      });
      statics = [];
      return made;
    },
    // a live copy for something that moves, with the muted materials
    instance: function (name) {
      need(name);
      var o = templates[name].clone(true);
      o.traverse(function (m) {
        if (m.isMesh) m.material = materialFor(m.material);
      });
      return o;
    },
    // scale and place a live copy so it fills box b (like fit, for instances)
    fitObject: function (obj, name, b, rot) {
      var m = fitMatrix(name, b, rot);
      obj.matrixAutoUpdate = false;
      obj.matrix.copy(m);
      obj.updateMatrixWorld(true);
      return obj;
    },
  };
  OC.models = api;
})();
