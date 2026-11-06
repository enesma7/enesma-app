/* CDA line math shared by the Transaction Center UI and the demo backend.
 * Live cdaGet.suggested is authoritative. This file only fills gaps and checks the total. */
(function (root) {
  'use strict';
  var ADMIN_FEE = 200;
  var EXAMPLE_SPLIT = 90; // Enrique Esparza: 90% agent / 10% brokerage
  var BROKER_NAME = 'ENESMA Realty';
  var KINDS = ['brokerage', 'primary', 'co_list', 'co_buyer', 'referral_inhouse', 'referral_outside', 'tc_fee', 'admin_fee', 'other', 'credit'];
  var EBOOKS = ['brokerage', 'primary', 'co_list', 'co_buyer', 'referral_inhouse'];
  var LABELS = {
    brokerage: 'ENESMA Realty (brokerage)',
    primary: 'Primary agent',
    co_list: 'Co-listing agent',
    co_buyer: 'Co-buyer agent',
    referral_inhouse: 'Referral · in-house agent',
    referral_outside: 'Referral · outside',
    tc_fee: 'TC fee',
    admin_fee: 'Admin fee',
    other: 'Other',
    credit: 'Credit / paying from closing'
  };
  var AGENT_KINDS = { primary: 1, co_list: 1, co_buyer: 1, referral_inhouse: 1 };

  function round2(n) { n = Number(n); if (!isFinite(n)) return 0; return Math.round(n * 100) / 100; }
  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[$,%\s]/g, '')); return isNaN(n) ? 0 : n; }
  function blank(kind) { return { kind: kind, amount: '', name: '', agentId: '', vendorId: '', pct: '', note: '' }; }
  function isCdaItem(it) {
    if (!it) return false;
    var code = String(it.code || '');
    if (code === 'P_CDA_COMMISSION_DISBURSEMENT_' || code === 'CDA') return true;
    var title = String(it.baseTitle || it.title || '');
    return /^CDA\b/i.test(title) || /commission disbursement authorization/i.test(title);
  }
  function cloneLine(l) {
    l = l || {};
    var amt = l.amount === '' || l.amount == null ? '' : round2(num(l.amount));
    return { kind: String(l.kind || ''), amount: amt, name: String(l.name || ''), agentId: String(l.agentId || ''), vendorId: String(l.vendorId || ''), pct: l.pct === '' || l.pct == null ? '' : l.pct, note: String(l.note || '') };
  }
  function ensureAdmin(lines, adminFee) {
    var fee = adminFee == null || adminFee === '' ? ADMIN_FEE : round2(num(adminFee));
    var out = (lines || []).map(cloneLine).filter(function (l) { return KINDS.indexOf(l.kind) >= 0; });
    var a = null;
    out.forEach(function (l) { if (l.kind === 'admin_fee' && !a) a = l; });
    if (!a) out.push(Object.assign(blank('admin_fee'), { amount: fee, name: BROKER_NAME }));
    else { if (a.amount === '' || a.amount == null) a.amount = fee; if (!a.name) a.name = BROKER_NAME; }
    return out;
  }
  function sumLines(lines) {
    var s = 0;
    (lines || []).forEach(function (l) { if (l.amount === '' || l.amount == null) return; s += round2(num(l.amount)); });
    return round2(s);
  }
  function grossOf(header) { return round2(header && header.totalGross); }
  function splitOf(agent) {
    if (!agent || agent.splitPct === '' || agent.splitPct == null) return { split: EXAMPLE_SPLIT, source: 'example' };
    var n = Number(agent.splitPct);
    if (!isFinite(n)) return { split: EXAMPLE_SPLIT, source: 'example' };
    return { split: n, source: 'profile' };
  }
  /* Brokerage is the broker portion of total gross. Admin fee is its own line, taken from the agent side so the three lines equal total gross. */
  function fallbackSuggest(header, agent, adminFee) {
    var gross = grossOf(header), sp = splitOf(agent), fee = adminFee == null ? ADMIN_FEE : round2(num(adminFee));
    var brokerage = round2(gross * (100 - sp.split) / 100);
    var primary = round2(gross - brokerage - fee);
    if (primary < 0) { primary = 0; brokerage = round2(Math.max(0, gross - fee)); }
    var lines = [
      Object.assign(blank('brokerage'), { amount: brokerage, name: BROKER_NAME, pct: round2(100 - sp.split) }),
      Object.assign(blank('primary'), { amount: primary, name: (header && header.agentName) || '', agentId: (header && header.agentId) || (agent && agent.id) || '', pct: sp.split }),
      Object.assign(blank('admin_fee'), { amount: fee, name: BROKER_NAME })
    ];
    return { split: sp.split, source: sp.source, capAmount: agent && agent.capAmount !== '' && agent.capAmount != null ? agent.capAmount : '', lines: lines };
  }
  function ensureSkeleton(lines, header, adminFee) {
    var out = ensureAdmin(lines, adminFee);
    if (!out.some(function (l) { return l.kind === 'brokerage'; })) out.unshift(Object.assign(blank('brokerage'), { name: BROKER_NAME }));
    if (!out.some(function (l) { return l.kind === 'primary'; })) {
      var at = out.some(function (l) { return l.kind === 'brokerage'; }) ? 1 : 0;
      out.splice(at, 0, Object.assign(blank('primary'), { name: (header && header.agentName) || '', agentId: (header && header.agentId) || '' }));
    }
    return out;
  }
  function linesForEdit(pack) {
    var cda = pack && pack.cda;
    var useSaved = cda && cda.lines && cda.lines.length && (cda.status === 'draft' || cda.status === 'sent' || cda.status === 'executed');
    var header = pack && pack.header;
    var lines = useSaved ? cda.lines : ((pack && pack.suggested && pack.suggested.length) ? pack.suggested : fallbackSuggest(header, null, pack && pack.adminFee).lines);
    return ensureSkeleton(lines, header, pack && pack.adminFee);
  }
  function booksLines(lines) {
    var byKey = {};
    (lines || []).forEach(function (l) {
      if (EBOOKS.indexOf(l.kind) < 0) return;
      var amt = round2(num(l.amount));
      if (!(amt > 0)) return;
      if (l.kind === 'brokerage') {
        var b = byKey.brokerage || { kind: 'brokerage', amount: 0, name: l.name || BROKER_NAME, agentId: '' };
        b.amount = round2(b.amount + amt); byKey.brokerage = b; return;
      }
      if (!l.agentId) return;
      var k = 'agent:' + l.agentId;
      var a = byKey[k] || { kind: l.kind, amount: 0, name: l.name || '', agentId: l.agentId };
      a.amount = round2(a.amount + amt); if (!a.name && l.name) a.name = l.name; byKey[k] = a;
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; });
  }
  function sideLabel(side, type) {
    var map = { buyer: 'Buyer', seller: 'Seller', both: 'Both sides', tenant: 'Tenant', landlord: 'Landlord' };
    if (map[side]) return map[side];
    if (type === 'listing' || type === 'lease_listing') return 'Seller';
    if (type === 'referral') return 'Referral';
    return side || '';
  }
  function headerFromTxn(t) {
    var i = (t && t.intake) || {};
    var price = num(i.finalPrice) || num(i.purchasePrice) || num(i.salePrice) || num(i.price) || num(i.listPrice) || num(i.monthlyRent);
    var key = ['commission', 'listingCommission', 'buyerBrokerComp', 'referralFee'].filter(function (k) { return i[k] !== undefined && i[k] !== ''; })[0];
    var raw = key ? num(i[key]) : 0;
    var commissionType = key && i[key + 'Type'] === 'amount' ? 'amount' : 'percent';
    var totalGross = commissionType === 'amount' ? round2(raw) : round2(price * raw / 100);
    var street = [i.address || t.address || '', i.unit].filter(Boolean).join(i.unit && /^(apt|unit|ste|suite|#)/i.test(i.unit) ? ' ' : i.unit ? ' #' : '');
    var city = i.city || t.city || '', st = (i.state || 'CA'), zip = i.zip || t.zip || '';
    var line2 = city ? (city + ', ' + st + (zip ? ' ' + zip : '')) : (zip ? st + ' ' + zip : '');
    return {
      address: [street, line2].filter(Boolean).join(', '),
      price: round2(price),
      commission: raw,
      commissionType: commissionType,
      totalGross: totalGross,
      escrowNumber: i.escrowNumber || '',
      escrowCompany: i.escrowCompany || '',
      escrowOfficer: i.escrowOfficer || '',
      escrowEmail: i.escrowEmail || '',
      agentId: t.agentId || '',
      agentName: t.agentName || '',
      side: t.side || '',
      type: t.type || ''
    };
  }
  function pdfAmount(n) { n = round2(num(n)); return n ? n.toFixed(2) : ''; }
  function joinBits(list) { return list.filter(Boolean).join('; '); }
  function pdfFields(header, lines) {
    header = header || {}; lines = ensureAdmin(lines, ADMIN_FEE);
    function rows(kind) { return lines.filter(function (l) { return l.kind === kind && (num(l.amount) || l.name); }); }
    var ref = rows('referral_inhouse').concat(rows('referral_outside'));
    var extra = rows('co_list').concat(rows('co_buyer'), rows('other'), rows('credit'));
    var bro = rows('brokerage')[0] || { name: BROKER_NAME, amount: 0, note: '' };
    var ag = rows('primary')[0] || { name: header.agentName || '', amount: 0, note: '' };
    var tc = rows('tc_fee')[0] || { name: '', amount: 0, note: '' };
    var ad = rows('admin_fee')[0] || { name: BROKER_NAME, amount: ADMIN_FEE, note: '' };
    var refAmt = round2(ref.reduce(function (s, l) { return s + num(l.amount); }, 0));
    var extraAmt = round2(extra.reduce(function (s, l) { return s + num(l.amount); }, 0));
    var pct = header.commissionType === 'amount'
      ? (num(header.price) ? round2(num(header.totalGross) / num(header.price) * 100) : '')
      : header.commission;
    var officer = [header.escrowOfficer, header.escrowEmail].filter(Boolean).join(' · ');
    var disbursed = round2(num(bro.amount) + num(ag.amount) + num(tc.amount) + num(ad.amount) + refAmt + extraAmt);
    var otherName = extra.map(function (l) {
      var label = LABELS[l.kind] || l.kind;
      var who = l.name || '';
      return (extra.length > 1 ? label + (who ? ': ' + who : '') + (num(l.amount) ? ' $' + pdfAmount(l.amount) : '') : (who || label));
    }).join('; ');
    return {
      date: new Date().toISOString().slice(0, 10),
      agent_name: header.agentName || '',
      property_address: header.address || '',
      sales_price: header.price ? round2(header.price).toFixed(2) : '',
      commission_pct: pct === '' || pct == null ? '' : String(round2(num(pct))),
      escrow_number: header.escrowNumber || '',
      escrow_company: header.escrowCompany || '',
      escrow_officer: officer,
      agent_represents: sideLabel(header.side, header.type),
      payee1_payee: bro.name || BROKER_NAME,
      payee1_amount: pdfAmount(bro.amount),
      payee1_mail_to: bro.note || '',
      agent_payee: ag.name || header.agentName || '',
      agent_amount: pdfAmount(ag.amount),
      agent_mail_to: ag.note || '',
      tc_fee_payee: tc.name || '',
      tc_fee_amount: pdfAmount(tc.amount),
      tc_fee_mail_to: tc.note || '',
      admin_fee_payee: ad.name || BROKER_NAME,
      admin_fee_amount: pdfAmount(ad.amount || ADMIN_FEE),
      admin_fee_mail_to: ad.note || '',
      referral_payee: joinBits(ref.map(function (l) { return l.name || LABELS[l.kind]; })),
      referral_amount: pdfAmount(refAmt),
      referral_mail_to: joinBits(ref.map(function (l) { return l.note; })),
      other_payee: otherName,
      other_amount: pdfAmount(extraAmt),
      other_mail_to: joinBits(extra.map(function (l) { return l.note; })),
      total_gross_commission: header.totalGross ? round2(header.totalGross).toFixed(2) : '',
      total_disbursed: disbursed ? disbursed.toFixed(2) : ''
    };
  }
  /* E-Sign fractions, top-left origin, from the CDA AcroForm signature widgets (letter page). */
  function signRects(pageW, pageH) {
    pageW = pageW || 612; pageH = pageH || 792;
    function box(x, y, w, h) { return { page: 1, x: +(x / pageW).toFixed(4), y: +(y / pageH).toFixed(4), w: +(w / pageW).toFixed(4), h: +(h / pageH).toFixed(4) }; }
    return { agentSig: box(145, 600, 170, 28), agentDate: box(330, 608, 100, 18), brokerSig: box(145, 656, 170, 28), brokerDate: box(330, 664, 100, 18) };
  }

  root.TCCda = {
    ADMIN_FEE: ADMIN_FEE, EXAMPLE_SPLIT: EXAMPLE_SPLIT, BROKER_NAME: BROKER_NAME,
    KINDS: KINDS, EBOOKS_KINDS: EBOOKS, LABELS: LABELS, AGENT_KINDS: AGENT_KINDS,
    round2: round2, num: num, blank: blank, isCdaItem: isCdaItem, cloneLine: cloneLine,
    ensureAdmin: ensureAdmin, sumLines: sumLines, grossOf: grossOf, splitOf: splitOf,
    fallbackSuggest: fallbackSuggest, ensureSkeleton: ensureSkeleton, linesForEdit: linesForEdit, booksLines: booksLines,
    sideLabel: sideLabel, headerFromTxn: headerFromTxn, pdfFields: pdfFields, signRects: signRects
  };
})(typeof window !== 'undefined' ? window : globalThis);
