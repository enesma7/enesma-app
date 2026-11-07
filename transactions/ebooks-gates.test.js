/* Proves which events create E-Books rows. Agent commission uses the actual escrow
   closing date. Brokerage income uses only a confirmed deposit date. Synthetic data only. */
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
function cdaKeys(entries, txnId) {
  return entries.filter(function (e) { return String(e.importKey || '').indexOf('cda:' + txnId + ':') === 0 && !e.deleted; });
}

var mixed = [
  { kind: 'brokerage', amount: 1000, name: 'ENESMA Realty' },
  { kind: 'primary', amount: 7000, name: 'Alex Rivera', agentId: 'U2' },
  { kind: 'co_list', amount: 400, name: 'Alex Rivera', agentId: 'U2' },
  { kind: 'co_buyer', amount: 250, name: 'Sample Agent', agentId: 'U3' },
  { kind: 'referral_inhouse', amount: 150, name: 'Sample Agent', agentId: 'U3' },
  { kind: 'referral_outside', amount: 500, name: 'Outside Co', agentId: 'U2' },
  { kind: 'tc_fee', amount: 300, name: 'TC Desk' },
  { kind: 'admin_fee', amount: 200, name: 'ENESMA Realty' },
  { kind: 'other', amount: 80, name: 'Courier' },
  { kind: 'credit', amount: 40, name: 'Credit' }
];
var books = M.booksLines(mixed);
var kinds = books.map(function (l) { return l.kind; }).sort();
assert.strictEqual(Array.prototype.join.call(kinds, '|'), 'brokerage|co_buyer|primary');
var alex = books.filter(function (l) { return l.agentId === 'U2'; })[0];
var sample = books.filter(function (l) { return l.agentId === 'U3'; })[0];
assert.strictEqual(alex.amount, 7400);
assert.strictEqual(sample.amount, 400);
assert.ok(!books.some(function (l) { return l.kind === 'referral_outside' || l.kind === 'tc_fee' || l.kind === 'admin_fee' || l.kind === 'other' || l.kind === 'credit'; }));

