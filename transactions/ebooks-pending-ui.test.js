/* Pending signed-CDA rows show up for review and stay out of posted totals. Synthetic amounts only. */
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
var css = fs.readFileSync(__dirname + '/app.css', 'utf8');
assert.ok(app.indexOf("api('ebCdaPending')") >= 0);
assert.ok(app.indexOf('function ebPendingVisible') >= 0);
assert.ok(app.indexOf('class="ebred"') >= 0);
assert.ok(app.indexOf('Review Pending CDA Amount') >= 0);
assert.ok(app.indexOf('>Pending</span>') >= 0);
assert.ok(app.indexOf("e.key === 'Escape'") >= 0);
assert.ok(app.indexOf('does not add it to income') >= 0);
assert.ok(app.indexOf('actual escrow closing date') >= 0);
assert.ok(app.indexOf('Checklist compliance review is separate') >= 0 || app.indexOf('Compliance review stays separate') >= 0);
assert.ok(css.indexOf('.ebred{') >= 0);
var ledger = app.slice(app.indexOf('function ebLedger'), app.indexOf('function ebRangeLabel'));
assert.ok(ledger.indexOf("if (e.type === 'income') tin += e.amount") >= 0);
assert.ok(ledger.indexOf('tin += r.amount') < 0);
assert.ok(ledger.indexOf('tin += waiting') < 0);

function call(body) {
  return mock.call(body).then(function (r) {
    if (!r.ok) { var e = new Error(r.error); e.code = r.code; throw e; }
    return r.data;
  });
}
call({ action: 'login', email: 'admin@demo.test', password: 'demo' }).then(function (admin) {
  var token = admin.token;
  return call({ action: 'ebCdaPending', token: token }).then(function (q) {
    var rows = q.pending.filter(function (p) { return p.id === 'CPsampleB' || p.id === 'CPsampleA'; });
    assert.strictEqual(rows.length, 2);
    var income = rows.filter(function (p) { return p.type === 'income'; })[0];
    var expense = rows.filter(function (p) { return p.type === 'expense'; })[0];
    assert.strictEqual(income.amount, 640);
    assert.strictEqual(income.payeeType, '');
    assert.strictEqual(expense.amount, 2560);
    assert.strictEqual(expense.payeeId, 'U2');
    assert.notStrictEqual(income.importKey, expense.importKey);
    return call({ action: 'ebLoad', token: token }).then(function (book) {
      assert.ok(!book.entries.some(function (e) { return e.importKey === income.importKey || e.importKey === expense.importKey; }));
      var postedIn = book.entries.filter(function (e) { return e.type === 'income'; }).reduce(function (s, e) { return s + e.amount; }, 0);
      assert.ok(book.entries.every(function (e) { return e.amount !== 640 || e.importKey !== income.importKey; }));
      return call({ action: 'eb1099', token: token, year: '2026' }).then(function (y) {
        var u2 = (y.payees || []).filter(function (p) { return p.id === 'U2'; })[0];
        var before = u2 ? u2.fromTxns : 0;
        return call({ action: 'ebCdaDecide', token: token, ids: ['CPsampleB'], decision: 'approve' }).then(function (res) {
          assert.ok(res.awaitingDeposit >= 1);
          assert.strictEqual(res.approved, 0);
          return call({ action: 'ebLoad', token: token });
        }).then(function (after) {
          var postedIn2 = after.entries.filter(function (e) { return e.type === 'income'; }).reduce(function (s, e) { return s + e.amount; }, 0);
          assert.strictEqual(postedIn2, postedIn);
          assert.ok(!after.entries.some(function (e) { return e.importKey === income.importKey; }));
          return call({ action: 'ebCdaDecide', token: token, ids: ['CPsampleA'], decision: 'approve' });
        }).then(function (res) {
          assert.strictEqual(res.approved, 1);
          assert.strictEqual(res.missingCloseDate, 0);
          return call({ action: 'ebLoad', token: token });
        }).then(function (posted) {
          var agent = posted.entries.filter(function (e) { return e.importKey === expense.importKey; });
          assert.strictEqual(agent.length, 1);
          assert.strictEqual(agent[0].amount, 2560);
          assert.strictEqual(agent[0].payeeId, 'U2');
          return call({ action: 'eb1099', token: token, year: '2026' });
        }).then(function (y) {
          var u2 = (y.payees || []).filter(function (p) { return p.id === 'U2'; })[0];
          assert.ok(u2);
          assert.strictEqual(Math.round((u2.fromTxns - before) * 100) / 100, 2560);
          console.log('pending CDA ledger checks passed');
        });
      });
    });
  });
}).catch(function (e) { console.error(e); process.exit(1); });
