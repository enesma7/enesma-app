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
var uiSrc = fs.readFileSync(__dirname + '/cda-ui.js', 'utf8');
assert.ok(uiSrc.indexOf('cda-note') < 0, 'example-split paragraph is not rendered');
assert.ok(uiSrc.indexOf('No split is saved') < 0);
assert.ok(uiSrc.indexOf('Standard per-transaction admin fee') < 0);
assert.ok(uiSrc.indexOf('M.adminFeeNote(l.note)') >= 0, 'admin fee mail-to uses the office-address note');
var html = fs.readFileSync(__dirname + '/index.html', 'utf8');
assert.ok(html.indexOf('cda-math.js?v=9') >= 0);
assert.ok(html.indexOf('cda-ui.js?v=15') >= 0);
assert.ok(html.indexOf('app.js?v=48') >= 0);
assert.ok(html.indexOf('app.css?v=48') >= 0);
assert.ok(html.indexOf('cda-math.js?v=8') < 0);
assert.ok(html.indexOf('cda-ui.js?v=13') < 0);
var appSrc = fs.readFileSync(__dirname + '/app.js', 'utf8');
var zd = appSrc.indexOf('id="zd"');
var zdSnippet = appSrc.slice(Math.max(0, zd - 280), zd + 80);
assert.ok(zd > 0);
assert.ok(zdSnippet.indexOf('estCloseDate') < 0);
assert.ok(appSrc.indexOf('Actual escrow closing date') >= 0);
assert.ok(appSrc.indexOf("t.closedAt ? String(t.closedAt).slice(0, 10) : ''") >= 0);
assert.ok(appSrc.indexOf('Nothing is saved until you press Save status.') >= 0);
assert.ok(uiSrc.indexOf('Owner amount approval') >= 0);
assert.ok(uiSrc.indexOf('not checklist compliance review') >= 0);
assert.ok(uiSrc.indexOf('does not approve the checklist item') >= 0 || uiSrc.indexOf('not approved by filing') >= 0);
assert.ok(uiSrc.indexOf('actual escrow closing date is missing') >= 0);
assert.ok(uiSrc.indexOf('Date deposited') >= 0);
assert.ok(uiSrc.indexOf('depositDate: date') >= 0);
assert.ok(uiSrc.indexOf('M.cdaSignHeading') >= 0);
assert.ok(uiSrc.indexOf('The agent signs first') < 0);
assert.ok(uiSrc.indexOf("subject: 'Please sign: CDA'") >= 0);
assert.ok(uiSrc.indexOf('Send agent, then broker') < 0);
assert.ok(uiSrc.indexOf('id="cdaAE"') < 0);
assert.ok(uiSrc.indexOf('id="cdaGo"') < 0);
assert.ok(uiSrc.indexOf('not on file') >= 0);
assert.ok(uiSrc.indexOf('tcTxnId: txnId') >= 0);
assert.ok(uiSrc.indexOf('Compliance review is still pending') >= 0);
assert.ok(uiSrc.indexOf('function () { }') < 0);
var plan = require('./cda-file-plan');
var latest = plan.cdaFileDecision([{ version: 1, status: 'sent', envelopeId: 'E1', signedDocId: '' }], 'E1');
assert.strictEqual(latest.action, 'file-latest');
assert.strictEqual(latest.docStatus, 'Pending');
assert.strictEqual(latest.approve, false);
assert.strictEqual(latest.queueEbooks, true);
var again = plan.cdaFileDecision([{ version: 1, status: 'executed', envelopeId: 'E1', signedDocId: 'D1' }], 'E1');
assert.strictEqual(again.action, 'already');
assert.strictEqual(again.queueEbooks, false);
var stale = plan.cdaFileDecision([
  { version: 1, status: 'sent', envelopeId: 'E1', signedDocId: '' },
  { version: 2, status: 'executed', envelopeId: 'E2', signedDocId: 'D2' }
], 'E1');
assert.strictEqual(stale.action, 'file-historical');
assert.strictEqual(stale.queueEbooks, false);
assert.strictEqual(stale.supersedeOlder, false);
assert.strictEqual(plan.cdaFileDecision([{ version: 2, status: 'sent', envelopeId: 'E2' }], 'E1').action, 'reject');
assert.ok(uiSrc.indexOf("order: 1") >= 0);
assert.ok(uiSrc.indexOf("order: 2") >= 0);
assert.ok(uiSrc.indexOf('Added payees come out of the Primary Agent') < 0);
assert.ok(uiSrc.indexOf('Brokerage stays its percent') < 0);
assert.ok(uiSrc.indexOf('Lines equal the locked total gross.') >= 0);
assert.ok(uiSrc.indexOf('M.settlement') >= 0);
assert.ok(uiSrc.indexOf('Primary Agent is below $0.00') >= 0);
assert.ok(uiSrc.indexOf('These amounts do not match') >= 0);
assert.ok(uiSrc.indexOf('cda-foot') >= 0);
var shotLines = [
  { kind: 'primary', amount: 11140, name: 'Agent' },
  { kind: 'brokerage', amount: 1260, name: 'ENESMA Realty' },
  { kind: 'admin_fee', amount: 200, name: 'ENESMA Realty' },
  { kind: 'referral_outside', amount: 6300, name: 'Zina Gjoni' }
];
var unreduced = M.settlement(shotLines, 12600);
assert.strictEqual(unreduced.sum, 18900);
assert.strictEqual(unreduced.remainder, 4840);
assert.strictEqual(unreduced.mismatch, true);
assert.strictEqual(unreduced.under, false);
var reduced = shotLines.map(function (l) { return Object.assign({}, l); });
reduced[0].amount = unreduced.remainder;
var matched = M.settlement(reduced, 12600);
assert.strictEqual(matched.primary, 4840);
assert.strictEqual(matched.sum, 12600);
assert.strictEqual(matched.diff, 0);
assert.strictEqual(matched.mismatch, false);
var negative = M.settlement([
  { kind: 'primary', amount: -1460 },
  { kind: 'brokerage', amount: 1260 },
  { kind: 'admin_fee', amount: 200 },
  { kind: 'referral_outside', amount: 12600 }
], 12600);
assert.strictEqual(negative.diff, 0);
assert.strictEqual(negative.under, true);
assert.strictEqual(negative.mismatch, true);
var shot = M.applySplitLines(shotLines, { totalGross: 12600, agentId: 'U1', agentName: 'Agent' }, { id: 'U1', splitPct: 90, address: '10 Agent St' }, 200);
var shotBy = {}; shot.forEach(function (l) { shotBy[l.kind] = l; });
assert.strictEqual(shotBy.brokerage.amount, 1260);
assert.strictEqual(shotBy.admin_fee.amount, 200);
assert.strictEqual(shotBy.primary.amount, 4840);
assert.strictEqual(shotBy.referral_outside.amount, 6300);
assert.strictEqual(M.sumLines(shot), 12600);
assert.strictEqual(shotBy.primary.note, '10 Agent St');
assert.strictEqual(shotBy.brokerage.note, M.OFFICE_MAIL);
assert.strictEqual(shotBy.admin_fee.note, M.OFFICE_MAIL);
assert.strictEqual(shotBy.admin_fee.name, M.BROKER_NAME);
var beforeSplit = M.rebalanceAmounts([{ kind: 'referral_outside', amount: 6300 }], 12600, 90, 200);
assert.strictEqual(beforeSplit.brokerage, 1260);
assert.notStrictEqual(beforeSplit.brokerage, M.round2((12600 - 6300) * 0.1));
assert.strictEqual(beforeSplit.admin, 200);
assert.strictEqual(beforeSplit.primary, 4840);
assert.notStrictEqual(beforeSplit.primary, M.round2((12600 - 6300) * 0.9 - 200));
var kinds = ['co_list', 'co_buyer', 'referral_inhouse', 'referral_outside', 'tc_fee', 'other', 'credit'];
kinds.forEach(function (kind) {
  var one = M.rebalanceAmounts([{ kind: kind, amount: 500 }], 12600, 90, 200);
  assert.strictEqual(one.brokerage, 1260, kind);
  assert.strictEqual(one.admin, 200, kind);
  assert.strictEqual(one.extras, 500, kind);
  assert.strictEqual(one.primary, 10640, kind);
});
var allAdded = kinds.map(function (kind) { return { kind: kind, amount: 500 }; });
var allPlan = M.rebalanceAmounts(allAdded, 12600, 90, 200);
assert.strictEqual(allPlan.brokerage, 1260);
assert.strictEqual(allPlan.extras, 3500);
assert.strictEqual(allPlan.primary, 7640);
assert.strictEqual(M.round2(allPlan.brokerage + allPlan.admin + allPlan.extras + allPlan.primary), 12600);
assert.strictEqual(M.LABELS.primary, 'Primary Agent');
assert.strictEqual(M.LABELS.brokerage, 'ENESMA Realty (Brokerage)');
assert.strictEqual(M.LABELS.admin_fee, 'Admin Fee');
assert.strictEqual(M.LABELS.co_list, 'Co-Listing Agent');
assert.strictEqual(M.LABELS.co_buyer, 'Co-Buyer Agent');
assert.strictEqual(M.LABELS.referral_inhouse, 'Referral · In-House Agent');
assert.strictEqual(M.LABELS.referral_outside, 'Referral · Outside');
assert.strictEqual(M.LABELS.tc_fee, 'TC Fee');
assert.strictEqual(M.LABELS.other, 'Other');
assert.strictEqual(M.LABELS.credit, 'Credit / Paying From Closing');
['+ Co-Listing Agent', '+ Co-Buyer Agent', '+ In-House Referral', '+ Outside Referral', '+ TC Fee', '+ Other', '+ Credit'].forEach(function (label) {
  assert.ok(uiSrc.indexOf(label) >= 0, label);
});
assert.ok(uiSrc.indexOf('data-add="co_list"') >= 0);
assert.ok(uiSrc.indexOf('data-add="referral_outside"') >= 0);
assert.ok(uiSrc.indexOf('data-add="tc_fee"') >= 0);
assert.ok(uiSrc.indexOf('Co-listing agent') < 0);
assert.ok(uiSrc.indexOf('Co-buyer agent') < 0);
assert.ok(uiSrc.indexOf('In-house referral') < 0);
assert.ok(uiSrc.indexOf('Outside referral') < 0);
assert.ok(uiSrc.indexOf('+ TC fee') < 0);
assert.ok(uiSrc.indexOf('Referral · outside') < 0);
assert.ok(uiSrc.indexOf('paying from closing') < 0);
assert.ok(uiSrc.indexOf('aria-label="Primary agent"') < 0);

