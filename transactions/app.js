/* ENESMA REALTY · Transaction Center — single-page app (talks to the Apps Script API in config.js). */
(function () {
'use strict';
var CFG = window.TC_CONFIG || {};
var DEMO = /[?&]demo=1\b/.test(location.search) || sessionStorage.getItem('tc_demo') === '1';
var $app = document.getElementById('app');
var S = { token: null, user: null, scope: 'personal', filter: '', dash: null, txn: null, tab: 'checklist', badges: { review: 0 }, tcApi: undefined, crmApi: false, crm: null, asRole: sessionStorage.getItem('tc_role') || '' };

/* ---------------- utilities ---------------- */
function h(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function qs(sel, root) { return (root || document).querySelector(sel); }
function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function money(n) { n = Number(String(n || '').replace(/[$,\s]/g, '')); if (!n) return '$0'; return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 }); }
function moneyShort(n) { n = Number(n) || 0; if (n >= 1e6) return '$' + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, '') + 'M'; if (n >= 1e3) return '$' + Math.round(n / 1e3) + 'K'; return '$' + n; }
function fmtDate(s) { if (!s) return ''; var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); if (!m) return s; return m[2] + '/' + m[3] + '/' + m[1]; }
function fmtTs(s) { if (!s) return ''; var d = new Date(s); if (isNaN(d)) return s; return d.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' PT'; }
function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); }
function toast(msg, bad) { var t = document.createElement('div'); t.className = 'toast' + (bad ? ' bad' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, bad ? 6000 : 3500); }
function debounce(fn, ms) { var t; return function () { var a = arguments, s = this; clearTimeout(t); t = setTimeout(function () { fn.apply(s, a); }, ms); }; }
/* Display name: First Last (v1.2.1+), else the legacy name, else the email (older backends). */
function hasName(u) { return !!(u && (String(u.firstName || '').trim() || String(u.lastName || '').trim() || String(u.name || '').trim())); }
function uName(u) { if (!u) return ''; var fl = [u.firstName, u.lastName].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' '); return fl || String(u.name || '').trim() || u.email || u.username || ''; }
function splitNm(u) { if (u.firstName || u.lastName) return { f: u.firstName || '', l: u.lastName || '' }; var p = String(u.name || '').trim().split(/\s+/); return { f: p[0] || '', l: p.slice(1).join(' ') }; }
var NAME_MAX = 50;
function nameErr(f, l) { if (!f) return 'First name is required.'; if (!l) return 'Last name is required.'; if (f.length > NAME_MAX || l.length > NAME_MAX) return 'Names must be ' + NAME_MAX + ' characters or fewer.'; return ''; }
/* Activity labels. 'converted' from a listing (older backends) and 'accepted_contract' both read as Accepted Contract. */
function actLabel(a, t) { var x = String(a.action || ''); if (x === 'accepted_contract' || (x === 'converted' && t && t.convertedFrom === 'listing')) return 'Accepted Contract'; return x.replace(/_/g, ' '); }
function isAdmin() { return S.user && S.user.role === 'admin'; }
/* Roles (backend 1.3.0+, detected from ping). Older backends: the single role field, and no TC features at all. */
function myRoles() { if (!S.user) return []; if (S.user.role === 'admin') return ['admin']; return (S.tcApi && S.user.roles && S.user.roles.length) ? S.user.roles : [S.user.role === 'tc' ? 'tc' : 'agent']; }
function isDual() { return !!S.tcApi && myRoles().length > 1; }
function activeRole() { var r = myRoles(); return r.indexOf(S.asRole) >= 0 ? S.asRole : r[0]; }
function isTC() { return !!S.tcApi && activeRole() === 'tc'; }
function rolesOf(u) { if (!u) return []; if (u.role === 'admin') return ['admin']; return (u.roles && u.roles.length) ? u.roles : [u.role === 'tc' ? 'tc' : 'agent']; }
function roleLabel(u) { var r = rolesOf(u); if (r[0] === 'admin') return 'Admin'; return r.map(function (x) { return x === 'tc' ? 'Transaction Coordinator' : 'Agent'; }).join(' · '); }
function setRole(r) { S.asRole = r; sessionStorage.setItem('tc_role', r); S.scope = 'personal'; S.filter = ''; S.dash = null; S.txn = null; S.crm = null; if (location.hash && location.hash !== '#/') location.hash = '#/'; else route(); }
var SEARCH_ICON = '<svg viewBox="0 0 24 24"><defs><linearGradient id="sgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAD59E"/><stop offset="1" stop-color="#D5BE87"/></linearGradient></defs><g fill="none" stroke="url(#sgr)" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M16 16l5 5"/></g></svg>';

/* ---------------- API ---------------- */
function api(action, params) {
  var body = Object.assign({ action: action, token: S.token }, params || {});
  if (isDual() && action !== 'ping' && action !== 'login') body.asRole = activeRole();   // the server checks every call against this role
  if (DEMO || !CFG.API_URL) {
    if (!DEMO) return Promise.reject(Object.assign(new Error('The Transaction Center backend is not connected yet.'), { code: 'SETUP' }));
    return window.TC_MOCK.call(body).then(unwrap);
  }
  return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('Server error ' + r.status); return r.json(); }, function () { throw new Error('Could not reach the server. Check your connection and try again.'); })
    .then(unwrap);
}
function unwrap(res) {
  if (res && res.ok) return res.data;
  var e = new Error((res && res.error) || 'Something went wrong.'); e.code = res && res.code;
  if (e.code === 'AUTH') { signOutLocal(); render(); }
  if (e.code === 'MUST_CHANGE' && S.user) { S.user.mustChange = true; render(); }
  throw e;
}
/* The session token lives only in sessionStorage (cleared when the tab closes), never in localStorage or a URL. */
function storeToken(tok) {
  S.token = tok;
  sessionStorage.removeItem('tc_t');
  try { localStorage.removeItem('tc_t'); } catch (e) { /* clean up tokens saved by older versions */ }
  if (tok) sessionStorage.setItem('tc_t', tok);
}
function signOutLocal() { storeToken(null); S.user = null; S.crm = null; CRM_UI.agentId = ''; S.dash = null; S.txn = null; S.asRole = ''; sessionStorage.removeItem('tc_role'); }

/* ---------------- intake definitions ---------------- */
var TYPES = [
  { k: 'listing', l: 'Listing', d: 'Seller listing agreement' },
  { k: 'purchase', l: 'Purchase', d: 'Accepted offer / escrow' },
  { k: 'lease_listing', l: 'Lease Listing', d: 'Property listed for rent' },
  { k: 'lease', l: 'Lease', d: 'Signed lease' },
  { k: 'referral', l: 'Referral', d: 'Client referred out' }
];
var TYPE_LABEL = { listing: 'Listing', purchase: 'Purchase', lease_listing: 'Lease Listing', lease: 'Lease', referral: 'Referral' };
var PROP_TYPES = ['Single Family', 'Condo', 'Townhome', '2-4 Units', '5+ Units', 'Manufactured / Mobile', 'Land', 'Commercial'];
var PROPERTY = [
  { k: 'address', l: 'Property address', r: 1, w: 2 }, { k: 'city', l: 'City', r: 1 }, { k: 'zip', l: 'ZIP', r: 1 },
  { k: 'apn', l: 'APN' }, { k: 'propertyType', l: 'Property type', opts: PROP_TYPES }, { k: 'yearBuilt', l: 'Year built', t: 'number' }, { k: 'mlsNumber', l: 'MLS #' }
];
var F = {
  listing: [
    { h: 'Property' }].concat(PROPERTY).concat([
    { h: 'Listing agreement' },
    { k: 'listingDate', l: 'Listing contract date', t: 'date', r: 1 }, { k: 'expirationDate', l: 'Expiration date', t: 'date', r: 1 },
    { k: 'listPrice', l: 'List price', t: 'money', r: 1 }, { k: 'listingCommission', l: 'Listing commission', r: 1, comm: 1 },
    { k: 'buyerBrokerComp', l: 'Offered to buyer broker', comm: 1 }, { k: 'occupancy', l: 'Occupancy', opts: ['Owner occupied', 'Tenant occupied', 'Vacant'] },
    { h: 'Sellers' }, { k: 'sellers', l: 'Sellers', people: 1, r: 1 },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]),
  purchase: [
    { h: 'Who we represent' }, { k: 'side', l: 'We represent', r: 1, radio: [['buyer', 'Buyer'], ['seller', 'Seller'], ['both', 'Both sides']], w: 3 },
    { h: 'Property' }].concat(PROPERTY).concat([
    { h: 'Contract' },
    { k: 'contractDate', l: 'Contract (acceptance) date', t: 'date', r: 1 }, { k: 'estCloseDate', l: 'Estimated close of escrow', t: 'date', r: 1 },
    { k: 'purchasePrice', l: 'Purchase price', t: 'money', r: 1 }, { k: 'emdAmount', l: 'Earnest money deposit', t: 'money' },
    { k: 'commission', l: 'Our commission', r: 1, comm: 1 }, { k: 'financing', l: 'Financing', opts: ['Conventional', 'FHA', 'VA', 'Cash', 'Other'] },
    { h: 'Buyers' }, { k: 'buyers', l: 'Buyers', people: 1, r: 1 },
    { h: 'Sellers' }, { k: 'sellers', l: 'Sellers', people: 1, r: 1 },
    { h: 'Escrow, title & lender' },
    { k: 'escrowCompany', l: 'Escrow company', r: 1 }, { k: 'escrowNumber', l: 'Escrow #' }, { k: 'escrowOfficer', l: 'Escrow officer · phone · email' },
    { k: 'titleCompany', l: 'Title company' }, { k: 'lender', l: 'Lender' }, { k: 'loanOfficer', l: 'Loan officer · phone · email' },
    { k: 'otherAgent', l: 'Other agent · brokerage · phone', w: 3 },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]),
  lease_listing: [
    { h: 'Property' }].concat(PROPERTY).concat([
    { h: 'Lease listing agreement' },
    { k: 'listingDate', l: 'Listing contract date', t: 'date', r: 1 }, { k: 'expirationDate', l: 'Expiration date', t: 'date', r: 1 },
    { k: 'monthlyRent', l: 'Monthly rent', t: 'money', r: 1 }, { k: 'listingCommission', l: 'Listing commission', r: 1, comm: 1 },
    { h: 'Landlords' }, { k: 'landlords', l: 'Landlords', people: 1, r: 1 },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]),
  lease: [
    { h: 'Who we represent' }, { k: 'side', l: 'We represent', r: 1, radio: [['tenant', 'Tenant'], ['landlord', 'Landlord'], ['both', 'Both sides']], w: 3 },
    { h: 'Property' }].concat(PROPERTY).concat([
    { h: 'Lease' },
    { k: 'leaseStart', l: 'Lease start', t: 'date', r: 1 }, { k: 'leaseEnd', l: 'Lease end', t: 'date' },
    { k: 'monthlyRent', l: 'Monthly rent', t: 'money', r: 1 }, { k: 'securityDeposit', l: 'Security deposit', t: 'money' },
    { k: 'commission', l: 'Our commission', r: 1, comm: 1 },
    { h: 'Landlords' }, { k: 'landlords', l: 'Landlords', people: 1, r: 1 },
    { h: 'Tenants' }, { k: 'tenants', l: 'Tenants', people: 1, r: 1 },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]),
  referral: [
    { h: 'Referral' },
    { k: 'clientName', l: 'Client name', r: 1 }, { k: 'clientPhone', l: 'Client phone', t: 'tel' }, { k: 'clientEmail', l: 'Client email', t: 'email' },
    { k: 'referredTo', l: 'Referred to (agent · brokerage)', r: 1, w: 2 }, { k: 'referralFee', l: 'Referral fee', r: 1, comm: 1 },
    { k: 'location', l: 'Area / location', r: 1 }, { k: 'expectedClose', l: 'Expected close', t: 'date' }, { k: 'referralSide', l: 'Client is', opts: ['Buyer', 'Seller', 'Tenant', 'Landlord'] },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]
};

/* Commission inputs: number + %/$ toggle. Stored as <k> = number, <k>Type = 'percent' | 'amount'. */
function commType(v, ty) { return ty === 'amount' || ty === 'percent' ? ty : (/\$/.test(String(v || '')) ? 'amount' : 'percent'); }
function fmtComm(v, ty) {
  if (!v) return ''; var n = String(v).replace(/[$,%\s]/g, '');
  if (!/^\d+(\.\d+)?$/.test(n)) return String(v);
  return commType(v, ty) === 'amount' ? '$' + Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : n + '%';
}
function fieldHtml(f, v, pre, all) {
  var id = (pre || 'f') + '_' + f.k, req = f.r ? ' <span class="req">*</span>' : '';
  var cls = 'f' + (f.w === 2 ? ' w2' : f.w === 3 ? ' w3' : '');
  if (f.comm) {
    var ty = commType(v, (all || {})[f.k + 'Type']), num = String(v == null ? '' : v).replace(/[$,%\s]/g, '');
    return '<div class="' + cls + '" data-k="' + f.k + '" data-r="' + (f.r ? 1 : '') + '" data-comm="1"><label for="' + id + '">' + h(f.l) + req + '</label><div class="comm"><input id="' + id + '" type="text" inputmode="decimal" placeholder="' + (ty === 'amount' ? 'Amount' : 'Rate') + '" value="' + h(num) + '">' +
      '<div class="seg" role="radiogroup" aria-label="' + h(f.l) + ' unit">' + [['percent', '%'], ['amount', '$']].map(function (o) {
        return '<label class="' + (ty === o[0] ? 'on' : '') + '" title="' + (o[0] === 'percent' ? 'Percent' : 'Dollar amount') + '"><input type="radio" name="' + id + '_ty" value="' + o[0] + '"' + (ty === o[0] ? ' checked' : '') + '>' + o[1] + '</label>';
      }).join('') + '</div></div></div>';
  }
  if (f.people) {
    var arr = (v && v.length) ? v : [{}];
    return '<div class="f w3 people" data-k="' + f.k + '" data-r="' + (f.r ? 1 : '') + '"><label>' + h(f.l) + req + ' · name, phone, email</label><div class="plist">' +
      arr.map(personRow).join('') + '</div><div><button type="button" class="link addp">+ Add another</button></div></div>';
  }
  if (f.radio) {
    return '<div class="' + cls + '" data-k="' + f.k + '" data-r="' + (f.r ? 1 : '') + '"><label>' + h(f.l) + req + '</label><div class="radios">' + f.radio.map(function (o) {
      return '<label class="' + (v === o[0] ? 'on' : '') + '"><input type="radio" name="' + id + '" value="' + o[0] + '"' + (v === o[0] ? ' checked' : '') + '> ' + h(o[1]) + '</label>';
    }).join('') + '</div></div>';
  }
  var inner;
  if (f.opts) inner = '<select id="' + id + '"><option value="">Select…</option>' + f.opts.map(function (o) { return '<option' + (v === o ? ' selected' : '') + '>' + h(o) + '</option>'; }).join('') + '</select>';
  else if (f.ta) inner = '<textarea id="' + id + '">' + h(v) + '</textarea>';
  else {
    var t = f.t === 'money' ? 'text' : (f.t || 'text');
    inner = '<input id="' + id + '" type="' + t + '"' + (f.t === 'money' ? ' inputmode="decimal" placeholder="$"' : '') + (f.ph ? ' placeholder="' + h(f.ph) + '"' : '') + ' value="' + h(v) + '"' + (f.k === 'zip' ? ' inputmode="numeric" maxlength="10"' : '') + '>';
  }
  return '<div class="' + cls + '" data-k="' + f.k + '" data-r="' + (f.r ? 1 : '') + '"><label for="' + id + '">' + h(f.l) + req + '</label>' + inner + '</div>';
}
function personRow(p) {
  p = p || {};
  return '<div class="prow"><input type="text" placeholder="Full name" value="' + h(p.name) + '" data-p="name"><input type="tel" placeholder="Phone" value="' + h(p.phone) + '" data-p="phone"><input type="email" placeholder="Email" value="' + h(p.email) + '" data-p="email"><button type="button" class="x" title="Remove">×</button></div>';
}
function formHtml(type, intake, pre, skip) {
  var out = '', open = false;
  F[type].forEach(function (f) {
    if (skip && skip[f.k]) return;
    if (f.h) { if (open) out += '</div></div>'; out += '<div class="card gb" data-h="' + h(f.h) + '"><h3>' + h(f.h) + '</h3><div class="fgrid">'; open = true; return; }
    out += fieldHtml(f, (intake || {})[f.k], pre, intake);
  });
  if (open) out += '</div></div>';
  return out.replace(/<div class="card gb" data-h="[^"]*"><h3>[^<]*<\/h3><div class="fgrid"><\/div><\/div>/g, '');
}
function wireForm(root) {
  root.addEventListener('click', function (e) {
    if (e.target.classList.contains('addp')) { var l = e.target.closest('.people').querySelector('.plist'); l.insertAdjacentHTML('beforeend', personRow()); }
    if (e.target.classList.contains('x') && e.target.closest('.prow')) { var pl = e.target.closest('.plist'); if (pl.children.length > 1) e.target.closest('.prow').remove(); else qsa('input', e.target.closest('.prow')).forEach(function (i) { i.value = ''; }); }
  });
  root.addEventListener('change', function (e) {
    if (e.target.type === 'radio') qsa('label', e.target.closest('.radios,.seg')).forEach(function (l) { l.classList.toggle('on', l.contains(e.target)); });
    if (e.target.type === 'radio' && e.target.closest('.seg')) { var ci = qs('input[type=text]', e.target.closest('.comm')); if (ci) ci.placeholder = e.target.value === 'amount' ? 'Amount' : 'Rate'; }
  });
}
function readForm(root) {
  var out = {}, missing = [];
  qsa('.f[data-k]', root).forEach(function (el) {
    var k = el.getAttribute('data-k'), v;
    if (el.classList.contains('people')) {
      v = qsa('.prow', el).map(function (r) { var p = {}; qsa('input', r).forEach(function (i) { p[i.getAttribute('data-p')] = i.value.trim(); }); return p; }).filter(function (p) { return p.name; });
    } else if (el.getAttribute('data-comm')) {
      var ck = qs('.seg input:checked', el); v = qs('input[type=text]', el).value.replace(/[$,%\s]/g, '');
      out[k + 'Type'] = ck ? ck.value : 'percent';
      if (v && (!/^\d+(\.\d+)?$/.test(v) || (out[k + 'Type'] === 'percent' && Number(v) > 100))) { el.classList.add('bad'); missing.push(qs('label', el).textContent.replace(/\s*\*.*$/, '') + ' (number only, % up to 100)'); out[k] = v; return; }
    } else if (qs('.radios', el)) { var c = qs('input:checked', el); v = c ? c.value : ''; }
    else { var inp = qs('input,select,textarea', el); v = inp ? inp.value.trim() : ''; }
    out[k] = v;
    var bad = el.getAttribute('data-r') && (Array.isArray(v) ? !v.length : !v);
    el.classList.toggle('bad', !!bad); if (bad) missing.push(qs('label', el).textContent.replace(/\s*\*.*$/, '').replace(/ · name.*$/, ''));
  });
  if (out.listingDate && out.expirationDate && out.expirationDate <= out.listingDate) missing.push('Expiration must be after the listing contract date');
  return { intake: out, missing: missing };
}

/* ---------------- shell ---------------- */
/* Title lockup: TRANSACTION (Michroma, wide tracking) over CENTER (smaller, wider tracking, Aztec Gold gradient). Live text, no image. */
/* Shared title lockup: the ONE source for the product name. Used by the sign-in screen, the header, the page <title>,
   and (rendered to assets/tc-title-email.png from this same markup + app.css) the backend's emails and the Agent Hub tile. */
