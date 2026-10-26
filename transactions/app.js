/* ENESMA REALTY · Transaction Center — single-page app (talks to the Apps Script API in config.js). */
(function () {
'use strict';
var CFG = window.TC_CONFIG || {};
var DEMO = /[?&]demo=1\b/.test(location.search) || sessionStorage.getItem('tc_demo') === '1';
var $app = document.getElementById('app');
var S = { token: null, user: null, scope: 'personal', filter: '', dash: null, txn: null, tab: 'checklist', badges: { review: 0 } };

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
function isAdmin() { return S.user && S.user.role === 'admin'; }
var SEARCH_ICON = '<svg viewBox="0 0 24 24"><defs><linearGradient id="sgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAD59E"/><stop offset="1" stop-color="#D5BE87"/></linearGradient></defs><g fill="none" stroke="url(#sgr)" stroke-width="2.6" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M16 16l5 5"/></g></svg>';

/* ---------------- API ---------------- */
function api(action, params) {
  var body = Object.assign({ action: action, token: S.token }, params || {});
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
function storeToken(tok, remember) {
  S.token = tok;
  sessionStorage.removeItem('tc_t'); localStorage.removeItem('tc_t');
  if (tok) (remember ? localStorage : sessionStorage).setItem('tc_t', tok);
}
function signOutLocal() { storeToken(null); S.user = null; S.dash = null; S.txn = null; }

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
    { k: 'listPrice', l: 'List price', t: 'money', r: 1 }, { k: 'listingCommission', l: 'Listing commission', r: 1, ph: 'e.g. 2.5% or $10,000' },
    { k: 'buyerBrokerComp', l: 'Offered to buyer broker', ph: 'e.g. 2% or none' }, { k: 'occupancy', l: 'Occupancy', opts: ['Owner occupied', 'Tenant occupied', 'Vacant'] },
    { h: 'Sellers' }, { k: 'sellers', l: 'Sellers', people: 1, r: 1 },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]),
  purchase: [
    { h: 'Who we represent' }, { k: 'side', l: 'We represent', r: 1, radio: [['buyer', 'Buyer'], ['seller', 'Seller'], ['both', 'Both sides']], w: 3 },
    { h: 'Property' }].concat(PROPERTY).concat([
    { h: 'Contract' },
    { k: 'contractDate', l: 'Contract (acceptance) date', t: 'date', r: 1 }, { k: 'estCloseDate', l: 'Estimated close of escrow', t: 'date', r: 1 },
    { k: 'purchasePrice', l: 'Purchase price', t: 'money', r: 1 }, { k: 'emdAmount', l: 'Earnest money deposit', t: 'money' },
    { k: 'commission', l: 'Our commission', r: 1, ph: 'e.g. 2.5% or $12,000' }, { k: 'financing', l: 'Financing', opts: ['Conventional', 'FHA', 'VA', 'Cash', 'Other'] },
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
    { k: 'monthlyRent', l: 'Monthly rent', t: 'money', r: 1 }, { k: 'listingCommission', l: 'Listing commission', r: 1, ph: 'e.g. one month rent' },
    { h: 'Landlords' }, { k: 'landlords', l: 'Landlords', people: 1, r: 1 },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]),
  lease: [
    { h: 'Who we represent' }, { k: 'side', l: 'We represent', r: 1, radio: [['tenant', 'Tenant'], ['landlord', 'Landlord'], ['both', 'Both sides']], w: 3 },
    { h: 'Property' }].concat(PROPERTY).concat([
    { h: 'Lease' },
    { k: 'leaseStart', l: 'Lease start', t: 'date', r: 1 }, { k: 'leaseEnd', l: 'Lease end', t: 'date' },
    { k: 'monthlyRent', l: 'Monthly rent', t: 'money', r: 1 }, { k: 'securityDeposit', l: 'Security deposit', t: 'money' },
    { k: 'commission', l: 'Our commission', r: 1 },
    { h: 'Landlords' }, { k: 'landlords', l: 'Landlords', people: 1, r: 1 },
    { h: 'Tenants' }, { k: 'tenants', l: 'Tenants', people: 1, r: 1 },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]),
  referral: [
    { h: 'Referral' },
    { k: 'clientName', l: 'Client name', r: 1 }, { k: 'clientPhone', l: 'Client phone', t: 'tel' }, { k: 'clientEmail', l: 'Client email', t: 'email' },
    { k: 'referredTo', l: 'Referred to (agent · brokerage)', r: 1, w: 2 }, { k: 'referralFee', l: 'Referral fee', r: 1, ph: 'e.g. 25%' },
    { k: 'location', l: 'Area / location', r: 1 }, { k: 'expectedClose', l: 'Expected close', t: 'date' }, { k: 'referralSide', l: 'Client is', opts: ['Buyer', 'Seller', 'Tenant', 'Landlord'] },
    { h: 'Notes' }, { k: 'notes', l: 'Notes for the office', ta: 1, w: 3 }]
};

