// Every sound in the game is synthesized with the Web Audio API: no audio files.
// Builders take (ctx, out, opts, t) and connect into `out`; loops return { stop() }.
// Positional sounds go through a panner placed in the world, and are muffled when a wall is in the way.
(function () {
  var OC = (window.OC = window.OC || {});

  // ---- helpers -----------------------------------------------------------------------------------
  function noise(c) {
    if (!c._noise) {
      var len = c.sampleRate * 2;
      var b = c.createBuffer(1, len, c.sampleRate);
      var d = b.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      c._noise = b;
    }
    var s = c.createBufferSource();
    s.buffer = c._noise;
    return s;
  }
  function filt(c, type, freq, q) {
    var f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q) f.Q.value = q;
    return f;
  }
  function gain(c, v) {
    var g = c.createGain();
    g.gain.value = v;
    return g;
  }
  function osc(c, type, freq) {
    var o = c.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    return o;
  }
  // a short enveloped noise burst through one filter
  function burst(c, out, t, o) {
    var s = noise(c);
    s.loop = true;
    var f = filt(c, o.type || 'bandpass', o.freq || 1000, o.q || 1);
    var g = gain(c, 0);
    s.connect(f).connect(g).connect(out);
    var a = o.attack || 0.004;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak || 0.5, t + a);
    g.gain.exponentialRampToValueAtTime(0.0008, t + a + (o.decay || 0.08));
    s.start(t, Math.random() * 1.5);
    s.stop(t + a + (o.decay || 0.08) + 0.05);
  }
  // an enveloped tone
  function tone(c, out, t, o) {
    var v = osc(c, o.wave || 'sine', o.freq);
    var g = gain(c, 0);
    v.connect(g).connect(out);
    if (o.to) v.frequency.exponentialRampToValueAtTime(o.to, t + (o.decay || 0.2));
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(o.peak || 0.3, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0008, t + (o.attack || 0.005) + (o.decay || 0.2));
    v.start(t);
    v.stop(t + (o.attack || 0.005) + (o.decay || 0.2) + 0.05);
  }
  // re-run `fn(t)` every `every` seconds until stopped (for loops made of separate events)
  function repeater(c, every, fn) {
    var next = c.currentTime + 0.02;
    var alive = true;
    function pump() {
      if (!alive) return;
      while (next < c.currentTime + 0.6) {
        fn(next);
        next += typeof every === 'function' ? every() : every;
      }
      setTimeout(pump, 200);
    }
    pump();
    return { stop: function () { alive = false; } };
  }

  function mtof(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }
  // Ethan's mixtape, vol. 3: "songs to housesit to" (patterns of MIDI notes per sixteenth)
  var MIXTAPE = [
    { bpm: 78, bassWave: 'triangle', leadWave: 'sine',
      bass: [45, 0, 0, 0, 45, 0, 0, 0, 41, 0, 0, 0, 43, 0, 0, 0],
      lead: [69, 0, 72, 0, 76, 0, 74, 0, 72, 0, 0, 69, 67, 0, 0, 0] },
    { bpm: 140, bassWave: 'sawtooth', leadWave: 'square',
      bass: [38, 38, 0, 38, 0, 38, 41, 0, 38, 38, 0, 38, 43, 0, 41, 0],
      lead: [62, 0, 65, 0, 69, 0, 65, 0, 62, 0, 60, 0, 57, 0, 0, 0] },
    { bpm: 66, bassWave: 'triangle', leadWave: 'sine',
      bass: [36, 0, 0, 0, 0, 0, 0, 0, 40, 0, 0, 0, 43, 0, 0, 0],
      lead: [72, 0, 0, 74, 76, 0, 0, 0, 79, 0, 77, 76, 74, 0, 0, 0] },
  ];

  // ---- the sounds ---------------------------------------------------------------------------------
  var B = {
    step: function (c, out, o, t) {
      var s = {
        carpet: { type: 'lowpass', freq: 380, peak: 0.35, decay: 0.09 },
        wood: { type: 'lowpass', freq: 900, peak: 0.45, decay: 0.08 },
        tile: { type: 'bandpass', freq: 2300, q: 1.2, peak: 0.35, decay: 0.05 },
        concrete: { type: 'lowpass', freq: 1500, peak: 0.4, decay: 0.07 },
        grass: { type: 'highpass', freq: 1400, peak: 0.16, decay: 0.15 },
      }[o.surface || 'wood'];
      var jitter = 0.85 + Math.random() * 0.3;
      burst(c, out, t, { type: s.type, freq: s.freq * jitter, q: s.q, peak: s.peak, decay: s.decay });
      if (o.surface === 'wood' || o.surface === 'concrete') tone(c, out, t, { freq: 110 * jitter, peak: 0.12, decay: 0.07 });
    },
    beep: function (c, out, o, t) {
      for (var i = 0; i < 3; i++) tone(c, out, t + i * 0.25, { wave: 'square', freq: 2050, peak: 0.08, attack: 0.002, decay: 0.12 });
    },
    hum: function (c, out) {
      var a = osc(c, 'sawtooth', 118);
      var b = osc(c, 'sine', 60);
      var f = filt(c, 'lowpass', 520);
      var g = gain(c, 0.07);
      var lfo = osc(c, 'sine', 5.3);
      var lg = gain(c, 0.02);
      lfo.connect(lg).connect(g.gain);
      a.connect(f);
      b.connect(f);
      f.connect(g).connect(out);
      [a, b, lfo].forEach(function (n) { n.start(); });
      return { stop: function () { [a, b, lfo].forEach(function (n) { try { n.stop(); } catch (e) {} }); } };
    },
    scratch: function (c, out, o, t) {
      var muffle = filt(c, 'lowpass', 2300);
      muffle.connect(out);
      var n = 14 + ((Math.random() * 8) | 0);
      var dur = o.duration || 2.6;
      for (var i = 0; i < n; i++) {
        var at = t + Math.random() * dur;
        burst(c, muffle, at, { freq: 1400 + Math.random() * 1800, q: 3, peak: 0.25 + Math.random() * 0.5, decay: 0.03 + Math.random() * 0.06 });
      }
    },
    thud: function (c, out, o, t) {
      tone(c, out, t, { freq: 72, to: 48, peak: 0.6, decay: 0.4 });
      burst(c, out, t, { type: 'lowpass', freq: 220, peak: 0.5, decay: 0.2 });
    },
    whisper: function (c, out, o, t) {
      // "Shhhh..." then a breathy murmur
      var s = noise(c);
      s.loop = true;
      var hp = filt(c, 'highpass', 2600);
      var bp = filt(c, 'bandpass', 4300, 0.8);
      var g = gain(c, 0);
      s.connect(hp).connect(bp).connect(g).connect(out);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.55, t + 0.3);
      g.gain.setValueAtTime(0.55, t + 1.3);
      g.gain.linearRampToValueAtTime(0, t + 2.0);
      s.start(t);
      s.stop(t + 2.1);
      var m = noise(c);
      m.loop = true;
      var mb = filt(c, 'bandpass', 950, 1.4);
      var mg = gain(c, 0);
      var trem = osc(c, 'sine', 6.5);
      var tg = gain(c, 0.12);
      trem.connect(tg).connect(mg.gain);
      m.connect(mb).connect(mg).connect(out);
      mg.gain.setValueAtTime(0, t + 2.2);
      mg.gain.linearRampToValueAtTime(0.18, t + 2.4);
      mg.gain.linearRampToValueAtTime(0, t + 4.0);
      m.start(t + 2.2);
      trem.start(t + 2.2);
      m.stop(t + 4.1);
      trem.stop(t + 4.1);
    },
    tv: function (c, out) {
      // speech-like murmur: band-passed noise whose pitch and loudness jump like syllables
      var s = noise(c);
      s.loop = true;
      var bp = filt(c, 'bandpass', 900, 0.9);
      var g = gain(c, 0);
      s.connect(bp).connect(g).connect(out);
      s.start();
      var r = repeater(c, function () { return 0.09 + Math.random() * 0.14; }, function (t) {
        bp.frequency.setValueAtTime(500 + Math.random() * 1300, t);
        g.gain.setTargetAtTime(Math.random() < 0.18 ? 0.005 : 0.03 + Math.random() * 0.09, t, 0.02);
      });
      return { stop: function () { r.stop(); try { s.stop(); } catch (e) {} } };
    },
    glassSmash: function (c, out, o, t) {
      burst(c, out, t, { type: 'highpass', freq: 1800, peak: 0.9, decay: 0.55 });
      burst(c, out, t, { type: 'lowpass', freq: 300, peak: 0.6, decay: 0.25 });
      for (var i = 0; i < 9; i++) {
        tone(c, out, t + Math.random() * 0.35, { freq: 2500 + Math.random() * 4000, peak: 0.08, decay: 0.2 + Math.random() * 0.4 });
      }
    },
    siren: function (c, out) {
      var v = osc(c, 'sawtooth', 700);
      var f = filt(c, 'lowpass', 2200);
      var g = gain(c, 0.1);
      v.connect(f).connect(g).connect(out);
      v.start();
      var hi = false;
      var r = repeater(c, 0.55, function (t) {
        hi = !hi;
        v.frequency.setTargetAtTime(hi ? 960 : 660, t, 0.06);
      });
      return { stop: function () { r.stop(); try { v.stop(); } catch (e) {} } };
    },
    shower: function (c, out) {
      var s = noise(c);
      s.loop = true;
      var hp = filt(c, 'highpass', 600);
      var lp = filt(c, 'lowpass', 7000);
      var g = gain(c, 0.2);
      s.connect(hp).connect(lp).connect(g).connect(out);
      s.start();
      return { stop: function () { try { s.stop(); } catch (e) {} } };
    },
    engineSputter: function (c, out, o, t) {
      // three cranks of a starter that will not catch, then a click
      for (var i = 0; i < 3; i++) {
        var at = t + i * 0.85;
        var v = osc(c, 'sawtooth', 52);
        var f = filt(c, 'lowpass', 700);
        var g = gain(c, 0);
        var trem = osc(c, 'square', 13);
        var tg = gain(c, 0.12);
        trem.connect(tg).connect(g.gain);
        v.connect(f).connect(g).connect(out);
        g.gain.setValueAtTime(0.18, at);
        g.gain.setValueAtTime(0.18, at + 0.55);
        g.gain.linearRampToValueAtTime(0, at + 0.65);
        v.start(at);
        trem.start(at);
        v.stop(at + 0.7);
        trem.stop(at + 0.7);
      }
      burst(c, out, t + 2.75, { type: 'highpass', freq: 2500, peak: 0.4, decay: 0.03 });
    },
    doorLock: function (c, out, o, t) {
      burst(c, out, t, { freq: 3000, q: 2, peak: 0.5, decay: 0.02 });
      burst(c, out, t + 0.09, { freq: 2400, q: 2, peak: 0.6, decay: 0.03 });
      tone(c, out, t + 0.09, { freq: 180, peak: 0.2, decay: 0.05 });
    },
    knock: function (c, out, o, t) {
      for (var i = 0; i < (o.count || 3); i++) {
        tone(c, out, t + i * 0.32, { freq: 95, peak: 0.5, decay: 0.18 });
        burst(c, out, t + i * 0.32, { type: 'lowpass', freq: 500, peak: 0.4, decay: 0.08 });
      }
    },
    creak: function (c, out, o, t) {
      var v = osc(c, 'sawtooth', 330);
      var bp = filt(c, 'bandpass', 600, 12);
      var g = gain(c, 0);
      v.connect(bp).connect(g).connect(out);
      v.frequency.setValueAtTime(330, t);
      v.frequency.linearRampToValueAtTime(280, t + 0.6);
      v.frequency.linearRampToValueAtTime(360, t + 1.2);
      bp.frequency.linearRampToValueAtTime(760, t + 1.2);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.09, t + 0.15);
      g.gain.linearRampToValueAtTime(0, t + 1.3);
      v.start(t);
      v.stop(t + 1.35);
    },
    bark: function (c, out, o, t) {
      for (var i = 0; i < (o.count || 2); i++) {
        var at = t + i * 0.3;
        var v = osc(c, 'sawtooth', 560);
        var bp = filt(c, 'bandpass', 950, 1.1);
        var g = gain(c, 0);
        v.connect(bp).connect(g).connect(out);
        v.frequency.exponentialRampToValueAtTime(250, at + 0.13);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.32, at + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.15);
        v.start(at);
        v.stop(at + 0.17);
      }
    },
    growl: function (c, out, o, t) {
      var dur = o.duration || 2.5;
      var a = osc(c, 'sawtooth', 92);
      var b = osc(c, 'sawtooth', 99);
      var bp = filt(c, 'bandpass', 430, 2);
      var g = gain(c, 0);
      var trem = osc(c, 'sine', 23);
      var tg = gain(c, 0.05);
      trem.connect(tg).connect(g.gain);
      a.connect(bp);
      b.connect(bp);
      bp.connect(g).connect(out);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.14, t + 0.3);
      g.gain.setValueAtTime(0.14, t + dur - 0.4);
      g.gain.linearRampToValueAtTime(0, t + dur);
      [a, b, trem].forEach(function (n) { n.start(t); n.stop(t + dur + 0.05); });
    },
    buzz: function (c, out, o, t) {
      for (var i = 0; i < 2; i++) {
        var at = t + i * 0.5;
        var v = osc(c, 'square', 165);
        var lp = filt(c, 'lowpass', 420);
        var g = gain(c, 0);
        v.connect(lp).connect(g).connect(out);
        g.gain.setValueAtTime(0.12, at);
        g.gain.setValueAtTime(0.12, at + 0.32);
        g.gain.linearRampToValueAtTime(0, at + 0.34);
        v.start(at);
        v.stop(at + 0.36);
      }
    },
    heartbeat: function (c, out) {
      return repeater(c, 0.85, function (t) {
        tone(c, out, t, { freq: 58, to: 40, peak: 0.55, decay: 0.16 });
        tone(c, out, t + 0.22, { freq: 52, to: 38, peak: 0.4, decay: 0.16 });
      });
    },
    scrape: function (c, out) {
      return repeater(c, function () { return 1.1 + Math.random() * 0.8; }, function (t) {
        var s = noise(c);
        s.loop = true;
        var bp = filt(c, 'bandpass', 3000, 16);
        var g = gain(c, 0);
        s.connect(bp).connect(g).connect(out);
        bp.frequency.setValueAtTime(2800 + Math.random() * 400, t);
        bp.frequency.linearRampToValueAtTime(4200, t + 0.9);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.5, t + 0.1);
        g.gain.linearRampToValueAtTime(0, t + 0.95);
        s.start(t);
        s.stop(t + 1);
      });
    },
    crowbar: function (c, out, o, t) {
      burst(c, out, t, { freq: 1500, q: 4, peak: 0.7, decay: 0.25 });
      [380, 623, 1104].forEach(function (f) { tone(c, out, t, { freq: f, peak: 0.18, decay: 0.6 }); });
    },
    slide: function (c, out, o, t) {
      burst(c, out, t, { type: 'lowpass', freq: 800, peak: 0.25, attack: 0.08, decay: 0.55 });
    },
    dig: function (c, out, o, t) {
      for (var i = 0; i < 4; i++) burst(c, out, t + i * 0.42, { freq: 600, q: 0.8, peak: 0.4, decay: 0.18 });
    },
    sting: function (c, out, o, t) {
      tone(c, out, t, { freq: 55, to: 30, peak: 0.8, decay: 1.8 });
      [1180, 1250, 1330, 1415].forEach(function (f) { tone(c, out, t, { freq: f, peak: 0.05, attack: 0.05, decay: 2.4 }); });
    },
    click: function (c, out, o, t) {
      burst(c, out, t, { freq: 3500, q: 3, peak: 0.25, decay: 0.012 });
    },
    // ---- night one -----------------------------------------------------------------------------
    // the singing fish: a goofy original jingle over a motor whir
    fish: function (c, out, o, t) {
      var notes = [76, 79, 81, 79, 76, 72, 74, 76, 79, 76, 74, 72, 0, 72, 67, 72];
      var d = 0.17;
      notes.forEach(function (m, i) {
        if (m) tone(c, out, t + i * d, { wave: 'square', freq: mtof(m), peak: 0.07, attack: 0.005, decay: d * 0.9 });
      });
      var whir = osc(c, 'sawtooth', 58);
      var wf = filt(c, 'lowpass', 300);
      var wg = gain(c, 0.025);
      whir.connect(wf).connect(wg).connect(out);
      whir.start(t);
      whir.stop(t + notes.length * d);
    },
    pan: function (c, out, o, t) {
      [[0, 0.7], [0.24, 0.4], [0.4, 0.25], [0.52, 0.14]].forEach(function (b) {
        burst(c, out, t + b[0], { freq: 2600, q: 1.5, peak: b[1] * 0.8, decay: 0.08 });
        [310, 770, 1290, 2170].forEach(function (f) {
          tone(c, out, t + b[0], { freq: f * (0.97 + Math.random() * 0.06), peak: b[1] * 0.12, decay: 0.7 });
        });
      });
    },
    kettle: function (c, out, o, t) {
      var dur = o.duration || 3;
      var v = osc(c, 'sine', 1350);
      var vib = osc(c, 'sine', 7);
      var vg = gain(c, 30);
      vib.connect(vg).connect(v.frequency);
      var g = gain(c, 0);
      v.connect(g).connect(out);
      v.frequency.linearRampToValueAtTime(2100, t + dur * 0.7);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + dur * 0.5);
      g.gain.setValueAtTime(0.06, t + dur - 0.2);
      g.gain.linearRampToValueAtTime(0, t + dur);
      [v, vib].forEach(function (n) { n.start(t); n.stop(t + dur + 0.05); });
    },
    ice: function (c, out, o, t) {
      for (var i = 0; i < 6; i++) {
        var at = t + i * 0.07 + Math.random() * 0.05;
        tone(c, out, at, { freq: 2000 + Math.random() * 1600, peak: 0.08, decay: 0.08 });
        burst(c, out, at, { freq: 3500, q: 2, peak: 0.15, decay: 0.02 });
      }
    },
    fridgeHum: function (c, out) {
      var a = osc(c, 'sawtooth', 50);
      var b = osc(c, 'sine', 100);
      var f = filt(c, 'lowpass', 180);
      var g = gain(c, 0.05);
      a.connect(f);
      b.connect(f);
      f.connect(g).connect(out);
      a.start();
      b.start();
      return { stop: function () { [a, b].forEach(function (n) { try { n.stop(); } catch (e) {} }); } };
    },
    clockTick: function (c, out) {
      var tock = false;
      return repeater(c, 1, function (t) {
        tock = !tock;
        burst(c, out, t, { freq: tock ? 2400 : 3100, q: 4, peak: 0.12, decay: 0.012 });
      });
    },
    // the two-tone alert signal
    alertTone: function (c, out, o, t) {
      var dur = o.duration || 8;
      var g = gain(c, 0);
      [853, 960].forEach(function (f) {
        var v = osc(c, 'sine', f);
        v.connect(g);
        v.start(t);
        v.stop(t + dur + 0.05);
      });
      g.connect(out);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.05);
      g.gain.setValueAtTime(0.07, t + dur - 0.05);
      g.gain.linearRampToValueAtTime(0, t + dur);
    },
    whine: function (c, out, o, t) {
      for (var i = 0; i < (o.count || 1); i++) {
        var at = t + i * 1.1;
        var v = osc(c, 'sine', 720);
        var g = gain(c, 0);
        v.connect(g).connect(out);
        v.frequency.setValueAtTime(720, at);
        v.frequency.linearRampToValueAtTime(940, at + 0.35);
        v.frequency.linearRampToValueAtTime(640, at + 0.9);
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(0.09, at + 0.1);
        g.gain.linearRampToValueAtTime(0, at + 0.9);
        v.start(at);
        v.stop(at + 0.95);
      }
    },
    shutter: function (c, out, o, t) {
      burst(c, out, t, { freq: 4200, q: 2, peak: 0.4, decay: 0.015 });
      burst(c, out, t + 0.06, { freq: 3000, q: 2, peak: 0.3, decay: 0.02 });
    },
    switch: function (c, out, o, t) {
      burst(c, out, t, { freq: 2100, q: 2, peak: 0.45, decay: 0.012 });
      tone(c, out, t, { freq: 900, peak: 0.06, decay: 0.03 });
    },
    kibble: function (c, out, o, t) {
      for (var i = 0; i < 26; i++) burst(c, out, t + Math.random() * 0.6, { freq: 2500 + Math.random() * 2500, q: 3, peak: 0.12, decay: 0.015 });
    },
    water: function (c, out) {
      var s = noise(c);
      s.loop = true;
      var hp = filt(c, 'highpass', 500);
      var lp = filt(c, 'lowpass', 4000);
      var g = gain(c, 0.1);
      s.connect(hp).connect(lp).connect(g).connect(out);
      s.start();
      return { stop: function () { try { s.stop(); } catch (e) {} } };
    },
    bounce: function (c, out, o, t) {
      tone(c, out, t, { freq: 190, to: 95, peak: 0.25, decay: 0.1 });
      burst(c, out, t, { type: 'lowpass', freq: 700, peak: 0.2, decay: 0.04 });
    },
    rustle: function (c, out, o, t) {
      for (var i = 0; i < 12; i++) burst(c, out, t + Math.random() * 0.5, { freq: 2500 + Math.random() * 2000, q: 1, peak: 0.15, decay: 0.05 });
    },
    keyBeep: function (c, out, o, t) {
      tone(c, out, t, { wave: 'square', freq: 2400, peak: 0.05, attack: 0.002, decay: 0.05 });
    },
    munch: function (c, out, o, t) {
      for (var i = 0; i < 4; i++) burst(c, out, t + i * 0.28, { type: 'lowpass', freq: 900, peak: 0.25, decay: 0.09 });
    },
    // a knee popping as he straightens up
    kneePop: function (c, out, o, t) {
      burst(c, out, t, { type: 'bandpass', freq: 1800, q: 3, peak: 0.6, decay: 0.025 });
      tone(c, out, t, { freq: 240, to: 120, peak: 0.12, decay: 0.05 });
    },
    // Ethan's mixtape: three cheap loops (opts.track 0..2)
    mixtape: function (c, out, o) {
      var T = MIXTAPE[o.track || 0];
      var step = 0;
      var sixteenth = 60 / T.bpm / 4;
      var master = gain(c, 0.5);
      master.connect(out);
      var r = repeater(c, sixteenth, function (t) {
        var i = step % 16;
        var b = T.bass[i];
        var l = T.lead[i];
        if (b) tone(c, master, t, { wave: T.bassWave, freq: mtof(b), peak: 0.16, attack: 0.01, decay: sixteenth * 3 });
        if (l) tone(c, master, t, { wave: T.leadWave, freq: mtof(l), peak: 0.07, attack: 0.01, decay: sixteenth * 2.2 });
        if (i % 2 === 0) burst(c, master, t, { type: 'highpass', freq: 7000, peak: 0.05, decay: 0.03 });
        if (i % 8 === 0) tone(c, master, t, { freq: 110, to: 45, peak: 0.25, decay: 0.15 });
        step++;
      });
      return { stop: function () { r.stop(); } };
    },
    drone: function (c, out) {
      var g = gain(c, 0.06);
      var lp = filt(c, 'lowpass', 190);
      var a = osc(c, 'sine', 44);
      var b = osc(c, 'sawtooth', 66.5);
      var bg = gain(c, 0.35);
      var d = osc(c, 'sine', 93.3); // the dissonant one, brought in by tension
      var dg = gain(c, 0);
      var n = noise(c);
      n.loop = true;
      var nb = filt(c, 'bandpass', 280, 0.5);
      var ng = gain(c, 0.25);
      var lfo = osc(c, 'sine', 0.07);
      var lg = gain(c, 0.02);
      lfo.connect(lg).connect(g.gain);
      a.connect(lp);
      b.connect(bg).connect(lp);
      d.connect(dg).connect(lp);
      n.connect(nb).connect(ng).connect(lp);
      lp.connect(g).connect(out);
      [a, b, d, n, lfo].forEach(function (x) { x.start(); });
      return {
        stop: function () { [a, b, d, n, lfo].forEach(function (x) { try { x.stop(); } catch (e) {} }); },
        setTension: function (v) {
          var now = c.currentTime;
          dg.gain.setTargetAtTime(0.5 * v, now, 1.5);
          g.gain.setTargetAtTime(0.06 + 0.07 * v, now, 1.5);
          lp.frequency.setTargetAtTime(190 + 500 * v, now, 1.5);
        },
      };
    },
  };

  // ---- the engine ---------------------------------------------------------------------------------
  var ctx = null;
  var bus = null;
  var volume = 0.9;
  var occluded = null; // function(pos) -> true when a wall is between the listener and pos
  var listenerPos = { x: 0, y: 1.6, z: 0 };

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    bus = gain(ctx, volume);
    bus.connect(comp).connect(ctx.destination);
  }

  function play(name, opts) {
    opts = opts || {};
    var none = { stop: function () {} };
    if (!ctx || !B[name]) return none;
    var out = gain(ctx, opts.gain === undefined ? 1 : opts.gain);
    var tail = out;
    if (opts.pos) {
      var p = ctx.createPanner();
      p.panningModel = 'HRTF';
      p.distanceModel = 'inverse';
      p.refDistance = opts.ref || 1.5;
      p.maxDistance = 60;
      p.rolloffFactor = opts.rolloff || 1.1;
      if (p.positionX) {
        p.positionX.value = opts.pos.x;
        p.positionY.value = opts.pos.y || 1;
        p.positionZ.value = opts.pos.z;
      } else p.setPosition(opts.pos.x, opts.pos.y || 1, opts.pos.z);
      out.connect(p);
      tail = p;
      if (occluded && occluded(opts.pos)) {
        var m = filt(ctx, 'lowpass', 900);
        var mg = gain(ctx, 0.75);
        p.connect(m).connect(mg).connect(bus);
      } else p.connect(bus);
    } else out.connect(bus);
    var handle = B[name](ctx, out, opts, ctx.currentTime + (opts.delay || 0));
    return handle || none;
  }

  function listen(camera) {
    if (!ctx) return;
    var L = ctx.listener;
    var p = camera.position;
    listenerPos.x = p.x;
    listenerPos.y = p.y;
    listenerPos.z = p.z;
    var f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    if (L.positionX) {
      L.positionX.value = p.x;
      L.positionY.value = p.y;
      L.positionZ.value = p.z;
      L.forwardX.value = f.x;
      L.forwardY.value = f.y;
      L.forwardZ.value = f.z;
      L.upX.value = 0;
      L.upY.value = 1;
      L.upZ.value = 0;
    } else {
      L.setPosition(p.x, p.y, p.z);
      L.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }

  // Render one sound offline and measure it (for automated checks that every sound makes noise).
  function measure(name, seconds, opts) {
    var OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var c = new OAC(1, Math.ceil(44100 * seconds), 44100);
    var h = B[name](c, c.destination, opts || {}, 0);
    return c.startRendering().then(function (buf) {
      if (h && h.stop) h.stop(); // loops: stop their schedulers once the render is done
      var d = buf.getChannelData(0);
      var sum = 0;
      var peak = 0;
      for (var i = 0; i < d.length; i++) {
        sum += d[i] * d[i];
        if (Math.abs(d[i]) > peak) peak = Math.abs(d[i]);
      }
      return { rms: Math.sqrt(sum / d.length), peak: peak };
    });
  }

  OC.audio = {
    init: init,
    play: play,
    listen: listen,
    measure: measure,
    names: Object.keys(B),
    tracks: ['lo-fi beats to housesit to', "cooper's theme (dubstep remix)", 'slow jam for nobody'],
    setOcclusion: function (fn) { occluded = fn; },
    setVolume: function (v) {
      volume = v;
      if (bus) bus.gain.value = v;
    },
    ready: function () { return !!ctx; },
  };
})();
