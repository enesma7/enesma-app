/* Missing Only is a checklist view filter. Run: node transactions/missing-only.test.js */
'use strict';
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var app = fs.readFileSync(__dirname + '/app.js', 'utf8');
var css = fs.readFileSync(__dirname + '/app.css', 'utf8');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');

assert.ok(html.indexOf('app.js?v=52') >= 0);
assert.ok(html.indexOf('app.css?v=51') >= 0);
assert.ok(app.indexOf('role="switch"') >= 0);
assert.ok(app.indexOf('aria-checked') >= 0);
assert.ok(app.indexOf('aria-label="Missing Only"') >= 0);
assert.ok(app.indexOf('>Missing Only<') >= 0);
assert.ok(app.indexOf('All Required Files Approved') >= 0);
assert.ok(app.indexOf("MISS_ONLY_KEY = 'tc_missing_only'") >= 0);
assert.ok(app.indexOf('localStorage.getItem(MISS_ONLY_KEY)') >= 0);
assert.ok(app.indexOf('localStorage.setItem(MISS_ONLY_KEY') >= 0);
assert.ok(app.indexOf('act = act.filter(checklistItemMissing)') >= 0);
var filterAt = app.indexOf('act = act.filter(checklistItemMissing)');
var eachAt = app.indexOf('act.forEach(function (it)', filterAt);
assert.ok(filterAt > 0 && eachAt > filterAt, 'missing items are chosen before section headings are emitted');
assert.ok(app.indexOf("p.approved + ' of ' + p.required + ' required approved") >= 0);
assert.ok(css.indexOf('.tabs button.missw') >= 0);
assert.ok(css.indexOf('.missw[aria-checked="true"]') >= 0);
assert.ok(css.indexOf('.missw-lab{color:var(--k);text-transform:none}') >= 0);
assert.ok(css.indexOf('@media(max-width:640px)') >= 0);
assert.ok(css.indexOf('.tabs .tabbtns{flex:1 0 100%;position:relative}') >= 0);
assert.ok(css.indexOf('.tabs button.missw{margin:0 0 0 auto;align-self:flex-end}') >= 0);

var pred = app.match(/function checklistItemMissing\(it\) \{ return ([^;]+); \}/);
assert.ok(pred, 'checklistItemMissing is a one-line predicate');
var checklistItemMissing = new Function('it', 'return ' + pred[1] + ';');

assert.strictEqual(checklistItemMissing({ req: true, status: 'Missing' }), true);
assert.strictEqual(checklistItemMissing({ req: true, status: 'Pending' }), true, 'uploaded and awaiting review is missing');
assert.strictEqual(checklistItemMissing({ req: true, status: 'Rejected' }), true);
assert.strictEqual(checklistItemMissing({ req: true, status: 'Approved' }), false);
assert.strictEqual(checklistItemMissing({ req: false, status: 'Missing' }), false);
assert.strictEqual(checklistItemMissing({ req: false, status: 'Pending' }), false);
assert.strictEqual(checklistItemMissing({ req: false, status: 'Rejected' }), false);
assert.strictEqual(checklistItemMissing({ req: false, status: 'Approved' }), false);
assert.strictEqual(checklistItemMissing({ req: true, status: '' }), true);

var window = {};
var context = { window: window, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/mock.js', 'utf8'), context);
var mock = context.window.TC_MOCK;
function call(body) {
  return mock.call(body).then(function (r) {
    if (!r.ok) { var e = new Error(r.error); e.code = r.code; throw e; }
    return r.data;
  });
}
var CATS = ['Listing Documents', 'Buyer Representation', 'Sales Documentation', 'Escrow Documentation', 'Disclosures', 'Misc', 'Reports and Invoices', 'Closing Documents'];
function itemCat(it) {
  if (it.misc) return 'Misc';
  if (it.cancel) return 'Cancellation';
  var c = String(it.forms || '').split(' · ')[0].trim();
  return CATS.indexOf(c) >= 0 ? c : '';
}
function headingsFor(items) {
  var out = [], lastPhase = null, lastCat = null;
  items.forEach(function (it) {
    var ph = it.phase;
    if (ph !== lastPhase) { out.push('phase:' + ph); lastPhase = ph; lastCat = null; }
    var cat = itemCat(it);
    if (cat && cat !== lastCat) { out.push('cat:' + cat); lastCat = cat; }
  });
  return out;
}

call({ action: 'login', email: 'admin@demo.test', password: 'demo' }).then(function (admin) {
  return call({ action: 'search', token: admin.token, q: 'Canyon Crest' }).then(function (found) {
    var hit = found.results.filter(function (t) { return /88 Canyon Crest/.test(t.title || ''); })[0];
    assert.ok(hit, 'demo purchase');
    return call({ action: 'getTransaction', token: admin.token, id: hit.id });
  }).then(function (d) {
    var progress = JSON.stringify(d.txn.progress);
    var active = d.items.filter(function (it) { return it.active; });
    var visible = active.filter(checklistItemMissing);
    assert.ok(visible.length > 0 && visible.length < active.length);
    assert.ok(visible.every(function (it) { return it.req && it.status !== 'Approved'; }));
    assert.ok(visible.some(function (it) { return it.status === 'Pending'; }), 'awaiting review stays visible');
    assert.ok(visible.some(function (it) { return it.status === 'Missing'; }));
    assert.ok(!visible.some(function (it) { return it.status === 'Approved' || !it.req; }));
    var allHeads = headingsFor(active);
    var visHeads = headingsFor(visible);
    assert.ok(allHeads.indexOf('cat:Buyer Representation') >= 0);
    assert.ok(visHeads.indexOf('cat:Buyer Representation') < 0, 'approved-only section heading is omitted');
    assert.ok(visHeads.indexOf('cat:Sales Documentation') >= 0);
    assert.strictEqual(JSON.stringify(d.txn.progress), progress, 'filtering does not change progress');
    var statuses = {};
    active.forEach(function (it) {
      if (!checklistItemMissing(it)) return;
      statuses[it.status] = true;
    });
    assert.deepStrictEqual(Object.keys(statuses).sort(), ['Missing', 'Pending']);
    return call({ action: 'search', token: admin.token, q: 'Vista Del Mar' });
  }).then(function (found) {
    return call({ action: 'getTransaction', token: admin.token, id: found.results[0].id });
  }).then(function (d) {
    var rejected = d.items.filter(function (it) { return it.active && it.status === 'Rejected'; });
    assert.ok(rejected.length >= 1);
    assert.ok(rejected.every(checklistItemMissing), 'Rejected required items count as missing');
    var before = rejected.map(function (it) { return it.status + ':' + it.req; }).join('|');
    rejected.filter(checklistItemMissing);
    assert.strictEqual(rejected.map(function (it) { return it.status + ':' + it.req; }).join('|'), before);
  });
}).then(function () {
  console.log('missing-only.test.js ok');
}).catch(function (e) {
  console.error(e);
  process.exit(1);
});
