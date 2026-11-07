/* Admin fee is its own brokerage income row. Synthetic amounts only. */
'use strict';
var assert = require('assert');
var fs = require('fs');
var vm = require('vm');
var window = {};
var context = { window: window, console: console, setTimeout: setTimeout, clearTimeout: clearTimeout };
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/cda-math.js', 'utf8'), context);
vm.runInContext(fs.readFileSync(__dirname + '/mock.js', 'utf8'), context);
var M = context.window.TCCda;
var mock = context.window.TC_MOCK;

function call(body) {
  return mock.call(body).then(function (r) {
    if (!r.ok) { var e = new Error(r.error); e.code = r.code; throw e; }
    return r.data;
  });
}
function rows(entries, txnId) {
  return entries.filter(function (e) { return String(e.importKey || '').indexOf('cda:' + txnId + ':') === 0 && !e.deleted; });
}
function one(list, kind) { return list.filter(function (p) { return p.kind === kind || String(p.importKey || '').indexOf(':' + kind) >= 0; })[0]; }

call({ action: 'login', email: 'admin@demo.test', password: 'demo' }).then(function (admin) {
  var token = admin.token, txnId, brokerAmt, agentAmt, agentPrior = 0;
  return call({ action: 'dashboard', token: token, scope: 'company' }).then(function (dash) {
    txnId = (dash.transactions || []).filter(function (t) { return /Canyon Crest/.test(t.title || '') && t.status !== 'Closed'; })[0].id;
    return call({ action: 'cdaGet', token: token, txnId: txnId });
  }).then(function (pack) {
    var lines = pack.suggested.map(function (l) { return Object.assign({}, l); });
    lines.forEach(function (l) {
      if (l.kind === 'admin_fee') l.amount = 175;
      if (l.kind === 'primary') l.amount = M.round2(l.amount + 25);
    });
    assert.strictEqual(M.sumLines(lines), M.grossOf(pack.header));
    brokerAmt = one(lines, 'brokerage').amount;
    agentAmt = one(lines, 'primary').amount;
    return call({ action: 'cdaSaveDraft', token: token, txnId: txnId, lines: lines });
  }).then(function () {
    return call({ action: 'cdaMarkSent', token: token, txnId: txnId, envelopeId: 'env-fee' });
  }).then(function () {
    return call({ action: 'cdaOnSigned', token: token, txnId: txnId, envelopeId: 'env-fee', base64: 'JVBERi0xLjEK', name: 'CDA-signed.pdf' });
  }).then(function () {
    return call({ action: 'ebCdaPending', token: token });
  }).then(function (q) {
    var mine = q.pending.filter(function (p) { return p.txnId === txnId; });
    var fee = one(mine, 'admin_fee');
    fee.status = 'superseded';
    return call({ action: 'ebCdaPending', token: token });
  }).then(function (q) {
    var fees = q.pending.filter(function (p) { return p.txnId === txnId && p.kind === 'admin_fee'; });
    assert.strictEqual(fees.length, 1);
    assert.strictEqual(fees[0].amount, 175);
    var id = fees[0].id;
    return call({ action: 'ebCdaPending', token: token }).then(function (again) {
      var still = again.pending.filter(function (p) { return p.txnId === txnId && p.kind === 'admin_fee'; });
      assert.strictEqual(still.length, 1);
      assert.strictEqual(still[0].id, id);
      return call({ action: 'ebLoad', token: token });
    }).then(function (book) {
      assert.strictEqual(rows(book.entries, txnId).length, 0);
      var bro = one(q.pending.filter(function (p) { return p.txnId === txnId; }), 'brokerage');
      return call({ action: 'ebCdaDecide', token: token, ids: [id, bro.id], decision: 'approve' });
    });
  }).then(function (res) {
    assert.strictEqual(res.approved, 0);
    assert.ok(res.awaitingDeposit >= 2);
    return call({ action: 'ebLoad', token: token });
  }).then(function (book) {
    assert.strictEqual(rows(book.entries, txnId).length, 0);
    return call({ action: 'setStatus', token: token, id: txnId, status: 'Closed', closeDate: '2026-12-31', finalPrice: '615000' });
  }).then(function () {
    return call({ action: 'eb1099', token: token, year: '2026' });
  }).then(function (before) {
    var prior = (before.payees || []).filter(function (p) { return p.id === 'U2'; })[0];
    agentPrior = prior ? prior.total : 0;
    return call({ action: 'ebCdaPending', token: token });
  }).then(function (q) {
    var agent = q.pending.filter(function (p) { return p.txnId === txnId && p.payeeType === 'agent'; })[0];
    return call({ action: 'ebCdaDecide', token: token, ids: [agent.id], decision: 'approve' });
  }).then(function (res) {
    assert.strictEqual(res.approved, 1);
    return call({ action: 'cdaGet', token: token, txnId: txnId });
  }).then(function (again) {
    return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: txnId, depositDate: '2027-01-04', checkNumber: '77', amount: again.header.totalGross });
  }).then(function () {
    return call({ action: 'cdaGet', token: token, txnId: txnId });
  }).then(function (again) {
    return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: txnId, depositDate: '2027-01-04', checkNumber: '77', amount: again.header.totalGross });
  }).then(function () {
    return call({ action: 'ebLoad', token: token });
  }).then(function (book) {
    var list = rows(book.entries, txnId);
    var fee = list.filter(function (e) { return e.importKey.indexOf(':admin_fee') >= 0; });
    var bro = list.filter(function (e) { return e.importKey.indexOf(':brokerage') >= 0; });
    var ag = list.filter(function (e) { return e.payeeType === 'agent'; });
    assert.strictEqual(fee.length, 1);
    assert.strictEqual(bro.length, 1);
    assert.strictEqual(ag.length, 1);
    assert.strictEqual(fee[0].amount, 175);
    assert.strictEqual(bro[0].amount, brokerAmt);
    assert.strictEqual(ag[0].amount, agentAmt);
    assert.strictEqual(book.categories.filter(function (c) { return c.id === fee[0].categoryId; })[0].name, 'Transaction/Admin Fees');
    return call({ action: 'eb1099', token: token, year: '2026' });
  }).then(function (y) {
    assert.strictEqual(M.round2((y.payees || []).filter(function (p) { return p.id === 'U2'; })[0].total - agentPrior), agentAmt);
    return call({ action: 'cdaRevise', token: token, txnId: txnId, reason: 'Fee correction' });
  }).then(function () {
    return call({ action: 'cdaGet', token: token, txnId: txnId });
  }).then(function (draft) {
    var next = draft.cda.lines.map(function (l) { return Object.assign({}, l); });
    next.forEach(function (l) {
      if (l.kind === 'admin_fee') l.amount = 190;
      if (l.kind === 'primary') l.amount = M.round2(l.amount - 15);
    });
    return call({ action: 'cdaSaveDraft', token: token, txnId: txnId, lines: next });
  }).then(function () {
    return call({ action: 'cdaMarkSent', token: token, txnId: txnId, envelopeId: 'env-fee-2' });
  }).then(function () {
    return call({ action: 'cdaOnSigned', token: token, txnId: txnId, envelopeId: 'env-fee-2', base64: 'JVBERi0xLjEK', name: 'CDA-signed.pdf' });
  }).then(function () {
    return call({ action: 'ebCdaPending', token: token });
  }).then(function (q) {
    var fees = q.pending.filter(function (p) { return p.txnId === txnId && p.kind === 'admin_fee'; });
    assert.strictEqual(fees.length, 1);
    assert.strictEqual(fees[0].op, 'update');
    assert.strictEqual(fees[0].amount, 190);
    return call({ action: 'ebCdaDecide', token: token, ids: [fees[0].id], decision: 'approve' });
  }).then(function () {
    return call({ action: 'ebLoad', token: token });
  }).then(function (book) {
    var fees = rows(book.entries, txnId).filter(function (e) { return e.importKey.indexOf(':admin_fee') >= 0; });
    assert.strictEqual(fees.length, 1);
    assert.strictEqual(fees[0].amount, 190);
    console.log('admin fee income checks passed');
  });
}).catch(function (e) { console.error(e); process.exit(1); });