call({ action: 'login', email: 'admin@demo.test', password: 'demo' }).then(function (admin) {
  var token = admin.token;
  return call({ action: 'dashboard', token: token, scope: 'company' }).then(function (dash) {
    var open = (dash.transactions || []).filter(function (t) { return /Canyon Crest/.test(t.title || t.address || '') && t.status !== 'Closed'; })[0];
    assert.ok(open, 'open Canyon Crest file');
    return call({ action: 'ebLoad', token: token }).then(function (before) {
      var beforeCount = (before.entries || []).length;
      return call({ action: 'cdaGet', token: token, txnId: open.id }).then(function (pack) {
        var lines = pack.suggested.map(function (l) { return Object.assign({}, l); });
        lines.forEach(function (l) { if (l.kind === 'primary') { l.agentId = 'U1'; l.name = 'Enrique Esparza'; } });
        return call({ action: 'cdaSaveDraft', token: token, txnId: open.id, lines: lines }).then(function () {
          return call({ action: 'cdaMarkSent', token: token, txnId: open.id, envelopeId: 'env-canyon' });
        }).then(function () {
          return call({ action: 'cdaOnSigned', token: token, txnId: open.id, envelopeId: 'env-canyon', base64: 'JVBERi0xLjEK', name: 'CDA-signed.pdf' });
        });
      }).then(function (filed) {
        assert.strictEqual(filed.itemStatus, 'Pending');
        assert.ok(filed.queued >= 1);
        return call({ action: 'login', email: 'agent@demo.test', password: 'demo' }).then(function (agent) {
          return call({ action: 'mebLoad', token: agent.token });
        }).then(function (mebOpen) {
          assert.ok(!mebOpen.commission.some(function (c) { return c.txnId === open.id; }));
          return call({ action: 'ebLoad', token: token });
        }).then(function (mid) {
          assert.strictEqual((mid.entries || []).length, beforeCount);
          assert.strictEqual(cdaKeys(mid.entries || [], open.id).length, 0);
          return call({ action: 'ebCdaPending', token: token });
        }).then(function (queued) {
          var earlyIds = queued.pending.filter(function (p) { return p.txnId === open.id; }).map(function (p) { return p.id; });
          assert.ok(earlyIds.length >= 2);
          assert.ok(!queued.pending.some(function (p) { return p.txnId === open.id && /admin_fee|tc_fee|referral_outside|other|credit/.test(p.kind || ''); }));
          return call({ action: 'ebCdaDecide', token: token, ids: earlyIds, decision: 'approve', date: '1999-01-01' });
        }).then(function (early) {
          assert.ok(early.missingCloseDate >= 1);
          assert.strictEqual(early.approved, 0);
          assert.ok(early.awaitingDeposit >= 1);
          return call({ action: 'ebLoad', token: token });
        }).then(function (stillOpen) {
          assert.strictEqual(cdaKeys(stillOpen.entries || [], open.id).length, 0);
          return call({ action: 'setStatus', token: token, id: open.id, status: 'Closed', closeDate: '2026-12-31', finalPrice: '615000' });
        }).then(function () {
          return call({ action: 'ebLoad', token: token });
        }).then(function (afterClose) {
          assert.strictEqual(cdaKeys(afterClose.entries || [], open.id).length, 0);
          return call({ action: 'ebCdaPending', token: token });
        }).then(function (queued) {
          var agentIds = queued.pending.filter(function (p) { return p.txnId === open.id && p.payeeType === 'agent'; }).map(function (p) { return p.id; });
          assert.strictEqual(agentIds.length, 1);
          assert.strictEqual(queued.pending.filter(function (p) { return p.importKey === 'cda:' + open.id + ':brokerage'; }).length, 0);
          return call({ action: 'ebCdaDecide', token: token, ids: agentIds, decision: 'approve', date: '2027-01-02' });
        }).then(function (res) {
          assert.strictEqual(res.approved, 1);
          assert.strictEqual(res.missingCloseDate, 0);
          return call({ action: 'ebLoad', token: token });
        }).then(function (agentPosted) {
          var agentRows = cdaKeys(agentPosted.entries || [], open.id);
          assert.strictEqual(agentRows.length, 1);
          assert.strictEqual(agentRows[0].importKey, 'cda:' + open.id + ':agent:U1');
          assert.strictEqual(agentRows[0].payeeId, 'U1');
          assert.strictEqual(agentRows[0].date, '2026-12-31');
          var agentAmt = agentRows[0].amount, agentEntryId = agentRows[0].id;
          return call({ action: 'cdaGet', token: token, txnId: open.id }).then(function (again) {
            return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: open.id, checkNumber: '4400', amount: again.header.totalGross }).then(function () {
              throw new Error('deposit date should be required');
            }, function (err) { assert.ok(/deposited/.test(err.message)); });
          }).then(function () {
            return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: open.id, depositDate: '2027-01-02', checkNumber: '4401', amount: 1 });
          }).then(function (bad) {
            assert.strictEqual(bad.escrowCheck.match, false);
            assert.strictEqual(bad.incomePosted, false);
            return call({ action: 'ebLoad', token: token });
          }).then(function (noIncome) {
            assert.strictEqual(cdaKeys(noIncome.entries || [], open.id).length, 1);
            return call({ action: 'cdaGet', token: token, txnId: open.id });
          }).then(function (again) {
            return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: open.id, depositDate: '2027-01-02', checkNumber: '4400', amount: again.header.totalGross });
          }).then(function (chk) {
            assert.strictEqual(chk.escrowCheck.match, true);
            assert.strictEqual(chk.incomePosted, true);
            return call({ action: 'ebConfirmEscrowCheck', token: token, txnId: open.id, depositDate: '2027-01-03', checkNumber: '4400', amount: chk.escrowCheck.expected });
          }).then(function (againChk) {
            assert.strictEqual(againChk.incomePosted, true);
            return call({ action: 'ebLoad', token: token });
          }).then(function (both) {
            var rows = cdaKeys(both.entries || [], open.id);
            assert.strictEqual(rows.length, 2);
            var income = rows.filter(function (e) { return e.importKey === 'cda:' + open.id + ':brokerage'; })[0];
            var expense = rows.filter(function (e) { return e.importKey === 'cda:' + open.id + ':agent:U1'; })[0];
            assert.strictEqual(income.payeeId, '');
            assert.strictEqual(income.date, '2027-01-03');
            assert.notStrictEqual(income.amount, expense.amount);
            assert.notStrictEqual(income.amount, M.round2(income.amount + expense.amount));
            assert.strictEqual(expense.id, agentEntryId);
            assert.strictEqual(expense.date, '2026-12-31');
            assert.strictEqual(expense.amount, agentAmt);
            return call({ action: 'eb1099', token: token, year: '2026' }).then(function (y) {
              var u1 = (y.payees || []).filter(function (p) { return p.id === 'U1'; })[0];
              assert.ok(u1);
              assert.strictEqual(u1.total, agentAmt);
              return call({ action: 'eb1099', token: token, year: '2027' });
            }).then(function (y) {
              var u1 = (y.payees || []).filter(function (p) { return p.id === 'U1'; })[0];
              assert.ok(!u1 || u1.total === 0);
            });
          }).then(function () {
            return call({ action: 'cdaRevise', token: token, txnId: open.id, reason: 'Correct the split' });
          }).then(function () {
            return call({ action: 'cdaGet', token: token, txnId: open.id });
          }).then(function (draft) {
            var next = draft.cda.lines.map(function (l) { return Object.assign({}, l); });
            next.forEach(function (l) {
              if (l.kind === 'primary') l.amount = M.round2(l.amount - 100);
              if (l.kind === 'brokerage') l.amount = M.round2(l.amount + 100);
            });
            return call({ action: 'cdaSaveDraft', token: token, txnId: open.id, lines: next }).then(function () {
              return call({ action: 'cdaMarkSent', token: token, txnId: open.id, envelopeId: 'env-canyon-2' });
            }).then(function () {
              return call({ action: 'cdaOnSigned', token: token, txnId: open.id, envelopeId: 'env-canyon-2', base64: 'JVBERi0xLjEK', name: 'CDA-signed.pdf' });
            });
          }).then(function (revised) {
            assert.ok(revised.queued >= 1);
            return call({ action: 'ebCdaPending', token: token });
          }).then(function (queued) {
            var ids = queued.pending.filter(function (p) { return p.txnId === open.id; }).map(function (p) { return p.id; });
            return call({ action: 'ebCdaDecide', token: token, ids: ids, decision: 'approve' }).then(function () {
              return call({ action: 'ebCdaDecide', token: token, ids: ids, decision: 'approve' });
            }).then(function (second) {
              assert.strictEqual(second.approved, 0);
              return call({ action: 'ebLoad', token: token });
            });
          }).then(function (finalRows) {
            var rows = cdaKeys(finalRows.entries || [], open.id);
            assert.strictEqual(rows.length, 2);
            var income = rows.filter(function (e) { return e.type === 'income'; })[0];
            var expense = rows.filter(function (e) { return e.type === 'expense'; })[0];
            assert.strictEqual(expense.date, '2026-12-31');
            assert.strictEqual(expense.amount, M.round2(agentAmt - 100));
            assert.strictEqual(income.date, '2027-01-03');
            assert.strictEqual(income.payeeId, '');
            assert.strictEqual(expense.id, agentEntryId);
            return call({ action: 'ebImport', token: token, items: [{ txnId: open.id, gross: 9999, payout: 9999 }] });
          }).then(function (imp) {
            assert.strictEqual(imp.added, 0);
            assert.ok(imp.skipped >= 1);
            console.log('ebooks gate checks passed');
          });
        });
      });
    });
  });
}).catch(function (e) { console.error(e); process.exit(1); });
