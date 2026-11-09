/* CRM note delete: author or admin, enforced by the action. Synthetic clients only. */
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
assert.ok(app.indexOf('Delete This Note?') >= 0);
assert.ok(app.indexOf('>Delete Note<') >= 0);
assert.ok(app.indexOf("api('crmDeleteNote'") >= 0);
assert.ok(app.indexOf('n.canDelete === true') >= 0);

function raw(body) { return mock.call(body); }
function call(body) {
  return raw(body).then(function (r) {
    if (!r.ok) { var e = new Error(r.error); e.code = r.code; throw e; }
    return r.data;
  });
}

call({ action: 'login', email: 'admin@demo.test', password: 'demo' }).then(function (admin) {
  var token = admin.token;
  return call({ action: 'crmGetClient', token: token, id: 'C2' }).then(function (g) {
    assert.strictEqual(g.notes.length, 2);
    assert.ok(g.notes.every(function (n) { return n.canDelete === true && n.id; }));
    var theirs = g.notes.filter(function (n) { return n.userId === 'U2'; })[0];
    return call({ action: 'crmDeleteNote', token: token, id: theirs.id }).then(function () {
      return call({ action: 'crmGetClient', token: token, id: 'C2' });
    });
  }).then(function (g) {
    assert.strictEqual(g.notes.length, 1);
    assert.strictEqual(g.notes[0].userId, 'U1');
    return call({ action: 'login', email: 'agent@demo.test', password: 'demo' });
  }).then(function (agent) {
    var at = agent.token;
    return call({ action: 'crmGetClient', token: at, id: 'C2' }).then(function (g) {
      var own = g.notes.filter(function (n) { return n.canDelete; });
      var locked = g.notes.filter(function (n) { return !n.canDelete; });
      assert.strictEqual(own.length, 0);
      assert.strictEqual(locked.length, 1);
      assert.strictEqual(locked[0].userId, 'U1');
      return raw({ action: 'crmDeleteNote', token: at, id: locked[0].id }).then(function (denied) {
        assert.strictEqual(denied.ok, false);
        assert.strictEqual(denied.code, 'FORBIDDEN');
        return call({ action: 'crmAddNote', token: at, clientId: 'C2', text: 'Agent note on the sample file.' });
      });
    }).then(function (added) {
      assert.strictEqual(added.note.canDelete, true);
      assert.strictEqual(added.note.userId, 'U2');
      return call({ action: 'crmDeleteNote', token: at, id: added.note.id }).then(function () {
        return raw({ action: 'crmDeleteNote', token: at, id: added.note.id });
      });
    }).then(function (again) {
      assert.strictEqual(again.ok, false);
      assert.strictEqual(again.code, 'NOT_FOUND');
      return raw({ action: 'crmDeleteNote', token: at, id: 'CN1' });
    }).then(function (other) {
      assert.strictEqual(other.ok, false);
      assert.strictEqual(other.code, 'NOT_FOUND');
      return call({ action: 'crmGetClient', token: token, id: 'C1' });
    }).then(function (still) {
      assert.ok(still.notes.some(function (n) { return n.id === 'CN1'; }));
      console.log('crm note delete checks passed');
    });
  });
}).catch(function (e) { console.error(e); process.exit(1); });