function fieldHtml(f, v, pre) {
  var id = (pre || 'f') + '_' + f.k, req = f.r ? ' <span class="req">*</span>' : '';
  var cls = 'f' + (f.w === 2 ? ' w2' : f.w === 3 ? ' w3' : '');
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
    out += fieldHtml(f, (intake || {})[f.k], pre);
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
    if (e.target.type === 'radio') qsa('label', e.target.closest('.radios')).forEach(function (l) { l.classList.toggle('on', l.contains(e.target)); });
  });
}
function readForm(root) {
  var out = {}, missing = [];
  qsa('.f[data-k]', root).forEach(function (el) {
    var k = el.getAttribute('data-k'), v;
    if (el.classList.contains('people')) {
      v = qsa('.prow', el).map(function (r) { var p = {}; qsa('input', r).forEach(function (i) { p[i.getAttribute('data-p')] = i.value.trim(); }); return p; }).filter(function (p) { return p.name; });
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
function shell(active, inner) {
  var nav = '<a href="#/" class="' + (active === 'dash' ? 'on' : '') + '">Transactions</a><a href="#/new" class="' + (active === 'new' ? 'on' : '') + '">+ New</a>';
  if (isAdmin()) nav += '<a href="#/review" class="' + (active === 'review' ? 'on' : '') + '">Review' + (S.badges.review ? '<span class="cnt">' + S.badges.review + '</span>' : '') + '</a><a href="#/users" class="' + (active === 'users' ? 'on' : '') + '">Users</a><a href="#/archive" class="' + (active === 'archive' ? 'on' : '') + '">Archive</a>';
  return (DEMO ? '<div class="demo"><b>DEMO PREVIEW</b> · sample data only, nothing is saved · <a href="#" id="exitDemo" style="color:#FBFBFB">exit demo</a></div>' : '') +
    '<header><a class="brand" href="#/"><img src="assets/enesma-realty-logo.png" alt="Logo"><span class="app">Transaction Center</span></a>' +
    '<nav class="main">' + nav + '</nav><div class="hspace"></div>' +
    '<div class="search"><span>' + SEARCH_ICON + '</span><input id="q" type="search" placeholder="Search address, client, escrow #" autocomplete="off" aria-label="Search transactions"><div class="sres hidden" id="sres"></div></div>' +
    '<div class="umenu"><button class="ubtn" id="ubtn" aria-label="Account">' + h(initials(S.user.name)) + '</button><div class="udrop hidden" id="udrop"><div class="who"><b>' + h(S.user.name) + '</b>' + h(S.user.username) + ' · ' + (isAdmin() ? 'Admin' : 'Agent') + '</div><a href="#/account">Change password</a><button id="signout">Sign out</button></div></div></header>' +
    '<main>' + inner + '</main>';
}
var docClickBound = false;
function wireShell() {
  var q = qs('#q'), box = qs('#sres');
  if (q) {
    var run = debounce(function () {
      var v = q.value.trim(); if (v.length < 2) { box.classList.add('hidden'); return; }
      api('search', { q: v }).then(function (d) {
        box.innerHTML = d.results.length ? d.results.map(function (r) { return '<a href="#/t/' + h(r.id) + '"><b>' + h(r.title) + '</b><small>' + h(r.typeLabel) + ' · ' + h(r.status) + ' · ' + h(r.clients) + (isAdmin() ? ' · ' + h(r.agentName) : '') + '</small></a>'; }).join('') : '<div class="empty">No matches for “' + h(v) + '”.</div>';
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
  var ub = qs('#ubtn'); if (ub) ub.onclick = function () { qs('#udrop').classList.toggle('hidden'); };
  var so = qs('#signout'); if (so) so.onclick = function () { api('logout').catch(function () { }); signOutLocal(); location.hash = '#/'; render(); };
  var ex = qs('#exitDemo'); if (ex) ex.onclick = function (e) { e.preventDefault(); sessionStorage.removeItem('tc_demo'); signOutLocal(); location.href = location.pathname; };
}
function page(active, inner, after) { $app.innerHTML = shell(active, inner); wireShell(); if (!page.keepScroll) window.scrollTo(0, 0); page.keepScroll = false; if (after) after(); }
function loading(active) { page(active, '<div class="loading"><span class="spin"></span>Loading…</div>'); }
function failView(active, e) { page(active, '<div class="err">' + h(e.message) + '</div><a class="ub" href="#/">Back to transactions</a>'); }

/* ---------------- login / password ---------------- */
function loginView(msg) {
  var noApi = !CFG.API_URL && !DEMO;
  $app.innerHTML = '<div class="login"><form class="box" id="lf" autocomplete="on"><img src="assets/enesma-realty-logo.png" alt="Logo"><div class="app">Transaction Center</div>' +
    (msg ? '<div class="err">' + h(msg) + '</div>' : '') +
    (noApi ? '<div class="ok">The secure backend is being connected. Sign-in opens as soon as setup is finished.<br><a href="?demo=1">Preview with sample data</a></div>' : '') +
    (DEMO ? '<div class="ok">Demo preview. Sign in as <b>admin</b> or <b>agent</b> with password <b>demo</b>.</div>' : '') +
    '<div class="f"><label for="lu">Username</label><input id="lu" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>' +
    '<div class="f"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required></div>' +
    '<label style="display:flex;gap:8px;align-items:center;font-size:13px;margin:4px 0 16px"><input type="checkbox" id="lr" style="accent-color:#D5BE87"> Keep me signed in on this device</label>' +
    '<button class="btn" id="lb"' + (noApi ? ' disabled' : '') + '>Sign in</button><div class="fine">Forgot your password? Ask the office to reset it.<br>Private system · access is logged.</div></form></div>';
  qs('#lf').onsubmit = function (e) {
    e.preventDefault(); var b = qs('#lb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Signing in…';
    api('login', { username: qs('#lu').value, password: qs('#lp').value }).then(function (d) {
      storeToken(d.token, qs('#lr').checked); S.user = d.user; render();
    }).catch(function (err) { loginView(err.message); });
  };
}
function passwordView(forced) {
  var inner = '<div style="max-width:520px"><h1>' + (forced ? 'Set your password' : 'Change password') + '</h1><p class="sub">' + (forced ? 'Your account uses a temporary password. Choose your own before continuing. ' : '') + 'At least 10 characters with letters and numbers.</p>' +
    '<form class="card gb" id="pf"><div id="pe"></div><div class="f" style="margin-bottom:12px"><label>Current ' + (forced ? '(temporary) ' : '') + 'password</label><input type="password" id="p0" autocomplete="current-password" required></div>' +
    '<div class="f" style="margin-bottom:12px"><label>New password</label><input type="password" id="p1" autocomplete="new-password" minlength="10" required></div>' +
    '<div class="f"><label>Repeat new password</label><input type="password" id="p2" autocomplete="new-password" required></div><div class="actions">' + (forced ? '<button type="button" class="ub" id="pout">Sign out</button>' : '') + '<button class="btn">Save password</button></div></form></div>';
  if (forced) {
    $app.innerHTML = '<header><a class="brand"><img src="assets/enesma-realty-logo.png" alt="Logo"><span class="app">Transaction Center</span></a></header><main>' + inner + '</main>';
    qs('#pout').onclick = function () { api('logout').catch(function () { }); signOutLocal(); render(); };
  } else page('', inner);
  qs('#pf').onsubmit = function (e) {
    e.preventDefault(); var p1 = qs('#p1').value;
    if (p1 !== qs('#p2').value) { qs('#pe').innerHTML = '<div class="err">The new passwords do not match.</div>'; return; }
    if (p1.length < 10 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) { qs('#pe').innerHTML = '<div class="err">Use at least 10 characters with letters and numbers.</div>'; return; }
    api('changePassword', { current: qs('#p0').value, newPassword: p1 }).then(function (d) { S.user = d.user; toast('Password saved.'); location.hash = '#/'; render(); })
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
    (isAdmin() && S.scope === 'company' ? '<p>Agent: ' + h(t.agentName) + '</p>' : '') + '<div class="grow"></div><div class="bar"><i style="width:' + pct + '%"></i></div><p>' + (p.approved || 0) + '/' + (p.required || 0) + ' required docs approved</p></a>';
}
function dashView() {
  loading('dash');
  api('dashboard', { scope: S.scope }).then(function (d) {
    S.dash = d; if (isAdmin()) S.badges.review = (d.pendingReview || 0) + (d.cancelRequests || 0);
    var c = d.counts, st = d.stats;
    var statDefs = [['type:listing', c.listings, 'Listings'], ['type:purchase', c.purchases, 'Purchases'], ['Active', c.Active, 'Active'], ['In Escrow', c['In Escrow'], 'In Escrow'], ['Closed', c.Closed, 'Closed'], ['Expired Contract', c['Expired Contract'], 'Expired']];
    var extra = [];
    if (c.leaseListings) extra.push(c.leaseListings + ' lease listings'); if (c.leases) extra.push(c.leases + ' leases'); if (c.referrals) extra.push(c.referrals + ' referrals'); if (c.Cancelled) extra.push(c.Cancelled + ' cancelled');
    var inner = '<div class="top"><div><h1>' + (S.scope === 'company' ? 'Company Transactions' : 'My Transactions') + '</h1><p class="sub">' + h(S.scope === 'company' ? 'All agents' : S.user.name) + ' · ' + d.transactions.length + ' files' + (extra.length ? ' · ' + extra.join(' · ') : '') + '</p></div>' +
      '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' + (isAdmin() ? '<div class="seg"><button data-s="personal" class="' + (S.scope === 'personal' ? 'on' : '') + '">Personal</button><button data-s="company" class="' + (S.scope === 'company' ? 'on' : '') + '">Company</button></div>' : '') + '<a class="btn" href="#/new">+ New Transaction</a></div></div>' +
      (isAdmin() && S.badges.review ? '<a class="ok" href="#/review" style="display:block;text-decoration:none"><b>' + d.pendingReview + '</b> checklist item(s) waiting for review' + (d.cancelRequests ? ' · <b>' + d.cancelRequests + '</b> cancellation request(s)' : '') + ' → Open Review</a>' : '') +
      '<div class="stats">' + statDefs.map(function (s) { return '<button class="stat gb' + (S.filter === s[0] ? ' on' : '') + '" data-f="' + h(s[0]) + '"><b>' + (s[1] || 0) + '</b><span>' + s[2] + '</span></button>'; }).join('') + '</div>' +
      '<div class="vol gb"><div class="ttl">Closed in the last 12 months' + (S.scope === 'company' ? ' · company' : '') + '</div><div><span>Closed deals</span><b>' + st.closedCount + '</b></div><div><span>Seller volume (' + st.sellerSides + ')</span><b>' + moneyShort(st.sellerVolume) + '</b></div><div><span>Buyer volume (' + st.buyerSides + ')</span><b>' + moneyShort(st.buyerVolume) + '</b></div><div><span>Combined volume</span><b class="gt">' + moneyShort(st.combinedVolume) + '</b></div></div>' +
      '<div class="chips">' + [['', 'All'], ['open', 'Open'], ['type:listing', 'Listings'], ['type:purchase', 'Purchases'], ['type:lease_listing', 'Lease Listings'], ['type:lease', 'Leases'], ['type:referral', 'Referrals'], ['Active', 'Active'], ['In Escrow', 'In Escrow'], ['Closed', 'Closed'], ['Expired Contract', 'Expired'], ['Cancelled', 'Cancelled']].map(function (x) { return '<button class="chip' + (S.filter === x[0] ? ' on' : '') + '" data-f="' + h(x[0]) + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="grid" id="tiles"></div>';
    page('dash', inner, function () {
      drawTiles();
      qsa('[data-f]').forEach(function (b) { b.onclick = function () { var f = b.getAttribute('data-f'); S.filter = (S.filter === f && b.classList.contains('stat')) ? '' : f; qsa('[data-f]').forEach(function (x) { x.classList.toggle('on', x.getAttribute('data-f') === S.filter); }); drawTiles(); }; });
      qsa('.seg button').forEach(function (b) { b.onclick = function () { S.scope = b.getAttribute('data-s'); S.filter = ''; dashView(); }; });
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
  var agentsP = isAdmin() ? api('listUsers') : Promise.resolve(null);
  agentsP.then(function (users) {
    var inner = '<h1>New Transaction</h1><p class="sub">Choose the type, then answer the intake questions. The checklist unlocks once intake is complete.</p>' +
      '<div class="types">' + TYPES.map(function (t) { return '<button class="type' + (type === t.k ? ' sel' : '') + '" data-t="' + t.k + '">' + t.l + '<small>' + t.d + '</small></button>'; }).join('') + '</div>' +
      (type ? '<form id="nf" novalidate><div id="ne"></div>' +
        (users ? '<div class="card gb"><h3>Agent</h3><div class="fgrid"><div class="f w2"><label>File belongs to</label><select id="agentId">' + users.filter(function (u) { return u.active; }).map(function (u) { return '<option value="' + h(u.id) + '"' + (u.id === S.user.id ? ' selected' : '') + '>' + h(u.name) + (u.role === 'admin' ? ' (admin)' : '') + '</option>'; }).join('') + '</select></div></div></div>' : '') +
        formHtml(type, {}, 'n') + '<div class="actions"><a class="ub" href="#/">Cancel</a><button class="btn" id="nb">Create &amp; open checklist</button></div></form>' : '');
    page('new', inner, function () {
      qsa('.type').forEach(function (b) { b.onclick = function () { newView(b.getAttribute('data-t')); }; });
      var form = qs('#nf'); if (!form) return;
      wireForm(form);
      form.onsubmit = function (e) {
        e.preventDefault(); var r = readForm(form);
        if (r.missing.length) { qs('#ne').innerHTML = '<div class="err">Please complete: ' + h(r.missing.join(', ')) + '</div>'; qs('#ne').scrollIntoView({ behavior: 'smooth' }); return; }
        var b = qs('#nb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Creating folder…';
        api('createTransaction', { type: type, intake: r.intake, agentId: qs('#agentId') ? qs('#agentId').value : undefined }).then(function (d) { toast('Transaction created. Checklist unlocked.'); location.hash = '#/t/' + d.id; })
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
  if (open && (t.type === 'listing' || t.type === 'lease_listing') && !crPending) acts += '<button class="ub" id="aConv">' + (t.type === 'listing' ? 'Convert to Purchase' : 'Convert to Lease') + '</button>';
  if (open && !crPending) acts += '<button class="ub red" id="aCancel">Request cancellation</button>';
  if (isAdmin()) acts += '<button class="ub" id="aStatus">Set status</button>';
  var banner = '';
  if (crPending) banner = '<div class="err"><b>Cancellation requested</b> by ' + h(cr.requestedByName) + ' on ' + h(fmtTs(cr.requestedAt)) + (cr.reason ? ' · “' + h(cr.reason) + '”' : '') + (cr.relist === true ? ' · Going back on the market (a new listing is created on approval)' : cr.relist === false ? ' · Not going back on the market' : '') + '. Waiting for admin approval.' + (isAdmin() ? ' <a href="#/review">Decide in Review</a>' : '') + '</div>';
  else if (cr && cr.state === 'denied') banner = '<div class="ok">Cancellation request was denied' + (cr.note ? ': “' + h(cr.note) + '”' : '') + '.</div>';
  if (t.childId) banner += '<div class="ok">Relisted as a new file: <a href="#/t/' + h(t.childId) + '">open the new listing</a>.</div>';
  if (t.parentId) banner += '<div class="ok">Relisted from a cancelled file: <a href="#/t/' + h(t.parentId) + '">open the previous file</a>.</div>';
  var docCount = d.documents.filter(function (x) { return !x.removed; }).length;
  var inner = '<div class="top"><div><div style="display:flex;gap:8px;align-items:center;margin-bottom:6px;flex-wrap:wrap">' + statusPill(t.status) + '<span class="pill p-pend">' + h(t.typeLabel) + '</span>' + (t.convertedFrom ? '<span class="pill p-miss">Converted from ' + h(TYPE_LABEL[t.convertedFrom] || t.convertedFrom) + '</span>' : '') + '</div><h1>' + h(t.title) + (t.zip ? ' ' + h(t.zip) : '') + '</h1>' +
    '<p class="sub">' + h([sideTxt].concat(who).filter(Boolean).join(' · ')) + (isAdmin() ? ' · Agent: ' + h(t.agentName) : '') + '</p></div><div style="display:flex;gap:8px;flex-wrap:wrap">' + acts + '</div></div>' + banner +
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
        (canEdit() ? '<label class="ub">' + (it.status === 'Rejected' ? 'Re-upload' : 'Upload') + '<input type="file" class="hidden up" data-item="' + h(it.id) + '" accept="application/pdf,image/*,.heic,.doc,.docx,.xls,.xlsx,.txt"></label>' : '') +
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
    c.innerHTML = '<div class="top"><p class="sub" style="margin:0;max-width:640px">Every file uploaded to this transaction. Store files here, then assign each one to a checklist item, or split a PDF packet into items.</p>' + (canEdit() ? '<label class="btn">Upload to storage<input type="file" class="hidden" id="stUp" multiple accept="application/pdf,image/*,.heic,.doc,.docx,.xls,.xlsx,.txt"></label>' : '') + '</div>' +
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
      else if (f.t === 'date') v = fmtDate(v); else if (f.t === 'money' && v) v = money(v);
      return '<div' + (f.w === 3 || f.people ? ' style="grid-column:1/-1"' : '') + '><span>' + h(f.l) + '</span><b style="white-space:pre-line">' + (v ? h(v) : '—') + '</b></div>';
    }).join('') + (ii.finalPrice ? '<div><span>Final sales price</span><b>' + money(ii.finalPrice) + '</b></div>' : '') + (t.closedAt ? '<div><span>Closed</span><b>' + fmtDate(t.closedAt) + '</b></div>' : '') +
      (t.retentionUntil ? '<div><span>Keep records until</span><b>' + fmtDate(t.retentionUntil) + '</b></div>' : '') + '<div><span>File ID</span><b>' + h(t.id) + '</b></div></div>' +
      (canEdit() ? '<div class="actions"><button class="ub" id="editI">Edit intake</button></div>' : '') + '</div>';
    if (qs('#editI')) qs('#editI').onclick = function () {
      c.innerHTML = '<form id="ef" novalidate><div id="ee"></div>' + formHtml(t.type, ii, 'e', { side: 1 }) + '<div class="actions"><button type="button" class="ub" id="ecan">Cancel</button><button class="btn">Save intake</button></div></form>';
      var f = qs('#ef'); wireForm(f); qs('#ecan').onclick = drawTab;
      f.onsubmit = function (e) { e.preventDefault(); var r = readForm(f); if (r.missing.length) { qs('#ee').innerHTML = '<div class="err">Please complete: ' + h(r.missing.join(', ')) + '</div>'; return; }
        api('updateIntake', { id: t.id, intake: r.intake }).then(function () { toast('Saved.'); refresh(); }).catch(function (err) { qs('#ee').innerHTML = '<div class="err">' + h(err.message) + '</div>'; }); };
    };
  } else {
    c.innerHTML = '<div class="split" style="grid-template-columns:1fr 1fr"><div class="card gb"><h3>Notes</h3><textarea id="nt" placeholder="Add a note for this file"></textarea><div class="actions" style="margin-top:8px"><button class="btn sm" id="ntb">Add note</button></div><div class="feed">' +
      d.notes.slice().reverse().map(function (n) { var it = d.items.filter(function (x) { return x.id === n.itemId; })[0]; return '<div class="ev"><b>' + h(n.by) + '</b> ' + (n.kind === 'rejection' ? '<span class="rt">rejected</span> ' : n.kind === 'resubmit' ? '<span class="gt">resubmitted</span> ' : '') + (it ? '· ' + h(it.title) : '') + '<br>' + h(n.text) + '<small>' + h(fmtTs(n.createdAt)) + '</small></div>'; }).join('') + '</div></div>' +
      '<div class="card gb"><h3>Activity</h3><div class="feed">' + d.activity.map(function (a) { return '<div class="ev">' + h(String(a.action).replace(/_/g, ' ')) + '<small>' + h(a.by) + ' · ' + h(fmtTs(a.ts)) + '</small></div>'; }).join('') + '</div></div></div>';
    qs('#ntb').onclick = function () { var v = qs('#nt').value.trim(); if (!v) return; api('addNote', { txnId: t.id, text: v }).then(function () { toast('Note added.'); refresh(); }).catch(function (e) { toast(e.message, 1); }); };
  }
  qsa('.dl', c).forEach(function (b) { b.onclick = function () { openDoc(b.getAttribute('data-doc'), b); }; });
}

/* ---------------- files ---------------- */
var MAX = 20 * 1024 * 1024;
function fileToB64(file) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(String(r.result).split(',')[1]); }; r.onerror = function () { rej(new Error('Could not read the file.')); }; r.readAsDataURL(file); }); }
function bytesToB64(bytes) { var s = '', ch = 0x8000; for (var i = 0; i < bytes.length; i += ch) s += String.fromCharCode.apply(null, bytes.subarray(i, i + ch)); return btoa(s); }
function mimeOf(file) {
  var ext = (file.name.split('.').pop() || '').toLowerCase();
  var m = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', heic: 'image/heic', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', txt: 'text/plain' }[ext];
  return file.type || m || 'application/octet-stream';
}
function uploadFile(file, itemId, quiet) {
  if (file.size > MAX) { toast(file.name + ' is larger than 20 MB.', 1); return Promise.resolve(); }
  toast('Uploading ' + file.name + '…');
  return fileToB64(file).then(function (b64) { return api('upload', { txnId: S.txn.txn.id, itemId: itemId || '', name: file.name, mime: mimeOf(file), base64: b64, kind: 'file' }); })
    .then(function () { toast('Uploaded ' + file.name + (itemId ? '. Sent for review.' : ' to Document Storage.')); if (!quiet) refresh(); })
    .catch(function (e) { toast(e.message, 1); });
}
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
    (existingDocId ? '' : '<label class="btn" id="spick">Choose PDF packet<input type="file" class="hidden" id="sfile" accept="application/pdf"></label>') + '<div id="sbody"></div>', true);
  var state = { bytes: null, name: '', pages: 0, srcId: existingDocId || '' };
  function showErr(msg) { qs('#se', m).innerHTML = msg ? '<div class="err">' + h(msg) + '</div>' : ''; }
  function addRange(a, b) { qs('#rngs', m).insertAdjacentHTML('beforeend', '<div class="rng"><input type="number" min="1" max="' + state.pages + '" value="' + a + '" aria-label="From page"><input type="number" min="1" max="' + state.pages + '" value="' + b + '" aria-label="To page"><select aria-label="Checklist item">' + opt + '</select><button class="rx link" title="Remove" style="text-decoration:none;font-size:20px">×</button></div>'); }
  function setup(bytes, name) {
    return loadPdfLib().then(function (L) { return L.PDFDocument.load(bytes, { ignoreEncryption: true }); }).then(function (doc) {
      state.bytes = bytes; state.name = name; state.pages = doc.getPageCount();
      var url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      qs('#sbody', m).innerHTML = '<div class="split" style="margin-top:14px"><div><iframe src="' + url + '" title="Packet preview"></iframe><p class="sub" style="margin-top:6px">' + h(name) + ' · ' + state.pages + ' pages</p></div><div><b class="gt">Assign pages</b><p class="sub" style="margin:8px 0 12px">From page · to page · checklist item</p><div id="rngs"></div><button class="link" id="addr">+ Add range</button>' +
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
      if (f.size > MAX) return showErr('That PDF is larger than 20 MB.');
      showErr(''); qs('#spick', m).classList.add('hidden');
      f.arrayBuffer().then(function (ab) { return setup(new Uint8Array(ab), f.name); }).catch(function (e) { showErr('Could not open that PDF: ' + e.message); qs('#spick', m).classList.remove('hidden'); });
    };
  }
}
function convertModal() {
  var t = S.txn.txn, to = t.type === 'listing' ? 'purchase' : 'lease';
  var pre = Object.assign({}, t.intake); pre.side = to === 'purchase' ? 'seller' : 'landlord';
  var sideField = { k: 'side', l: 'We represent', r: 1, w: 3, radio: to === 'purchase' ? [['seller', 'Seller only'], ['both', 'Both sides (we also have the buyer)']] : [['landlord', 'Landlord only'], ['both', 'Both sides (we also have the tenant)']] };
  var m = modal('<h2>Convert to ' + (to === 'purchase' ? 'Purchase' : 'Lease') + '</h2><p class="sub">' + (to === 'purchase' ? 'Offer accepted? Add the escrow details. The listing information is already filled in, and the purchase checklist items are added to this file.' : 'Tenant found? Add the lease details. The listing information is already filled in, and the lease checklist items are added to this file.') + '</p><div id="ce"></div><form id="cf" novalidate>' +
    '<div class="card gb"><h3>Who we represent</h3><div class="fgrid">' + fieldHtml(sideField, pre.side, 'c') + '</div></div>' +
    formHtml(to, pre, 'c', { side: 1 }) + '<div class="actions"><button class="btn" id="cb">Convert</button></div></form>', true);
  var f = qs('#cf', m); wireForm(f);
  f.onsubmit = function (e) {
    e.preventDefault(); var r = readForm(f);
    if (r.missing.length) { qs('#ce', m).innerHTML = '<div class="err">Please complete: ' + h(r.missing.join(', ')) + '</div>'; m.scrollTop = 0; return; }
    qs('#cb', m).disabled = true;
    api('convert', { id: t.id, intake: r.intake, side: r.intake.side }).then(function (d) { m.close(); toast('Converted. ' + d.added + ' checklist items unlocked.'); txnView(t.id); })
      .catch(function (err) { qs('#cb', m).disabled = false; qs('#ce', m).innerHTML = '<div class="err">' + h(err.message) + '</div>'; m.scrollTop = 0; });
  };
}
function cancelModal() {
  var d = S.txn, t = d.txn;
  var ci = d.items.filter(function (x) { return x.cancel && x.active; })[0];
  var has = ci && docsOf(ci.id).length;
  if (!has) {
    var m0 = modal('<h2>Request cancellation</h2><p class="sub">First upload the signed <b>' + h(ci ? ci.title : 'cancellation document') + '</b>' + (ci && ci.forms ? ' (' + h(ci.forms) + ')' : '') + '. Then you can send the request. An admin approves every cancellation.</p>' + (ci && canEdit() ? '<label class="btn">Upload ' + h(ci.title) + '<input type="file" class="hidden" id="xup" accept="application/pdf,image/*,.heic"></label>' : ''));
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
function usersView() {
  loading('users');
  api('listUsers').then(function (users) {
    var inner = '<div class="top"><div><h1>Users</h1><p class="sub">Agents see only their own files. Admins see everything and review documents. Temporary passwords are shown once; give them to the person directly.</p></div><button class="btn" id="nu">+ Add user</button></div>' +
      '<div class="gb tbl"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead><tbody>' +
      users.map(function (u) {
        return '<tr><td><b>' + h(u.name) + '</b><br><small>' + h(u.email) + ' ' + h(u.phone) + '</small></td><td>' + h(u.username) + '</td><td>' + (u.role === 'admin' ? '<span class="pill p-ok">Admin</span>' : '<span class="pill p-pend">Agent</span>') + (u.owner ? ' <small>owner</small>' : '') + '</td>' +
          '<td>' + (u.active ? (u.locked ? '<span class="pill p-rej">Locked</span>' : u.mustChange ? '<span class="pill p-miss">Temp password</span>' : '<span class="pill p-ok">Active</span>') : '<span class="pill p-miss">Disabled</span>') + '</td><td><small>' + h(fmtTs(u.lastLogin)) + '</small></td>' +
          '<td style="white-space:nowrap">' + (u.owner && !S.user.owner ? '' : '<button class="link rp" data-id="' + h(u.id) + '" data-n="' + h(u.name) + '">Reset password</button> ') + (u.owner || u.id === S.user.id ? '' : '<button class="link act" data-id="' + h(u.id) + '" data-a="' + (u.active ? '' : '1') + '">' + (u.active ? 'Disable' : 'Enable') + '</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    page('users', inner, function () {
      qs('#nu').onclick = function () {
        var m = modal('<h2>Add user</h2><div id="ae"></div><div class="fgrid"><div class="f w2"><label>Full name</label><input type="text" id="an"></div><div class="f"><label>Role</label><select id="ar"><option value="agent">Agent</option>' + (S.user.owner ? '<option value="admin">Admin</option>' : '') + '</select></div>' +
          '<div class="f w2"><label>Email (also the username)</label><input type="email" id="am" autocapitalize="none"></div><div class="f"><label>Phone</label><input type="tel" id="ap"></div></div><div class="actions"><button class="btn" id="ab">Create user</button></div>');
        qs('#ab', m).onclick = function () {
          var em = qs('#am', m).value.trim().toLowerCase();
          api('createUser', { name: qs('#an', m).value.trim(), username: em, email: em, phone: qs('#ap', m).value.trim(), role: qs('#ar', m).value }).then(function (r) {
            qs('.box', m).innerHTML = '<h2>User created</h2><p>Give these to <b>' + h(r.user.name) + '</b> in person or by phone. They choose a new password at first sign-in.</p><div class="ok">Username: <b>' + h(r.user.username) + '</b><br>Temporary password: <b style="font-family:monospace;font-size:16px">' + h(r.tempPassword) + '</b></div><p class="sub">This password is not shown again.</p><div class="actions"><button class="btn" id="dn">Done</button></div>';
            qs('#dn', m).onclick = function () { m.close(); usersView(); };
          }).catch(function (e) { qs('#ae', m).innerHTML = '<div class="err">' + h(e.message) + '</div>'; });
        };
      };
      qsa('.rp').forEach(function (b) { b.onclick = function () { if (!confirm('Reset the password for ' + b.getAttribute('data-n') + '? They will be signed out everywhere.')) return; api('resetPassword', { userId: b.getAttribute('data-id') }).then(function (r) { modal('<h2>Temporary password</h2><div class="ok">' + h(b.getAttribute('data-n')) + ': <b style="font-family:monospace;font-size:16px">' + h(r.tempPassword) + '</b></div><p class="sub">Shown once. They must change it at sign-in.</p>'); usersView(); }).catch(function (e) { toast(e.message, 1); }); }; });
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

/* ---------------- router ---------------- */
function route() {
  qsa('.modal').forEach(function (m) { m.remove(); }); document.body.style.overflow = '';
  var hs = location.hash.replace(/^#/, '') || '/';
  var mm = hs.match(/^\/t\/([A-Za-z0-9_-]+)/);
  if (mm) return txnView(mm[1], false);
  S.txn = null;
  if (hs === '/new') return newView('');
  if (hs === '/account') return passwordView(false);
  if (hs === '/review' && isAdmin()) return reviewView();
  if (hs === '/users' && isAdmin()) return usersView();
  if (hs === '/archive' && isAdmin()) return archiveView();
  return dashView();
}
function render() {
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
S.token = sessionStorage.getItem('tc_t') || localStorage.getItem('tc_t');
render();
})();
