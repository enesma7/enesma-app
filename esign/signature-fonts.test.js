/* Signature font choices are three local cursive files, with no serif fallback in the typed preview. */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
var css = fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8');
['Great Vibes', 'Allura', 'Sacramento'].forEach(function (name) {
  assert.ok(app.indexOf("family: 'ENESMA " + name + "'") >= 0, name);
  assert.ok(css.indexOf("font-family:'ENESMA " + name + "'") >= 0, name);
  var file = name === 'Great Vibes' ? 'GreatVibes-Regular.ttf' : name + '-Regular.ttf';
  var buf = fs.readFileSync(path.join(__dirname, 'assets', file));
  assert.ok(buf.length > 1000, file);
  assert.strictEqual(buf.slice(0, 4).toString('latin1') === '\x00\x01\x00\x00' || buf.slice(0, 4).toString('latin1') === 'OTTO' || buf.slice(0, 4).toString('latin1') === 'true', true);
});
assert.strictEqual((app.match(/family: 'ENESMA /g) || []).length, 3);
assert.ok(app.indexOf("'Great Vibes',cursive") < 0);
assert.ok(css.indexOf("font-family:'Great Vibes',cursive") < 0);
assert.ok(app.indexOf('fontIsCursive') >= 0);
assert.ok(app.indexOf("mode !== 'type'") >= 0);
assert.ok(css.indexOf('.dochead{white-space:pre-line}') >= 0);
var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert.ok(html.indexOf('app.js?v=15') >= 0);
assert.ok(app.indexOf("class: 'err' }, 'The signed PDF could not be filed") >= 0);
assert.ok(html.indexOf('app.css?v=10') >= 0);
console.log('esign signature font checks passed');
