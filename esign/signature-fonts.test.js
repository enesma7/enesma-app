/* Typed signatures use only the three bundled script faces, loaded through FontFace, never a plain or system fallback. */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
var css = fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8');
var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
['GreatVibes', 'Allura', 'Sacramento'].forEach(function (file, i) {
  var name = ['Great Vibes', 'Allura', 'Sacramento'][i];
  assert.ok(app.indexOf("family: 'ENESMA " + name + "'") >= 0, name);
  // No CSS @font-face twin: an unused duplicate face kept document.fonts.check() false.
  assert.ok(css.indexOf("font-family:'ENESMA " + name + "'") < 0, name + ' must not be declared in CSS');
  var woff2 = fs.readFileSync(path.join(__dirname, 'assets', file + '-Regular.woff2'));
  assert.strictEqual(woff2.slice(0, 4).toString('latin1'), 'wOF2', file + ' woff2');
  assert.ok(woff2.length > 10000 && woff2.length < 150000, file + ' woff2 size');
  var ttf = fs.readFileSync(path.join(__dirname, 'assets', file + '-Regular.ttf'));
  assert.ok(['\x00\x01\x00\x00', 'OTTO', 'true'].indexOf(ttf.slice(0, 4).toString('latin1')) >= 0, file + ' ttf');
  assert.ok(app.indexOf("file: 'assets/" + file + "-Regular.woff2'") >= 0, file + ' woff2 src');
  assert.ok(app.indexOf("ttf: 'assets/" + file + "-Regular.ttf'") >= 0, file + ' ttf src');
});
assert.strictEqual((app.match(/family: 'ENESMA /g) || []).length, 3);
// No generic or system cursive fallback anywhere in the signature path.
assert.ok(app.indexOf('SYSTEM_CURSIVE') < 0);
assert.ok(app.indexOf('fontsCheck_') < 0);
assert.ok(!/paintTyped\([^)]/.test(app), 'paintTyped takes no fallback font');
assert.ok(!/['"]\s*,\s*cursive/.test(app), 'no cursive fallback stack');
assert.ok(app.indexOf('sigFontRenders') >= 0);
assert.ok(app.indexOf("if (!sigFontRenders(family, t)) throw") >= 0, 'Adopt re-verifies the face before painting');
assert.ok(app.indexOf('setTimeout(preloadSigFonts, 0)') >= 0, 'fonts preload at boot');
assert.ok(app.indexOf("'Loading Signature Styles…'") >= 0);
assert.ok(app.indexOf('Choose Draw To Sign') >= 0);
assert.ok(app.indexOf("mode !== 'type'") >= 0);
assert.ok(css.indexOf('.dochead{white-space:pre-line}') >= 0);
assert.ok(html.indexOf('app.js?v=19') >= 0);
assert.ok(html.indexOf('app.css?v=12') >= 0);
assert.ok(app.indexOf("class: 'err' }, 'The signed PDF could not be filed") >= 0);
console.log('esign signature font checks passed');
