/* Spouse/Partner fields stay on the owning agent's client. Synthetic records only. */
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
assert.ok(app.indexOf('>Spouse/Partner<') >= 0);
assert.ok(app.indexOf('Spouse/Partner First Name') >= 0);
assert.ok(app.indexOf('spouseFirstName || \'\'') >= 0);
assert.ok(app.indexOf('if (!bits.length) return \'\'') >= 0);

function raw(body) { return mock.call(body); }
function call(body) {
  return raw(body).then(function (r) {
    if (!r.ok) { var e = new Error(r.error); e.code = r.code; throw e; }
    return r.data;
  });
}

var csv = [
  'First Name,Last Name,Phone,Email,Spouse First Name,Spouse/Partner Last Name,Partner Phone,SPOUSE EMAIL',
  'Mina,Ortiz,951-555-0177,mina.ortiz.sample@example.test,Sam,Ortiz,951-555-0178,sam.ortiz.sample@example.test',
  'Bad,Row,951-555-0179,bad.row.sample@example.test,Jo,Row,12,not-an-email'
].join('\n');

call({ action: 'login', email: 'agent@demo.test', password: 'demo' }).then(function (agent) {
  return raw({ action: 'crmGetClient', token: agent.token, id: 'C1' }).then(function (hidden) {
    assert.strictEqual(hidden.ok, false);
    return call({ action: 'crmGetClient', token: agent.token, id: 'C2' });
  }).then(function (own) {
    assert.strictEqual(own.client.spouseFirstName, '');
    assert.strictEqual(own.client.ownerId, 'U2');
    return raw({ action: 'crmSaveClient', token: agent.token, id: 'C2', client: { firstName: 'Riley', lastName: 'Chen', phone: '9515550190', email: own.client.email, type: 'seller', status: 'New Lead', spousePhone: '555' } });
  }).then(function (badPhone) {
    assert.strictEqual(badPhone.ok, false);
    assert.strictEqual(badPhone.code, 'BAD_REQUEST');
    return raw({ action: 'crmSaveClient', token: agent.token, id: 'C2', client: { firstName: 'Riley', lastName: 'Chen', phone: '951-555-0190', email: 'riley.chen.longname.client@example.test', type: 'seller', status: 'New Lead', spouseEmail: 'nope' } });
  }).then(function (badEmail) {
    assert.strictEqual(badEmail.ok, false);
    return call({ action: 'crmSaveClient', token: agent.token, id: 'C2', client: { firstName: 'Riley', lastName: 'Chen', phone: '(951) 555-0190', email: 'riley.chen.longname.client@example.test', type: 'seller', status: 'New Lead', spouseFirstName: 'Noah', spouseLastName: 'Chen', spousePhone: '9515550191', spouseEmail: 'noah.chen.sample@example.test' } });
  }).then(function (saved) {
    assert.strictEqual(saved.client.spousePhone, '951-555-0191');
    assert.strictEqual(saved.client.phone, '951-555-0190');
    return call({ action: 'crmImportPreview', token: agent.token, csv: csv });
  }).then(function (preview) {
    assert.strictEqual(preview.labels.spouseFirstName, 'Spouse/Partner First Name');
    assert.strictEqual(preview.headers[preview.mapping.spouseFirstName], 'Spouse First Name');
    assert.strictEqual(preview.headers[preview.mapping.spouseLastName], 'Spouse/Partner Last Name');
    assert.strictEqual(preview.headers[preview.mapping.spousePhone], 'Partner Phone');
    assert.strictEqual(preview.headers[preview.mapping.spouseEmail], 'SPOUSE EMAIL');
    assert.strictEqual(preview.headers[preview.mapping.phone], 'Phone');
    assert.strictEqual(preview.counts['new'], 1);
    assert.strictEqual(preview.counts.invalid, 1);
    return call({ action: 'crmImportCommit', token: agent.token, csv: csv, mapping: preview.mapping });
  }).then(function (done) {
    assert.strictEqual(done.created, 1);
    assert.strictEqual(done.invalid, 1);
    return call({ action: 'crmBoot', token: agent.token });
  }).then(function (boot) {
    var mina = boot.clients.filter(function (c) { return c.email === 'mina.ortiz.sample@example.test'; })[0];
    assert.ok(mina);
    assert.strictEqual(mina.ownerId, 'U2');
    assert.strictEqual(mina.spouseFirstName, 'Sam');
    assert.strictEqual(mina.spouseLastName, 'Ortiz');
    assert.strictEqual(mina.spousePhone, '951-555-0178');
    assert.strictEqual(mina.spouseEmail, 'sam.ortiz.sample@example.test');
    assert.ok(!boot.clients.some(function (c) { return c.ownerId === 'U1'; }));
    return call({ action: 'crmExport', token: agent.token });
  }).then(function (exp) {
    assert.ok(exp.csv.indexOf('Spouse/Partner First Name') >= 0);
    assert.ok(exp.csv.indexOf('Noah') >= 0);
    assert.ok(exp.csv.indexOf('Avery') < 0);
    return call({ action: 'login', email: 'admin@demo.test', password: 'demo' });
  }).then(function (admin) {
    return call({ action: 'crmGetClient', token: admin.token, id: 'C1' });
  }).then(function (adminClient) {
    assert.strictEqual(adminClient.client.spouseFirstName, 'Avery');
    assert.strictEqual(adminClient.client.spouseEmail, 'avery.hale.sample@example.test');
    console.log('spouse checks passed');
  });
}).catch(function (e) { console.error(e); process.exit(1); });
