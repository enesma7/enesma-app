/* Dual-role CDA signers. No network, no envelopes, no mail. Run: node transactions/esign-recipients.test.js */
'use strict';
var assert = require('assert');
var fs = require('fs');
var R = require('./esign-recipients.js');
var SAME = 'signer@enesmabroker.com';
var OTHER = 'broker@enesmabroker.com';

function cdaPair(emailA, emailB, roleA, roleB) {
  return [
    { key: 'agent', name: 'Alex Agent', email: emailA, roleLabel: roleA === undefined ? 'Agent' : roleA, order: 1 },
    { key: 'owner', name: 'Alex Broker', email: emailB, roleLabel: roleB === undefined ? 'Broker' : roleB, order: 2 }
  ];
}
function rowsFrom(recs) {
  return recs.map(function (r, i) {
    return { id: 'R' + (i + 1), status: 'created', email: r.email, roleLabel: r.roleLabel, ord: r.ord, key: r.key, name: r.name };
  });
}

var dual = R.prepareRecipients(cdaPair(SAME, SAME), 'sequential');
assert.strictEqual(dual.length, 2);
assert.strictEqual(dual[0].email, SAME);
assert.strictEqual(dual[1].email, SAME);
assert.notStrictEqual(dual[0].key, dual[1].key);
assert.strictEqual(dual[0].roleLabel, 'Agent');
assert.strictEqual(dual[1].roleLabel, 'Broker');
assert.strictEqual(dual[0].ord, 1);
assert.strictEqual(dual[1].ord, 2);
assert.notStrictEqual(R.signerSlot(dual[0].email, dual[0].roleLabel), R.signerSlot(dual[1].email, dual[1].roleLabel));

var fields = R.bindFields(rowsFrom(dual), [
  { type: 'signature', recipient: 'agent' },
  { type: 'date', recipient: 'agent' },
  { type: 'signature', recipient: 'owner' },
  { type: 'date', recipient: 'owner' }
]);
assert.deepStrictEqual(fields.map(function (f) { return f.recipient + ':' + f.type; }), ['R1:signature', 'R1:date', 'R2:signature', 'R2:date']);

var live = rowsFrom(dual);
assert.throws(function () { R.signRecipient(live, 1, 'R2'); }, function (e) { return e.code === 'NOT_YET'; });
assert.strictEqual(live[0].status, 'created');
assert.strictEqual(live[1].status, 'created');
var first = R.signRecipient(live, 1, 'R1');
assert.strictEqual(live[0].status, 'signed');
assert.strictEqual(live[1].status, 'created');
assert.strictEqual(first.allSigned, false);
assert.strictEqual(first.currentOrder, 2);
assert.deepStrictEqual(first.inviteIds, ['R2']);
var second = R.signRecipient(live, first.currentOrder, 'R2');
assert.strictEqual(second.allSigned, true);
assert.strictEqual(live[0].status, 'signed');
assert.strictEqual(live[1].status, 'signed');
assert.throws(function () { R.signRecipient(live, 2, 'R1'); }, function (e) { return e.code === 'DONE'; });

assert.throws(function () { R.prepareRecipients(cdaPair(SAME, SAME, 'Agent', 'Agent'), 'sequential'); }, function (e) {
  return e.code === 'BAD_REQUEST' && /listed twice for the same role/.test(e.message) && e.message.indexOf(SAME) === 0;
});
assert.throws(function () { R.prepareRecipients(cdaPair(SAME, SAME, 'Agent', ' agent '), 'sequential'); }, function (e) {
  return /listed twice for the same role/.test(e.message);
});
assert.throws(function () { R.prepareRecipients(cdaPair(SAME, SAME, '', ''), 'sequential'); }, function (e) {
  return /listed twice for the same role/.test(e.message);
});
assert.throws(function () {
  R.prepareRecipients([
    { key: 'agent', name: 'A', email: SAME, roleLabel: 'Agent', order: 1 },
    { key: 'agent', name: 'B', email: OTHER, roleLabel: 'Broker', order: 2 }
  ], 'sequential');
}, function (e) { return /own key/.test(e.message); });

var distinct = R.prepareRecipients(cdaPair(SAME, OTHER), 'sequential');
assert.strictEqual(distinct[0].email, SAME);
assert.strictEqual(distinct[1].email, OTHER);
assert.strictEqual(distinct[0].ord, 1);
assert.strictEqual(distinct[1].ord, 2);

var parallel = R.prepareRecipients([
  { key: 'agent', name: 'A', email: SAME, roleLabel: 'Agent', order: 5 },
  { key: 'owner', name: 'B', email: SAME, roleLabel: 'Broker', order: 9 }
], 'parallel');
assert.strictEqual(parallel[0].ord, 1);
assert.strictEqual(parallel[1].ord, 1);
var both = rowsFrom(parallel);
var one = R.signRecipient(both, 1, 'R1');
assert.strictEqual(both[1].status, 'created');
assert.strictEqual(one.allSigned, false);
assert.deepStrictEqual(one.inviteIds, []);
R.signRecipient(both, one.currentOrder, 'R2');
assert.strictEqual(both[0].status, 'signed');
assert.strictEqual(both[1].status, 'signed');

var book = rowsFrom(dual);
assert.strictEqual(R.emailTakenForRole(book, 'R2', SAME, 'Broker'), false);
assert.strictEqual(R.emailTakenForRole(book, 'R2', SAME, 'Agent'), true);
assert.strictEqual(R.emailTakenForRole(book, 'R1', OTHER, 'Agent'), false);
assert.strictEqual(R.emailTakenForRole(book, 'new', SAME, 'Agent'), true);
assert.strictEqual(R.emailTakenForRole(book, 'new', SAME, 'Broker'), true);
assert.strictEqual(R.emailTakenForRole(book, 'new', SAME, 'Witness'), false);

var ui = fs.readFileSync(__dirname + '/cda-ui.js', 'utf8');
assert.ok(ui.indexOf("key: 'agent'") >= 0 && ui.indexOf("roleLabel: 'Agent'") >= 0);
assert.ok(ui.indexOf("key: 'owner'") >= 0 && ui.indexOf("roleLabel: 'Broker'") >= 0);
assert.ok(ui.indexOf('order: 1') >= 0 && ui.indexOf('order: 2') >= 0);
assert.ok(ui.indexOf('listed twice') < 0);

console.log('esign recipient dual-role checks passed');