var APP_NAME = CFG.APP_NAME || 'Transaction Center';
function titleMark(size) {
  var w = APP_NAME.split(/\s+/), last = w.pop();
  return '<span class="tc-title ' + size + '" role="img" aria-label="' + h(APP_NAME) + '"><span class="tc-t1" aria-hidden="true">' + h(w.join(' ')) + '</span> <span class="tc-t2" aria-hidden="true">' + h(last) + '</span></span>';
}
document.title = APP_NAME;
function shell(active, inner) {
  // No '+ New' tab: My Transactions has the '+ New Transaction' button; the new-transaction screen lights up Transactions.
  var nav = '<a href="#/" class="' + (active === 'dash' || active === 'new' ? 'on' : '') + '">Transactions</a>';
  if (isAdmin()) nav += '<a href="#/review" class="' + (active === 'review' ? 'on' : '') + '">Review' + (S.badges.review ? '<span class="cnt">' + S.badges.review + '</span>' : '') + '</a><a href="#/users" class="' + (active === 'users' ? 'on' : '') + '">Users</a><a href="#/archive" class="' + (active === 'archive' ? 'on' : '') + '">Archive</a>';
  // CRM sits last, set apart from the transaction tabs (gold tab, divider before it).
  if (canCrm()) nav += '<a href="#/crm" class="crmtab' + (active === 'crm' ? ' on' : '') + '"' + (active === 'crm' ? ' aria-current="page"' : '') + '>CRM</a>';
  var tog = isDual() ? '<div class="rtog seg" role="group" aria-label="View as">' + [['agent', 'My Files'], ['tc', 'TC View']].map(function (x) { return '<button type="button" data-role="' + x[0] + '" class="' + (activeRole() === x[0] ? 'on' : '') + '" aria-pressed="' + (activeRole() === x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' : '';
  return (DEMO ? '<div class="demo"><b>DEMO PREVIEW</b> · sample data only, nothing is saved · <a href="#" id="exitDemo" style="color:#FBFBFB">exit demo</a></div>' : '') +
    '<header id="hdr"><button class="nbtn" id="nbtn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span><span></span></button>' +
    '<a class="brand" href="#/" aria-label="Transaction Center home">' + titleMark('tc-sm') + '</a>' +
    '<nav class="main" id="mnav" aria-label="Main">' + nav + '</nav><div class="hspace"></div>' + tog +
    '<div class="search"><span>' + SEARCH_ICON + '</span><input id="q" type="search" placeholder="Search address, client, escrow #" autocomplete="off" aria-label="Search transactions"><div class="sres hidden" id="sres"></div></div>' +
    '<div class="umenu"><button class="ubtn" id="ubtn" aria-label="Account">' + h(initials(uName(S.user))) + '</button><div class="udrop hidden" id="udrop"><div class="who"><b>' + h(uName(S.user)) + '</b>' + h(roleLabel(S.user)) + (isDual() ? '<br><small>Now: ' + (isTC() ? 'TC View' : 'My Files') + '</small>' : '') + '</div><a href="#/account">Change password</a><button id="signout">Sign out</button></div></div></header>' +
    '<main>' + inner + '</main>';
}
var docClickBound = false;
function wireShell() {
  var q = qs('#q'), box = qs('#sres');
  if (q) {
    var run = debounce(function () {
      var v = q.value.trim(); if (v.length < 2) { box.classList.add('hidden'); return; }
      api('search', { q: v }).then(function (d) {
        box.innerHTML = d.results.length ? d.results.map(function (r) { return '<a href="#/t/' + h(r.id) + '"><b>' + h(r.title) + '</b><small>' + h(r.typeLabel) + ' · ' + h(r.status) + ' · ' + h(r.clients) + (isAdmin() || isTC() ? ' · ' + h(r.agentName) : '') + '</small></a>'; }).join('') : '<div class="empty">No matches for “' + h(v) + '”.</div>';
        box.classList.remove('hidden');
      }).catch(function (e) { toast(e.message, 1); });
    }, 300);
    q.addEventListener('input', run);
    box.addEventListener('click', function () { box.classList.add('hidden'); q.value = ''; });
  }
  if (!docClickBound) {
    docClickBound = true;
    document.addEventListener('click', function (e) {
      var b = qs('#sres'); if (b && !e.target.closest('.search')) b.classList.add('hidden');
      var u = qs('#udrop'); if (u && !e.target.closest('.umenu')) u.classList.add('hidden');
    });
  }
  var ub = qs('#ubtn'); if (ub) { ub.setAttribute('aria-haspopup', 'true'); ub.setAttribute('aria-expanded', 'false'); ub.onclick = function () { var d = qs('#udrop'); d.classList.toggle('hidden'); ub.setAttribute('aria-expanded', d.classList.contains('hidden') ? 'false' : 'true'); }; }
  /* narrow screens: tabs live behind the hamburger */
  var nb = qs('#nbtn'), hd = qs('#hdr');
  if (nb && hd) {
    var setNav = function (open, focusBtn) { hd.classList.toggle('navopen', open); nb.setAttribute('aria-expanded', open ? 'true' : 'false'); nb.setAttribute('aria-label', open ? 'Close menu' : 'Menu'); if (open) { var f = qs('#mnav a'); if (f) f.focus(); } else if (focusBtn) nb.focus(); };
    nb.onclick = function () { setNav(!hd.classList.contains('navopen')); };
    hd.addEventListener('keydown', function (e) { if (e.key === 'Escape' && hd.classList.contains('navopen')) { setNav(false, true); } });
    qsa('#mnav a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  }
  qsa('.rtog button').forEach(function (b) { b.onclick = function () { if (b.getAttribute('data-role') !== activeRole()) setRole(b.getAttribute('data-role')); }; });
  var so = qs('#signout'); if (so) so.onclick = function () { api('logout').catch(function () { }); signOutLocal(); location.hash = '#/'; render(); };
  var ex = qs('#exitDemo'); if (ex) ex.onclick = function (e) { e.preventDefault(); sessionStorage.removeItem('tc_demo'); signOutLocal(); location.href = location.pathname; };
}
/* Which page the current URL should show; a slow response for a page the user already left is dropped. */
function expectedPage() {
  var hs = location.hash.replace(/^#/, '') || '/';
  if (hs === '/new') return 'new';
  if (hs === '/account') return '';
  if (/^\/crm(\/|$)/.test(hs) && canCrm()) return 'crm';
  if (/^\/(review|users|archive)$/.test(hs) && isAdmin()) return hs.slice(1);
  return 'dash';
}
function page(active, inner, after) { if (S.user && !S.user.mustChange && active !== expectedPage()) return; $app.innerHTML = shell(active, inner); wireShell(); if (!page.keepScroll) window.scrollTo(0, 0); page.keepScroll = false; if (after) after(); }
function loading(active) { page(active, '<div class="loading"><span class="spin"></span>Loading…</div>'); }
function failView(active, e) { page(active, '<div class="err">' + h(e.message) + '</div><a class="ub" href="#/">Back to transactions</a>'); }

/* ---------------- login / password ---------------- */
function loginView(msg) {
  var noApi = !CFG.API_URL && !DEMO;
  $app.innerHTML = '<div class="login"><form class="box" id="lf" autocomplete="on"><h1 class="app">' + titleMark('tc-lg') + '</h1>' +
    (msg ? '<div class="err">' + h(msg) + '</div>' : '') +
    (noApi ? '<div class="ok">The secure backend is being connected. Sign-in opens as soon as setup is finished.<br><a href="?demo=1">Preview with sample data</a></div>' : '') +
    (DEMO ? '<div class="ok">Demo preview. Sign in as <b>admin@demo.test</b> or <b>agent@demo.test</b> with password <b>demo</b>.</div>' : '') +
    '<div class="f"><label for="lu">Email</label><input id="lu" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" required></div>' +
    '<div class="f"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required></div>' +
    '<button class="btn" id="lb"' + (noApi ? ' disabled' : '') + '>Sign in</button><div class="fine"><a href="#" id="lc">First time or forgot password?</a><br>Private system · access is logged.</div></form></div>';
  qs('#lc').onclick = function (e) { e.preventDefault(); codeView(qs('#lu').value.trim()); };
  qs('#lf').onsubmit = function (e) {
    e.preventDefault(); var b = qs('#lb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Signing in…';
    api('login', { email: qs('#lu').value.trim().toLowerCase(), username: qs('#lu').value.trim().toLowerCase(), password: qs('#lp').value }).then(function (d) {
      storeToken(d.token); S.user = d.user; render();
    }).catch(function (err) { var em = qs('#lu').value; loginView(err.message); qs('#lu').value = em; qs('#lp').focus(); });
  };
}
/* First sign-in and forgot password: a 6-digit code is emailed from Enrique's Apps Script account. */
function codeView(email, step, msg, okMsg) {
  var two = step === 2;
  $app.innerHTML = '<div class="login"><form class="box" id="cf" autocomplete="on"><h1 class="app">' + titleMark('tc-lg') + '</h1>' +
    '<h2 style="font-size:17px;margin:0 0 6px">' + (two ? 'Enter your code' : 'Set up or reset your password') + '</h2>' +
    '<p class="sub" style="margin:0 0 14px">' + (two ? 'We emailed a 6-digit code to <b>' + h(email) + '</b>. It expires in 15 minutes. Check spam if you don’t see it.' : 'Enter the email address the office registered for you. We’ll email you a code.') + '</p>' +
    (msg ? '<div class="err">' + h(msg) + '</div>' : '') + (okMsg ? '<div class="ok">' + h(okMsg) + '</div>' : '') +
    (two ? '<input type="hidden" id="ce" value="' + h(email) + '"><div class="f"><label for="cc">Code</label><input id="cc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div>' +
      '<div class="f"><label for="c1">New password</label><input id="c1" type="password" autocomplete="new-password" minlength="10" required></div>' +
      '<div class="f"><label for="c2">Repeat new password</label><input id="c2" type="password" autocomplete="new-password" required></div>' +
      '<p class="sub" style="font-size:12px;margin:0 0 12px">At least 10 characters with letters and numbers.</p>'
      : '<div class="f"><label for="ce">Email</label><input id="ce" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" value="' + h(email) + '" required></div>') +
    '<button class="btn" id="cb">' + (two ? 'Save password and sign in' : 'Email me a code') + '</button><div class="fine">' + (two ? '<a href="#" id="cr">Send a new code</a> · ' : '') + '<a href="#" id="cbk">Back to sign in</a></div></form></div>';
  qs('#cbk').onclick = function (e) { e.preventDefault(); loginView(); };
  if (qs('#cr')) qs('#cr').onclick = function (e) { e.preventDefault(); codeView(email); };
  function unsupported(err) { return /unknown action/i.test(err.message) ? 'Password setup by email isn’t switched on yet. Ask Enrique to reset your password.' : err.message; }
  qs('#cf').onsubmit = function (e) {
    e.preventDefault(); var b = qs('#cb'), em = qs('#ce').value.trim().toLowerCase();
    if (!two) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return codeView(em, 1, 'Enter a valid email address.');
      b.disabled = true; b.innerHTML = '<span class="spin"></span>Sending…';
      return api('requestPasswordCode', { email: em }).then(function () { codeView(em, 2, '', 'If that email has an account, a code is on its way.'); }).catch(function (err) { codeView(em, 1, unsupported(err)); });
    }
    var p1 = qs('#c1').value;
    if (p1 !== qs('#c2').value) return codeView(em, 2, 'The new passwords do not match.');
    if (p1.length < 10 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) return codeView(em, 2, 'Use at least 10 characters with letters and numbers.');
    b.disabled = true; b.innerHTML = '<span class="spin"></span>Saving…';
    api('resetPasswordWithCode', { email: em, code: qs('#cc').value.trim(), newPassword: p1 }).then(function (d) { storeToken(d.token); S.user = d.user; toast('Password saved. You’re signed in.'); location.hash = '#/'; render(); })
      .catch(function (err) { codeView(em, 2, unsupported(err)); });
  };
}
function passwordView(forced) {
  var inner = '<div style="max-width:520px"><h1>' + (forced ? 'Set your password' : 'Change password') + '</h1><p class="sub">' + (forced ? 'Choose your own password before continuing. ' : '') + 'At least 10 characters with letters and numbers.</p>' +
    (forced ? '' : '<div class="card gb" id="acct" style="margin-bottom:14px"><h3>' + h(uName(S.user)) + '</h3><small>' + h(roleLabel(S.user)) + '</small></div>') +
    '<form class="card gb" id="pf"><div id="pe"></div><div class="f" style="margin-bottom:12px"><label>Current password</label><input type="password" id="p0" autocomplete="current-password" required></div>' +
    '<div class="f" style="margin-bottom:12px"><label>New password</label><input type="password" id="p1" autocomplete="new-password" minlength="10" required></div>' +
    '<div class="f"><label>Repeat new password</label><input type="password" id="p2" autocomplete="new-password" required></div><div class="actions">' + (forced ? '<button type="button" class="ub" id="pout">Sign out</button>' : '') + '<button class="btn">Save password</button></div></form></div>';
  if (forced) {
    $app.innerHTML = '<header><a class="brand">' + titleMark('tc-sm') + '</a></header><main>' + inner + '</main>';
    qs('#pout').onclick = function () { api('logout').catch(function () { }); signOutLocal(); render(); };
  } else page('', inner);
  qs('#pf').onsubmit = function (e) {
    e.preventDefault(); var p1 = qs('#p1').value;
    if (p1 !== qs('#p2').value) { qs('#pe').innerHTML = '<div class="err">The new passwords do not match.</div>'; return; }
    if (p1.length < 10 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) { qs('#pe').innerHTML = '<div class="err">Use at least 10 characters with letters and numbers.</div>'; return; }
    api('changePassword', { current: qs('#p0').value, newPassword: p1 }).then(function (d) { if (d.token) storeToken(d.token); S.user = d.user; toast('Password saved.'); location.hash = '#/'; render(); })
      .catch(function (err) { qs('#pe').innerHTML = '<div class="err">' + h(err.message) + '</div>'; });
  };
}

/* ---------------- dashboard ---------------- */
function statusPill(st) {
  var c = { 'Active': 'p-ok', 'In Escrow': 'p-pend', 'Closed': 'p-dark', 'Expired Contract': 'p-miss', 'Cancelled': 'p-miss' }[st] || 'p-miss';
  return '<span class="pill ' + c + '">' + h(st) + '</span>';
}
function tileHtml(t) {
  var p = t.progress || {}, pct = p.required ? Math.round(p.approved / p.required * 100) : 0;
  var pills = statusPill(t.status) + (p.rejected ? '<span class="pill p-rej">' + p.rejected + ' Rejected</span>' : '') + (p.pending ? '<span class="pill p-pend">' + p.pending + ' Pending</span>' : '') + (t.cancelPending ? '<span class="pill p-rej">Cancel requested</span>' : '');
  return '<a class="tile ' + (p.rejected || t.cancelPending ? 'rb' : 'gb') + '" href="#/t/' + h(t.id) + '"><div class="pills">' + pills + '</div><h3>' + h(t.title) + '</h3><p>' + h(t.typeLabel) + ' · ' + h(t.keyDate) + '</p><p>' + h(t.clients) + '</p>' +
    ((isAdmin() && S.scope === 'company') || isTC() ? '<p>Agent: ' + h(t.agentName) + '</p>' : '') + (t.tcName && !isTC() ? '<p>TC: ' + h(t.tcName) + '</p>' : '') + '<div class="grow"></div><div class="bar"><i style="width:' + pct + '%"></i></div><p>' + (p.approved || 0) + '/' + (p.required || 0) + ' required docs approved</p></a>';
}
function dashView() {
  loading('dash');
  api('dashboard', { scope: S.scope }).then(function (d) {
    S.dash = d; if (isAdmin()) S.badges.review = (d.pendingReview || 0) + (d.cancelRequests || 0);
    var c = d.counts, st = d.stats;
    var statDefs = [['type:listing', c.listings, 'Listings'], ['type:purchase', c.purchases, 'Purchases'], ['Active', c.Active, 'Active'], ['In Escrow', c['In Escrow'], 'In Escrow'], ['Closed', c.Closed, 'Closed'], ['Expired Contract', c['Expired Contract'], 'Expired']];
    var extra = [];
    if (c.leaseListings) extra.push(c.leaseListings + ' lease listings'); if (c.leases) extra.push(c.leases + ' leases'); if (c.referrals) extra.push(c.referrals + ' referrals'); if (c.Cancelled) extra.push(c.Cancelled + ' cancelled');
    var inner = '<div class="top"><div><h1>' + (S.scope === 'company' ? 'Company Transactions' : isTC() ? 'My TC Files' : 'My Transactions') + '</h1><p class="sub">' + h(S.scope === 'company' ? 'All agents' : isTC() ? uName(S.user) + ' · files you created or coordinate' : uName(S.user)) + ' · ' + d.transactions.length + ' files' + (extra.length ? ' · ' + extra.join(' · ') : '') + '</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + (isAdmin() ? '<div class="seg"><button data-s="personal" class="' + (S.scope === 'personal' ? 'on' : '') + '">Personal</button><button data-s="company" class="' + (S.scope === 'company' ? 'on' : '') + '">Company</button></div>' : '') + '<a class="btn" href="#/new">+ New Transaction</a></div></div>' +
      (isAdmin() && S.badges.review ? '<a class="ok" href="#/review" style="display:block;text-decoration:none"><b>' + d.pendingReview + '</b> checklist item(s) waiting for review' + (d.cancelRequests ? ' · <b>' + d.cancelRequests + '</b> cancellation request(s)' : '') + ' → Open Review</a>' : '') +
      '<div class="stats">' + statDefs.map(function (s) { return '<button class="stat gb' + (S.filter === s[0] ? ' on' : '') + '" data-f="' + h(s[0]) + '"><b>' + (s[1] || 0) + '</b><span>' + s[2] + '</span></button>'; }).join('') + '</div>' +
      '<div class="vol gb"><div class="ttl">Closed in the last 12 months' + (S.scope === 'company' ? ' · company' : '') + '</div><div><span>Closed deals</span><b>' + st.closedCount + '</b></div><div><span>Seller volume (' + st.sellerSides + ')</span><b>' + moneyShort(st.sellerVolume) + '</b></div><div><span>Buyer volume (' + st.buyerSides + ')</span><b>' + moneyShort(st.buyerVolume) + '</b></div><div><span>Combined volume</span><b class="gt">' + moneyShort(st.combinedVolume) + '</b></div></div>' +
      '<div class="chips">' + [['', 'All'], ['open', 'Open'], ['type:listing', 'Listings'], ['type:purchase', 'Purchases'], ['type:lease_listing', 'Lease Listings'], ['type:lease', 'Leases'], ['type:referral', 'Referrals'], ['Active', 'Active'], ['In Escrow', 'In Escrow'], ['Closed', 'Closed'], ['Expired Contract', 'Expired'], ['Cancelled', 'Cancelled']].map(function (x) { return '<button class="chip' + (S.filter === x[0] ? ' on' : '') + '" data-f="' + h(x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="grid" id="tiles"></div>';
    page('dash', inner, function () {
      drawTiles();
      qsa('[data-f]').forEach(function (b) { b.onclick = function () { var f = b.getAttribute('data-f'); S.filter = (S.filter === f && b.classList.contains('stat')) ? '' : f; qsa('[data-f]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-f') === S.filter); }); drawTiles(); }; });
      qsa('.seg button[data-s]').forEach(function (b) { b.onclick = function () { S.scope = b.getAttribute('data-s'); S.filter = ''; dashView(); }; });
    });
  }).catch(function (e) { failView('dash', e); });
}
function drawTiles() {
  var f = S.filter, list = S.dash.transactions.filter(function (t) {
    if (!f) return true; if (f === 'open') return t.status === 'Active' || t.status === 'In Escrow';
    if (f.indexOf('type:') === 0) return t.type === f.slice(5); return t.status === f;
  });
  qs('#tiles').innerHTML = list.length ? list.map(tileHtml).join('') : '<div class="card gb"><b>No transactions here yet.</b><p class="sub" style="margin:6px 0 0">Start one with <a href="#/new">+ New Transaction</a>.</p></div>';
}

/* ---------------- new transaction ---------------- */
function newView(type) {
  var tcMode = isTC();
  var agentsP = isAdmin() ? api('listUsers') : Promise.resolve(null);
  var peopleP = (S.tcApi && !isAdmin()) ? api('listPeople') : Promise.resolve(null);
  Promise.all([agentsP, peopleP]).then(function (res) {
    var users = res[0], ppl = res[1], me = S.user.id;
    var tcOpts = function (list) { return '<option value="">None</option>' + list.map(function (u) { return '<option value="' + h(u.id) + '">' + h(uName(u)) + '</option>'; }).join(''); };
    var people = '';
    if (users) {
      var act = users.filter(function (u) { return u.active; });
      people = '<div class="card gb"><h3>Agent' + (S.tcApi ? ' &amp; coordinator' : '') + '</h3><div class="fgrid"><div class="f w2"><label>File belongs to</label><select id="agentId">' + act.filter(function (u) { return !S.tcApi || rolesOf(u).indexOf('tc') < 0 || rolesOf(u).length > 1; }).map(function (u) { return '<option value="' + h(u.id) + '"' + (u.id === me ? ' selected' : '') + '>' + h(uName(u)) + (u.role === 'admin' ? ' (admin)' : '') + '</option>'; }).join('') + '</select></div>' +
        (S.tcApi ? '<div class="f"><label>Transaction coordinator</label><select id="tcId">' + tcOpts(act.filter(function (u) { return rolesOf(u).indexOf('tc') >= 0; })) + '</select></div>' : '') + '</div></div>';
    } else if (ppl && tcMode) {
      var ags = ppl.agents.filter(function (u) { return u.id !== me; });
      people = '<div class="card gb"><h3>Agent</h3><p class="sub" style="margin:0 0 12px">Pick the agent this file belongs to. It shows up in their files as their own, with you as the coordinator.</p><div class="fgrid"><div class="f w2"><label>Agent <span class="req">*</span></label><select id="agentId" required><option value="">Choose the agent…</option>' + ags.map(function (u) { return '<option value="' + h(u.id) + '">' + h(uName(u)) + '</option>'; }).join('') + '</select></div></div></div>';
    } else if (ppl) {
      people = '<div class="card gb"><h3>Transaction coordinator</h3><p class="sub" style="margin:0 0 12px">Is there a TC on this file? They can upload and edit details but can’t approve anything. Optional.</p><div class="fgrid"><div class="f w2"><label>TC</label><select id="tcId">' + tcOpts(ppl.tcs.filter(function (u) { return u.id !== me; })) + '</select></div></div></div>';
    }
    var inner = '<h1>New Transaction</h1><p class="sub">Choose the type, then answer the intake questions. The checklist unlocks once intake is complete.</p>' +
      '<div class="types">' + TYPES.map(function (t) { return '<button class="type' + (type === t.k ? ' sel' : '') + '" data-t="' + t.k + '">' + t.l + '<small>' + t.d + '</small></button>'; }).join('') + '</div>' +
      (type ? '<form id="nf" novalidate><div id="ne"></div>' +
        people +
        formHtml(type, {}, 'n') + '<div class="actions"><a class="ub" href="#/">Cancel</a><button class="btn" id="nb">Create &amp; open checklist</button></div></form>' : '');
    page('new', inner, function () {
      qsa('.type').forEach(function (b) { b.onclick = function () { newView(b.getAttribute('data-t')); }; });
      var form = qs('#nf'); if (!form) return;
      wireForm(form);
      form.onsubmit = function (e) {
        e.preventDefault(); var r = readForm(form);
        if (tcMode && qs('#agentId') && !qs('#agentId').value) r.missing.unshift('Agent');
        if (r.missing.length) { qs('#ne').innerHTML = '<div class="err">Please complete: ' + h(r.missing.join(', ')) + '</div>'; qs('#ne').scrollIntoView({ behavior: 'smooth' }); return; }
        var b = qs('#nb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Creating folder…';
        api('createTransaction', { type: type, intake: r.intake, agentId: qs('#agentId') ? qs('#agentId').value : undefined, tcId: qs('#tcId') && qs('#tcId').value ? qs('#tcId').value : undefined }).then(function (d) { toast('Transaction created. Checklist unlocked.'); location.hash = '#/t/' + d.id; })
          .catch(function (err) { b.disabled = false; b.textContent = 'Create & open checklist'; qs('#ne').innerHTML = '<div class="err">' + h(err.message) + '</div>'; qs('#ne').scrollIntoView({ behavior: 'smooth' }); });
      };
    });
  }).catch(function (e) { failView('new', e); });
}

/* ---------------- transaction view ---------------- */
function itemPill(s) { return '<span class="pill ' + ({ Approved: 'p-ok', Rejected: 'p-rej', Pending: 'p-pend', Missing: 'p-miss' }[s] || 'p-miss') + '">' + ({ Pending: 'Uploaded – Pending Review' }[s] || h(s)) + '</span>'; }
var PHASE_LABEL = { listing: 'Listing', purchase: 'Purchase', lease_listing: 'Lease Listing', lease: 'Lease', referral: 'Referral' };
function txnView(id, keep) {
  if (!keep) S.tab = 'checklist';
  if (!S.txn || S.txn.txn.id !== id) loading('dash');
  api('getTransaction', { id: id }).then(function (d) { page.keepScroll = !!keep; S.txn = d; drawTxn(); }).catch(function (e) { failView('dash', e); });
}
function canEdit() { var t = S.txn.txn; return isAdmin() || (t.status !== 'Closed' && t.status !== 'Cancelled'); }
function names(arr) { return (arr || []).map(function (x) { return x.name; }).join(', '); }
function drawTxn() {
  var d = S.txn, t = d.txn, i = t.intake || {}, p = t.progress, pct = p.required ? Math.round(p.approved / p.required * 100) : 0;
  var sideTxt = { buyer: 'Buyer side', seller: 'Seller side', both: 'Both sides', tenant: 'Tenant side', landlord: 'Landlord side' }[t.side] || '';
  var who = [];
  if (i.sellers && i.sellers.length) who.push('Sellers: ' + names(i.sellers));
  if (i.buyers && i.buyers.length) who.push('Buyers: ' + names(i.buyers));
  if (i.landlords && i.landlords.length) who.push('Landlords: ' + names(i.landlords));
  if (i.tenants && i.tenants.length) who.push('Tenants: ' + names(i.tenants));
  if (i.clientName) who.push('Client: ' + i.clientName);
  if (i.escrowNumber) who.push('Escrow #' + i.escrowNumber);
  var open = t.status === 'Active' || t.status === 'In Escrow';
  var cr = t.cancelRequest, crPending = cr && cr.state === 'pending';
  var acts = '';
  if (canEdit()) acts += '<button class="btn" id="aSplit">Upload &amp; Split Packet</button>';
  if (open && (t.type === 'listing' || t.type === 'lease_listing') && !crPending) acts += '<button class="ub" id="aConv">' + (t.type === 'listing' ? 'Accepted Contract' : 'Convert to Lease') + '</button>';
  if (open && !crPending) acts += '<button class="ub red" id="aCancel">Request cancellation</button>';
  if (isAdmin()) acts += '<button class="ub" id="aStatus">Set status</button>';
  var banner = '';
  if (crPending) banner = '<div class="err"><b>Cancellation requested</b> by ' + h(cr.requestedByName) + ' on ' + h(fmtTs(cr.requestedAt)) + (cr.reason ? ' · “' + h(cr.reason) + '”' : '') + (cr.relist === true ? ' · Going back on the market (a new listing is created on approval)' : cr.relist === false ? ' · Not going back on the market' : '') + '. Waiting for admin approval.' + (isAdmin() ? ' <a href="#/review">Decide in Review</a>' : '') + '</div>';
  else if (cr && cr.state === 'denied') banner = '<div class="ok">Cancellation request was denied' + (cr.note ? ': “' + h(cr.note) + '”' : '') + '.</div>';
  if (t.childId) banner += '<div class="ok">Relisted as a new file: <a href="#/t/' + h(t.childId) + '">open the new listing</a>.</div>';
  if (t.parentId) banner += '<div class="ok">Relisted from a cancelled file: <a href="#/t/' + h(t.parentId) + '">open the previous file</a>.</div>';
  var docCount = d.documents.filter(function (x) { return !x.removed; }).length;
  var inner = '<div class="top"><div><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">' + statusPill(t.status) + '<span class="pill p-pend">' + h(t.typeLabel) + '</span>' + (t.convertedFrom ? '<span class="pill p-miss">' + (t.convertedFrom === 'listing' ? 'Accepted Contract · from Listing' : 'Converted from ' + h(TYPE_LABEL[t.convertedFrom] || t.convertedFrom)) + '</span>' : '') + '</div><h1>' + h(t.title) + (t.zip ? ' ' + h(t.zip) : '') + '</h1>' +
    '<p class="sub">' + h([sideTxt].concat(who).filter(Boolean).join(' · ')) + (isAdmin() || isTC() ? ' · Agent: ' + h(t.agentName) : '') + (t.tcName ? ' · TC: ' + h(t.tcName) : '') + '</p></div><div style="display:flex;gap:8px;flex-wrap:wrap">' + acts + '</div></div>' + banner +
    '<div class="tabs">' + [['checklist', 'Checklist'], ['storage', 'Document Storage (' + docCount + ')'], ['details', 'Details'], ['activity', 'Notes & Activity']].map(function (x) { return '<button data-tab="' + x[0] + '" class="' + (S.tab === x[0] ? 'on' : '') + '">' + x[1] + '</button>'; }).join('') + '</div><div id="tabc"></div>' +
    '<div class="pbar"><div class="in"><b>' + p.approved + ' of ' + p.required + ' required approved</b><div class="bar"><i style="width:' + pct + '%"></i></div><b class="gt">' + pct + '%</b></div></div>';
  page('dash', inner, function () {
    qsa('.tabs button').forEach(function (b) { b.onclick = function () { S.tab = b.getAttribute('data-tab'); qsa('.tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); drawTab(); }; });
    if (qs('#aSplit')) qs('#aSplit').onclick = function () { splitModal(); };
    if (qs('#aConv')) qs('#aConv').onclick = convertModal;
    if (qs('#aCancel')) qs('#aCancel').onclick = cancelModal;
    if (qs('#aStatus')) qs('#aStatus').onclick = statusModal;
    drawTab();
  });
}
function docsOf(itemId) { return S.txn.documents.filter(function (x) { return x.itemId === itemId && !x.removed; }); }
function refresh() { txnView(S.txn.txn.id, true); }
function drawTab() {
  var d = S.txn, c = qs('#tabc'), t = d.txn;
  if (S.tab === 'checklist') {
    var html = '', lastPhase = null, groups = 0;
    d.items.filter(function (it) { return it.active; }).forEach(function (it) {
      var ph = PHASE_LABEL[it.phase] || it.phase;
      if (ph !== lastPhase) { if (groups++) html += '</div>'; html += '<div class="gb" style="padding:4px 0;margin-bottom:16px"><div class="phase">' + h(ph) + ' checklist</div>'; lastPhase = ph; }
      var docs = docsOf(it.id), notes = d.notes.filter(function (n) { return n.itemId === it.id && n.kind !== 'rejection'; }).slice(-3);
      html += '<div class="row" id="it_' + h(it.id) + '"><div class="n"><b>' + h(it.title) + (it.req ? '<span class="req-dot" title="Required"></span>' : '') + '</b><small>' + h(it.forms) + '</small>' +
        (it.status === 'Rejected' && it.reviewNote ? '<div class="note rt">Admin note: ' + h(it.reviewNote) + '</div>' : '') +
        notes.map(function (n) { return '<div class="note">' + h(n.by) + ': ' + h(n.text) + '</div>'; }).join('') +
        (docs.length ? '<div class="docs">' + docs.map(function (x) { return '<button class="dl" data-doc="' + h(x.id) + '">' + h(x.name) + (x.pageRange ? ' (pages ' + h(x.pageRange) + ')' : '') + '</button>'; }).join('') + '</div>' : '') + '</div>' +
        itemPill(it.status) + '<div class="acts">' +
        (canEdit() ? '<label class="ub">' + (it.status === 'Rejected' ? 'Re-upload' : 'Upload') + '<input type="file" class="hidden up" data-item="' + h(it.id) + '" accept="' + UP_ACCEPT + '"></label>' : '') +
        (it.status === 'Rejected' && canEdit() ? '<button class="ub red resub" data-item="' + h(it.id) + '">Add note &amp; resubmit</button>' : '') +
        (it.misc && canEdit() ? '<button class="link ren" data-item="' + h(it.id) + '" data-t="' + h(it.title) + '">Rename</button>' : '') +
        '<button class="link addn" data-item="' + h(it.id) + '">Note</button></div></div>';
    });
    if (groups) html += '</div>';
    c.innerHTML = html + '<p class="sub"><span class="req-dot"></span> Required for compliance. Agents can upload but cannot delete; only an admin can remove a document, and it stays in the archive.</p>';
    qsa('.up', c).forEach(function (inp) { inp.onchange = function () { if (inp.files[0]) uploadFile(inp.files[0], inp.getAttribute('data-item')); }; });
    qsa('.resub', c).forEach(function (b) { b.onclick = function () { promptModal('Resubmit for review', 'Explain what you fixed. Re-upload first if a corrected document is needed.', 'Resubmit', function (txt) { return api('resubmit', { itemId: b.getAttribute('data-item'), note: txt }); }); }; });
    qsa('.ren', c).forEach(function (b) { b.onclick = function () { promptModal('Rename Misc item', 'Name it after the document it holds.', 'Save', function (txt) { return api('renameMisc', { itemId: b.getAttribute('data-item'), title: txt }); }, true, b.getAttribute('data-t')); }; });
    qsa('.addn', c).forEach(function (b) { b.onclick = function () { promptModal('Add a note', 'Visible to the office and the agent on this file.', 'Add note', function (txt) { return api('addNote', { txnId: t.id, itemId: b.getAttribute('data-item'), text: txt }); }); }; });
  } else if (S.tab === 'storage') {
    var items = d.items.filter(function (x) { return x.active; });
    var opts = function (sel) { return '<option value="">Document Storage (unassigned)</option>' + items.map(function (x) { return '<option value="' + h(x.id) + '"' + (x.id === sel ? ' selected' : '') + '>' + h(x.title) + '</option>'; }).join(''); };
    var docs = d.documents.slice().sort(function (a, b) { return String(b.uploadedAt).localeCompare(String(a.uploadedAt)); });
    c.innerHTML = '<div class="top"><p class="sub" style="margin:0;max-width:640px">Every file uploaded to this transaction. Store files here, then assign each one to a checklist item, or split a PDF packet into items.</p>' + (canEdit() ? '<label class="btn">Upload to storage<input type="file" class="hidden" id="stUp" multiple accept="' + UP_ACCEPT + '"></label>' : '') + '</div>' +
      '<div class="gb tbl" style="margin-top:14px"><table><thead><tr><th>File</th><th>Checklist item</th><th>Status</th><th>Uploaded</th><th></th></tr></thead><tbody>' +
      (docs.length ? docs.map(function (x) {
        var it = items.filter(function (y) { return y.id === x.itemId; })[0];
        var canAssign = canEdit() && !x.removed && (isAdmin() || !x.itemId || x.status === 'Pending');
        return '<tr' + (x.removed ? ' style="opacity:.55"' : '') + '><td><button class="link dl" data-doc="' + h(x.id) + '">' + h(x.name) + '</button><br><small>' + h({ packet: 'Packet', split: 'Split' + (x.pageRange ? ' · pages ' + x.pageRange : ''), file: 'File' }[x.kind] || '') + (x.pages ? ' · ' + h(x.pages) + ' pages' : '') + ' · ' + Math.max(1, Math.round((x.size || 0) / 1024)) + ' KB</small>' + (x.removed ? '<div class="note rt">Removed by admin · kept in archive' + (x.removeReason ? ': ' + h(x.removeReason) : '') + '</div>' : '') + '</td>' +
          '<td>' + (canAssign ? '<select class="asg" data-doc="' + h(x.id) + '" aria-label="Checklist item">' + opts(x.itemId) + '</select>' : h(it ? it.title : 'Document Storage')) + '</td>' +
          '<td>' + (x.status === 'Stored' || !x.itemId ? '<span class="pill p-miss">Stored</span>' : itemPill(x.status)) + '</td><td><small>' + h(fmtTs(x.uploadedAt)) + '<br>' + h(x.uploadedByName || '') + '</small></td>' +
          '<td style="white-space:nowrap">' + (x.mime === 'application/pdf' && !x.removed && canEdit() ? '<button class="link spl" data-doc="' + h(x.id) + '">Split</button> ' : '') + (isAdmin() ? (x.removed ? '<button class="link rst" data-doc="' + h(x.id) + '">Restore</button>' : '<button class="link rm" data-doc="' + h(x.id) + '">Remove</button>') : '') + '</td></tr>';
      }).join('') : '<tr><td colspan="5">No documents yet.</td></tr>') + '</tbody></table></div>';
    var su = qs('#stUp'); if (su) su.onchange = function () { var fs = Array.prototype.slice.call(su.files); fs.reduce(function (pr, f) { return pr.then(function () { return uploadFile(f, '', true); }); }, Promise.resolve()).then(refresh); };
    qsa('.asg', c).forEach(function (s) { s.onchange = function () { api('assignDocument', { docId: s.getAttribute('data-doc'), itemId: s.value }).then(function () { toast(s.value ? 'Assigned and sent for review.' : 'Moved to Document Storage.'); refresh(); }).catch(function (e) { toast(e.message, 1); refresh(); }); }; });
    qsa('.spl', c).forEach(function (b) { b.onclick = function () { splitModal(b.getAttribute('data-doc')); }; });
    qsa('.rm', c).forEach(function (b) { b.onclick = function () { promptModal('Remove document (admin)', 'The file leaves the checklist but stays in the Drive archive, flagged for Enrique. Nothing is deleted. Give a reason.', 'Remove', function (txt) { return api('removeDocument', { docId: b.getAttribute('data-doc'), reason: txt }); }); }; });
    qsa('.rst', c).forEach(function (b) { b.onclick = function () { api('restoreDocument', { docId: b.getAttribute('data-doc') }).then(function () { toast('Restored.'); refresh(); }).catch(function (e) { toast(e.message, 1); }); }; });
  } else if (S.tab === 'details') {
    var ii = t.intake || {}, defs = F[t.type].filter(function (f) { return !f.h; });
    c.innerHTML = '<div class="card gb"><div class="kv">' + defs.map(function (f) {
      var v = ii[f.k];
      if (f.people) v = (v || []).map(function (pp) { return [pp.name, pp.phone, pp.email].filter(Boolean).join(' · '); }).join('\n');
      else if (f.radio) v = (f.radio.filter(function (o) { return o[0] === (f.k === 'side' ? t.side : v); })[0] || [])[1];
      else if (f.t === 'date') v = fmtDate(v); else if (f.t === 'money' && v) v = money(v); else if (f.comm) v = fmtComm(v, ii[f.k + 'Type']);
      return '<div' + (f.w === 3 || f.people ? ' style="grid-column:1/-1"' : '') + '><span>' + h(f.l) + '</span><b style="white-space:pre-line">' + (v ? h(v) : '—') + '</b></div>';
    }).join('') + (ii.finalPrice ? '<div><span>Final sales price</span><b>' + money(ii.finalPrice) + '</b></div>' : '') + (t.closedAt ? '<div><span>Closed</span><b>' + fmtDate(t.closedAt) + '</b></div>' : '') +
      (t.retentionUntil ? '<div><span>Keep records until</span><b>' + fmtDate(t.retentionUntil) + '</b></div>' : '') + (S.tcApi ? '<div><span>Transaction coordinator</span><b>' + (t.tcName ? h(t.tcName) : 'None') + '</b></div>' : '') + '<div><span>File ID</span><b>' + h(t.id) + '</b></div></div>' +
      (canEdit() ? '<div class="actions">' + (S.tcApi && t.canAssignTc ? '<button class="ub" id="editTc">' + (t.tcName ? 'Change TC' : 'Add TC') + '</button>' : '') + '<button class="ub" id="editI">Edit intake</button></div>' : '') + '</div>';
    if (qs('#editTc')) qs('#editTc').onclick = tcModal;
    if (qs('#editI')) qs('#editI').onclick = function () {
      c.innerHTML = '<form id="ef" novalidate><div id="ee"></div>' + formHtml(t.type, ii, 'e', { side: 1 }) + '<div class="actions"><button type="button" class="ub" id="ecan">Cancel</button><button class="btn">Save intake</button></div></form>';
      var f = qs('#ef'); wireForm(f); qs('#ecan').onclick = drawTab;
      f.onsubmit = function (e) { e.preventDefault(); var r = readForm(f); if (r.missing.length) { qs('#ee').innerHTML = '<div class="err">Please complete: ' + h(r.missing.join(', ')) + '</div>'; return; }
        api('updateIntake', { id: t.id, intake: r.intake }).then(function () { toast('Saved.'); refresh(); }).catch(function (err) { qs('#ee').innerHTML = '<div class="err">' + h(err.message) + '</div>'; }); };
    };
  } else {
    c.innerHTML = '<div class="split" style="grid-template-columns:1fr 1fr"><div class="card gb"><h3>Notes</h3><textarea id="nt" placeholder="Add a note for this file"></textarea><div class="actions" style="margin-top:8px"><button class="btn sm" id="ntb">Add note</button></div><div class="feed">' +
      d.notes.slice().reverse().map(function (n) { var it = d.items.filter(function (x) { return x.id === n.itemId; })[0]; return '<div class="ev"><b>' + h(n.by) + '</b> ' + (n.kind === 'rejection' ? '<span class="rt">rejected</span> ' : n.kind === 'resubmit' ? '<span class="gt">resubmitted</span> ' : '') + (it ? '· ' + h(it.title) : '') + '<br>' + h(n.text) + '<small>' + h(fmtTs(n.createdAt)) + '</small></div>'; }).join('') + '</div></div>' +
      '<div class="card gb"><h3>Activity</h3><div class="feed">' + d.activity.map(function (a) { return '<div class="ev">' + h(actLabel(a, d.txn)) + '<small>' + h(a.by) + ' · ' + h(fmtTs(a.ts)) + '</small></div>'; }).join('') + '</div></div></div>';
    qs('#ntb').onclick = function () { var v = qs('#nt').value.trim(); if (!v) return; api('addNote', { txnId: t.id, text: v }).then(function () { toast('Note added.'); refresh(); }).catch(function (e) { toast(e.message, 1); }); };
  }
  qsa('.dl', c).forEach(function (b) { b.onclick = function () { openDoc(b.getAttribute('data-doc'), b); }; });
}

/* Assign / change / remove the TC of a file (the file's agent or an admin; the server re-checks). */
function tcModal() {
  var t = S.txn.txn;
  (isAdmin() ? api('listUsers').then(function (us) { return us.filter(function (u) { return u.active && rolesOf(u).indexOf('tc') >= 0; }); }) : api('listPeople').then(function (p) { return p.tcs; })).then(function (tcs) {
    tcs = tcs.filter(function (u) { return u.id !== t.agentId; });
    var m = modal('<h2>Transaction coordinator</h2><p class="sub">The TC sees this file, can upload documents and edit details, but can’t review or approve anything. Changes are recorded in the activity log.</p><div id="te"></div><div class="f"><label>TC</label><select id="tcSel"><option value="">None</option>' +
      tcs.map(function (u) { return '<option value="' + h(u.id) + '"' + (u.id === t.tcId ? ' selected' : '') + '>' + h(uName(u)) + '</option>'; }).join('') + '</select></div><div class="actions"><button class="btn" id="tcSave">Save</button></div>');
    qs('#tcSave', m).onclick = function () {
      api('setTransactionTc', { id: t.id, tcId: qs('#tcSel', m).value }).then(function () { m.close(); toast('Coordinator updated.'); refresh(); }).catch(function (e) { qs('#te', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; });
    };
  }).catch(function (e) { toast(e.message, 1); });
}

/* ---------------- files ---------------- */
var MAX = 20 * 1024 * 1024;
function bytesToB64(bytes) { var s = '', ch = 0x8000; for (var i = 0; i < bytes.length; i += ch) s += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(s); }
function uploadFile(file, itemId, quiet) {
  var bad = upCheck(file); if (bad) { toast(bad, 1); return Promise.resolve(); }
  toast('Preparing ' + file.name + '…');
  return prepUpload(file).then(function (p) {
    toast('Uploading ' + p.name + ' (' + fmtSize(p.bytes.length) + ')…');
    return api('upload', { txnId: S.txn.txn.id, itemId: itemId || '', name: p.name, mime: 'application/pdf', base64: bytesToB64(p.bytes), kind: 'file', pages: p.pages || '' })
      .then(function () { toast('Uploaded ' + p.name + ' (' + fmtSize(p.bytes.length) + ')' + (itemId ? '. Sent for review.' : ' to Document Storage.')); if (!quiet) refresh(); });
  }).catch(function (e) { toast(e.message, 1); });
}
/* ---- 1.4.3 uploads: PDF, JPG or PNG only. JPG/PNG become a one-page PDF in the browser, so every stored transaction file is a PDF.
   Everything is shrunk only losslessly or visually losslessly, and the smaller of original vs optimized always wins:
   - images: never upscaled; long edge capped at UP_CAP px (~300 DPI on Letter); the original JPEG/PNG data is embedded as-is when it
     can be; JPEG re-encoding (q UP_JPEG_Q) is tried only for photo-like pictures and kept only when smaller; text/line art stays lossless PNG.
   - PDFs: pdf-lib re-save with object streams + unreachable objects dropped, kept only when smaller with the same page count.
     Never rasterized or downsampled. Encrypted PDFs and PDFs with form/signature fields (AcroForm) are uploaded untouched. ---- */
var UP_ACCEPT = 'application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png';
var UP_ERR = 'Only PDF, JPG or PNG files can be uploaded.';
var UP_CAP = 3300, UP_JPEG_Q = 0.88, UP_IN_MAX = 60 * 1024 * 1024;
function fmtSize(n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; }
function upCheck(file) {
  var ext = (String(file.name || '').split('.').pop() || '').toLowerCase(), ty = String(file.type || '').toLowerCase();
  var hasExt = /\.[a-z0-9]{1,5}$/i.test(String(file.name || ''));
  if (hasExt ? ['pdf', 'jpg', 'jpeg', 'png'].indexOf(ext) < 0 : ['application/pdf', 'image/jpeg', 'image/png'].indexOf(ty) < 0) return UP_ERR;
  if (file.size > UP_IN_MAX) return file.name + ' is too large to upload.';
  return '';
}
function sniffKind(b) {
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return 'jpg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return 'png';
  for (var i = 0; i < Math.min(1024, b.length - 4); i++) if (b[i] === 0x25 && b[i + 1] === 0x50 && b[i + 2] === 0x44 && b[i + 3] === 0x46) return i ? 'pdf+junk' : 'pdf';
  return '';
}
function jpegOrientation(b) {   // EXIF Orientation tag (1-8), 1 if none
  var i = 2;
  while (i + 10 < b.length && b[i] === 0xFF) {
    var mk = b[i + 1], len = (b[i + 2] << 8) | b[i + 3];
    if (mk === 0xDA || mk === 0xD9) break;
    if (mk === 0xE1 && b[i + 4] === 0x45 && b[i + 5] === 0x78 && b[i + 6] === 0x69 && b[i + 7] === 0x66) {
      var t = i + 10, le = b[t] === 0x49;
      var r16 = function (o) { return le ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]; };
      var r32 = function (o) { return le ? (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0 : ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; };
      var ifd = t + r32(t + 4); if (ifd + 2 > b.length) return 1;
      for (var k = 0, n = r16(ifd); k < n && ifd + 14 + k * 12 <= b.length; k++) { var e = ifd + 2 + k * 12; if (r16(e) === 0x0112) { var v = r16(e + 8); return v >= 1 && v <= 8 ? v : 1; } }
      return 1;
    }
    i += 2 + len;
  }
  return 1;
}
function loadImg(bytes, mime) {
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(new Blob([bytes], { type: mime })), im = new Image();
    im.onload = function () { URL.revokeObjectURL(url); res(im); };   // browsers apply EXIF orientation (image-orientation: from-image)
    im.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Could not read that image. ' + UP_ERR)); };
    im.src = url;
  });
}
function drawScaled(im, w, h, bg) {   // high-quality downscale (halving steps), optional white background for JPEG
  var src = im, sw = im.naturalWidth || im.width, sh = im.naturalHeight || im.height;
  while (sw / 2 >= w * 1.0001 && sh / 2 >= h) {
    var c0 = document.createElement('canvas'); c0.width = Math.round(sw / 2); c0.height = Math.round(sh / 2);
    var x0 = c0.getContext('2d'); x0.imageSmoothingEnabled = true; x0.imageSmoothingQuality = 'high'; x0.drawImage(src, 0, 0, c0.width, c0.height);
    src = c0; sw = c0.width; sh = c0.height;
  }
  var c = document.createElement('canvas'); c.width = w; c.height = h;
  var x = c.getContext('2d'); if (bg) { x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, w, h); }
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, w, h);
  return c;
}
function canvasBytes(c, type, q) {
  return new Promise(function (res) { c.toBlob(function (b) { if (!b) return res(null); b.arrayBuffer().then(function (ab) { res(new Uint8Array(ab)); }); }, type, q); });
}
function photoLike(c) {   // text, scans and line art reuse a handful of exact colors; photos don't. Only photo-like pictures may become JPEG.
  var x = c.getContext('2d'), w = c.width, rows = Math.min(64, c.height), seen = {}, n = 0, tot = 0, top = 0, cnt = {};
  for (var r = 0; r < rows; r++) {
    var d = x.getImageData(0, Math.floor((r + 0.5) * c.height / rows), w, 1).data;
    for (var i = 0; i < d.length; i += 4 * Math.max(1, Math.floor(w / 512))) {
      var k = ((d[i] >> 2) << 12) | ((d[i + 1] >> 2) << 6) | (d[i + 2] >> 2); tot++;
      if (!seen[k]) { seen[k] = 1; n++; } cnt[k] = (cnt[k] || 0) + 1;
    }
  }
  Object.keys(cnt).map(function (k) { return cnt[k]; }).sort(function (a, b) { return b - a; }).slice(0, 8).forEach(function (v) { top += v; });
  return n > 4096 && top / tot < 0.5;
}
function imageDoc(L, w, h, title, draw) {   // one page sized to the image (px at 72 DPI), shrunk to fit Letter when bigger
  return L.PDFDocument.create().then(function (doc) {
    var fit = w <= h ? Math.min(1, 612 / w, 792 / h) : Math.min(1, 792 / w, 612 / h), pw = w * fit, ph = h * fit, pg = doc.addPage([pw, ph]);
    doc.setTitle(title); doc.setProducer('ENESMA REALTY Transaction Center'); doc.setCreator('ENESMA REALTY Transaction Center');
    return Promise.resolve(draw(doc, pg, pw, ph)).then(function () { return doc.save({ useObjectStreams: true }); });
  });
}
function imagePdf(L, data, kind, w, h, title) {   // embeds the JPEG/PNG data (JPEG bytes go in untouched)
  return imageDoc(L, w, h, title, function (doc, pg, pw, ph) {
    return (kind === 'png' ? doc.embedPng(data) : doc.embedJpg(data)).then(function (img) { pg.drawImage(img, { x: 0, y: 0, width: pw, height: ph }); });
  });
}
function rawImagePdf(L, c, title) {   // lossless: the exact pixels, DeviceGray when there is no color, Flate + PNG 'Up' predictor. Opaque images only.
  var w = c.width, h = c.height, d = c.getContext('2d').getImageData(0, 0, w, h).data, gray = true, i;
  for (i = 0; i < d.length; i += 4) { if (d[i + 3] !== 255) return Promise.resolve(null); if (gray && (d[i] !== d[i + 1] || d[i] !== d[i + 2])) gray = false; }
  var nc = gray ? 1 : 3, row = w * nc, buf = new Uint8Array((row + 1) * h), prev = new Uint8Array(row), cur = new Uint8Array(row);
  for (var y = 0; y < h; y++) {
    for (var x = 0, q = y * w * 4; x < w; x++, q += 4) { if (gray) cur[x] = d[q]; else { cur[x * 3] = d[q]; cur[x * 3 + 1] = d[q + 1]; cur[x * 3 + 2] = d[q + 2]; } }
    var o = y * (row + 1); buf[o] = 2; for (var k = 0; k < row; k++) buf[o + 1 + k] = (cur[k] - prev[k]) & 255;
    var t = prev; prev = cur; cur = t;
  }
  return imageDoc(L, w, h, title, function (doc, pg, pw, ph) {
    var ref = doc.context.register(doc.context.flateStream(buf, { Type: 'XObject', Subtype: 'Image', Width: w, Height: h, ColorSpace: gray ? 'DeviceGray' : 'DeviceRGB', BitsPerComponent: 8, DecodeParms: { Predictor: 15, Colors: nc, BitsPerComponent: 8, Columns: w } }));
    var nm = pg.node.newXObject('Im', ref);
    pg.pushOperators(L.pushGraphicsState(), L.concatTransformationMatrix(pw, 0, 0, ph, 0, 0), L.drawObject(nm), L.popGraphicsState());
  });
}
function imageToPdf(L, bytes, kind, name) {
  var orient = kind === 'jpg' ? jpegOrientation(bytes) : 1;
  return loadImg(bytes, kind === 'png' ? 'image/png' : 'image/jpeg').then(function (im) {
    var W = im.naturalWidth, H = im.naturalHeight; if (!W || !H) throw new Error('Could not read that image. ' + UP_ERR);
    var sc = Math.min(1, UP_CAP / Math.max(W, H)), w = Math.max(1, Math.round(W * sc)), h = Math.max(1, Math.round(H * sc));
    var asIs = sc === 1 && orient === 1, tries = [], info = { w: w, h: h, srcW: W, srcH: H, orient: orient, tried: [] };
    var c = drawScaled(im, w, h, false), photo = photoLike(c), sfx = sc < 1 ? ' (scaled)' : '';
    if (asIs) tries.push({ how: kind + ' (original data)', pdf: function () { return imagePdf(L, bytes, kind, w, h, name); } });
    if (kind === 'png') {   // lossless candidates
      tries.push({ how: 'lossless flate' + sfx, pdf: function () { return rawImagePdf(L, c, name); } });
      if (!asIs) tries.push({ how: 'png' + sfx, pdf: function () { return canvasBytes(c, 'image/png').then(function (d) { return d && imagePdf(L, d, 'png', w, h, name); }); } });
    }
    if (kind === 'jpg' || photo) {   // JPEG re-encode: photos only; text/line-art PNGs stay lossless. Re-encoding an untouched JPEG must save >= 10%.
      var cj = kind === 'png' ? drawScaled(im, w, h, true) : c;   // PNG transparency goes on white for JPEG
      tries.push({ how: 'jpeg q' + UP_JPEG_Q + sfx, gain: asIs && kind === 'jpg' ? 0.9 : 1, pdf: function () { return canvasBytes(cj, 'image/jpeg', UP_JPEG_Q).then(function (d) { return d && imagePdf(L, d, 'jpg', w, h, name); }); } });
    }
    info.photo = photo;
    return tries.reduce(function (pr, t) {
      return pr.then(function (best) {
        return Promise.resolve().then(t.pdf).catch(function () { return null; }).then(function (pdf) {
          if (!pdf) return best; info.tried.push({ how: t.how, size: pdf.length });
          return !best || pdf.length < best.bytes.length * (t.gain || 1) ? { bytes: pdf, how: t.how } : best;
        });
      });
    }, Promise.resolve(null)).then(function (best) { if (!best) throw new Error('Could not convert that image to PDF.'); info.how = best.how; return { bytes: best.bytes, pages: 1, info: info }; });
  });
}
function pruneUnreachable(L, ctx) {
  var seen = {}, st = [ctx.trailerInfo.Root, ctx.trailerInfo.Info];
  while (st.length) {
    var o = st.pop(); if (!o) continue;
    if (o instanceof L.PDFRef) { if (!seen[o.tag]) { seen[o.tag] = 1; st.push(ctx.lookup(o)); } }
    else if (o instanceof L.PDFArray) st.push.apply(st, o.asArray());
    else if (o instanceof L.PDFDict) o.entries().forEach(function (e) { st.push(e[1]); });
    else if (o && o.dict instanceof L.PDFDict) st.push(o.dict);
  }
  var gone = 0; ctx.enumerateIndirectObjects().forEach(function (e) { if (!seen[e[0].tag]) { ctx.delete(e[0]); gone++; } });
  return gone;
}
function optimizePdf(L, bytes, junk) {
  var info = { how: 'original' };
  return L.PDFDocument.load(bytes, { updateMetadata: false }).then(function (doc) {   // encrypted PDFs throw here: kept as-is
    var cat = doc.catalog;
    if (doc.isEncrypted || cat.get(L.PDFName.of('AcroForm')) || cat.get(L.PDFName.of('Perms'))) { info.how = 'original (forms/signatures or encryption kept untouched)'; return { bytes: bytes, pages: doc.getPageCount(), info: info }; }
    var n = doc.getPageCount(); info.dropped = pruneUnreachable(L, doc.context);
    return doc.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false }).then(function (out) {
      info.tried = [{ how: 'object streams', size: out.length }];
      if (out.length >= bytes.length && !junk) return { bytes: bytes, pages: n, info: info };
      return L.PDFDocument.load(out, { updateMetadata: false }).then(function (chk) {
        if (chk.getPageCount() !== n) return { bytes: bytes, pages: n, info: info };
        info.how = 'object streams'; return { bytes: out, pages: n, info: info };
      });
    });
  }).catch(function () { info.how = 'original (not re-saved)'; return { bytes: bytes, pages: '', info: info }; });
}
function prepUpload(file) {   // -> { name, bytes (PDF), pages, before, info }
  var bad = upCheck(file); if (bad) return Promise.reject(new Error(bad));
  return file.arrayBuffer().then(function (ab) {
    var bytes = new Uint8Array(ab), kind = sniffKind(bytes);
    if (!kind) throw new Error(UP_ERR);
    return loadPdfLib().then(function (L) { return kind === 'jpg' || kind === 'png' ? imageToPdf(L, bytes, kind, file.name) : optimizePdf(L, bytes, kind === 'pdf+junk'); }).then(function (r) {
      if (sniffKind(r.bytes) !== 'pdf') throw new Error('That file is not a valid PDF. ' + UP_ERR);
      var base = String(file.name || 'upload').replace(/\.(pdf|jpe?g|png)$/i, '') || 'upload';
      if (r.bytes.length > MAX) throw new Error(base + '.pdf is larger than 20 MB.');
      return { name: base + '.pdf', bytes: r.bytes, pages: r.pages, before: bytes.length, info: r.info };
    });
  });
}
window.TCUpload = { prep: prepUpload, accept: UP_ACCEPT, cap: UP_CAP };   // used by the upload tests
var fileCache = {};
function getFileBytes(docId) {
  if (fileCache[docId]) return Promise.resolve(fileCache[docId]);
  return api('getFile', { docId: docId }).then(function (f) { var bin = atob(f.base64), u = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); fileCache[docId] = { name: f.name, mime: f.mime, bytes: u }; return fileCache[docId]; });
}
function openDoc(docId, btn) {
  if (btn) btn.disabled = true;
  var m = modal('<h2>Loading…</h2><div class="loading"><span class="spin"></span></div>', true);
  getFileBytes(docId).then(function (f) {
    var url = URL.createObjectURL(new Blob([f.bytes], { type: f.mime }));
    var viewable = /^application\/pdf|^image\/(png|jpe?g|gif|webp)|^text\/plain/.test(f.mime);
    qs('.box', m).innerHTML = '<button class="close" aria-label="Close">×</button><h2 style="padding-right:30px;word-break:break-word">' + h(f.name) + '</h2>' +
      (viewable ? (/^image/.test(f.mime) ? '<img src="' + url + '" alt="" style="max-width:100%;border-radius:10px;margin-top:10px">' : '<iframe src="' + url + '" title="Document" style="width:100%;height:70vh;border:1px solid rgba(0,0,7,.12);border-radius:10px;margin-top:10px;background:#fff"></iframe>') : '<p class="sub">This file type cannot be previewed in the browser.</p>') +
      '<div class="actions"><a class="btn" href="' + url + '" download="' + h(f.name) + '">Download</a></div>';
    qs('.close', m).onclick = function () { m.close(); URL.revokeObjectURL(url); };
  }).catch(function (e) { m.close(); toast(e.message, 1); }).then(function () { if (btn) btn.disabled = false; });
}
function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'vendor/pdf-lib.min.js'; s.onload = function () { res(window.PDFLib); }; s.onerror = function () { rej(new Error('Could not load the PDF tools.')); }; document.head.appendChild(s); });
}

/* ---------------- modals ---------------- */
function modal(html, wide) {
  var m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = '<div class="box' + (wide ? ' wide' : '') + '" role="dialog" aria-modal="true"><button class="close" aria-label="Close">×</button>' + html + '</div>';
  document.body.appendChild(m); document.body.style.overflow = 'hidden';
  var close = function () { m.remove(); if (!qs('.modal')) document.body.style.overflow = ''; };
  qs('.close', m).onclick = close; m.addEventListener('click', function (e) { if (e.target === m) close(); });
  m.close = close; return m;
}
function afterChange() { if (S.txn && location.hash.indexOf('#/t/') === 0) refresh(); else route(); }
function promptModal(title, help, btn, fn, single, val) {
  var m = modal('<h2>' + h(title) + '</h2><p class="sub">' + h(help) + '</p><div id="me"></div>' + (single ? '<input type="text" id="mt" maxlength="80" value="' + h(val || '') + '">' : '<textarea id="mt"></textarea>') + '<div class="actions"><button class="btn" id="mb">' + h(btn) + '</button></div>');
  qs('#mt', m).focus();
  qs('#mb', m).onclick = function () {
    var v = qs('#mt', m).value.trim(); if (!v) { qs('#me', m).innerHTML = '<div class="err">This is required.</div>'; return; }
    this.disabled = true;
    fn(v).then(function () { m.close(); toast('Saved.'); afterChange(); })
      .catch(function (e) { qs('#mb', m).disabled = false; qs('#me', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; });
  };
}
function splitModal(existingDocId) {
  var items = S.txn.items.filter(function (x) { return x.active; });
  var opt = '<option value="">Document Storage</option>' + items.map(function (x) { return '<option value="' + h(x.id) + '">' + h(x.title) + '</option>'; }).join('');
  var m = modal('<h2>Upload &amp; Split Packet</h2><p class="sub">Upload one signed PDF packet, then assign page ranges to checklist items. The full packet stays in Document Storage; nothing is deleted.</p><div id="se"></div>' +
    (existingDocId ? '' : '<label class="btn" id="spick">Choose PDF packet<input type="file" class="hidden" id="sfile" accept="' + UP_ACCEPT + '"></label>') + '<div id="sbody"></div>', true);
  var state = { bytes: null, name: '', pages: 0, srcId: existingDocId || '' };
  function showErr(msg) { qs('#se', m).innerHTML = msg ? '<div class="err">' + h(msg) + '</div>' : ''; }
  function addRange(a, b) { qs('#rngs', m).insertAdjacentHTML('beforeend', '<div class="rng"><input type="number" min="1" max="' + state.pages + '" value="' + a + '" aria-label="From page"><input type="number" min="1" max="' + state.pages + '" value="' + b + '" aria-label="To page"><select aria-label="Checklist item">' + opt + '</select><button class="rx link" title="Remove" style="text-decoration:none;font-size:20px">×</button></div>'); }
  function setup(bytes, name) {
    return loadPdfLib().then(function (L) { return L.PDFDocument.load(bytes, { ignoreEncryption: true }); }).then(function (doc) {
      state.bytes = bytes; state.name = name; state.pages = doc.getPageCount();
      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      qs('#sbody', m).innerHTML = '<div class="split" style="margin-top:14px"><div><iframe src="' + url + '" title="Packet preview"></iframe><p class="sub" style="margin-top:6px">' + h(name) + ' · ' + state.pages + (state.pages === 1 ? ' page' : ' pages') + '</p></div><div><b class="gt">Assign pages</b><p class="sub" style="margin:8px 0 12px">From page · to page · checklist item</p><div id="rngs"></div><button class="link" id="addr">+ Add range</button>' +
        '<div class="actions"><button class="btn" id="sgo">Split &amp; upload</button></div></div></div>';
      addRange(1, state.pages);
      qs('#addr', m).onclick = function () { var last = qsa('.rng', m).pop(); var s = last ? Math.min(state.pages, Number(qsa('input', last)[1].value) + 1) : 1; addRange(s, state.pages); };
      qs('#rngs', m).addEventListener('click', function (e) { if (e.target.classList.contains('rx')) e.target.closest('.rng').remove(); });
      qs('#sgo', m).onclick = run;
    });
  }
  function run() {
    var ranges = qsa('.rng', m).map(function (r) { var ins = qsa('input', r); return { a: Number(ins[0].value), b: Number(ins[1].value), item: qs('select', r).value }; });
    if (!ranges.length) return showErr('Add at least one range.');
    for (var k = 0; k < ranges.length; k++) { var r = ranges[k]; if (!(r.a >= 1 && r.b >= r.a && r.b <= state.pages)) return showErr('Check the page numbers in range ' + (k + 1) + ' (1–' + state.pages + ').'); }
    showErr(''); var btn = qs('#sgo', m); btn.disabled = true; btn.innerHTML = '<span class="spin"></span>Working…';
    var L, txnId = S.txn.txn.id, base = state.name.replace(/\.pdf$/i, '');
    loadPdfLib().then(function (lib) {
      L = lib;
      if (state.srcId) return null;
      btn.innerHTML = '<span class="spin"></span>Saving packet…';
      return api('upload', { txnId: txnId, itemId: '', name: state.name, mime: 'application/pdf', base64: bytesToB64(state.bytes), kind: 'packet', pages: state.pages }).then(function (d) { state.srcId = d.doc.id; });
    }).then(function () { return L.PDFDocument.load(state.bytes, { ignoreEncryption: true }); }).then(function (src) {
      return ranges.reduce(function (pr, r, idx) {
        return pr.then(function () {
          btn.innerHTML = '<span class="spin"></span>Uploading part ' + (idx + 1) + ' of ' + ranges.length + '…';
          return L.PDFDocument.create().then(function (out) {
            var ix = []; for (var p = r.a - 1; p < r.b; p++) ix.push(p);
            return out.copyPages(src, ix).then(function (pages) { pages.forEach(function (pg) { out.addPage(pg); }); return out.save(); });
          }).then(function (bytes) {
            var it = items.filter(function (x) { return x.id === r.item; })[0];
            var nm = (it ? it.title : base).replace(/[\\/:*?"<>|]+/g, '-') + ' (p' + r.a + (r.b > r.a ? '-' + r.b : '') + ').pdf';
            return api('upload', { txnId: txnId, itemId: r.item, name: nm, mime: 'application/pdf', base64: bytesToB64(bytes), kind: 'split', sourceDocId: state.srcId, pageRange: r.a + '-' + r.b, pages: r.b - r.a + 1 });
          });
        });
      }, Promise.resolve());
    }).then(function () { m.close(); toast('Packet split into ' + ranges.length + ' part(s). Assigned parts are sent for review.'); S.tab = 'checklist'; refresh(); })
      .catch(function (e) { btn.disabled = false; btn.textContent = 'Split & upload'; showErr(e.message); });
  }
  if (existingDocId) {
    qs('#sbody', m).innerHTML = '<div class="loading"><span class="spin"></span>Loading packet…</div>';
    getFileBytes(existingDocId).then(function (f) { return setup(f.bytes, f.name); }).catch(function (e) { showErr(e.message); });
  } else {
    qs('#sfile', m).onchange = function () {
      var f = this.files[0]; if (!f) return;
      var bad = upCheck(f); if (bad) return showErr(bad);
      showErr(''); qs('#spick', m).classList.add('hidden');
      prepUpload(f).then(function (p) { return setup(p.bytes, p.name); }).catch(function (e) { showErr(/Only PDF|larger than/.test(e.message) ? e.message : 'Could not open that PDF: ' + e.message); qs('#spick', m).classList.remove('hidden'); });
    };
  }
}
function convertModal() {
  var t = S.txn.txn, to = t.type === 'listing' ? 'purchase' : 'lease';
  var pre = Object.assign({}, t.intake); pre.side = to === 'purchase' ? 'seller' : 'landlord';
  var sideField = { k: 'side', l: 'We represent', r: 1, w: 3, radio: to === 'purchase' ? [['seller', 'Seller only'], ['both', 'Both sides (we also have the buyer)']] : [['landlord', 'Landlord only'], ['both', 'Both sides (we also have the tenant)']] };
  var m = modal('<h2>' + (to === 'purchase' ? 'Accepted Contract' : 'Convert to Lease') + '</h2><p class="sub">' + (to === 'purchase' ? 'Offer accepted? Add the escrow details. The listing information is already filled in, and the purchase checklist items are added to this file.' : 'Tenant found? Add the lease details. The listing information is already filled in, and the lease checklist items are added to this file.') + '</p><div id="ce"></div><form id="cf" novalidate>' +
    '<div class="card gb"><h3>Who we represent</h3><div class="fgrid">' + fieldHtml(sideField, pre.side, 'c') + '</div></div>' +
    formHtml(to, pre, 'c', { side: 1 }) + '<div class="actions"><button class="btn" id="cb">' + (to === 'purchase' ? 'Save Accepted Contract' : 'Convert') + '</button></div></form>', true);
  var f = qs('#cf', m); wireForm(f);
  f.onsubmit = function (e) {
    e.preventDefault(); var r = readForm(f);
    if (r.missing.length) { qs('#ce', m).innerHTML = '<div class="err">Please complete: ' + h(r.missing.join(', ')) + '</div>'; m.scrollTop = 0; return; }
    qs('#cb', m).disabled = true;
    api('convert', { id: t.id, intake: r.intake, side: r.intake.side }).then(function (d) { m.close(); toast((to === 'purchase' ? 'Accepted Contract saved. ' + d.added + ' purchase checklist items added.' : 'Converted. ' + d.added + ' checklist items unlocked.')); txnView(t.id); })
      .catch(function (err) { qs('#cb', m).disabled = false; qs('#ce', m).innerHTML = '<div class="err">' + h(err.message) + '</div>'; m.scrollTop = 0; });
  };
}
function cancelModal() {
  var d = S.txn, t = d.txn;
  var ci = d.items.filter(function (x) { return x.cancel && x.active; })[0];
  var has = ci && docsOf(ci.id).length;
  if (!has) {
    var m0 = modal('<h2>Request cancellation</h2><p class="sub">First upload the signed <b>' + h(ci ? ci.title : 'cancellation document') + '</b>' + (ci && ci.forms ? ' (' + h(ci.forms) + ')' : '') + '. Then you can send the request. An admin approves every cancellation.</p>' + (ci && canEdit() ? '<label class="btn">Upload ' + h(ci.title) + '<input type="file" class="hidden" id="xup" accept="' + UP_ACCEPT + '"></label>' : ''));
    var xu = qs('#xup', m0);
    if (xu) xu.onchange = function () { var f = xu.files[0]; if (!f) return; uploadFile(f, ci.id, true).then(function () { m0.close(); return api('getTransaction', { id: t.id }); }).then(function (dd) { if (dd) { S.txn = dd; page.keepScroll = true; drawTxn(); if (docsOf(ci.id).length) cancelModal(); } }); };
    return;
  }
  var html = '<h2>Request cancellation</h2><div id="xe"></div><p class="sub">Signed ' + h(ci.title) + ' is on file. An admin reviews your request.</p>';
  if (t.relistQuestion) html += '<div class="card gb"><h3>Is the property going back on the market?</h3><div class="radios" id="rl"><label><input type="radio" name="rl" value="yes"> Yes, relist it</label><label><input type="radio" name="rl" value="no"> No</label></div><p class="sub" style="margin:10px 0 0">If yes, a new ' + (t.type === 'lease' ? 'lease listing' : 'listing') + ' is created automatically with the listing documents once the cancellation is approved.</p></div>';
  html += '<div class="f"><label>Reason</label><textarea id="xr" placeholder="Why is this file cancelling?"></textarea></div><div class="actions"><button class="btn red" id="xb">Send cancellation request</button></div>';
  var m = modal(html);
  qsa('#rl input', m).forEach(function (r) { r.onchange = function () { qsa('#rl label', m).forEach(function (l) { l.classList.toggle('on', l.contains(r)); }); }; });
  qs('#xb', m).onclick = function () {
    var p = { id: t.id, reason: qs('#xr', m).value.trim() };
    if (t.relistQuestion) { var c = qs('#rl input:checked', m); if (!c) { qs('#xe', m).innerHTML = '<div class="err">Answer whether the property is going back on the market.</div>'; return; } p.relist = c.value === 'yes'; }
    this.disabled = true;
    api('requestCancel', p).then(function () { m.close(); toast('Cancellation request sent to the office.'); refresh(); }).catch(function (e) { qs('#xb', m).disabled = false; qs('#xe', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; });
  };
}
function statusModal() {
  var t = S.txn.txn, i = t.intake || {};
  var m = modal('<h2>Set status</h2><p class="sub">Cancellations go through “Request cancellation” so the signed document is on file.</p><div id="ze"></div><div class="radios" id="zs">' +
    ['Active', 'In Escrow', 'Closed', 'Expired Contract'].map(function (s) { return '<label class="' + (t.status === s ? 'on' : '') + '"><input type="radio" name="zs" value="' + s + '"' + (t.status === s ? ' checked' : '') + '> ' + s + '</label>'; }).join('') + '</div>' +
    '<div class="fgrid hidden" id="zc" style="margin-top:16px"><div class="f"><label>Close date</label><input type="date" id="zd" value="' + h(t.closedAt ? String(t.closedAt).slice(0, 10) : (i.estCloseDate || '')) + '"></div>' + (t.type === 'purchase' ? '<div class="f"><label>Final sales price</label><input type="text" inputmode="decimal" id="zp" value="' + h(i.finalPrice || i.purchasePrice || '') + '"></div>' : '') + '</div>' +
    '<div class="actions"><button class="btn" id="zb">Save status</button></div>');
  var sync = function () { var c = qs('#zs input:checked', m); qs('#zc', m).classList.toggle('hidden', !(c && c.value === 'Closed')); qsa('#zs label', m).forEach(function (l) { l.classList.toggle('on', !!c && l.contains(c)); }); };
  qsa('#zs input', m).forEach(function (r) { r.onchange = sync; }); sync();
  qs('#zb', m).onclick = function () {
    var c = qs('#zs input:checked', m); if (!c) return;
    api('setStatus', { id: t.id, status: c.value, closeDate: qs('#zd', m).value, finalPrice: qs('#zp', m) ? qs('#zp', m).value : '' }).then(function () { m.close(); toast('Status updated.'); refresh(); })
      .catch(function (e) { qs('#ze', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; });
  };
}

/* ---------------- admin: review ---------------- */
function reviewView() {
  loading('review');
  api('reviewQueue').then(function (d) {
    S.badges.review = d.items.length + d.cancellations.length;
    var inner = '<h1>Review</h1><p class="sub">Admin only. Approve each submitted checklist item, or reject it with a note that goes back to the agent.</p>' +
      (d.cancellations.length ? '<h2>Cancellation requests</h2>' + d.cancellations.map(function (c) {
        var r = c.request || {};
        return '<div class="rb card" style="padding:18px"><div class="top"><div><b>' + h(c.title) + '</b><p class="sub" style="margin:2px 0 0">' + h(c.typeLabel) + ' · ' + h(c.agentName) + ' · requested ' + h(fmtTs(r.requestedAt)) + '</p>' + (r.reason ? '<div class="note">Reason: ' + h(r.reason) + '</div>' : '') +
          (r.relist === true ? '<div class="note"><b class="gt">Back on market: yes</b> · approving creates a new listing with the listing documents.</div>' : r.relist === false ? '<div class="note">Back on market: no</div>' : '') + '</div>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap"><a class="ub" href="#/t/' + h(c.txnId) + '">Open file</a><button class="btn sm cdec" data-id="' + h(c.txnId) + '" data-a="1">Approve</button><button class="btn red sm cdec" data-id="' + h(c.txnId) + '" data-a="">Deny</button></div></div></div>';
      }).join('') : '') +
      '<h2>Checklist items waiting (' + d.items.length + ')</h2>' +
      (d.items.length ? '<div class="gb" style="padding:4px 0">' + d.items.map(function (it) {
        return '<div class="row" style="align-items:flex-start"><div class="n"><b>' + h(it.itemTitle) + '</b><small>' + h(it.forms) + '</small><div class="note"><a href="#/t/' + h(it.txnId) + '">' + h(it.txnTitle) + '</a> · ' + h(it.typeLabel) + ' · ' + h(it.agentName) + ' · ' + h(fmtTs(it.submittedAt)) + '</div>' +
          '<div class="docs">' + it.docs.map(function (x) { return '<button class="dl" data-doc="' + h(x.id) + '">' + h(x.name) + (x.pageRange ? ' (pages ' + h(x.pageRange) + ')' : '') + '</button>'; }).join('') + '</div>' +
          (it.notes || []).map(function (n) { return '<div class="note">' + (n.kind === 'rejection' ? '<span class="rt">Earlier rejection</span> ' : n.kind === 'resubmit' ? '<span class="gt">Agent resubmitted</span> ' : '') + h(n.by) + ': ' + h(n.text) + '</div>'; }).join('') + '</div>' +
          '<div class="acts" style="flex-direction:column;align-items:stretch;min-width:240px"><textarea class="rn" placeholder="Note (required to reject)" style="min-height:60px;margin:0"></textarea><div style="display:flex;gap:8px"><button class="btn sm rv" data-item="' + h(it.itemId) + '" data-d="approve">Approve</button><button class="btn red sm rv" data-item="' + h(it.itemId) + '" data-d="reject">Reject</button></div></div></div>';
      }).join('') + '</div>' : '<div class="card gb">Nothing is waiting for review.</div>');
    page('review', inner, function () {
      qsa('.dl').forEach(function (b) { b.onclick = function () { openDoc(b.getAttribute('data-doc'), b); }; });
      qsa('.rv').forEach(function (b) {
        b.onclick = function () {
          var ta = qs('.rn', b.closest('.row')), note = ta.value.trim(), dec = b.getAttribute('data-d');
          if (dec === 'reject' && !note) { toast('Add a rejection note so the agent knows what to fix.', 1); ta.focus(); return; }
          b.disabled = true;
          api('reviewItem', { itemId: b.getAttribute('data-item'), decision: dec, note: note }).then(function () { toast(dec === 'approve' ? 'Approved.' : 'Rejected. The agent will see your note.'); reviewView(); }).catch(function (e) { b.disabled = false; toast(e.message, 1); });
        };
      });
      qsa('.cdec').forEach(function (b) {
        b.onclick = function () {
          var approve = !!b.getAttribute('data-a');
          promptModal(approve ? 'Approve cancellation' : 'Deny cancellation', approve ? 'The file becomes Cancelled and is kept 7 years. Add a note for the record.' : 'Tell the agent why.', approve ? 'Approve' : 'Deny', function (txt) {
            return api('decideCancel', { id: b.getAttribute('data-id'), approve: approve, note: txt }).then(function (r) { if (r && r.relistedId) setTimeout(function () { toast('Cancelled. A new listing was created.'); }, 400); });
          });
        };
      });
    });
  }).catch(function (e) { failView('review', e); });
}

/* ---------------- admin: users ---------------- */
/* Role picker (admin only; backend 1.3.0+). Admin is a role on its own and only the owner can grant it. */
function rolePicker(sel, canAdmin) {
  var opts = [['agent', 'Agent', 'Owns files and sees only their own'], ['tc', 'Transaction Coordinator', 'Sees only files they create or are assigned; can’t approve']];
  if (canAdmin) opts.push(['admin', 'Admin', 'Sees and reviews every file (on its own)']);
  return '<div class="f w3"><label>Roles *</label><div class="rpick">' + opts.map(function (o) { return '<label class="' + (sel.indexOf(o[0]) >= 0 ? 'on' : '') + '"><input type="checkbox" name="rl" value="' + o[0] + '"' + (sel.indexOf(o[0]) >= 0 ? ' checked' : '') + '><span><b>' + o[1] + '</b><small>' + o[2] + '</small></span></label>'; }).join('') + '</div></div>';
}
function wireRolePicker(m) {
  var boxes = qsa('input[name=rl]', m);
  var sync = function () { var adm = boxes.filter(function (x) { return x.value === 'admin' && x.checked; }).length; boxes.forEach(function (x) { if (x.value !== 'admin') { x.disabled = !!adm; if (adm) x.checked = false; } x.closest('label').classList.toggle('on', x.checked); }); };
  boxes.forEach(function (x) { x.onchange = sync; }); sync();
}
function pickedRoles(m) { return qsa('input[name=rl]:checked', m).map(function (x) { return x.value; }); }
function usersView() {
  loading('users');
  api('listUsers').then(function (users) {
    var row = function (u, sec) {
      var rs = rolesOf(u), pills = rs[0] === 'admin' ? '<span class="pill p-ok">Admin</span>' : rs.map(function (r) { return '<span class="pill ' + (r === sec ? 'p-ok' : 'p-pend') + '">' + (r === 'tc' ? 'TC' : 'Agent') + '</span>'; }).join(' ');
      return '<tr><td class="unm"><b class="un">' + h(uName(u)) + '</b></td><td class="uem" data-l="Email">' + (hasName(u) ? h(u.email || u.username) : '') + '</td><td data-l="Phone">' + h(u.phone || '') + '</td><td data-l="Role">' + pills + (u.owner ? ' <small>Owner</small>' : '') + '</td>' +
        '<td data-l="Status">' + (u.active ? (u.locked ? '<span class="pill p-rej">Locked</span>' : u.mustChange ? '<span class="pill p-miss">Password not set</span>' : '<span class="pill p-ok">Active</span>') : '<span class="pill p-miss">Disabled</span>') + '</td><td data-l="Last sign-in"><small>' + h(fmtTs(u.lastLogin)) + '</small></td>' +
        '<td class="uact">' + (u.owner && !S.user.owner ? '' : '<button class="link eu" data-id="' + h(u.id) + '">Edit</button> <button class="link rp" data-id="' + h(u.id) + '" data-n="' + h(uName(u)) + '">Reset password</button> ') + (u.owner || u.id === S.user.id ? '' : '<button class="link act" data-id="' + h(u.id) + '" data-a="' + (u.active ? '' : '1') + '">' + (u.active ? 'Disable' : 'Enable') + '</button>') + '</td></tr>';
    };
    var section = function (key, title, list, empty) {
      return '<section class="usec" aria-labelledby="us_' + key + '"><div class="ush"><h2 id="us_' + key + '">' + title + '</h2><span class="ucount">' + list.length + '</span></div>' +
        (list.length ? '<div class="gb tbl"><table class="utbl"><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody>' + list.map(function (u) { return row(u, key); }).join('') + '</tbody></table></div>'
          : '<div class="card gb uempty">' + empty + '</div>') + '</section>';
    };
    var admins = users.filter(function (u) { return rolesOf(u)[0] === 'admin'; }), agents = users.filter(function (u) { return rolesOf(u).indexOf('agent') >= 0; }), tcs = users.filter(function (u) { return rolesOf(u).indexOf('tc') >= 0; });
    var inner = '<div class="top"><div><h1>Users</h1></div><button class="btn" id="nu">' + (S.tcApi ? '+ Add user' : '+ Add agent') + '</button></div>' +
      section('admin', 'Admins', admins, 'No admins.') + section('agent', 'Agents', agents, 'No agents yet.') +
      section('tc', 'Transaction Coordinators', tcs, S.tcApi ? 'No transaction coordinators yet. Use <b>+ Add user</b> and tick Transaction Coordinator.' : 'Transaction coordinators arrive with the next backend update.');
    page('users', inner, function () {
      qs('#nu').onclick = function () {
        var m = modal('<h2>' + (S.tcApi ? 'Add user' : 'Add agent') + '</h2><div id="ae"></div><div class="fgrid"><div class="f"><label>First name *</label><input type="text" id="af" maxlength="50" required></div><div class="f w2"><label>Last name *</label><input type="text" id="al" maxlength="50" required></div>' +
          '<div class="f w2"><label>Email (their login)</label><input type="email" id="am" autocapitalize="none"></div><div class="f"><label>Phone</label><input type="tel" id="ap"></div>' + (S.tcApi ? rolePicker(['agent'], !!S.user.owner) : '') + '</div><div class="actions"><button class="btn" id="ab">Create user</button></div>');
        if (S.tcApi) wireRolePicker(m);
        qs('#ab', m).onclick = function () {
          var em = qs('#am', m).value.trim().toLowerCase(), fn = qs('#af', m).value.trim(), ln = qs('#al', m).value.trim(), ne = nameErr(fn, ln);
          var roles = S.tcApi ? pickedRoles(m) : null;
          if (!ne && roles && !roles.length) ne = 'Choose at least one role.';
          if (ne) { qs('#ae', m).innerHTML = '<div class="err">' + h(ne) + '</div>'; return; }
          var body = { firstName: fn, lastName: ln, name: fn + ' ' + ln /* older backends */, username: em, email: em, phone: qs('#ap', m).value.trim() };
          if (roles) body.roles = roles; else body.role = 'agent';
          api('createUser', body).then(function (r) {
            qs('.box', m).innerHTML = '<h2>' + (S.tcApi ? h(roleLabel(r.user)) + ' added' : 'Agent added') + '</h2><p>Tell <b>' + h(uName(r.user)) + '</b> to open ' + h(location.origin + location.pathname) + ', tap <b>First time or forgot password?</b> and enter <b>' + h(r.user.username) + '</b>. A code is emailed to them to set their own password.' + (S.tcApi ? ' Their roles are already set and they can’t change them.' : '') + '</p>' +
              (r.tempPassword /* older backend (before v1.2) */ ? '<div class="ok">Temporary password (shown once): <b style="font-family:monospace;font-size:16px">' + h(r.tempPassword) + '</b></div>' : '') + '<div class="actions"><button class="btn" id="dn">Done</button></div>';
            qs('#dn', m).onclick = function () { m.close(); usersView(); };
          }).catch(function (e) { qs('#ae', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; });
        };
      };
      qsa('.rp').forEach(function (b) { b.onclick = function () { if (!confirm('Reset the password for ' + b.getAttribute('data-n') + '? Their current password stops working, they are signed out everywhere, and they get an email with a code to choose a new one.')) return; api('resetPassword', { userId: b.getAttribute('data-id') }).then(function (r) { modal(r.tempPassword /* older backend (before v1.2) */ ? '<h2>Temporary password</h2><div class="ok">' + h(b.getAttribute('data-n')) + ': <b style="font-family:monospace;font-size:16px">' + h(r.tempPassword) + '</b></div><p class="sub">Shown once. They must change it at sign-in.</p>'
          : '<h2>Password reset</h2><div class="ok">' + h(b.getAttribute('data-n')) + ' was signed out and emailed a code to set a new password.</div><p class="sub">The code expires in 30 minutes and works once. Nobody else ever sees their password.</p>'); usersView(); }).catch(function (e) { toast(e.message, 1); }); }; });
      qsa('.eu').forEach(function (b) { b.onclick = function () {
        var u = users.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0]; if (!u) return; var nm = splitNm(u);
        var canRoles = S.tcApi && !u.owner && u.id !== S.user.id && (rolesOf(u)[0] !== 'admin' || S.user.owner);
        var m = modal('<h2>Edit user</h2><p class="sub">' + h(u.email || u.username) + '</p><div id="ee"></div><div class="fgrid"><div class="f"><label>First name *</label><input type="text" id="ef" maxlength="50" required></div><div class="f w2"><label>Last name *</label><input type="text" id="el" maxlength="50" required></div>' +
          '<div class="f"><label>Phone</label><input type="tel" id="ep"></div>' + (canRoles ? rolePicker(rolesOf(u), !!S.user.owner) : '') + '</div><div class="actions"><button class="btn" id="eb">Save</button></div>');
        qs('#ef', m).value = nm.f; qs('#el', m).value = nm.l; qs('#ep', m).value = u.phone || '';
        if (canRoles) wireRolePicker(m);
        qs('#eb', m).onclick = function () {
          var fn = qs('#ef', m).value.trim(), ln = qs('#el', m).value.trim(), ne = nameErr(fn, ln), roles = canRoles ? pickedRoles(m) : null;
          if (!ne && roles && !roles.length) ne = 'Choose at least one role.';
          if (ne) { qs('#ee', m).innerHTML = '<div class="err">' + h(ne) + '</div>'; return; }
          var body = { userId: u.id, firstName: fn, lastName: ln, phone: qs('#ep', m).value.trim() };
          if (roles && roles.join() !== rolesOf(u).join()) body.roles = roles;
          api('updateUser', body).then(function (r) {
            if (u.id === S.user.id && r && r.user) { S.user.firstName = r.user.firstName; S.user.lastName = r.user.lastName; S.user.name = r.user.name; }
            m.close(); toast('Saved.'); usersView();
          }).catch(function (e) { qs('#ee', m).innerHTML = '<div class="err">' + h(/unknown action/i.test(e.message) ? 'Editing names needs the Transaction Center backend 1.2.1 or later.' : e.message) + '</div>'; });
        };
      }; });
      qsa('.act').forEach(function (b) { b.onclick = function () { api('setUserActive', { userId: b.getAttribute('data-id'), active: !!b.getAttribute('data-a') }).then(usersView).catch(function (e) { toast(e.message, 1); }); }; });
    });
  }).catch(function (e) { failView('users', e); });
}

/* ---------------- admin: archive ---------------- */
function archiveView() {
  loading('archive');
  api('purgeQueue').then(function (d) {
    var inner = '<h1>Archive</h1><p class="sub">Every file is kept for 7 years after the transaction closes, expires or cancels. This app never deletes anything. Documents an admin removes from a checklist stay in the Drive archive, marked as removed and waiting for Enrique’s purge approval. Only Enrique decides on permanent deletion, after the keep-until date.</p>' +
      '<div class="gb tbl"><table><thead><tr><th>Document</th><th>Transaction</th><th>Removed</th><th>Reason</th><th>Keep until</th><th></th></tr></thead><tbody>' +
      (d.docs.length ? d.docs.map(function (x) { return '<tr><td>' + h(x.name) + '</td><td><a href="#/t/' + h(x.txnId) + '">' + h(x.txnTitle || x.txnId) + '</a></td><td><small>' + h(fmtTs(x.removedAt)) + '<br>' + h(x.removedBy) + '</small></td><td>' + h(x.reason) + '</td><td>' + h(fmtDate(x.retentionUntil) || 'Open file') + '</td><td><button class="link rst" data-doc="' + h(x.id) + '">Restore</button></td></tr>'; }).join('') : '<tr><td colspan="6">No removed documents.</td></tr>') + '</tbody></table></div>';
    page('archive', inner, function () { qsa('.rst').forEach(function (b) { b.onclick = function () { api('restoreDocument', { docId: b.getAttribute('data-doc') }).then(function () { toast('Restored.'); archiveView(); }).catch(function (e) { toast(e.message, 1); }); }; }); });
  }).catch(function (e) { failView('archive', e); });
}

/* ---------------- CRM (backend 1.4.0+, detected from ping 'crm') ----------------
   Agents see their own clients; admins see everyone with an agent filter; TC view has no CRM (the server enforces all of it).
   Phone and email are plain text only: no texting or emailing from here. */
// CRM: admin, the agent role, and (backend 1.4.2+, feature crm_tc) an agent+TC user in TC View. Always their own clients.
function canCrm() { return !!S.crmApi && !!S.user && (isAdmin() || activeRole() === 'agent' || (S.crmTc && activeRole() === 'tc' && myRoles().indexOf('agent') >= 0)); }
// A linked transaction is the agent's own file: from TC View, open it in My Files (the TC role only sees assigned files).
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[data-ownfile]') : null;
  if (a && activeRole() === 'tc' && myRoles().indexOf('agent') >= 0) { S.asRole = 'agent'; sessionStorage.setItem('tc_role', 'agent'); S.scope = 'personal'; S.filter = ''; S.dash = null; S.txn = null; }
});
var CRM_UI = { q: '', status: '', type: '', tag: '', group: '', agentId: '', remTab: 'overdue', remPick: '', shown: 100 };
function dayPT(d) { return new Date(d).toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); }
function remBucket(r) { var now = Date.now(), t = new Date(r.dueAt).getTime(); if (t < now) return 'overdue'; return dayPT(t) === dayPT(now) ? 'due' : 'upcoming'; }
function cName(c) { return [c.firstName, c.lastName].filter(Boolean).join(' ') || '(no name)'; }
/* 1.4.3 (feature crm_lender): each agent's own Lender Roster. Shown only when the backend has it AND migrateV143 ran. */
function lendOn(d) { return !!S.crmLender && !!d && d.lendersReady === true && Array.isArray(d.lenders); }
function lenderLabel(name, company) { return h(name || '') + (company && company !== name ? ' <small class="lco">' + h(company) + '</small>' : ''); }
function crmStatusPill(s) { var c = { 'New Lead': 'p-pend', 'Active': 'p-ok', 'Under Contract': 'p-ok', 'Closed': 'p-dark', 'Past Client': 'p-dark', 'Inactive': 'p-miss' }[s] || 'p-miss'; return '<span class="pill ' + c + '">' + h(s) + '</span>'; }
function crmDownload(name, text, mime) {
  var url = URL.createObjectURL(new Blob([text], { type: mime }));
  var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
}
function icsStamp(d) { return new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
function icsEsc(s) { return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n'); }
function remText(r, c) { return 'Follow up: ' + cName(c); }
function remDetails(r, c) { return [r.note, c.phone ? 'Phone: ' + c.phone : '', 'Open in CRM: ' + location.origin + location.pathname + '#/crm/c/' + c.id].filter(Boolean).join('\n'); }
function gcalUrl(r, c) {
  var s = new Date(r.dueAt), e = new Date(s.getTime() + 30 * 60000);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(remText(r, c)) + '&dates=' + icsStamp(s) + '/' + icsStamp(e) + '&details=' + encodeURIComponent(remDetails(r, c));
}
function downloadIcs(r, c) {
  var s = new Date(r.dueAt), e = new Date(s.getTime() + 30 * 60000);
  var L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ENESMA REALTY//Transaction Center CRM//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT', 'UID:' + r.id + '@app.enesmarealty.com', 'DTSTAMP:' + icsStamp(new Date()), 'DTSTART:' + icsStamp(s), 'DTEND:' + icsStamp(e),
    'SUMMARY:' + icsEsc(remText(r, c)), 'DESCRIPTION:' + icsEsc(remDetails(r, c)), 'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(remText(r, c)), 'TRIGGER:-PT10M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'];
  crmDownload('follow-up-' + cName(c).replace(/[^A-Za-z0-9]+/g, '-') + '.ics', L.join('\r\n') + '\r\n', 'text/calendar');
}
function remRow(r, c, withClient) {
  var b = remBucket(r);
  return '<div class="row crem" data-rid="' + h(r.id) + '"><div class="n">' + (withClient ? '<b><a href="#/crm/c/' + h(c.id) + '">' + h(cName(c)) + '</a></b>' : '') +
    '<small class="' + (b === 'overdue' && !r.done ? 'rt' : '') + '">' + (r.done ? 'Done · ' : b === 'overdue' ? 'Overdue · ' : '') + h(fmtTs(r.dueAt)) + '</small>' + (r.note ? '<div class="note">' + h(r.note) + '</div>' : '') + '</div>' +
    '<div class="acts">' + (r.done ? '<button class="ub" data-act="undone">Reopen</button>' : '<button class="btn sm" data-act="done">Mark done</button>') +
    '<a class="ub" href="' + h(gcalUrl(r, c)) + '" target="_blank" rel="noopener noreferrer">Google Calendar</a><button class="ub" data-act="ics">.ics</button>' + (withClient ? '' : '<button class="link" data-act="del">Delete</button>') + '</div></div>';
}
function wireRems(root, rems, clientsById, after) {
  qsa('.crem', root).forEach(function (el) {
    var r = rems.filter(function (x) { return x.id === el.getAttribute('data-rid'); })[0]; if (!r) return;
    var c = clientsById[r.clientId] || {};
    qsa('[data-act]', el).forEach(function (b) {
      b.onclick = function () {
        var a = b.getAttribute('data-act');
        if (a === 'ics') return downloadIcs(r, c);
        b.disabled = true;
        var p = a === 'del' ? (confirm('Delete this follow-up?') ? api('crmDeleteReminder', { id: r.id }) : Promise.reject(null)) : api('crmSetReminderDone', { id: r.id, done: a === 'done' });
        p.then(function () { toast(a === 'done' ? 'Marked done.' : a === 'del' ? 'Deleted.' : 'Reopened.'); after(); }).catch(function (e) { b.disabled = false; if (e) toast(e.message, 1); });
      };
    });
  });
}

function crmHome() {
  loading('crm');
  api('crmBoot', isAdmin() ? { agentId: CRM_UI.agentId } : {}).then(function (d) {
    S.crm = d;
    var byId = {}; d.clients.forEach(function (c) { byId[c.id] = c; c._s = [cName(c), c.phone, String(c.phone || '').replace(/\D/g, ''), c.email, c.address, c.source, (c.tags || []).join(' '), c.ownerName || '', c.lenderName || '', c.lenderCompany || ''].join(' ').toLowerCase(); });
    var LO = lendOn(d);
    var gName = {}; d.groups.forEach(function (g) { gName[g.id] = g.name; });
    var tags = {}; d.clients.forEach(function (c) { (c.tags || []).forEach(function (t) { tags[t.toLowerCase()] = tags[t.toLowerCase()] || t; }); });
    var tagList = Object.keys(tags).sort().map(function (k) { return tags[k]; });
    var buckets = { overdue: [], due: [], upcoming: [] };
    d.reminders.filter(function (r) { return byId[r.clientId]; }).sort(function (a, b) { return a.dueAt < b.dueAt ? -1 : 1; }).forEach(function (r) { buckets[remBucket(r)].push(r); });
    // The tab the agent picked sticks while they stay on the page; otherwise show the most urgent non-empty list.
    CRM_UI.remTab = CRM_UI.remPick || (buckets.overdue.length ? 'overdue' : buckets.due.length ? 'due' : 'upcoming');
    var opt = function (v, l, cur) { return '<option value="' + h(v) + '"' + (v === cur ? ' selected' : '') + '>' + h(l) + '</option>'; };
    var inner = '<div class="top"><div><h1>CRM</h1><p class="sub">' + (d.admin ? 'Every agent’s clients. Pick an agent to narrow the list.' : 'Your clients, notes and follow-ups. Only you (and the admin) can see them.') + '</p></div>' +
      '<div class="cact"><button class="btn" id="cAdd">+ Add client</button><button class="ub" id="cImp">Import</button><button class="ub" id="cExp">Export</button><button class="ub" id="cGrp">Groups</button>' + (LO ? '<a class="ub" id="cLen" href="#/crm/lenders">' + (d.admin ? 'Lender rosters' : 'My Lenders') + '</a>' : '') + '<button class="ub" id="cFeed">Calendar feed</button></div></div>' +
      (d.admin ? '<div class="cagent f"><label for="cAg">Agent</label><select id="cAg">' + opt('', 'All agents', CRM_UI.agentId) + (d.agents || []).map(function (a) { return opt(a.id, a.name, CRM_UI.agentId); }).join('') + '</select></div>' : '') +
      '<div class="card gb crems"><div class="ush"><h2>Follow-ups</h2></div><div class="seg" role="group" aria-label="Follow-ups">' +
      [['overdue', 'Overdue'], ['due', 'Due today'], ['upcoming', 'Upcoming']].map(function (x) { return '<button type="button" data-rt="' + x[0] + '" class="' + (CRM_UI.remTab === x[0] ? 'on' : '') + '" aria-pressed="' + (CRM_UI.remTab === x[0]) + '">' + x[1] + ' <span class="ucount' + (x[0] === 'overdue' && buckets.overdue.length ? ' red' : '') + '">' + buckets[x[0]].length + '</span></button>'; }).join('') + '</div>' +
      '<div id="remList">' + (buckets[CRM_UI.remTab].length ? buckets[CRM_UI.remTab].slice(0, 50).map(function (r) { return remRow(r, byId[r.clientId], true); }).join('') : '<div class="uempty">' + { overdue: 'Nothing overdue.', due: 'Nothing due today.', upcoming: 'No upcoming follow-ups. Add one from a client’s page.' }[CRM_UI.remTab] + '</div>') + '</div></div>' +
      '<div class="cfil"><div class="f cq"><label for="cQ">Search</label><input type="search" id="cQ" placeholder="Name, phone, tag…" value="' + h(CRM_UI.q) + '" autocomplete="off"></div>' +
      '<div class="f"><label for="cSt">Status</label><select id="cSt">' + opt('', 'All', CRM_UI.status) + d.statuses.map(function (s) { return opt(s, s, CRM_UI.status); }).join('') + '</select></div>' +
      '<div class="f"><label for="cTy">Type</label><select id="cTy">' + opt('', 'All', CRM_UI.type) + Object.keys(d.types).map(function (k) { return opt(k, d.types[k], CRM_UI.type); }).join('') + '</select></div>' +
      '<div class="f"><label for="cTg">Tag</label><select id="cTg">' + opt('', 'All', CRM_UI.tag) + tagList.map(function (t) { return opt(t.toLowerCase(), t, CRM_UI.tag); }).join('') + '</select></div>' +
      '<div class="f"><label for="cGr">Group</label><select id="cGr">' + opt('', 'All', CRM_UI.group) + d.groups.map(function (g) { return opt(g.id, g.name + (d.admin && !CRM_UI.agentId ? ' · ' + (g.ownerName || '') : '') + ' (' + g.count + ')', CRM_UI.group); }).join('') + '</select></div></div>' +
      '<div class="card gb clist' + (LO ? ' wl' : '') + (d.admin ? ' wa' : '') + '"><div id="cRows"></div></div>';
    page('crm', inner, function () {
      var draw = function () {
        var q = CRM_UI.q.toLowerCase().trim(), qd = q.replace(/\D/g, '');
        var list = d.clients.filter(function (c) {
          if (CRM_UI.status && c.status !== CRM_UI.status) return false;
          if (CRM_UI.type && c.type !== CRM_UI.type) return false;
          if (CRM_UI.tag && !(c.tags || []).some(function (t) { return t.toLowerCase() === CRM_UI.tag; })) return false;
          if (CRM_UI.group && (c.groups || []).indexOf(CRM_UI.group) < 0) return false;
          return !q || q.split(/\s+/).every(function (w) { return c._s.indexOf(w) >= 0; }) || (qd.length >= 3 && c._s.indexOf(qd) >= 0);
        }).sort(function (a, b) { return cName(a).localeCompare(cName(b)); });
        var shown = list.slice(0, CRM_UI.shown);
        qs('#cRows').innerHTML = (list.length ? '<div class="tbl"><table class="ctbl"><thead><tr><th>Name</th><th>Status</th><th>Type</th><th>Phone</th><th>Email</th>' + (d.admin ? '<th>Agent</th>' : '') + (LO ? '<th>Lender</th>' : '') + '<th>Tags</th><th>Next follow-up</th></tr></thead><tbody>' +
          shown.map(function (c) {
            return '<tr><td class="cnm"><a href="#/crm/c/' + h(c.id) + '"><b>' + h(cName(c)) + '</b></a></td><td data-l="Status">' + crmStatusPill(c.status) + '</td><td data-l="Type">' + h(d.types[c.type] || c.type) + '</td>' +
              '<td data-l="Phone">' + h(c.phone) + '</td><td data-l="Email">' + h(c.email) + '</td>' + (d.admin ? '<td data-l="Agent">' + h(c.ownerName) + '</td>' : '') +
              (LO ? '<td data-l="Lender">' + (c.lenderId ? lenderLabel(c.lenderName, c.lenderCompany) : '') + '</td>' : '') +
              '<td data-l="Tags">' + (c.tags || []).map(function (t) { return '<span class="ctag">' + h(t) + '</span>'; }).join('') + '</td><td data-l="Follow-up">' + (c.nextDue ? '<span class="' + (new Date(c.nextDue).getTime() < Date.now() ? 'rt' : '') + '">' + h(fmtTs(c.nextDue)) + '</span>' : '') + '</td></tr>';
          }).join('') + '</tbody></table></div>' : '<div class="uempty">' + (d.clients.length ? 'No clients match these filters.' : 'No clients yet. Use <b>+ Add client</b> or <b>Import</b>.') + '</div>') +
          '<div class="cfoot">' + h(list.length) + ' of ' + h(d.clients.length) + ' clients' + (list.length > shown.length ? ' · <button class="link" id="cMore">Show more</button>' : '') + '</div>';
        var mo = qs('#cMore'); if (mo) mo.onclick = function () { CRM_UI.shown += 200; draw(); };
      };
      draw();
      qs('#cQ').addEventListener('input', debounce(function () { CRM_UI.q = qs('#cQ').value; CRM_UI.shown = 100; draw(); }, 120));
      [['#cSt', 'status'], ['#cTy', 'type'], ['#cTg', 'tag'], ['#cGr', 'group']].forEach(function (x) { qs(x[0]).onchange = function () { CRM_UI[x[1]] = this.value; CRM_UI.shown = 100; draw(); }; });
      var ag = qs('#cAg'); if (ag) ag.onchange = function () { CRM_UI.agentId = this.value; CRM_UI.group = ''; crmHome(); };
      qsa('[data-rt]').forEach(function (b) { b.onclick = function () { CRM_UI.remPick = b.getAttribute('data-rt'); page.keepScroll = true; crmHome(); }; });
      wireRems(qs('#remList'), d.reminders, byId, function () { page.keepScroll = true; crmHome(); });
      qs('#cAdd').onclick = function () { clientForm(null, d); };
      qs('#cImp').onclick = function () { importModal(d); };
      qs('#cExp').onclick = function () { exportModal(d); };
      qs('#cGrp').onclick = function () { groupsModal(d); };
      qs('#cFeed').onclick = function () { feedModal(d); };
    });
  }).catch(function (e) { failView('crm', e); });
}

function clientView(id) {
  loading('crm');
  var bootP = S.crm ? Promise.resolve(S.crm) : api('crmBoot', isAdmin() ? { agentId: CRM_UI.agentId } : {}).then(function (d) { S.crm = d; return d; });
  Promise.all([api('crmGetClient', { id: id }), bootP]).then(function (res) {
    var g = res[0], d = res[1], c = g.client;
    var gName = {}; d.groups.forEach(function (x) { gName[x.id] = x.name; });
    var by = {}; by[c.id] = c;
    var kv = function (l, v) { return '<div><span>' + h(l) + '</span><b>' + (v || '—') + '</b></div>'; };
    var inner = '<a class="link cback" href="#/crm">← All clients</a><div class="top"><div><div class="pills">' + crmStatusPill(c.status) + '<span class="pill p-pend">' + h(d.types[c.type] || c.type) + '</span></div><h1>' + h(cName(c)) + '</h1></div>' +
      '<div class="cact"><button class="btn" id="cEdit">Edit</button><button class="ub red" id="cDel">Delete</button></div></div>' +
      '<div class="card gb"><div class="kv">' + kv('Phone', h(c.phone)) + kv('Email', h(c.email)) + kv('Address', h(c.address)) + kv('Source', h(c.source)) +
      kv('Tags', (c.tags || []).map(function (t) { return '<span class="ctag">' + h(t) + '</span>'; }).join('')) + kv('Groups', (c.groups || []).map(function (x) { return h(gName[x] || ''); }).filter(Boolean).join(', ')) +
      (c.ownerName !== undefined ? kv('Agent', h(c.ownerName)) : '') +
      (lendOn(d) ? kv('Lender', g.lender ? lenderLabel(g.lender.name, g.lender.company) + ([g.lender.phone, g.lender.email, g.lender.nmls ? 'NMLS #' + g.lender.nmls : ''].filter(Boolean).length ? '<small class="lco">' + h([g.lender.phone, g.lender.email, g.lender.nmls ? 'NMLS #' + g.lender.nmls : ''].filter(Boolean).join(' · ')) + '</small>' : '') : '') : '') +
      kv('Added', h(fmtTs(c.createdAt))) + kv('Updated', h(fmtTs(c.updatedAt))) + '</div>' +
      (g.txns.length ? '<h3 class="csub">Linked transactions</h3><div class="clinks">' + g.txns.map(function (t) { return '<a class="ub" data-ownfile="1" href="#/t/' + h(t.id) + '">' + h(t.title) + ' · ' + h(t.typeLabel) + ' · ' + h(t.status) + '</a>'; }).join('') + '</div>' : '') + '</div>' +
      '<div class="cgrid"><div class="card gb"><h3>Follow-ups</h3><form id="rf" class="rform" novalidate><div class="f"><label for="rd">Date &amp; time</label><input type="datetime-local" id="rd" required></div><div class="f rnote"><label for="rn">Note</label><input type="text" id="rn" maxlength="300" placeholder="Call about…"></div><button class="btn" id="rb">Add follow-up</button></form><div id="re"></div>' +
      '<div id="rl">' + (g.reminders.length ? g.reminders.map(function (r) { return remRow(r, c, false); }).join('') : '<div class="uempty">No follow-ups yet.</div>') + '</div></div>' +
      '<div class="card gb"><h3>Notes</h3><form id="nf" novalidate><textarea id="nt" maxlength="5000" placeholder="Add a note…" aria-label="New note"></textarea><div class="actions"><button class="btn" id="nb">Add note</button></div></form><div id="ne"></div>' +
      '<div class="feed">' + (g.notes.length ? g.notes.map(function (n) { return '<div class="ev"><small>' + h(fmtTs(n.createdAt)) + (n.by ? ' · ' + h(n.by) : '') + '</small><div class="ntext">' + h(n.text) + '</div></div>'; }).join('') : '<div class="uempty">No notes yet.</div>') + '</div></div></div>';
    page('crm', inner, function () {
      var again = function () { page.keepScroll = true; clientView(id); };
      qs('#cEdit').onclick = function () { clientForm(c, d, g.txns, g.lender); };
      qs('#cDel').onclick = function () { if (!confirm('Delete ' + cName(c) + ' from the CRM?')) return; api('crmDeleteClient', { id: c.id }).then(function () { toast('Client deleted.'); S.crm = null; location.hash = '#/crm'; }).catch(function (e) { toast(e.message, 1); }); };
      wireRems(qs('#rl'), g.reminders, by, function () { S.crm = null; again(); });
      qs('#rf').onsubmit = function (e) {
        e.preventDefault(); var v = qs('#rd').value, err = qs('#re');
        if (!v || isNaN(new Date(v))) { err.innerHTML = '<div class="err">Choose a date and time.</div>'; return; }
        qs('#rb').disabled = true;
        api('crmAddReminder', { clientId: c.id, dueAt: new Date(v).toISOString(), note: qs('#rn').value }).then(function () { toast('Follow-up added.'); S.crm = null; again(); })
          .catch(function (x) { qs('#rb').disabled = false; err.innerHTML = '<div class="err">' + h(x.message) + '</div>'; });
      };
      qs('#nf').onsubmit = function (e) {
        e.preventDefault(); var v = qs('#nt').value.trim(); if (!v) { qs('#ne').innerHTML = '<div class="err">Write a note first.</div>'; return; }
        qs('#nb').disabled = true;
        api('crmAddNote', { clientId: c.id, text: v }).then(function () { toast('Note added.'); again(); }).catch(function (x) { qs('#nb').disabled = false; qs('#ne').innerHTML = '<div class="err">' + h(x.message) + '</div>'; });
      };
    });
  }).catch(function (e) { failView('crm', e); });
}

/* 1.4.1: CRM phones are 000-000-0000 (the server normalizes and checks too). A leading 1 / +1 is dropped. */
var PHONE_ERR = 'Phone must be a 10-digit number (000-000-0000).';
function phoneDigits(v) { var d = String(v || '').replace(/\D/g, ''); return d.charAt(0) === '1' ? d.slice(1) : d; }
function fmtPhone(v) { var d = phoneDigits(v).slice(0, 10); return d.length > 6 ? d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6) : d.length > 3 ? d.slice(0, 3) + '-' + d.slice(3) : d; }
function phoneOk(v) { return !v || /^\d{3}-\d{3}-\d{4}$/.test(v); }
function wirePhone(el) {
  if (!el) return;
  var cur = el.value; if (phoneDigits(cur).length === 10 || !cur) el.value = fmtPhone(cur);   // a legacy number that can't be formatted stays visible to fix
  function put(raw, caretDigits) {
    el.value = fmtPhone(raw);
    if (caretDigits === undefined) return;
    var i = 0, n = 0; while (i < el.value.length && n < caretDigits) { if (/\d/.test(el.value.charAt(i))) n++; i++; }
    try { el.setSelectionRange(i, i); } catch (e) { }
  }
  el.addEventListener('input', function () {
    var pos = el.selectionStart == null ? el.value.length : el.selectionStart, before = el.value.slice(0, pos);
    var lead = String(el.value).replace(/\D/g, '').charAt(0) === '1' ? 1 : 0;
    put(el.value, Math.max(0, before.replace(/\D/g, '').length - lead));
  });
  // Pasting "+1 (951) 555-0101" would be cut by maxlength before formatting, so format the pasted text ourselves.
  el.addEventListener('paste', function (e) {
    var t = (e.clipboardData || window.clipboardData); if (!t) return; e.preventDefault();
    var a = el.selectionStart || 0, b = el.selectionEnd || 0;
    put(el.value.slice(0, a) + t.getData('text') + el.value.slice(b));
  });
}

function clientForm(c, d, linked, curLender) {
  var isNew = !c; c = c || { type: '', status: 'New Lead', tags: [], groups: [], txnIds: [] };
  var ownerId = c.ownerId || (d.admin ? (CRM_UI.agentId || S.user.id) : S.user.id);
  var opt = function (v, l, cur) { return '<option value="' + h(v) + '"' + (v === cur ? ' selected' : '') + '>' + h(l) + '</option>'; };
  var inp = function (id, l, v, type, extra) { return '<div class="f' + (extra || '') + '"><label for="' + id + '">' + l + '</label><input type="' + (type || 'text') + '" id="' + id + '" value="' + h(v || '') + '"' + (type === 'email' ? ' autocapitalize="none" spellcheck="false"' : '') + '></div>'; };
  var m = modal('<h2>' + (isNew ? 'Add client' : 'Edit client') + '</h2><div id="ce"></div><form id="cf" novalidate><div class="fgrid">' +
    inp('cfF', 'First name', c.firstName) + inp('cfL', 'Last name', c.lastName) + '<div class="f"><label for="cfP">Phone</label><input type="tel" id="cfP" inputmode="tel" autocomplete="tel-national" placeholder="000-000-0000" maxlength="12" value="' + h(c.phone || '') + '"></div>' + inp('cfE', 'Email', c.email, 'email', ' w2') + inp('cfA', 'Address', c.address, 'text', ' w3') +
    '<div class="f"><label for="cfT">Client type <span class="req">*</span></label><select id="cfT">' + opt('', 'Choose…', c.type) + Object.keys(d.types).map(function (k) { return opt(k, d.types[k], c.type); }).join('') + '</select></div>' +
    '<div class="f"><label for="cfS">Status</label><select id="cfS">' + d.statuses.map(function (s) { return opt(s, s, c.status); }).join('') + '</select></div>' +
    '<div class="f"><label for="cfSo">Source</label><input type="text" id="cfSo" list="cfSoL" maxlength="60" value="' + h(c.source || '') + '"><datalist id="cfSoL">' + d.sources.map(function (s) { return '<option value="' + h(s) + '">'; }).join('') + '</datalist></div>' +
    '<div class="f w3"><label for="cfTg">Tags (comma separated)</label><input type="text" id="cfTg" value="' + h((c.tags || []).join(', ')) + '" placeholder="vip, first-time buyer"></div>' +
    (d.admin && isNew ? '<div class="f w3"><label for="cfO">Agent</label><select id="cfO">' + opt(S.user.id, uName(S.user) + ' (me)', ownerId) + (d.agents || []).filter(function (a) { return a.id !== S.user.id; }).map(function (a) { return opt(a.id, a.name, ownerId); }).join('') + '</select></div>' : '') +
    (lendOn(d) ? '<div class="f w3"><label for="cfLq">Lender</label><div class="lpick" id="cfLp"><input type="search" id="cfLq" placeholder="Search this roster…" autocomplete="off" aria-label="Search lenders"><select id="cfLn" aria-label="Lender"></select>' +
      '<div class="lbtns"><button type="button" class="ub" id="cfLa">+ Add new lender</button><button type="button" class="link" id="cfLx">Clear</button></div></div><div id="cfLnew"></div></div>' : '') +
    '<div class="f w3"><label>Groups</label><div class="chips" id="cfG"></div></div>' +
    '<div class="f w3"><label>Linked transactions</label><div class="clinkp" id="cfX"></div></div>' +
    (isNew ? '<div class="f w3"><label for="cfN">First note</label><textarea id="cfN" maxlength="5000"></textarea></div>' : '') +
    '</div><div class="actions"><button class="btn" id="cfB">' + (isNew ? 'Add client' : 'Save') + '</button></div></form>', true);
  var sel = { g: (c.groups || []).slice(), x: (c.txnIds || []).slice(), l: c.lenderId || '' };
  var LO = lendOn(d);
  // The client's current lender is always pickable, even if this boot's roster view was narrowed to another agent.
  if (LO && curLender && curLender.id && !d.lenders.some(function (l) { return l.id === curLender.id; })) d.lenders.push(curLender);
  function drawLenders() {   // only the client owner's roster (an agent's d.lenders is already just their own)
    if (!LO) return;
    var o = qs('#cfO', m) ? qs('#cfO', m).value : ownerId, q = qs('#cfLq', m).value.toLowerCase().trim();
    var ros = d.lenders.filter(function (l) { return l.ownerId === o; });
    if (sel.l && d.lenders.some(function (l) { return l.id === sel.l && l.ownerId !== o; })) sel.l = '';   // owner changed: other roster
    var shown = ros.filter(function (l) { return l.id === sel.l || !q || (l.name + ' ' + l.company + ' ' + l.phone + ' ' + l.email + ' ' + l.nmls).toLowerCase().indexOf(q) >= 0; });
    qs('#cfLn', m).innerHTML = '<option value="">' + (ros.length ? '— No lender —' : '— No lenders in this roster yet —') + '</option>' +
      shown.map(function (l) { return '<option value="' + h(l.id) + '"' + (l.id === sel.l ? ' selected' : '') + '>' + h(l.name + (l.company && l.company !== l.name ? ' · ' + l.company : '')) + '</option>'; }).join('') +
      (q && shown.length === (sel.l ? 1 : 0) ? '<option value="" disabled>No match for “' + h(q) + '”</option>' : '');
    qs('#cfLx', m).classList.toggle('hidden', !sel.l);
  }
  function newLenderForm() {
    var box = qs('#cfLnew', m), o = qs('#cfO', m) ? qs('#cfO', m).value : ownerId;
    box.innerHTML = '<div class="lnew"><div class="lnh"><b>New lender</b><small class="cmuted">' + (o === S.user.id ? 'Added to your roster.' : 'Added to this agent’s roster.') + '</small></div><div id="lne"></div><div class="fgrid">' +
      '<div class="f"><label for="lnN">Name <span class="req">*</span></label><input type="text" id="lnN" maxlength="80"></div><div class="f"><label for="lnC">Company</label><input type="text" id="lnC" maxlength="100"></div>' +
      '<div class="f"><label for="lnP">Phone</label><input type="tel" id="lnP" inputmode="tel" placeholder="000-000-0000" maxlength="12"></div><div class="f w2"><label for="lnE">Email</label><input type="email" id="lnE" maxlength="120" autocapitalize="none" spellcheck="false"></div>' +
      '<div class="f"><label for="lnM">NMLS #</label><input type="text" id="lnM" inputmode="numeric" maxlength="12"></div></div>' +
      '<div class="actions"><button type="button" class="link" id="lnX">Cancel</button><button type="button" class="btn" id="lnB">Add lender</button></div></div>';
    wirePhone(qs('#lnP', box)); qs('#lnN', box).focus();
    qs('#lnX', box).onclick = function () { box.innerHTML = ''; };
    qs('#lnB', box).onclick = function () {
      var v = function (id) { return qs(id, box).value.trim(); }, L = { name: v('#lnN'), company: v('#lnC'), phone: v('#lnP'), email: v('#lnE'), nmls: v('#lnM') };
      var er = lenderErr(L); if (er) { qs('#lne', box).innerHTML = '<div class="err">' + h(er) + '</div>'; return; }
      var b = this; b.disabled = true;
      api('crmSaveLender', { lender: L, ownerId: o }).then(function (r) { d.lenders.push(r.lender); sel.l = r.lender.id; qs('#cfLq', m).value = ''; box.innerHTML = ''; drawLenders(); toast('Lender added.'); })
        .catch(function (e) {
          b.disabled = false;
          var ex = e.code === 'DUPLICATE' ? d.lenders.filter(function (l) { return l.ownerId === o && (l.name + '|' + l.company).toLowerCase() === (L.name + '|' + L.company).toLowerCase(); })[0] : null;
          if (ex) { sel.l = ex.id; box.innerHTML = ''; drawLenders(); toast('Already in the roster: selected.'); return; }
          qs('#lne', box).innerHTML = '<div class="err">' + h(e.message) + '</div>';
        });
    };
  }
  function drawPicks() {
    drawLenders();
    var o = qs('#cfO', m) ? qs('#cfO', m).value : ownerId;
    var gs = d.groups.filter(function (g) { return g.ownerId === o; });
    sel.g = sel.g.filter(function (id) { return gs.some(function (g) { return g.id === id; }); });
    qs('#cfG', m).innerHTML = gs.length ? gs.map(function (g) { var on = sel.g.indexOf(g.id) >= 0; return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-g="' + h(g.id) + '" aria-pressed="' + on + '">' + h(g.name) + '</button>'; }).join('') : '<span class="cmuted">No groups yet. Create them with <b>Groups</b> on the CRM page.</span>';
    var tx = d.txns.filter(function (t) { return t.agentId === o; });
    (linked || []).forEach(function (t) { if (!tx.some(function (x) { return x.id === t.id; })) tx.push(t); });
    sel.x = sel.x.filter(function (id) { return tx.some(function (t) { return t.id === id; }); });
    qs('#cfX', m).innerHTML = tx.length ? tx.map(function (t) { var on = sel.x.indexOf(t.id) >= 0; return '<label class="' + (on ? 'on' : '') + '"><input type="checkbox" value="' + h(t.id) + '"' + (on ? ' checked' : '') + '><span>' + h(t.title) + ' <small>' + h(t.typeLabel) + ' · ' + h(t.status) + '</small></span></label>'; }).join('') : '<span class="cmuted">No transactions for this agent yet.</span>';
    qsa('[data-g]', m).forEach(function (b) { b.onclick = function () { var id = b.getAttribute('data-g'), i = sel.g.indexOf(id); if (i >= 0) sel.g.splice(i, 1); else sel.g.push(id); drawPicks(); }; });
    qsa('#cfX input', m).forEach(function (x) { x.onchange = function () { var i = sel.x.indexOf(x.value); if (x.checked && i < 0) sel.x.push(x.value); if (!x.checked && i >= 0) sel.x.splice(i, 1); x.closest('label').classList.toggle('on', x.checked); }; });
  }
  drawPicks();
  wirePhone(qs('#cfP', m));
  if (qs('#cfO', m)) qs('#cfO', m).onchange = function () { if (qs('#cfLnew', m)) qs('#cfLnew', m).innerHTML = ''; drawPicks(); };
  if (LO) {
    qs('#cfLq', m).addEventListener('input', drawLenders);
    qs('#cfLq', m).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var o = qsa('#cfLn option', m).filter(function (x) { return x.value && !x.disabled; }); if (o.length === 1) { sel.l = o[0].value; drawLenders(); } } });
    qs('#cfLn', m).onchange = function () { sel.l = this.value; drawLenders(); };
    qs('#cfLx', m).onclick = function () { sel.l = ''; qs('#cfLq', m).value = ''; drawLenders(); };
    qs('#cfLa', m).onclick = newLenderForm;
  }
  function save(allowDup) {
    var v = function (id) { return qs(id, m) ? qs(id, m).value.trim() : ''; };
    var client = { firstName: v('#cfF'), lastName: v('#cfL'), phone: v('#cfP'), email: v('#cfE'), address: v('#cfA'), type: v('#cfT'), status: v('#cfS'), source: v('#cfSo'), tags: v('#cfTg'), groups: sel.g, txnIds: sel.x };
    if (LO) client.lenderId = sel.l;   // only sent when lenders are on, so older backends never see it
    var err = !client.firstName && !client.lastName ? 'Enter a first or last name.' : !client.type ? 'Choose a client type.' : !phoneOk(client.phone) ? PHONE_ERR : (client.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(client.email)) ? 'Email address is not valid.' : '';
    if (err) { qs('#ce', m).innerHTML = '<div class="err">' + h(err) + '</div>'; return; }
    if (isNew) client.note = v('#cfN');
    var b = qs('#cfB', m); b.disabled = true;
    var p = { client: client, allowDuplicate: !!allowDup }; if (!isNew) p.id = c.id; if (qs('#cfO', m)) p.ownerId = qs('#cfO', m).value;
    api('crmSaveClient', p).then(function (r) { m.close(); toast(isNew ? 'Client added.' : 'Saved.'); S.crm = null; if (isNew) location.hash = '#/crm/c/' + r.id; else { page.keepScroll = true; clientView(c.id); } })
      .catch(function (e) {
        b.disabled = false;
        qs('#ce', m).innerHTML = '<div class="err">' + h(e.message) + (e.code === 'DUPLICATE' ? ' <button type="button" class="link" id="cfDup">Save anyway</button>' : '') + '</div>';
        var dup = qs('#cfDup', m); if (dup) dup.onclick = function () { save(true); };
        qs('.box', m).scrollTop = 0; m.scrollTop = 0;
      });
  }
  qs('#cf', m).onsubmit = function (e) { e.preventDefault(); save(false); };
}

function exportModal(d) {
  var scope = d.admin ? (CRM_UI.agentId ? ((d.agents || []).filter(function (a) { return a.id === CRM_UI.agentId; })[0] || {}).name || 'this agent' : 'all agents') : 'your clients';
  var m = modal('<h2>Export clients</h2><p class="sub">Downloads a CSV of ' + h(scope) + '. A private copy is also saved in Drive' + (d.admin ? ' (your CRM folder)' : ' (your CRM folder)') + '. Cells that start with = + - @ get a leading apostrophe so spreadsheets never run them as formulas.</p><div id="xe"></div><div class="actions"><button class="btn" id="xb">Download CSV</button></div>');
  qs('#xb', m).onclick = function () {
    var b = this; b.disabled = true;
    api('crmExport', d.admin ? { agentId: CRM_UI.agentId } : {}).then(function (r) { crmDownload(r.fileName, r.csv, 'text/csv;charset=utf-8'); m.close(); toast(r.count + ' clients exported.'); })
      .catch(function (e) { b.disabled = false; qs('#xe', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; });
  };
}

var CRM_TEMPLATE_L = 'First Name,Last Name,Phone,Email,Address,City,State,Zip,Client Type,Source,Status,Tags,Groups,Note,Lender,Lender Company,Lender Phone,Lender Email,Lender NMLS #\r\nJane,Sample,(951) 555-0100,jane@example.com,123 Main St,Riverside,CA,92501,Buyer,Referral,New Lead,"first-time, vip",Open House Oct,Pre-approved up to 600k,Lisa Lender,Sample Mortgage Co,951-555-0199,lisa@example.com,123456\r\n';
var CRM_TEMPLATE = 'First Name,Last Name,Phone,Email,Address,City,State,Zip,Client Type,Source,Status,Tags,Groups,Note\r\nJane,Sample,(951) 555-0100,jane@example.com,123 Main St,Riverside,CA,92501,Buyer,Referral,New Lead,"first-time, vip",Open House Oct,Pre-approved up to 600k\r\n';
function importModal(d) {
  var st = { csv: '', name: '', mapping: null, owner: d.admin ? (CRM_UI.agentId || S.user.id) : '' };
  var opt = function (v, l, cur) { return '<option value="' + h(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + h(l) + '</option>'; };
  var m = modal('<h2>Import clients</h2><p class="sub">Upload a CSV. You’ll match its columns, see every row, and confirm before anything is saved. Duplicates are found by email or phone.</p><div id="ie"></div>' +
    '<div class="cact"><label class="btn" id="ipick">Choose CSV file<input type="file" class="hidden" id="ifile" accept=".csv,text/csv"></label><button type="button" class="ub" id="itpl">Download template</button></div>' +
    (d.admin ? '<div class="f cagent"><label for="iown">Import into</label><select id="iown">' + opt(S.user.id, uName(S.user) + ' (me)', st.owner) + (d.agents || []).filter(function (a) { return a.id !== S.user.id; }).map(function (a) { return opt(a.id, a.name, st.owner); }).join('') + '</select></div>' : '') +
    '<div id="ibody"></div>', true);
  var err = function (msg) { qs('#ie', m).innerHTML = msg ? '<div class="err">' + h(msg) + '</div>' : ''; };
  qs('#itpl', m).onclick = function () { crmDownload('crm-import-template.csv', '\uFEFF' + (lendOn(d) ? CRM_TEMPLATE_L : CRM_TEMPLATE), 'text/csv;charset=utf-8'); };
  if (qs('#iown', m)) qs('#iown', m).onchange = function () { st.owner = this.value; if (st.csv) preview(); };
  qs('#ifile', m).onchange = function () {
    var f = this.files[0]; if (!f) return; err('');
    if (f.size > 2 * 1024 * 1024) return err('That file is too large (max 2 MB).');
    var rd = new FileReader();
    rd.onload = function () { st.csv = String(rd.result || '').replace(/^\uFEFF/, ''); st.name = f.name; st.mapping = null; preview(); };
    rd.onerror = function () { err('Could not read that file.'); };
    rd.readAsText(f);
  };
  function body() { var p = { csv: st.csv }; if (st.mapping) p.mapping = st.mapping; if (d.admin) p.ownerId = st.owner; return p; }
  function preview() {
    qs('#ibody', m).innerHTML = '<div class="loading"><span class="spin"></span>Reading ' + h(st.name) + '…</div>';
    api('crmImportPreview', body()).then(function (p) {
      st.mapping = p.mapping;
      var colOpts = function (f) { return opt('', '— not imported —', p.mapping[f] === undefined ? '' : p.mapping[f]) + p.headers.map(function (hd, i) { return opt(i, hd || ('Column ' + (i + 1)), p.mapping[f]); }).join(''); };
      var stPill = { 'new': '<span class="pill p-ok">New</span>', duplicate: '<span class="pill p-pend">Duplicate</span>', invalid: '<span class="pill p-rej">Invalid</span>' };
      qs('#ibody', m).innerHTML = '<h3 class="csub">1 · Match columns <small>(' + h(st.name) + ', ' + p.total + ' rows)</small></h3><div class="imap">' +
        p.fields.map(function (f) { return '<div class="f"><label for="im_' + f + '">' + h(p.labels[f]) + '</label><select id="im_' + f + '" data-f="' + f + '">' + colOpts(f) + '</select></div>'; }).join('') + '</div>' +
        (p.named ? '' : '<div class="err">Match a name column (First Name, Last Name or Full Name).</div>') +
        '<h3 class="csub">2 · Check the rows</h3><div class="icounts"><span class="pill p-ok">' + p.counts['new'] + ' new</span><span class="pill p-pend">' + p.counts.duplicate + ' duplicates</span><span class="pill p-rej">' + p.counts.invalid + ' invalid (skipped)</span></div>' +
        '<div class="tbl iprev"><table class="ctbl"><thead><tr><th>Row</th><th>Name</th><th>Result</th><th>Phone</th><th>Email</th><th>Status</th><th>Notes</th></tr></thead><tbody>' +
        p.rows.slice(0, 200).map(function (r) {
          var msg = (r.errors || []).concat(r.warnings || []).concat(r.dupOf ? [r.dupOf.name ? 'Matches ' + r.dupOf.name : 'Same as row ' + r.dupOf.row] : [])
            .concat(r.lender && r.state !== 'invalid' ? ['Lender: ' + r.lender.name + (r.lender.company && r.lender.company !== r.lender.name ? ' · ' + r.lender.company : '') + (r.lender.isNew ? ' (new: will be added to the roster)' : ' (in the roster)')] : []);
          return '<tr><td data-l="Row">' + r.n + '</td><td class="cnm"><b>' + h(r.name || '—') + '</b></td><td data-l="Result">' + stPill[r.state] + '</td><td data-l="Phone">' + h(r.phone) + '</td><td data-l="Email">' + h(r.email) + '</td><td data-l="Status">' + h(r.status) + '</td><td data-l="Notes">' + h(msg.join(' · ')) + '</td></tr>';
        }).join('') + '</tbody></table></div>' + (p.rows.length > 200 ? '<p class="cmuted">Showing the first 200 rows.</p>' : '') +
        '<h3 class="csub">3 · Duplicates</h3><div class="radios" id="idm"><label class="on"><input type="radio" name="idm" value="skip" checked>Skip them</label><label><input type="radio" name="idm" value="merge">Fill empty fields of the existing client (never overwrites)</label></div>' +
        '<div class="actions"><button class="btn" id="igo"' + (p.named && (p.counts['new'] + p.counts.duplicate) ? '' : ' disabled') + '>Import ' + p.counts['new'] + ' new client' + (p.counts['new'] === 1 ? '' : 's') + '</button></div>';
      qsa('[data-f]', m).forEach(function (s) { s.onchange = function () { var mp = {}; qsa('[data-f]', m).forEach(function (x) { if (x.value !== '') mp[x.getAttribute('data-f')] = Number(x.value); }); st.mapping = mp; preview(); }; });
      qsa('#idm input', m).forEach(function (x) { x.onchange = function () { qsa('#idm label', m).forEach(function (l) { l.classList.toggle('on', l.contains(qs('#idm input:checked', m))); }); var go = qs('#igo', m); go.textContent = qs('#idm input:checked', m).value === 'merge' ? 'Import ' + p.counts['new'] + ' new, update ' + p.counts.duplicate : 'Import ' + p.counts['new'] + ' new client' + (p.counts['new'] === 1 ? '' : 's'); }; });
      qs('#igo', m).onclick = function () {
        var b = this; b.disabled = true; b.innerHTML = '<span class="spin"></span>Importing…';
        var q = body(); q.dupMode = qs('#idm input:checked', m).value; q.fileName = st.name; q.mapping = st.mapping;
        api('crmImportCommit', q).then(function (r) { m.close(); toast(r.created + ' added' + (r.merged ? ', ' + r.merged + ' updated' : '') + (r.skipped ? ', ' + r.skipped + ' skipped' : '') + (r.invalid ? ', ' + r.invalid + ' invalid' : '') + (r.lendersAdded ? ', ' + r.lendersAdded + ' lender' + (r.lendersAdded === 1 ? '' : 's') + ' added to the roster' : '') + '.'); S.crm = null; crmHome(); })
          .catch(function (e) { b.disabled = false; b.textContent = 'Try again'; err(e.message); });
      };
    }).catch(function (e) { qs('#ibody', m).innerHTML = ''; err(e.message); });
  }
}

function groupsModal(d) {
  var owner = d.admin ? (CRM_UI.agentId || S.user.id) : S.user.id;
  var mine = d.groups.filter(function (g) { return g.ownerId === owner; });
  var m = modal('<h2>Groups</h2><p class="sub">Your own lists, like “Open House Oct” or “Investors”.' + (d.admin && owner !== S.user.id ? ' Showing this agent’s groups.' : '') + '</p><div id="ge"></div>' +
    '<form id="gf" class="rform" novalidate><div class="f rnote"><label for="gn">New group</label><input type="text" id="gn" maxlength="40"></div><button class="btn" id="gb">Add group</button></form>' +
    '<div class="glist">' + (mine.length ? mine.map(function (g) { return '<div class="row" data-g="' + h(g.id) + '"><div class="n"><b>' + h(g.name) + '</b><small>' + g.count + ' client' + (g.count === 1 ? '' : 's') + '</small></div><div class="acts"><button class="ub" data-a="ren">Rename</button><button class="link" data-a="del">Delete</button></div></div>'; }).join('') : '<div class="uempty">No groups yet.</div>') + '</div>');
  var done = function (msg) { m.close(); toast(msg); S.crm = null; crmHome(); };
  var err = function (e) { qs('#ge', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; };
  qs('#gf', m).onsubmit = function (e) { e.preventDefault(); var v = qs('#gn', m).value.trim(); if (!v) return; api('crmSaveGroup', { name: v, ownerId: owner }).then(function () { done('Group added.'); }).catch(err); };
  qsa('[data-g]', m).forEach(function (row) {
    var id = row.getAttribute('data-g'), g = mine.filter(function (x) { return x.id === id; })[0];
    qs('[data-a=ren]', row).onclick = function () { var v = prompt('Rename group', g.name); if (v && v.trim() && v.trim() !== g.name) api('crmSaveGroup', { id: id, name: v.trim() }).then(function () { done('Renamed.'); }).catch(err); };
    qs('[data-a=del]', row).onclick = function () { if (confirm('Delete the group “' + g.name + '”? Clients stay; they just leave the group.')) api('crmDeleteGroup', { id: id }).then(function () { done('Group deleted.'); }).catch(err); };
  });
}

/* ---- 1.4.3 Lender Roster ("My Lenders"; admin: every agent's roster, grouped by agent). Directory only: no logins, nothing is sent. ---- */
function lenderErr(L) {
  return !L.name ? 'Enter the lender’s name.' : !phoneOk(L.phone) ? 'Lender phone must be a 10-digit number (000-000-0000).' : (L.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(L.email)) ? 'Lender email address is not valid.' : (L.nmls && !/^(nmls\s*(id|#|no\.?|number)?\s*[:#]?\s*)?[\d\s#-]{1,16}$/i.test(L.nmls)) ? 'NMLS # must be digits only.' : '';
}
function lendersView() {
  loading('crm');
  api('crmBoot', isAdmin() ? { agentId: CRM_UI.agentId } : {}).then(function (d) {
    S.crm = d;
    if (!lendOn(d)) { location.hash = '#/crm'; return; }
    var opt = function (v, l, cur) { return '<option value="' + h(v) + '"' + (v === cur ? ' selected' : '') + '>' + h(l) + '</option>'; };
    var row = function (l) {
      return '<tr data-lid="' + h(l.id) + '"><td class="cnm"><b>' + h(l.name) + '</b></td><td data-l="Company">' + h(l.company) + '</td><td data-l="Phone">' + h(l.phone) + '</td><td data-l="Email">' + h(l.email) + '</td><td data-l="NMLS #">' + h(l.nmls) + '</td>' +
        '<td data-l="Clients">' + h(l.count || 0) + '</td><td class="lact"><button class="ub sm" data-a="edit">Edit</button><button class="link" data-a="del">Remove</button></td></tr>';
    };
    var table = function (ls) { return '<div class="tbl"><table class="ctbl ltbl"><thead><tr><th>Name</th><th>Company</th><th>Phone</th><th>Email</th><th>NMLS #</th><th>Clients</th><th><span class="sr">Actions</span></th></tr></thead><tbody>' + ls.map(row).join('') + '</tbody></table></div>'; };
    var groups = [];
    if (d.admin) {
      var by = {}; d.lenders.forEach(function (l) { var k = l.ownerId; if (!by[k]) { by[k] = { name: l.ownerName || 'Agent', ls: [] }; groups.push(by[k]); } by[k].ls.push(l); });
      groups.sort(function (a, b) { return a.name.localeCompare(b.name); });
    }
    var inner = '<a class="link cback" href="#/crm">← All clients</a><div class="top"><div><h1>' + (d.admin ? 'Lender rosters' : 'My Lenders') + '</h1><p class="sub">' +
      (d.admin ? 'Each agent keeps their own roster. Pick an agent to narrow it.' : 'Your own lenders, to pick on your clients. Other agents don’t see this roster.') + '</p></div>' +
      '<div class="cact"><button class="btn" id="lAdd">+ Add lender</button></div></div>' +
      (d.admin ? '<div class="cagent f"><label for="lAg">Agent</label><select id="lAg">' + opt('', 'All agents', CRM_UI.agentId) + (d.agents || []).map(function (a) { return opt(a.id, a.name, CRM_UI.agentId); }).join('') + '</select></div>' : '') +
      (!d.lenders.length ? '<div class="card gb"><div class="uempty">No lenders yet. Use <b>+ Add lender</b>, add one while editing a client, or import a CSV with lender columns.</div></div>'
        : d.admin ? groups.map(function (g) { return '<div class="card gb clist lroster"><h2 class="lrh">' + h(g.name) + ' <small>' + g.ls.length + ' lender' + (g.ls.length === 1 ? '' : 's') + '</small></h2>' + table(g.ls) + '</div>'; }).join('')
          : '<div class="card gb clist lroster">' + table(d.lenders) + '<div class="cfoot">' + d.lenders.length + ' lender' + (d.lenders.length === 1 ? '' : 's') + '</div></div>');
    page('crm', inner, function () {
      var ag = qs('#lAg'); if (ag) ag.onchange = function () { CRM_UI.agentId = this.value; CRM_UI.group = ''; lendersView(); };
      qs('#lAdd').onclick = function () { lenderForm(null, d); };
      qsa('tr[data-lid]').forEach(function (tr) {
        var l = d.lenders.filter(function (x) { return x.id === tr.getAttribute('data-lid'); })[0];
        qs('[data-a=edit]', tr).onclick = function () { lenderForm(l, d); };
        qs('[data-a=del]', tr).onclick = function () {
          if (!confirm('Remove ' + l.name + ' from the roster?' + (l.count ? ' ' + l.count + ' client' + (l.count === 1 ? '' : 's') + ' will show no lender.' : ''))) return;
          api('crmDeleteLender', { id: l.id }).then(function () { toast('Lender removed.'); S.crm = null; page.keepScroll = true; lendersView(); }).catch(function (e) { toast(e.message, 1); });
        };
      });
    });
  }).catch(function (e) { failView('crm', e); });
}
function lenderForm(l, d) {
  var isNew = !l; l = l || {};
  var owner = l.ownerId || (d.admin ? (CRM_UI.agentId || S.user.id) : S.user.id);
  var opt = function (v, t, cur) { return '<option value="' + h(v) + '"' + (v === cur ? ' selected' : '') + '>' + h(t) + '</option>'; };
  var inp = function (id, lab, v, extra, attrs) { return '<div class="f' + (extra || '') + '"><label for="' + id + '">' + lab + '</label><input id="' + id + '" value="' + h(v || '') + '" ' + (attrs || 'type="text"') + '></div>'; };
  var m = modal('<h2>' + (isNew ? 'Add lender' : 'Edit lender') + '</h2><p class="sub">A contact card only: lenders don’t get a login and nothing is sent to them.</p><div id="le"></div><form id="lf" novalidate><div class="fgrid">' +
    inp('lfN', 'Name <span class="req">*</span>', l.name, '', 'type="text" maxlength="80"') + inp('lfC', 'Company', l.company, '', 'type="text" maxlength="100"') +
    inp('lfP', 'Phone', l.phone, '', 'type="tel" inputmode="tel" placeholder="000-000-0000" maxlength="12"') + inp('lfE', 'Email', l.email, ' w2', 'type="email" maxlength="120" autocapitalize="none" spellcheck="false"') +
    inp('lfM', 'NMLS #', l.nmls, '', 'type="text" inputmode="numeric" maxlength="12"') +
    (d.admin && isNew ? '<div class="f w2"><label for="lfO">Agent’s roster</label><select id="lfO">' + opt(S.user.id, uName(S.user) + ' (me)', owner) + (d.agents || []).filter(function (a) { return a.id !== S.user.id; }).map(function (a) { return opt(a.id, a.name, owner); }).join('') + '</select></div>' : '') +
    '<div class="f w3"><label for="lfT">Notes</label><textarea id="lfT" maxlength="1000">' + h(l.notes || '') + '</textarea></div>' +
    '</div><div class="actions"><button class="btn" id="lfB">' + (isNew ? 'Add lender' : 'Save') + '</button></div></form>', true);
  wirePhone(qs('#lfP', m));
  qs('#lf', m).onsubmit = function (e) {
    e.preventDefault();
    var v = function (id) { return qs(id, m).value.trim(); }, L = { name: v('#lfN'), company: v('#lfC'), phone: v('#lfP'), email: v('#lfE'), nmls: v('#lfM'), notes: v('#lfT') };
    var er = lenderErr(L); if (er) { qs('#le', m).innerHTML = '<div class="err">' + h(er) + '</div>'; return; }
    var b = qs('#lfB', m); b.disabled = true;
    var p = { lender: L }; if (!isNew) p.id = l.id; else if (qs('#lfO', m)) p.ownerId = qs('#lfO', m).value;
    api('crmSaveLender', p).then(function () { m.close(); toast(isNew ? 'Lender added.' : 'Saved.'); S.crm = null; page.keepScroll = true; lendersView(); })
      .catch(function (x) { b.disabled = false; qs('#le', m).innerHTML = '<div class="err">' + h(x.message) + '</div>'; });
  };
}

function feedModal(d) {
  var m = modal('<h2>Calendar feed</h2><p class="sub">Subscribe once and your open follow-ups appear in Google Calendar, Apple Calendar or Outlook, updating on their own. The link is private: anyone who has it can see your follow-ups, so don’t share it. You can turn it off or replace it any time.</p><div id="fe"></div><div id="fb"></div>');
  function draw(active, token) {
    var url = token ? CFG.API_URL + (CFG.API_URL.indexOf('?') >= 0 ? '&' : '?') + 'feed=' + encodeURIComponent(token) : '';
    qs('#fb', m).innerHTML = (token ? '<div class="ok">Copy this link now. For safety it is shown only once.</div><div class="f"><label for="fu">Feed link</label><input type="text" id="fu" readonly value="' + h(url) + '"></div>' +
      '<p class="cmuted">Google Calendar (computer): Other calendars → + → From URL → paste. iPhone: Settings → Calendar → Accounts → Add Subscribed Calendar.</p>' : '<p>' + (active ? 'Your feed is <b>on</b>' + (d.feed.createdAt ? ' (since ' + h(fmtTs(d.feed.createdAt)) + ')' : '') + '. The link was shown when you created it; make a new one if you lost it (the old one stops working).' : 'Your feed is <b>off</b>.') + '</p>') +
      '<div class="actions">' + (token ? '<button class="btn" id="fc">Copy link</button>' : '') + (active ? '<button class="ub red" id="fr">Turn off</button>' : '') + '<button class="' + (token ? 'ub' : 'btn') + '" id="fn">' + (active ? 'Make a new link' : 'Turn on') + '</button></div>';
    var fc = qs('#fc', m); if (fc) fc.onclick = function () { var i = qs('#fu', m); i.select(); (navigator.clipboard ? navigator.clipboard.writeText(i.value) : Promise.reject()).then(function () { toast('Copied.'); }, function () { document.execCommand('copy'); toast('Copied.'); }); };
    var fr = qs('#fr', m); if (fr) fr.onclick = function () { api('crmFeed', { op: 'revoke' }).then(function () { d.feed = { active: false }; toast('Feed turned off.'); draw(false); }).catch(function (e) { qs('#fe', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; }); };
    qs('#fn', m).onclick = function () { if (active && !confirm('Make a new link? The old link stops working.')) return; api('crmFeed', { op: 'create' }).then(function (r) { d.feed = { active: true, createdAt: r.createdAt }; draw(true, r.token); }).catch(function (e) { qs('#fe', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; }); };
  }
  draw(!!(d.feed && d.feed.active));
}

/* ---------------- router ---------------- */
function route() {
  qsa('.modal').forEach(function (m) { m.remove(); }); document.body.style.overflow = '';
  var hs = location.hash.replace(/^#/, '') || '/';
  var mm = hs.match(/^\/t\/([A-Za-z0-9_-]+)/);
  if (mm) return txnView(mm[1], false);
  S.txn = null;
  if (hs === '/new') return newView('');
  if (hs === '/account') return passwordView(false);
  var mc = hs.match(/^\/crm\/c\/([A-Za-z0-9_-]+)$/);
  if (mc && canCrm()) return clientView(mc[1]);
  if (/^\/crm\/?$/.test(hs) && canCrm()) { CRM_UI.remPick = ''; return crmHome(); }
  if (hs === '/crm/lenders' && canCrm() && S.crmLender) return lendersView();
  if (hs === '/review' && isAdmin()) return reviewView();
  if (hs === '/users' && isAdmin()) return usersView();
  if (hs === '/archive' && isAdmin()) return archiveView();
  return dashView();
}
function render() {
  if (S.tcApi === undefined) {   // feature detection: TC (1.3.0+) and CRM (1.4.0+) only when the backend says it has them
    S.tcApi = false;
    return api('ping').then(function (d) { S.tcApi = !!(d && d.features && d.features.indexOf('tc') >= 0); S.crmApi = !!(d && d.features && d.features.indexOf('crm') >= 0); S.crmTc = !!(d && d.features && d.features.indexOf('crm_tc') >= 0); S.crmLender = !!(d && d.features && d.features.indexOf('crm_lender') >= 0); }, function () { }).then(render);
  }
  if (!S.token) return loginView();
  if (!S.user) {
    $app.innerHTML = '<div class="loading"><span class="spin"></span>Loading…</div>';
    return api('me').then(function (d) { S.user = d.user; render(); }).catch(function (e) { if (e.code !== 'AUTH') { signOutLocal(); loginView(e.message); } });
  }
  if (S.user.mustChange) return passwordView(true);
  route();
}
window.addEventListener('hashchange', function () { if (S.user && !S.user.mustChange) route(); });
if (DEMO) sessionStorage.setItem('tc_demo', '1');
S.token = sessionStorage.getItem('tc_t'); try { localStorage.removeItem('tc_t'); } catch (e) { }
render();
})();
