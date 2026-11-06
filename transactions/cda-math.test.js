/* Node check for CDA math and the demo 1.7.1 actions. Run: node transactions/cda-math.test.js */
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

var header = { totalGross: 10000, price: 400000, commission: 2.5, commissionType: 'percent', agentId: 'U1', agentName: 'Enrique Esparza', address: '1 Main', side: 'seller', type: 'purchase' };
var sug = M.fallbackSuggest(header, { id: 'U1', splitPct: 90, capAmount: '' }, 200);
assert.strictEqual(sug.split, 90);
assert.strictEqual(sug.source, 'profile');
var by = {}; sug.lines.forEach(function (l) { by[l.kind] = l; });
assert.strictEqual(by.brokerage.amount, 1000);
assert.strictEqual(by.admin_fee.amount, 200);
assert.strictEqual(by.primary.amount, 8800);
assert.strictEqual(M.sumLines(sug.lines), 10000);
var ex = M.fallbackSuggest(header, { splitPct: '' }, 200);
assert.strictEqual(ex.source, 'example');
assert.strictEqual(ex.split, 90);
var books = M.booksLines(sug.lines.concat([{ kind: 'tc_fee', amount: 150, name: 'TC', agentId: '' }, { kind: 'referral_outside', amount: 50, name: 'Other Co' }, { kind: 'co_list', amount: 100, name: 'Alex', agentId: 'U2' }]));
assert.strictEqual(books.map(function (l) { return l.kind + ':' + l.amount; }).sort().join('|'), 'brokerage:1000|co_list:100|primary:8800');
assert.ok(M.isCdaItem({ code: 'P_CDA_COMMISSION_DISBURSEMENT_' }));
assert.ok(M.isCdaItem({ code: 'CDA' }));
assert.ok(!M.isCdaItem({ code: 'P_INVOICES' }));

function call(body) { return mock.call(body).then(function (r) { if (!r.ok) { var e = new Error(r.error); e.code = r.code; throw e; } return r.data; }); }

call({ action: 'login', email: 'admin@demo.test', password: 'demo' }).then(function (d) {
  var token = d.token;
  return call({ action: 'listTransactions', token: token }).catch(function () { return null; }).then(function () {
    return call({ action: 'dashboard', token: token });
  }).then(function (dash) {
    var closed = (dash.transactions || []).filter(function (t) { return t.status === 'Closed' && /Mission Inn/.test(t.title || t.address || ''); })[0];
    assert.ok(closed, 'closed Mission Inn file');
    return call({ action: 'cdaGet', token: token, txnId: closed.id }).then(function (pack) {
      assert.strictEqual(pack.adminFee, 200);
      assert.ok(pack.header.totalGross > 0);
      var lines = pack.suggested;
      assert.strictEqual(M.sumLines(lines), pack.header.totalGross);
      var admin = lines.filter(function (l) { return l.kind === 'admin_fee'; })[0];
      assert.strictEqual(admin.amount, 200);
      var primary = lines.filter(function (l) { return l.kind === 'primary'; })[0];
      assert.strictEqual(primary.pct, 90);
      return call({ action: 'cdaSaveDraft', token: token, txnId: closed.id, lines: lines }).then(function () {
        return call({ action: 'cdaMarkSent', token: token, txnId: closed.id, envelopeId: 'env-demo' });
      }).then(function (sent) {
        assert.strictEqual(sent.cda.status, 'sent');
        return call({ action: 'cdaSaveDraft', token: token, txnId: closed.id, lines: lines }).then(function () { throw new Error('draft should 409'); }, function (e) { assert.strictEqual(e.code, 'CONFLICT'); });
      }).then(function () {
        return call({ action: 'cdaOnSigned', token: token, txnId: closed.id, envelopeId: 'env-demo', base64: 'QQ==', name: 'CDA-signed.pdf' });
      }).then(function (done) {
        assert.strictEqual(done.cda.status, 'executed');
        assert.ok(done.queued >= 2);
        return call({ action: 'ebCdaPending', token: token });
      }).then(function (q) {
        var kinds = q.pending.map(function (p) { return p.kind; });
        assert.ok(kinds.indexOf('brokerage') >= 0);
        assert.ok(kinds.indexOf('primary') >= 0 || q.pending.some(function (p) { return p.payeeType === 'agent'; }));
        assert.ok(!q.pending.some(function (p) { return p.kind === 'admin_fee' || p.kind === 'tc_fee'; }));
        return call({ action: 'ebCdaDecide', token: token, ids: q.pending.map(function (p) { return p.id; }), decision: 'approve' });
      }).then(function (res) {
        assert.ok(res.approved >= 2);
        var gross = 0;
        return call({ action: 'cdaGet', token: token, txnId: closed.id }).then(function (again) {
          gross = again.header.totalGross;
          return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: closed.id, date: '2026-11-06', checkNumber: '1001', amount: gross });
        });
      }).then(function (chk) {
        assert.strictEqual(chk.escrowCheck.match, true);
        assert.strictEqual(chk.escrowCheck.difference, 0);
        return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: closed.id, date: '2026-11-06', checkNumber: '1002', amount: 1 });
      }).then(function (bad) {
        assert.strictEqual(bad.escrowCheck.match, false);
        return call({ action: 'setAgentSplit', token: token, userId: 'U2', splitPct: 90, capAmount: '', capNote: '' });
      }).then(function (row) {
        assert.strictEqual(row.splitPct, 90);
        console.log('cda-math and demo API checks passed');
      });
    });
  });
}).catch(function (e) { console.error(e); process.exit(1); });
