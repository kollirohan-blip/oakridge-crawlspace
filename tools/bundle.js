// Packs the whole game into one HTML file: every <script src> and the stylesheet inlined, so the file
// runs on its own, offline, from anywhere (a download, a USB stick, a phone's files app).
//   node tools/bundle.js [rootDir] [outFile]
// rootDir defaults to the repo; outFile to dist/oakridge-crawlspace.html.
const fs = require('fs');
const path = require('path');

function bundle(root) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const missing = [];
  // a script's text must not close the <script> it is inlined into
  const safe = (js) => js.replace(/<\/script/gi, '<\\/script');
  html = html.replace(/<script src="([^"]+)"[^>]*><\/script>/g, (tag, src) => {
    if (/^https?:/.test(src)) return tag;
    const file = path.join(root, src);
    if (!fs.existsSync(file)) {
      missing.push(src);
      return tag;
    }
    return '<script>/* ' + src + ' */\n' + safe(fs.readFileSync(file, 'utf8')) + '\n</script>';
  });
  html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (tag, href) => {
    const file = path.join(root, href);
    if (!fs.existsSync(file)) {
      missing.push(href);
      return tag;
    }
    return '<style>\n' + fs.readFileSync(file, 'utf8') + '\n</style>';
  });
  if (missing.length) throw new Error('missing files: ' + missing.join(', '));
  return html;
}

if (require.main === module) {
  const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
  const out = path.resolve(process.argv[3] || path.join(__dirname, '..', 'dist', 'oakridge-crawlspace.html'));
  const html = bundle(root);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
  console.log(out + ' (' + (html.length / 1048576).toFixed(2) + ' MB)');
}

module.exports = { bundle };