var header = { totalGross: 10000, price: 400000, commission: 2.5, commissionType: 'percent', agentId: 'U1', agentName: 'Enrique Esparza', address: '1 Main', side: 'seller', type: 'purchase' };
var sug = M.fallbackSuggest(header, { id: 'U1', splitPct: 90, capAmount: '' }, 200);
assert.strictEqual(sug.split, 90);
assert.strictEqual(sug.source, 'profile');
var by = {}; sug.lines.forEach(function (l) { by[l.kind] = l; });
assert.strictEqual(by.brokerage.amount, 1000);
assert.strictEqual(by.admin_fee.amount, 200);
assert.strictEqual(by.admin_fee.name, M.BROKER_NAME);
assert.strictEqual(by.admin_fee.note, M.OFFICE_MAIL);
assert.strictEqual(by.primary.amount, 8800);
assert.strictEqual(by.primary.note, '');
assert.strictEqual(M.sumLines(sug.lines), 10000);
assert.strictEqual(sug.lines.filter(function (l) { return l.kind === 'brokerage'; })[0].note, M.OFFICE_MAIL);
var lyn = M.applySplitLines([
  { kind: 'brokerage', amount: 1260, name: 'ENESMA Realty' },
  { kind: 'primary', amount: 11340, name: 'Enrique Esparza', agentId: 'U1' },
  { kind: 'admin_fee', amount: 200, name: 'ENESMA Admin Fee' }
], { totalGross: 12800, agentId: 'U1', agentName: 'Enrique Esparza' }, { id: 'U1', splitPct: 90, address: '10 Agent St, Lynwood, CA 90262' }, 200);
var lynBy = {}; lyn.forEach(function (l) { lynBy[l.kind] = l; });
assert.strictEqual(lynBy.brokerage.amount, 1280);
assert.strictEqual(lynBy.primary.amount, 11320);
assert.strictEqual(lynBy.admin_fee.amount, 200);
assert.strictEqual(M.sumLines(lyn), 12800);
assert.strictEqual(lynBy.primary.note, '10 Agent St, Lynwood, CA 90262');
assert.strictEqual(lynBy.brokerage.note, M.OFFICE_MAIL);
assert.strictEqual(lynBy.admin_fee.name, 'ENESMA Admin Fee');
assert.strictEqual(lynBy.admin_fee.note, M.OFFICE_MAIL);
assert.ok(lynBy.admin_fee.note.indexOf('Standard per-transaction') < 0);
assert.strictEqual(M.usd(11320), '$11,320.00');
var FEE_BLURB = 'Standard per-transaction admin fee (CDA only; deducted from agent share)';
var blurred = M.linesForEdit({
  header: { totalGross: 12800, agentId: 'U1', agentName: 'Enrique Esparza' },
  adminFee: 200,
  suggested: [
    { kind: 'brokerage', amount: 1260, name: 'ENESMA Realty' },
    { kind: 'primary', amount: 11340, name: 'Enrique Esparza', agentId: 'U1' },
    { kind: 'admin_fee', amount: 200, name: 'ENESMA Realty', note: FEE_BLURB }
  ],
  agents: [{ id: 'U1', splitPct: 90, address: '10 Agent St, Lynwood, CA 90262' }]
});
var blurBy = {}; blurred.forEach(function (l) { blurBy[l.kind] = l; });
assert.strictEqual(blurBy.admin_fee.note, M.OFFICE_MAIL);
assert.strictEqual(blurBy.admin_fee.name, M.BROKER_NAME);
assert.ok(blurBy.admin_fee.note.indexOf('Standard per-transaction') < 0);
assert.strictEqual(blurBy.admin_fee.amount, 200);
assert.strictEqual(blurBy.brokerage.amount, 1280);
assert.strictEqual(blurBy.primary.amount, 11320);
assert.strictEqual(blurBy.primary.note, '10 Agent St, Lynwood, CA 90262');
assert.strictEqual(M.sumLines(blurred), 12800);
var keptMail = M.ensureAdmin([{ kind: 'admin_fee', amount: 200, name: 'ENESMA Realty', note: '10 Agent St, Lynwood, CA 90262' }], 200);
assert.strictEqual(keptMail[0].note, '10 Agent St, Lynwood, CA 90262');
assert.strictEqual(keptMail[0].name, M.BROKER_NAME);
var freshAdmin = M.ensureAdmin([], 200);
assert.strictEqual(freshAdmin[0].kind, 'admin_fee');
assert.strictEqual(freshAdmin[0].name, M.BROKER_NAME);
assert.strictEqual(freshAdmin[0].note, M.OFFICE_MAIL);
assert.strictEqual(freshAdmin[0].amount, 200);
assert.strictEqual(M.adminFeeNote(''), M.OFFICE_MAIL);
assert.strictEqual(M.adminFeeNote(FEE_BLURB), M.OFFICE_MAIL);
assert.strictEqual(M.adminFeeNote(M.OFFICE_MAIL), M.OFFICE_MAIL);
assert.strictEqual(M.adminFeeNote('10 Agent St, Lynwood, CA 90262'), '10 Agent St, Lynwood, CA 90262');
var lockedPack = M.linesForEdit({
  header: { totalGross: 10000, agentId: 'U1', agentName: 'Enrique Esparza' },
  adminFee: 200,
  cda: { status: 'executed', lines: [
    { kind: 'brokerage', amount: 1000, name: 'ENESMA Realty', note: M.OFFICE_MAIL },
    { kind: 'primary', amount: 8800, name: 'Enrique Esparza', agentId: 'U1', note: '10 Agent St' },
    { kind: 'admin_fee', amount: 200, name: 'ENESMA Realty', note: FEE_BLURB }
  ] }
});
var lockBy = {}; lockedPack.forEach(function (l) { lockBy[l.kind] = l; });
assert.strictEqual(lockBy.admin_fee.note, M.OFFICE_MAIL);
assert.ok(lockBy.admin_fee.note.indexOf('Standard per-transaction') < 0);
assert.strictEqual(lockBy.admin_fee.amount, 200);
assert.strictEqual(lockBy.primary.amount, 8800);
assert.strictEqual(lockBy.primary.note, '10 Agent St');
assert.strictEqual(lockBy.brokerage.note, M.OFFICE_MAIL);
var pdf = M.pdfFields(header, [
  { kind: 'brokerage', amount: 1000, name: 'ENESMA Realty', note: M.OFFICE_MAIL },
  { kind: 'primary', amount: 8800, name: 'Enrique Esparza', note: '10 Agent St' },
  { kind: 'admin_fee', amount: 200, name: 'ENESMA Realty', note: FEE_BLURB }
]);
assert.strictEqual(pdf.admin_fee_mail_to, M.OFFICE_MAIL);
assert.strictEqual(pdf.admin_fee_payee, M.BROKER_NAME);
assert.strictEqual(pdf.admin_fee_amount, '$200.00');
assert.strictEqual(pdf.agent_mail_to, '10 Agent St');
assert.strictEqual(pdf.payee1_mail_to, M.OFFICE_MAIL);
var withCo = M.applySplitLines(lyn.concat([{ kind: 'co_list', amount: 500, name: 'Alex Rivera', agentId: 'U2' }]), { totalGross: 12800, agentId: 'U1', agentName: 'Enrique Esparza' }, { id: 'U1', splitPct: 90 }, 200, [{ id: 'U2', address: '2 Co St' }]);
var coPri = withCo.filter(function (l) { return l.kind === 'primary'; })[0];
var coBro = withCo.filter(function (l) { return l.kind === 'brokerage'; })[0];
assert.strictEqual(coBro.amount, 1280);
assert.strictEqual(coPri.amount, 10820);
assert.strictEqual(M.sumLines(withCo), 12800);
var ex = M.fallbackSuggest(header, { splitPct: '' }, 200);
assert.strictEqual(ex.source, 'example');
assert.strictEqual(ex.split, 90);
var books = M.booksLines(sug.lines.concat([{ kind: 'tc_fee', amount: 150, name: 'TC', agentId: '' }, { kind: 'referral_outside', amount: 50, name: 'Other Co' }, { kind: 'co_list', amount: 100, name: 'Alex', agentId: 'U2' }]));
assert.strictEqual(books.map(function (l) { return l.kind + ':' + l.amount; }).sort().join('|'), 'admin_fee:200|brokerage:1000|co_list:100|primary:8800');
assert.ok(M.isCdaItem({ code: 'P_CDA_COMMISSION_DISBURSEMENT_' }));
assert.ok(M.isCdaItem({ code: 'CDA' }));
assert.ok(!M.isCdaItem({ code: 'P_INVOICES' }));

