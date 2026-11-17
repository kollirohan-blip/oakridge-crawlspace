// What is on Dave's TV, drawn on a 256x144 canvas a few times a second. Each channel is a little show
// that follows its own closed captions (content/tv.js): the picture changes with the line being said.
//   OC.tvShows.draw(id, g, t, line, lt)   t: seconds the show has run; line: the caption up now;
//                                          lt: seconds into that caption
// Shows: news (7), shop (22), nature (31), weather (48), alert, black, reflection (night one's channel
// change), slider (night two's black screen), storm (late-night storm coverage), and crt(g), the
// screen's own scanlines and grain laid over whatever is showing.
(function () {
  var OC = (window.OC = window.OC || {});
  var W = 256;
  var H = 144;
  var SANS = 'Arial, Helvetica, sans-serif';
  var SERIF = 'Georgia, "Times New Roman", serif';

  // ---- drawing helpers -------------------------------------------------------------------------
  function R(g, c, x, y, w, h) {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  }
  function T(g, c, size, text, x, y, o) {
    o = o || {};
    g.fillStyle = c;
    g.font = (o.italic ? 'italic ' : '') + (o.bold ? 'bold ' : '') + size + 'px ' + (o.serif ? SERIF : o.mono ? 'monospace' : SANS);
    g.textAlign = o.align || 'left';
    g.textBaseline = 'alphabetic';
    g.fillText(text, x, y);
    g.textAlign = 'left';
  }
  function C(g, c, x, y, r) {
    g.fillStyle = c;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  function E(g, c, x, y, rx, ry, rot) {
    g.fillStyle = c;
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
    g.fill();
  }
  function poly(g, c, pts) {
    g.fillStyle = c;
    g.beginPath();
    g.moveTo(pts[0], pts[1]);
    for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.closePath();
    g.fill();
  }
  function grad(g, x0, y0, x1, y1, stops) {
    var gr = g.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
    return gr;
  }
  function fade(lt, inSec) {
    return Math.max(0, Math.min(1, lt / (inSec || 0.4)));
  }
  // a person from the chest up. look: { suit, shirt, tie, skin, hair, hairStyle, glasses, moustache }
  function bust(g, x, y, s, look, talking, t) {
    var mouth = talking ? Math.max(0, Math.sin(t * 13) * Math.sin(t * 5.3)) : 0;
    poly(g, look.suit, [x - 30 * s, y, x + 30 * s, y, x + 24 * s, y - 24 * s, x - 24 * s, y - 24 * s]); // shoulders
    poly(g, look.shirt || '#e8e4dc', [x - 7 * s, y - 24 * s, x + 7 * s, y - 24 * s, x, y - 8 * s]);
    if (look.tie) poly(g, look.tie, [x - 2 * s, y - 22 * s, x + 2 * s, y - 22 * s, x + 3 * s, y - 6 * s, x, y - 3 * s, x - 3 * s, y - 6 * s]);
    R(g, look.skin, x - 4 * s, y - 30 * s, 8 * s, 7 * s); // neck
    E(g, look.skin, x, y - 41 * s, 11 * s, 13 * s); // head
    g.fillStyle = look.hair;
    g.beginPath();
    if (look.hairStyle === 'long') {
      g.ellipse(x, y - 45 * s, 13 * s, 12 * s, 0, Math.PI, Math.PI * 2);
      g.fill();
      R(g, look.hair, x - 13 * s, y - 46 * s, 5 * s, 22 * s);
      R(g, look.hair, x + 8 * s, y - 46 * s, 5 * s, 22 * s);
    } else if (look.hairStyle === 'bald') {
      g.ellipse(x, y - 44 * s, 11.5 * s, 6 * s, 0, Math.PI * 0.95, Math.PI * 1.05);
      g.fill();
      R(g, look.hair, x - 12 * s, y - 45 * s, 3 * s, 7 * s);
      R(g, look.hair, x + 9 * s, y - 45 * s, 3 * s, 7 * s);
    } else {
      g.ellipse(x, y - 47 * s, 12 * s, 8 * s, 0, Math.PI, Math.PI * 2);
      g.fill();
    }
    var blink = Math.sin(t * 1.7 + x) > 0.985 ? 0.3 : 1;
    E(g, '#1a1410', x - 4.5 * s, y - 42 * s, 1.4 * s, 1.5 * s * blink);
    E(g, '#1a1410', x + 4.5 * s, y - 42 * s, 1.4 * s, 1.5 * s * blink);
    if (look.glasses) {
      g.strokeStyle = '#1a1a1a';
      g.lineWidth = Math.max(1, s * 0.9);
      g.strokeRect(x - 8 * s, y - 45 * s, 6 * s, 5 * s);
      g.strokeRect(x + 2 * s, y - 45 * s, 6 * s, 5 * s);
    }
    if (look.moustache) R(g, look.hair, x - 5 * s, y - 36.5 * s, 10 * s, 2 * s);
    E(g, '#5a2a24', x, y - 33.5 * s, 3.4 * s, (0.7 + mouth * 2.2) * s);
    if (look.grin) {
      g.fillStyle = '#f4f0e8';
      g.fillRect(x - 3.4 * s, y - 34.5 * s, 6.8 * s, 1.2 * s);
    }
  }
  // a ticker crawling along the bottom
  function ticker(g, t, text, y, h, bg, fg, speed) {
    R(g, bg, 0, y, W, h);
    g.save();
    g.beginPath();
    g.rect(0, y, W, h);
    g.clip();
    g.font = 'bold ' + (h - 3) + 'px ' + SANS;
    var w = g.measureText(text).width + 40;
    var x = W - ((t * (speed || 34)) % (w + W));
    g.fillStyle = fg;
    g.textBaseline = 'alphabetic';
    g.fillText(text, x, y + h - 2.5);
    g.fillText(text, x + w + W, y + h - 2.5);
    g.restore();
  }
  function cloud(g, x, y, s, c) {
    C(g, c, x, y, 6 * s);
    C(g, c, x + 7 * s, y - 3 * s, 7 * s);
    C(g, c, x + 14 * s, y, 6 * s);
    R(g, c, x, y, 14 * s, 6 * s);
  }
  function bolt(g, x, y, s, c) {
    poly(g, c, [x, y, x + 6 * s, y, x + 3 * s, y + 6 * s, x + 7 * s, y + 6 * s, x - 1 * s, y + 16 * s, x + 1 * s, y + 9 * s, x - 3 * s, y + 9 * s]);
  }
  function grass(g, t, y0, color, n, h, seed) {
    g.strokeStyle = color;
    g.lineWidth = 1;
    g.beginPath();
    for (var i = 0; i < n; i++) {
      var x = ((i * 37 + seed * 13) % 263) - 4;
      var hh = h * (0.6 + ((i * 7) % 5) / 10);
      var sway = Math.sin(t * 1.3 + i * 0.7) * 2;
      g.moveTo(x, y0);
      g.quadraticCurveTo(x + sway * 0.5, y0 - hh * 0.6, x + sway, y0 - hh);
    }
    g.stroke();
  }

  var ANCHOR = { suit: '#1d2b4a', shirt: '#e8e4dc', tie: '#8a1d24', skin: '#d8a888', hair: '#3a2a1c' };
  var MARGE = { suit: '#6a4a8a', shirt: '#d8c8a8', skin: '#e2b896', hair: '#b8b0a4', hairStyle: 'long', glasses: true };
  var HOST = { suit: '#d94a1a', shirt: '#ffffff', tie: '#1a7ad9', skin: '#e0a882', hair: '#2a1a10', grin: true };
  var GARY = { suit: '#5a6a3a', shirt: '#c8c0a8', skin: '#d8a080', hair: '#5a3a1a', hairStyle: 'bald', moustache: true };
  var WEATHERMAN = { suit: '#3a3a40', shirt: '#dfe6f2', tie: '#d9a01a', skin: '#c89a78', hair: '#1a1410', glasses: true };

  // ---- CH 7: the news ------------------------------------------------------------------------------
  var HEADLINES = ['ROUTE 9 PANTRY THIEF?', 'SIX HOMES SINCE SEPTEMBER', '"IT\'S JUST... LIGHTER"', "SHERIFF: TEENS OR RACCOON", 'TIGERS FALL TO DUNMORE'];
  function news(g, t, line, lt) {
    if (line === 2) return newsInterview(g, t, lt);
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#0d1a3a'], [0.6, '#1d3466'], [1, '#0a1428']]);
    g.fillRect(0, 0, W, H);
    for (var i = 0; i < 6; i++) R(g, 'rgba(120,170,255,0.06)', 140 + i * 18, 0, 6, 104); // the studio's light bars
    // the anchor, at her desk
    bust(g, 190, 104, 1.45, ANCHOR, true, t);
    R(g, '#0a0f1e', 120, 96, 136, 12);
    R(g, '#2b4a8a', 120, 96, 136, 2);
    // the box over her shoulder
    var a = fade(lt);
    g.globalAlpha = a;
    R(g, '#ffffff', 12, 14, 112, 68);
    R(g, '#101820', 14, 16, 108, 64);
    if (line === 0) {
      // a pantry, shelves with gaps in them
      R(g, '#5a4028', 22, 20, 92, 56);
      [30, 46, 62].forEach(function (y, k) {
        R(g, '#3a2818', 22, y + 10, 92, 2);
        for (var c = 0; c < 9; c++) {
          if ((c * 3 + k * 5) % 4 === 0) continue; // the gaps
          R(g, k === 1 ? '#b8322a' : '#d8c060', 26 + c * 10, y, 7, 10);
          R(g, '#e8e2d0', 26 + c * 10, y + 3, 7, 3);
        }
      });
      T(g, '#ffd23a', 12, '?', 104, 32, { bold: true });
    } else if (line === 1) {
      // the map: Route 9, and a red dot for every house that called it in
      R(g, '#3a5a2e', 16, 18, 104, 60);
      g.strokeStyle = '#e8d070';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(16, 66);
      g.bezierCurveTo(50, 50, 70, 70, 120, 30);
      g.stroke();
      T(g, '#ffffff', 8, 'RT 9', 94, 42, { bold: true });
      [[30, 58], [46, 56], [58, 62], [74, 56], [88, 46], [104, 36]].forEach(function (p, k) {
        if (lt < 0.5 + k * 0.6) return;
        C(g, '#ff2a2a', p[0], p[1], 3.5);
        C(g, 'rgba(255,42,42,0.35)', p[0], p[1], 3.5 + ((t * 6 + k) % 4));
      });
      T(g, '#ffffff', 9, '6 HOMES', 22, 30, { bold: true });
    } else if (line === 3) {
      // the Sheriff's star, and a raccoon, and a question mark
      poly(g, '#d8b04a', [44, 26, 49, 40, 64, 40, 52, 49, 57, 64, 44, 55, 31, 64, 36, 49, 24, 40, 39, 40]);
      C(g, '#b08a2a', 44, 45, 5);
      E(g, '#6a6a6a', 90, 52, 18, 15);
      E(g, '#1a1a1a', 82, 50, 6, 4);
      E(g, '#1a1a1a', 98, 50, 6, 4);
      C(g, '#ffffff', 83, 50, 1.5);
      C(g, '#ffffff', 97, 50, 1.5);
      poly(g, '#6a6a6a', [74, 42, 78, 30, 84, 40]);
      poly(g, '#6a6a6a', [106, 42, 102, 30, 96, 40]);
      C(g, '#1a1a1a', 90, 58, 2.5);
      T(g, '#ffd23a', 18, '?', 66, 76, { bold: true });
    } else {
      // the scoreboard
      R(g, '#1a1a1a', 22, 24, 92, 48);
      T(g, '#ff9a2a', 10, 'TIGERS', 28, 40, { bold: true });
      T(g, '#6ab0ff', 10, 'DUNMORE', 28, 62, { bold: true });
      T(g, '#ffe8a0', 16, '3', 104, 42, { bold: true, align: 'right', mono: true });
      T(g, '#ffe8a0', 16, '28', 104, 64, { bold: true, align: 'right', mono: true });
      T(g, '#aaaaaa', 7, 'FINAL', 68, 74, { align: 'center' });
    }
    g.globalAlpha = 1;
    // the lower third
    R(g, '#c8102e', 0, 108, 46, 16);
    T(g, '#ffffff', 9, line === 4 ? 'SPORTS' : 'BREAKING', 23, 119.5, { bold: true, align: 'center' });
    R(g, '#f2f2f2', 46, 108, 210, 16);
    T(g, '#0d1a3a', 10, HEADLINES[line] || '', 52, 120, { bold: true });
    ticker(g, t, 'STORMS TOMORROW NIGHT - POWER OUTAGES POSSIBLE   *   ROUTE 9 FOG ADVISORY AFTER MIDNIGHT   *   GAS-N-GO NOW OPEN TIL 9   *   OAKRIDGE TIGERS 3, DUNMORE 28   *   LOCK YOUR DOORS', 128, 12, '#0a1428', '#ffd23a');
    // the bug
    C(g, '#c8102e', 236, 16, 11);
    T(g, '#ffffff', 15, '7', 236, 21.5, { bold: true, align: 'center' });
    T(g, '#ffffff', 6, 'ACTION NEWS', 236, 34, { bold: true, align: 'center' });
    R(g, '#c8102e', 8, 4, 18, 8);
    T(g, '#ffffff', 6.5, 'LIVE', 17, 10.5, { bold: true, align: 'center' });
  }
  function newsInterview(g, t, lt) {
    // a kitchen doorway, at night, with the pantry open behind her
    R(g, '#2a2420', 0, 0, W, H);
    R(g, '#4a3a2a', 150, 10, 80, 100); // the pantry door, open
    R(g, '#1a1410', 156, 16, 68, 94);
    [34, 56, 78].forEach(function (y) { R(g, '#5a4430', 156, y, 68, 3); });
    R(g, '#d8c060', 162, 26, 8, 8); // one can left
    R(g, '#e8e2d0', 162, 29, 8, 2);
    R(g, 'rgba(255,230,180,0.08)', 0, 0, 140, H); // the camera light
    bust(g, 92, 132, 1.9, MARGE, lt > 0.3, t);
    // a microphone, from the edge
    R(g, '#1a1a1a', 128, 90, 30, 4);
    C(g, '#2a2a2a', 128, 92, 6);
    R(g, '#c8102e', 150, 86, 10, 12);
    T(g, '#ffffff', 7, '7', 155, 95, { bold: true, align: 'center' });
    R(g, '#c8102e', 0, 108, 6, 16);
    R(g, 'rgba(242,242,242,0.95)', 6, 108, 190, 16);
    T(g, '#0d1a3a', 10, 'MARGE PEARSON', 12, 117, { bold: true });
    T(g, '#55607a', 6.5, 'ROUTE 9 RESIDENT', 12, 123);
    R(g, '#c8102e', 8, 4, 18, 8);
    T(g, '#ffffff', 6.5, 'LIVE', 17, 10.5, { bold: true, align: 'center' });
    ticker(g, t, 'STORMS TOMORROW NIGHT - POWER OUTAGES POSSIBLE   *   ROUTE 9 FOG ADVISORY AFTER MIDNIGHT   *   LOCK YOUR DOORS', 128, 12, '#0a1428', '#ffd23a');
  }

  // ---- CH 22: Shop-at-Home -----------------------------------------------------------------------------
  function spoon(g, x, y, s, angle, temp) {
    var sx = Math.cos(angle);
    g.save();
    g.translate(x, y);
    g.scale(sx, 1);
    E(g, '#d8dce4', 0, -26 * s, 9 * s, 12 * s);
    E(g, '#a8aeb8', 0, -26 * s, 7 * s, 10 * s);
    R(g, '#c8ccd4', -2 * s, -14 * s, 4 * s, 38 * s);
    // the thermometer up the handle
    R(g, '#ffffff', -1.2 * s, -12 * s, 2.4 * s, 30 * s);
    var h = 28 * s * Math.min(1, temp);
    R(g, temp > 0.8 ? '#ff2a2a' : '#2ad04a', -1.2 * s, 18 * s - h, 2.4 * s, h);
    C(g, temp > 0.8 ? '#ff2a2a' : '#2ad04a', 0, 19 * s, 2.6 * s);
    g.restore();
  }
  function starburst(g, x, y, r, n, c, rot) {
    var pts = [];
    for (var i = 0; i < n * 2; i++) {
      var a = rot + (i * Math.PI) / n;
      var rr = i % 2 ? r * 0.62 : r;
      pts.push(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    poly(g, c, pts);
  }
  function shop(g, t, line, lt) {
    var flash = Math.floor(t * 3) % 2;
    g.fillStyle = grad(g, 0, 0, W, H, [[0, flash ? '#ff3aa8' : '#ffcc2a'], [1, flash ? '#ffcc2a' : '#ff3aa8']]);
    g.fillRect(0, 0, W, H);
    for (var i = 0; i < 12; i++) {
      g.fillStyle = 'rgba(255,255,255,' + (i % 2 ? 0.08 : 0.16) + ')';
      g.beginPath();
      g.moveTo(170, 60);
      var a0 = t * 0.4 + (i * Math.PI) / 6;
      g.arc(170, 60, 260, a0, a0 + Math.PI / 12);
      g.closePath();
      g.fill();
    }
    if (line === 3) {
      // Gary, Ohio
      R(g, '#4a6a8a', 0, 0, W, H);
      R(g, '#6a8aaa', 0, 0, W, 20);
      bust(g, 80, 128, 1.8, GARY, true, t);
      spoon(g, 118, 82, 0.9, 0.3, 0.4);
      R(g, 'rgba(0,0,0,0.6)', 136, 26, 112, 56);
      T(g, '#ffffff', 9, '"I used to burn', 142, 42, { italic: true, serif: true });
      T(g, '#ffffff', 9, 'my mouth every', 142, 54, { italic: true, serif: true });
      T(g, '#ffffff', 9, 'single day."', 142, 66, { italic: true, serif: true });
      R(g, '#ffcc2a', 0, 108, 120, 16);
      T(g, '#1a1a1a', 11, 'GARY - OHIO', 8, 120, { bold: true });
      T(g, '#ffffff', 6, 'Real customer. Results not typical.', 128, 120);
    } else {
      bust(g, 62, 132, 1.75, HOST, true, t);
      var spin = line === 1 ? 0.25 : t * 2.4;
      var temp = line === 1 ? Math.min(1, lt / 2.4) : 0.3;
      starburst(g, 172, 60, 46, 14, '#ffffff', t * 0.3);
      spoon(g, 172, 66, 1.4, spin, temp);
      if (line === 0) {
        starburst(g, 222, 24, 18, 10, '#ff2a2a', -t);
        T(g, '#ffffff', 11, 'NEW!', 222, 28, { bold: true, align: 'center' });
        T(g, '#1a1a1a', 22, 'SOUP', 128, 120, { bold: true });
        T(g, '#d9201a', 22, 'SENTRY', 186, 120, { bold: true });
        T(g, '#1a1a1a', 8, 'TM', 248, 106, { bold: true, align: 'right' });
      } else if (line === 1) {
        var hot = temp > 0.8;
        R(g, hot ? '#d9201a' : '#1aa03a', 120, 100, 104, 22);
        T(g, '#ffffff', 13, hot ? '142 F  TOO HOT!' : temp > 0.5 ? 'HEATING...' : 'SAFE', 172, 116, { bold: true, align: 'center' });
      } else if (line === 2) {
        spoon(g, 214, 72, 1.0, -t * 2.4, 0.3);
        R(g, flash ? '#d9201a' : '#1a1a1a', 112, 98, 140, 26);
        T(g, '#ffffff', 10, 'CALL NOW  1-800-555-SOUP', 182, 110, { bold: true, align: 'center' });
        T(g, '#ffcc2a', 8, 'DOUBLE YOUR ORDER!', 182, 120, { bold: true, align: 'center' });
      } else {
        R(g, '#1a1a1a', 112, 92, 140, 30);
        T(g, '#ffffff', 8, '3 EASY PAYMENTS OF', 182, 102, { bold: true, align: 'center' });
        T(g, '#ffcc2a', 15, '$19.99', 182, 118, { bold: true, align: 'center' });
      }
    }
    // the countdown and the fine print
    var left = Math.max(0, 599 - Math.floor(t));
    R(g, 'rgba(0,0,0,0.75)', 180, 4, 72, 12);
    T(g, '#ffffff', 7, 'ORDER IN ' + Math.floor(left / 60) + ':' + ('0' + (left % 60)).slice(-2), 216, 12.5, { bold: true, align: 'center', mono: true });
    ticker(g, t, 'Soup Sentry is not a toy. Do not give Soup Sentry to dogs. Do not use Soup Sentry as a thermometer for people. Soup Sentry does not cool soup. Shop-at-Home 22 is not responsible for soup.', 130, 10, 'rgba(0,0,0,0.8)', '#dddddd', 46);
    T(g, '#ffffff', 7, 'SHOP-AT-HOME 22', 6, 12, { bold: true });
  }

  // ---- CH 31: Nature Hour --------------------------------------------------------------------------------
  function owl(g, x, y, s, t, look) {
    E(g, '#8a6a3c', x, y, 8 * s, 11 * s); // body
    for (var i = 0; i < 6; i++) C(g, '#d8c8a0', x - 4 * s + (i % 3) * 4 * s, y - 2 * s + Math.floor(i / 3) * 5 * s, 1 * s);
    C(g, '#9a7a4a', x, y - 12 * s, 7 * s); // head
    var blink = Math.sin(t * 0.8) > 0.97 ? 0.2 : 1;
    C(g, '#f8e8a8', x - 3 * s, y - 13 * s, 2.8 * s);
    C(g, '#f8e8a8', x + 3 * s, y - 13 * s, 2.8 * s);
    E(g, '#e8c020', x - 3 * s, y - 13 * s, 2 * s, 2 * s * blink);
    E(g, '#e8c020', x + 3 * s, y - 13 * s, 2 * s, 2 * s * blink);
    C(g, '#000000', x - 3 * s + (look || 0) * s, y - 13 * s, 1 * s * blink);
    C(g, '#000000', x + 3 * s + (look || 0) * s, y - 13 * s, 1 * s * blink);
    poly(g, '#3a3020', [x - 1 * s, y - 10.5 * s, x + 1 * s, y - 10.5 * s, x, y - 8.5 * s]);
    R(g, '#c8b080', x - 4 * s, y + 10 * s, 1.5 * s, 6 * s); // long legs
    R(g, '#c8b080', x + 2.5 * s, y + 10 * s, 1.5 * s, 6 * s);
  }
  function prairieDog(g, x, y, s, up) {
    E(g, '#b8925a', x, y - up * 8 * s, 5 * s, 8 * s);
    C(g, '#c8a26a', x, y - 9 * s - up * 8 * s, 4 * s);
    C(g, '#1a1410', x - 1.5 * s, y - 10 * s - up * 8 * s, 0.8 * s);
    C(g, '#1a1410', x + 1.5 * s, y - 10 * s - up * 8 * s, 0.8 * s);
    E(g, '#e8d0a0', x, y - 1 * s - up * 8 * s, 2.5 * s, 4 * s);
  }
  function prairie(g, t, sunset) {
    g.fillStyle = grad(g, 0, 0, 0, 80, sunset ? [[0, '#3a2a5a'], [0.6, '#d86a3a'], [1, '#f8b85a']] : [[0, '#5a8ac8'], [1, '#bcd8ec']]);
    g.fillRect(0, 0, W, 82);
    C(g, sunset ? '#ffd88a' : '#fff8d8', sunset ? 200 : 210, sunset ? 70 : 22, sunset ? 16 : 9);
    poly(g, sunset ? '#5a4a3a' : '#7a9a6a', [0, 76, 40, 64, 90, 72, 140, 60, 200, 70, 256, 62, 256, 84, 0, 84]);
    R(g, sunset ? '#7a6a3a' : '#a89a5a', 0, 82, W, 62);
    grass(g, t, 144, sunset ? '#5a4a2a' : '#7a7a3a', 70, 22, 1);
  }
  function nature(g, t, line, lt) {
    if (line === 2) {
      // under the ground: the tunnel, the prairie dog asleep, and the owl just past the turn, awake
      R(g, '#bcd8ec', 0, 0, W, 26);
      R(g, '#a89a5a', 0, 26, W, 8);
      grass(g, t, 30, '#7a7a3a', 70, 10, 2);
      R(g, '#5a4028', 0, 34, W, 110);
      for (var k = 0; k < 120; k++) R(g, 'rgba(30,20,10,0.4)', (k * 53) % W, 34 + ((k * 29) % 110), 2, 1);
      g.strokeStyle = '#1a1208';
      g.lineCap = 'round';
      g.lineWidth = 14;
      g.beginPath();
      g.moveTo(40, 30);
      g.quadraticCurveTo(50, 80, 110, 96);
      g.quadraticCurveTo(170, 110, 214, 84);
      g.stroke();
      E(g, '#1a1208', 110, 98, 26, 12); // the first chamber
      E(g, '#1a1208', 210, 82, 22, 13); // the second
      // the prairie dog, curled up, asleep
      E(g, '#b8925a', 110, 102, 11, 6);
      C(g, '#c8a26a', 101, 100, 4);
      g.strokeStyle = '#1a1410';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(99, 99.5);
      g.lineTo(102, 99.5);
      g.stroke();
      // Zzz
      g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2);
      T(g, '#ffffff', 7, 'z', 120, 90 - (t * 3) % 6);
      g.globalAlpha = 1;
      owl(g, 210, 84, 0.75, t, -1.2); // and the owl, watching it sleep
      T(g, 'rgba(255,255,255,0.75)', 7, 'NATURE HOUR', 250, 138, { bold: true, align: 'right' });
      return;
    }
    if (line === 3) {
      prairie(g, t, true);
      owl(g, 60, 116, 1.1, t, 0);
      g.globalAlpha = fade(lt, 1.2);
      T(g, '#ffffff', 22, 'commensalism', 150, 56, { serif: true, italic: true, align: 'center' });
      T(g, '#fff0d0', 8, 'one benefits.   the other is not harmed.', 150, 72, { serif: true, align: 'center' });
      g.globalAlpha = 1;
      return;
    }
    if (line === 4) {
      // the cuckoo, and a nest that is not hers
      R(g, '#2a4a2a', 0, 0, W, H);
      for (var j = 0; j < 30; j++) E(g, j % 2 ? '#3a5a32' : '#24402a', (j * 47) % W, (j * 31) % 90, 22, 14);
      R(g, '#4a3420', 0, 100, W, 8); // a branch
      E(g, '#6a5030', 120, 98, 26, 10); // the nest
      E(g, '#5a4026', 120, 94, 22, 6);
      E(g, '#b8d8e8', 110, 92, 5, 3.5);
      E(g, '#b8d8e8', 120, 91, 5, 3.5);
      E(g, '#d8d0b8', 131, 90, 7, 5); // one egg too big, the wrong colour
      E(g, '#5a5a62', 184, 84, 12, 7, -0.3); // the cuckoo, on the branch, looking at it
      C(g, '#6a6a72', 174, 76, 5.5);
      C(g, '#f0c020', 172, 75, 1.4);
      poly(g, '#3a3a3a', [168, 77, 164, 78, 168, 79]);
      poly(g, '#4a4a52', [194, 86, 214, 92, 196, 90]);
      R(g, 'rgba(0,0,0,0.6)', 0, 112, W, 20);
      T(g, '#ffffff', 11, 'NEXT:  THE CUCKOO', 128, 126, { serif: true, align: 'center', bold: true });
      return;
    }
    prairie(g, t, false);
    // the burrow
    E(g, '#7a6a3a', 128, 122, 30, 9);
    E(g, '#1a1208', 128, 122, 12, 5);
    if (line === 0) {
      owl(g, 128, 104, 1.6, t, Math.sin(t * 0.6) * 1.5);
      g.globalAlpha = 1 - fade(lt - 2.4, 0.6);
      T(g, '#ffffff', 14, 'NATURE HOUR', 128, 34, { serif: true, bold: true, align: 'center' });
      T(g, '#ffffff', 8, 'squatters of the prairie', 128, 46, { serif: true, italic: true, align: 'center' });
      g.globalAlpha = 1;
    } else {
      // the prairie dog digs; the owl watches, then walks in
      var dig = Math.abs(Math.sin(t * 9));
      prairieDog(g, 128, 124, 1.4, 0.5 + dig * 0.3);
      for (var p = 0; p < 6; p++) {
        var ft = (t * 2.5 + p * 0.37) % 1;
        C(g, '#5a4028', 138 + ft * 30 + p * 2, 118 - Math.sin(ft * Math.PI) * 18, 1.8);
      }
      var walk = Math.min(1, lt / 4.5);
      owl(g, 40 + walk * 64, 112, 1.3, t, 2);
    }
    T(g, 'rgba(255,255,255,0.75)', 7, 'NATURE HOUR', 250, 138, { bold: true, align: 'right' });
  }

  // ---- CH 48: the weather -------------------------------------------------------------------------------------
  function countyMap(g) {
    R(g, '#3a6a3a', 0, 18, W, 108);
    E(g, '#2a5a9a', 60, 40, 28, 12, 0.3); // the lake
    for (var i = 0; i < 40; i++) R(g, 'rgba(20,60,20,0.35)', (i * 61) % W, 20 + ((i * 37) % 100), 10, 6);
    g.strokeStyle = '#e8d070';
    g.lineWidth = 2.5;
    g.beginPath();
    g.moveTo(0, 104);
    g.bezierCurveTo(60, 90, 100, 110, 150, 80);
    g.bezierCurveTo(180, 62, 210, 70, 256, 50);
    g.stroke();
    R(g, '#ffffff', 140, 70, 18, 9);
    T(g, '#1a1a1a', 7, 'RT 9', 149, 77, { bold: true, align: 'center' });
    C(g, '#ffffff', 112, 96, 3);
    T(g, '#ffffff', 8, 'OAKRIDGE', 118, 99, { bold: true });
    C(g, '#ffffff', 40, 70, 2);
    T(g, '#dfe6f2', 7, 'Dunmore', 45, 73);
  }
  function radar(g, x, y, s, t) {
    [['rgba(60,200,60,0.55)', 1], ['rgba(230,220,40,0.6)', 0.66], ['rgba(230,60,40,0.7)', 0.4], ['rgba(200,40,200,0.7)', 0.18]].forEach(function (b, k) {
      for (var i = 0; i < 6; i++) {
        var a = i * 1.1 + t * 0.2 + k;
        E(g, b[0], x + Math.cos(a) * 10 * s * b[1], y + Math.sin(a * 1.3) * 18 * s * b[1], 18 * s * b[1], 30 * s * b[1], 0.4);
      }
    });
  }
  function weather(g, t, line, lt) {
    R(g, '#0a1a3a', 0, 0, W, H);
    countyMap(g);
    if (line === 0) {
      // tonight: quiet, cold, fog on Route 9
      for (var f = 0; f < 5; f++) {
        var fx = ((t * 6 + f * 50) % 300) - 40;
        E(g, 'rgba(220,225,235,0.35)', fx, 92 - f * 6, 30, 5);
      }
      R(g, 'rgba(10,26,58,0.85)', 8, 26, 70, 54);
      T(g, '#9fc3ff', 8, 'TONIGHT', 43, 38, { bold: true, align: 'center' });
      T(g, '#ffffff', 26, '41', 38, 68, { bold: true, align: 'center' });
      T(g, '#ffffff', 10, 'o', 56, 54, { bold: true });
      T(g, '#dfe6f2', 7, 'PATCHY FOG', 43, 77, { align: 'center' });
    } else if (line === 1 || line === 2) {
      // the line of storms, crawling in from the west toward Oakridge
      var x = -20 + Math.min(1, lt / 5) * 70 + (line === 2 ? 70 : 0);
      radar(g, x, 80, 1.3, t);
      // the sweep
      g.strokeStyle = 'rgba(150,255,150,0.35)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(112, 96);
      g.lineTo(112 + Math.cos(t * 2) * 140, 96 + Math.sin(t * 2) * 140);
      g.stroke();
      R(g, 'rgba(10,26,58,0.85)', 8, 24, 92, 14);
      T(g, '#ffffff', 8, line === 1 ? 'TOMORROW 6 PM' : 'TOMORROW 9 PM', 54, 34, { bold: true, align: 'center' });
      if (line === 2) {
        var on = Math.floor(t * 3) % 2;
        R(g, on ? '#d9201a' : '#a01010', 40, 104, 176, 18);
        bolt(g, 48, 105, 1, '#ffd23a');
        T(g, '#ffffff', 10, 'POWER OUTAGES POSSIBLE', 132, 117, { bold: true, align: 'center' });
      }
    } else {
      // the five days
      R(g, 'rgba(10,26,58,0.9)', 0, 24, W, 102);
      ['TUE', 'WED', 'THU', 'FRI', 'SAT'].forEach(function (d, i) {
        var x0 = 8 + i * 49;
        R(g, i === 1 ? 'rgba(200,40,40,0.35)' : 'rgba(255,255,255,0.08)', x0, 30, 45, 90);
        T(g, '#ffffff', 9, d, x0 + 22, 44, { bold: true, align: 'center' });
        if (i === 4) C(g, '#ffd23a', x0 + 22, 66, 9);
        else {
          cloud(g, x0 + 10, 66, 1, i === 0 ? '#c8ccd8' : '#7a7e8a');
          if (i === 1 || i === 2) bolt(g, x0 + 20, 70, 0.9, '#ffd23a');
          if (i >= 1 && i <= 3) for (var r = 0; r < 4; r++) R(g, '#6ab0ff', x0 + 10 + r * 5, 76 + ((t * 20 + r * 3) % 8), 1, 4);
        }
        T(g, '#ffffff', 11, [48, 52, 47, 45, 50][i] + '', x0 + 22, 104, { bold: true, align: 'center' });
        T(g, '#9fc3ff', 8, [36, 41, 38, 33, 31][i] + '', x0 + 22, 114, { align: 'center' });
      });
    }
    // the weatherman, at the edge of the map, pointing
    bust(g, 228, 132, 1.25, WEATHERMAN, true, t);
    var reach = Math.sin(t * 1.2) * 4;
    g.strokeStyle = WEATHERMAN.suit;
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(212, 112);
    g.lineTo(196 + reach, 96);
    g.stroke();
    C(g, WEATHERMAN.skin, 194 + reach, 95, 3);
    R(g, '#1d3d74', 0, 0, W, 18);
    R(g, '#d9a01a', 0, 0, 6, 18);
    T(g, '#ffffff', 10, 'FIRST WARNING WEATHER', 12, 13, { bold: true });
    T(g, '#d9a01a', 10, '48', 166, 13, { bold: true });
    ticker(g, t, 'STORM WATCH: TOMORROW 6 PM - FRIDAY   *   WINDS TO 45 MPH   *   CHARGE YOUR PHONES   *   KEEP A FLASHLIGHT HANDY', 132, 12, '#0a1428', '#ffffff', 30);
  }

  // ---- the emergency alert --------------------------------------------------------------------------------------
  function alert(g, t) {
    R(g, '#050505', 0, 0, W, H);
    var on = Math.floor(t * 2) % 2;
    R(g, on ? '#c81010' : '#8a0a0a', 0, 0, W, 22);
    R(g, on ? '#c81010' : '#8a0a0a', 0, 112, W, 32);
    T(g, '#ffffff', 13, 'EMERGENCY ALERT SYSTEM', 128, 16, { bold: true, align: 'center' });
    // a composite sketch: pencil on grey paper
    R(g, '#b8b4a8', 18, 30, 64, 76);
    g.strokeStyle = '#2a2a2a';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(32, 104);
    g.lineTo(36, 72);
    g.quadraticCurveTo(34, 44, 50, 40);
    g.quadraticCurveTo(66, 44, 64, 72);
    g.lineTo(68, 104);
    g.stroke();
    E(g, '#2a2a2a', 50, 62, 10, 13); // the shadow inside the hood
    E(g, '#8a8680', 50, 66, 6, 8); // the face, mostly not there
    C(g, '#e8e4d8', 47, 63, 1.1);
    C(g, '#e8e4d8', 53, 63, 1.1);
    g.strokeStyle = '#3a3a3a';
    g.beginPath();
    g.moveTo(45, 69);
    g.quadraticCurveTo(50, 72, 55, 69); // a smile
    g.stroke();
    for (var i = 0; i < 18; i++) R(g, 'rgba(40,40,40,0.25)', 24 + ((i * 13) % 52), 34 + ((i * 17) % 70), 6, 1);
    T(g, '#ffffff', 8, 'ADVISORY:  ROUTE 9 AREA', 92, 40, { bold: true });
    T(g, '#ffd23a', 8, 'PROWLER IN OCCUPIED HOMES', 92, 54, { bold: true });
    T(g, '#ffffff', 7, 'TALL ADULT', 92, 68);
    T(g, '#ffffff', 7, 'DARK HOODED SWEATSHIRT', 92, 79);
    T(g, '#ffffff', 7, 'SECURE DOORS, WINDOWS, VENTS', 92, 90);
    T(g, '#ff6a6a', 8, 'DO NOT APPROACH', 92, 103, { bold: true });
    ticker(g, t, "THE SHERIFF'S OFFICE HAS ISSUED AN ADVISORY FOR THE ROUTE 9 AREA   *   A PROWLER HAS BEEN REPORTED INSIDE OCCUPIED HOMES   *   THIS MESSAGE WILL NOT BE REPEATED", 120, 16, 'rgba(0,0,0,0)', '#ffffff', 40);
  }

  // ---- the black screen, and what it reflects ------------------------------------------------------------------
  function black(g) {
    R(g, '#030304', 0, 0, W, H);
  }
  function darkRoom(g) {
    g.fillStyle = grad(g, 0, 0, 0, H, [[0, '#0e1013'], [1, '#08090b']]);
    g.fillRect(0, 0, W, H);
    R(g, '#141820', 0, 96, W, 48); // the floor
  }
  // night one: the room behind you, and somebody standing behind the couch with his head tilted over
  function reflection(g) {
    darkRoom(g);
    R(g, '#1a1f28', 186, 14, 46, 34); // the window
    R(g, '#0e1013', 207, 14, 3, 34);
    poly(g, '#20242a', [50, 40, 62, 40, 66, 52, 46, 52]); // the lamp
    R(g, '#16191e', 55, 52, 2, 46);
    R(g, '#1c2026', 30, 74, 190, 30); // the couch back, where you are not sitting
    R(g, '#22272e', 30, 74, 190, 4);
    // him
    g.save();
    g.translate(140, 30);
    g.rotate(0.32);
    E(g, '#040405', 0, 0, 12, 15); // the hood, tilted
    E(g, '#5c5a54', 1, 4, 6, 8); // a pale face in it
    C(g, '#141414', -1.5, 2, 1.1);
    C(g, '#141414', 3.5, 2, 1.1);
    g.restore();
    poly(g, '#040405', [118, 46, 168, 50, 172, 76, 114, 76]); // his shoulders, above the couch
    R(g, '#040405', 110, 52, 7, 26);
    R(g, '#040405', 167, 54, 7, 24);
    R(g, 'rgba(255,255,255,0.025)', 0, 0, W, H);
  }
  // night two: the slider behind you, open, the storm's grey light in it, and somebody standing there
  function slider(g) {
    darkRoom(g);
    R(g, '#1c2026', 20, 80, 120, 24); // the couch back
    R(g, '#3a4250', 120, 10, 70, 92); // the open slider
    R(g, '#2a3038', 190, 10, 30, 92); // the pane it slid behind
    R(g, '#4a5260', 120, 10, 70, 6);
    for (var i = 0; i < 18; i++) R(g, 'rgba(200,210,230,0.18)', 124 + ((i * 23) % 64), 18 + ((i * 41) % 80), 1, 7);
    g.save();
    g.translate(152, 30);
    g.rotate(0.3);
    E(g, '#030304', 0, 0, 10, 13);
    E(g, '#55534e', 1, 3, 5, 7);
    g.restore();
    poly(g, '#030304', [136, 42, 168, 44, 170, 100, 134, 100]); // too tall, too narrow
    R(g, '#030304', 129, 46, 6, 46);
    R(g, '#030304', 169, 48, 6, 46);
  }

  // ---- late night: storm coverage (on when the house turns the TV on by itself) ---------------------------------
  function storm(g, t) {
    R(g, '#0a1a3a', 0, 0, W, H);
    countyMap(g);
    radar(g, 120, 90, 1.6, t);
    var on = Math.floor(t * 2) % 2;
    R(g, on ? '#d9201a' : '#a01010', 0, 0, W, 18);
    T(g, '#ffffff', 11, 'STORM WATCH   LIVE', 128, 13, { bold: true, align: 'center' });
    R(g, 'rgba(10,26,58,0.9)', 8, 24, 96, 26);
    T(g, '#ffd23a', 8, 'OUTAGES', 14, 35, { bold: true });
    T(g, '#ffffff', 10, '2,140', 14, 46, { bold: true });
    ticker(g, t, 'POWER OUTAGES REPORTED ALONG ROUTE 9   *   STAY INDOORS   *   DO NOT OPEN YOUR DOOR TO STRANGERS   *   THE SHERIFF\'S OFFICE ADVISORY REMAINS IN EFFECT', 130, 12, '#0a1428', '#ffd23a', 34);
  }

  // the screen itself: scanlines, a little grain, darker corners
  function crt(g, t) {
    g.fillStyle = 'rgba(0,0,0,0.16)';
    for (var y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
    for (var i = 0; i < 70; i++) {
      var v = (Math.random() * 255) | 0;
      g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',0.18)';
      g.fillRect((Math.random() * W) | 0, (Math.random() * H) | 0, 1, 1);
    }
    var vg = g.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = vg;
    g.fillRect(0, 0, W, H);
    // a slow roll bar, like an old set
    var bar = ((t || 0) * 18) % (H + 30) - 15;
    g.fillStyle = 'rgba(255,255,255,0.025)';
    g.fillRect(0, bar, W, 14);
  }

  var SHOWS = { news: news, shop: shop, nature: nature, weather: weather, alert: alert, black: black, reflection: reflection, slider: slider, storm: storm };
  OC.tvShows = {
    W: W,
    H: H,
    ids: Object.keys(SHOWS),
    has: function (id) {
      return !!SHOWS[id];
    },
    draw: function (id, g, t, line, lt) {
      (SHOWS[id] || black)(g, t || 0, line || 0, lt || 0);
      if (id === 'reflection' || id === 'slider') {
        // a reflection in a dead screen is dim: you see it because you are looking, not because it glows
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(0, 0, W, H);
      } else if (id !== 'black') crt(g, t);
    },
    crt: crt,
  };
})();
