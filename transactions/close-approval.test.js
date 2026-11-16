/* Close request emails, decline, and congratulations. Synthetic files only. */
'use strict';
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var window = {};
var context = { window: window, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/mock.js', 'utf8'), context);
var mock = context.window.TC_MOCK;
var app = fs.readFileSync(__dirname + '/app.js', 'utf8');
assert.ok(app.indexOf('>Decline Close<') >= 0);
assert.ok(app.indexOf('>Close Declined<') >= 0);
assert.ok(app.indexOf("api('declineClose'") >= 0);
assert.ok(app.indexOf('A note is required.') >= 0);

function raw(body) { return mock.call(body); }
function call(body) {
  return raw(body).then(function (r) {
    if (!r.ok) { var e = new Error(r.error); e.code = r.code; throw e; }
    return r.data;
  });
}

call({ action: 'login', email: 'agent@demo.test', password: 'demo' }).then(function (agent) {
  var at = agent.token, id;
  return call({ action: 'dashboard', token: at }).then(function (dash) {
    var open = (dash.transactions || []).filter(function (t) { return /Canyon Crest/.test(t.title || '') && t.status !== 'Closed'; })[0];
    assert.ok(open);
    id = open.id;
    var before = open.status;
    return call({ action: 'setStatus', token: at, id: id, status: 'Closed', closeDate: '2026-12-31', finalPrice: '615000' }).then(function (held) {
      assert.strictEqual(held.pendingClose, true);
      assert.strictEqual(held.status, before);
      assert.strictEqual(held.emailedTo.join(','), 'admin@demo.test');
      assert.ok(held.previewHtml.indexOf('Close Requested') >= 0);
      assert.ok(held.previewHtml.indexOf('Approve Or Decline') >= 0);
      assert.ok(held.previewHtml.indexOf('615,000') >= 0);
      return raw({ action: 'declineClose', token: at, id: id, note: 'Missing the closing statement.' });
    });
  }).then(function (denied) {
    assert.strictEqual(denied.ok, false);
    assert.strictEqual(denied.code, 'FORBIDDEN');
    return call({ action: 'login', email: 'admin@demo.test', password: 'demo' });
  }).then(function (admin) {
    var token = admin.token;
    return raw({ action: 'declineClose', token: token, id: id, note: '   ' }).then(function (empty) {
      assert.strictEqual(empty.ok, false);
      assert.strictEqual(empty.code, 'BAD_REQUEST');
      return call({ action: 'declineClose', token: token, id: id, note: 'The closing statement is still missing.' });
    }).then(function (declined) {
      assert.strictEqual(declined.status, 'In Escrow');
      assert.strictEqual(declined.closeRequest.state, 'declined');
      assert.strictEqual(declined.closeRequest.note, 'The closing statement is still missing.');
      assert.strictEqual(declined.emailedTo.join(','), 'agent@demo.test');
      assert.ok(declined.previewHtml.indexOf('Close Declined') >= 0);
      assert.ok(declined.previewHtml.indexOf('closing statement') >= 0);
      return call({ action: 'getTransaction', token: token, id: id });
    }).then(function (file) {
      assert.strictEqual(file.txn.status, 'In Escrow');
      assert.strictEqual(file.txn.closeRequest.state, 'declined');
      return call({ action: 'setStatus', token: at, id: id, status: 'Closed', closeDate: '2026-12-31', finalPrice: '615000' });
    }).then(function (again) {
      assert.strictEqual(again.pendingClose, true);
      assert.strictEqual(again.emailedTo.join(','), 'admin@demo.test');
      return call({ action: 'approveClose', token: token, id: id });
    }).then(function (closed) {
      assert.strictEqual(closed.status, 'Closed');
      assert.strictEqual(closed.closedAt, '2026-12-31');
      assert.ok(closed.retentionUntil);
      assert.ok(closed.emailedTo.indexOf('agent@demo.test') >= 0);
      assert.ok(closed.emailedTo.indexOf('admin@demo.test') >= 0);
      assert.strictEqual(closed.emailedTo.length, 2);
      assert.ok(closed.previewHtml.indexOf('Congratulations On Your Closing') >= 0);
      return call({ action: 'getTransaction', token: token, id: id });
    }).then(function (file) {
      assert.strictEqual(file.txn.status, 'Closed');
      assert.strictEqual(file.txn.closedAt, '2026-12-31');
      console.log('close approval checks passed');
    });
  });
}).catch(function (e) { console.error(e); process.exit(1); });