assert.strictEqual(M.cdaSignHeading({ street: '400 Sample St', city: 'Sample City', state: 'CA', zip: '90000' }), 'CDA\n400 Sample St\nSample City CA 90000');
assert.strictEqual(M.cdaSignHeading({ street: '400 Sample St' }), 'CDA\n400 Sample St');
assert.strictEqual(M.cdaSignHeading({ city: 'Sample City', zip: '90000' }), 'CDA\nSample City 90000');
assert.strictEqual(M.cdaSignHeading({}), 'CDA');
assert.ok(M.cdaSignHeading({ city: 'Sample City', zip: '90000' }).indexOf(' CA') < 0);
var sampleHeader = M.headerFromTxn({ address: '9 Old St', city: 'Old City', zip: '11111', intake: { address: '400 Sample St', unit: '2', city: 'Sample City', zip: '90000' } });
assert.strictEqual(sampleHeader.street, '400 Sample St #2');
assert.strictEqual(sampleHeader.city, 'Sample City');
assert.strictEqual(sampleHeader.state, '');
assert.strictEqual(sampleHeader.zip, '90000');
assert.strictEqual(M.cdaSignHeading(sampleHeader), 'CDA\n400 Sample St #2\nSample City 90000');
var rects = M.signRects(612, 792);
assert.strictEqual(rects.agentDate.x, rects.agentSig.x);
assert.strictEqual(rects.brokerDate.x, rects.brokerSig.x);
assert.ok(rects.agentDate.y > rects.agentSig.y + rects.agentSig.h - 0.005);
assert.ok(rects.brokerDate.y > rects.brokerSig.y + rects.brokerSig.h - 0.005);
assert.ok(rects.agentDate.x < 0.3);
assert.strictEqual(rects.agentSig.y, +(608 / 792).toFixed(4));
assert.strictEqual(rects.agentDate.y, +(630 / 792).toFixed(4));
assert.strictEqual(rects.brokerSig.y, +(664 / 792).toFixed(4));
assert.strictEqual(rects.brokerDate.y, +(686 / 792).toFixed(4));

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
      assert.strictEqual(admin.name, M.BROKER_NAME);
      assert.strictEqual(admin.note, M.OFFICE_MAIL);
      assert.ok(admin.note.indexOf('Standard per-transaction') < 0);
      var bro = lines.filter(function (l) { return l.kind === 'brokerage'; })[0];
      assert.strictEqual(bro.note, M.OFFICE_MAIL);
      var primary = lines.filter(function (l) { return l.kind === 'primary'; })[0];
      assert.strictEqual(primary.pct, 90);
      assert.strictEqual(primary.note, '');
      return call({ action: 'cdaSaveDraft', token: token, txnId: closed.id, lines: lines }).then(function () {
        return call({ action: 'cdaMarkSent', token: token, txnId: closed.id, envelopeId: 'env-demo' });
      }).then(function (sent) {
        assert.strictEqual(sent.cda.status, 'sent');
        return call({ action: 'cdaSaveDraft', token: token, txnId: closed.id, lines: lines }).then(function () { throw new Error('draft should 409'); }, function (e) { assert.strictEqual(e.code, 'CONFLICT'); });
      }).then(function () {
        return call({ action: 'cdaOnSigned', token: token, txnId: closed.id, envelopeId: 'env-demo', base64: 'QQ==', name: 'CDA-signed.pdf' });
      }).then(function (done) {
        assert.strictEqual(done.cda.status, 'executed');
        assert.strictEqual(done.already, false);
        assert.strictEqual(done.itemStatus, 'Pending');
        assert.ok(done.queued >= 2);
        var filed = done.docId;
        return call({ action: 'cdaOnSigned', token: token, txnId: closed.id, envelopeId: 'env-demo', base64: 'QQ==', name: 'CDA-signed.pdf' }).then(function (repeat) {
          assert.strictEqual(repeat.already, true);
          assert.strictEqual(repeat.docId, filed);
          assert.strictEqual(repeat.queued, 0);
          return call({ action: 'cdaOnSigned', token: token, txnId: closed.id, envelopeId: 'env-other', base64: 'QQ==', name: 'CDA-signed.pdf' });
        }).then(function () { throw new Error('stale envelope should conflict'); }, function (e) {
          assert.strictEqual(e.code, 'CONFLICT');
        });
      }).then(function () {
        return call({ action: 'ebCdaPending', token: token });
      }).then(function (q) {
        var kinds = q.pending.map(function (p) { return p.kind; });
        assert.ok(kinds.indexOf('brokerage') >= 0);
        assert.ok(kinds.indexOf('primary') >= 0 || q.pending.some(function (p) { return p.payeeType === 'agent'; }));
        assert.ok(q.pending.some(function (p) { return p.kind === 'admin_fee' && p.type === 'income'; }));
        assert.ok(!q.pending.some(function (p) { return p.kind === 'tc_fee'; }));
        return call({ action: 'ebCdaDecide', token: token, ids: q.pending.map(function (p) { return p.id; }), decision: 'approve' });
      }).then(function (res) {
        assert.ok(res.approved >= 1);
        assert.ok(res.awaitingDeposit >= 1);
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
