/* ENESMA REALTY · ENESMA E-Sign frontend (v1.0.0). Talks only to the E-Sign Apps Script backend (config.js API_URL). */
(function () {
  'use strict';
  var CFG = window.ES_CONFIG || {}, API = String(CFG.API_URL || '').trim();
  var $app = document.getElementById('app'), $modal = document.getElementById('modal'), $toast = document.getElementById('toast');
  var S = { token: '', user: null, testMode: false, dirty: false, route: '', gmail: null };
  try { S.token = localStorage.getItem('es_token') || ''; S.user = JSON.parse(localStorage.getItem('es_user') || 'null'); } catch (e) { }
  if (window.pdfjsLib) { pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; }

  /* ---------- DOM helpers ---------- */
  function h(tag, attrs) {
    var el = document.createElement(tag), kids = Array.prototype.slice.call(arguments, 2);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'multiple' || k === 'required') el[k] = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    add(el, kids); return el;
  }
  function add(el, kids) { kids.forEach(function (c) { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) add(el, c); else el.appendChild(typeof c === 'object' ? c : document.createTextNode(String(c))); }); return el; }
  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function svg(path, vb) { var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', vb || '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = path; return s; }   // static icon markup only (never user data)
  var I = {
    sig: '<path d="M3 17c3-1 4-9 6-9s-1 9 1 9 3-5 4-5 1 3 2 3 2-1 3-2M3 21h18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    ini: '<path d="M5 18V6m0 0h4M5 12h3m6 6V6l5 12V6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    date: '<rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4m8-4v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    name: '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    text: '<path d="M5 6h14M12 6v13M9 19h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    check: '<rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 12l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    up: '<path d="M12 16V4m0 0L7 9m5-5l5 5M4 20h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    x: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
    arrowUp: '<path d="M12 19V5m0 0l-6 6m6-6l6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    arrowDn: '<path d="M12 5v14m0 0l-6-6m6 6l6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
    org: '<path d="M4 21V5h10v16M14 9h6v12M7 9h3M7 13h3M7 17h3M2 21h20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    badge: '<rect x="4" y="3" width="16" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 15h8M8 18h5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="9" r="2.5" fill="none" stroke="currentColor" stroke-width="2"/>',
    tick: '<path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#000007" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  var FT = { signature: ['Signature', I.sig], initials: ['Initials', I.ini], date: ['Date signed', I.date], name: ['Name', I.name], email: ['Email', I.mail], company: ['Company', I.org], title: ['Title', I.badge], text: ['Text', I.text], checkbox: ['Checkbox', I.check] };
  var INPUT_T = { text: 1, company: 1, title: 1 };
  var REQ_DEF = { signature: 1, initials: 1, date: 1, name: 1, email: 1, company: 1, title: 1, text: 1 };
  function isReq(f) { return f.required === undefined || f.required === null ? !!REQ_DEF[f.type] : !!f.required; }
  var STATUS = { sent: 'Out for signature', viewed: 'Viewed', finalizing: 'Finishing up', completed: 'Completed', declined: 'Declined', voided: 'Voided', created: 'Waiting turn', waiting: 'Waiting turn', signed: 'Signed' };
  function badge(st) { return h('span', { class: 'badge ' + st }, STATUS[st] || st); }
  function toast(msg) { $toast.textContent = msg; $toast.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(function () { $toast.classList.add('hidden'); }, 3800); }
  function errBox(msg) { return h('div', { class: 'err', role: 'alert' }, msg); }
  function fmt(iso, withTime) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return '';
    return d.toLocaleString('en-US', withTime === false ? { month: 'short', day: 'numeric', year: 'numeric' } : { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  function initials(n) { return String(n || '').split(/\s+/).filter(Boolean).map(function (p) { return p[0]; }).slice(0, 3).join('').toUpperCase(); }
  function emailOk(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim()); }
  function busy(btn, on, label) { if (!btn) return; if (on) { btn.dataset.l = btn.textContent; btn.textContent = label || 'Working…'; btn.disabled = true; } else { btn.textContent = btn.dataset.l || btn.textContent; btn.disabled = false; } }

  /* ---------- modal ---------- */
  function openModal(title, body, opts) {
    clear($modal); opts = opts || {};
    var box = h('div', { class: 'mbox' + (opts.lg ? ' lg' : '') }, h('button', { class: 'icon close', type: 'button', 'aria-label': 'Close', onclick: closeModal }, svg(I.x)), h('h2', null, title), body);
    $modal.appendChild(box); $modal.classList.remove('hidden'); $modal.onclick = function (e) { if (e.target === $modal && !opts.sticky) closeModal(); };
    var f = box.querySelector('input,textarea,select'); if (f && !opts.noFocus) setTimeout(function () { f.focus(); }, 30);
    return box;
  }
  function closeModal() { $modal.classList.add('hidden'); clear($modal); }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      var ok = h('button', { class: 'btn ' + (danger ? 'red' : ''), type: 'button', onclick: function () { closeModal(); res(true); } }, okLabel || 'OK');
      openModal(title, h('div', null, h('p', null, text), h('div', { class: 'actions' }, ok, h('button', { class: 'btn plain', type: 'button', onclick: function () { closeModal(); res(false); } }, 'Cancel'))), { noFocus: true });
    });
  }
  function promptBox(title, label, value, okLabel) {
    return new Promise(function (res) {
      var inp = h('input', { type: 'text', value: value || '', maxlength: 120 });
      var go = function () { var v = inp.value.trim(); if (!v) return inp.focus(); closeModal(); res(v); };
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(); });
      openModal(title, h('div', null, h('div', { class: 'f' }, h('label', null, label), inp), h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: go }, okLabel || 'Save'), h('button', { class: 'btn plain', type: 'button', onclick: function () { closeModal(); res(null); } }, 'Cancel'))));
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$modal.classList.contains('hidden')) closeModal(); });

  /* ---------- API ---------- */
  function api(action, params) {
    var body = Object.assign({ action: action }, params || {}); if (S.token && !body.token) body.token = S.token;
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.text(); }, function () { throw Object.assign(new Error('Can’t reach E-Sign right now. Check your connection and try again.'), { code: 'NET' }); })
      .then(function (t) {
        var j; try { j = JSON.parse(t); } catch (e) { throw Object.assign(new Error('E-Sign returned an unexpected response. Please try again.'), { code: 'BAD' }); }
        if (!j.ok) {
          var err = Object.assign(new Error(j.error || 'Something went wrong.'), { code: j.code });
          if (j.code === 'GMAIL' && action !== 'gmailConnect') { S.gmail = null; }
          if (j.code === 'AUTH' && action !== 'login' && !/^sign/.test(action)) { setSession(null); S.afterLogin = location.hash; go('#/login'); }
          throw err;
        }
        return j.data;
      });
  }
  function setSession(token, user) {
    S.token = token || ''; S.user = token ? user : null;
    try { if (token) { localStorage.setItem('es_token', token); localStorage.setItem('es_user', JSON.stringify(user)); } else { localStorage.removeItem('es_token'); localStorage.removeItem('es_user'); } } catch (e) { }
    chrome();
  }
  var isAdmin = function () { return S.user && S.user.role === 'admin'; };

  /* ---------- PDF helpers ---------- */
  function b64FromBytes(u8) { var s = '', CH = 0x8000; for (var i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
  function bytesFromB64(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function readFile(f) { return new Promise(function (res, rej) { var r = new FileReader(); r.onload = function () { res(new Uint8Array(r.result)); }; r.onerror = function () { rej(new Error('Could not read ' + f.name)); }; r.readAsArrayBuffer(f); }); }
  /** Merge PDFs (Uint8Arrays) into one. Returns {bytes, pages, offsets[]} — offsets[i] = first page index of input i. */
  async function mergePdfs(list) {
    var out = await PDFLib.PDFDocument.create(), offsets = [], n = 0;
    for (var i = 0; i < list.length; i++) {
      var src; try { src = await PDFLib.PDFDocument.load(list[i], { ignoreEncryption: true }); } catch (e) { throw new Error('One of the files is not a readable PDF.'); }
      var pages = await out.copyPages(src, src.getPageIndices()); offsets.push(n);
      pages.forEach(function (p) { out.addPage(p); n++; });
    }
    var bytes = await out.save(); return { bytes: bytes, pages: n, offsets: offsets };
  }
  function downloadPdf(name, b64) {
    var blob = new Blob([bytesFromB64(b64)], { type: 'application/pdf' }), url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: String(name || 'document').replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf' }); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
  }
  /** Render a PDF into `host` as .pg page boxes (lazy, sharp at any width). Resolves with [{el, w, h}] page info in PDF points. */
  async function renderPdf(bytes, host) {
    var doc = await pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false, disableFontFace: false }).promise;
    var pages = [], io = 'IntersectionObserver' in window ? new IntersectionObserver(function (ents) { ents.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); draw(en.target._i); } }); }, { rootMargin: '600px 0px' }) : null;
    for (var i = 1; i <= doc.numPages; i++) {
      var p = await doc.getPage(i), vp = p.getViewport({ scale: 1 });
      var el = h('div', { class: 'pg', 'data-page': i, style: { aspectRatio: vp.width + ' / ' + vp.height } }, h('canvas'), h('span', { class: 'pn' }, 'Page ' + i + ' of ' + doc.numPages));
      el._i = i - 1; host.appendChild(el); pages.push({ el: el, w: vp.width, h: vp.height, page: p });
      if (io) io.observe(el); else draw(i - 1);
    }
    function draw(ix) {
      var pi = pages[ix], c = pi.el.querySelector('canvas'), css = Math.max(320, Math.min(1000, pi.el.clientWidth || 800)), sc = css / pi.w * Math.min(2, window.devicePixelRatio || 1);
      var vp = pi.page.getViewport({ scale: sc }); c.width = Math.floor(vp.width); c.height = Math.floor(vp.height);
      pi.page.render({ canvasContext: c.getContext('2d'), viewport: vp });
    }
    return pages;
  }

  /* ---------- chrome / router ---------- */
  var $nav = document.getElementById('nav'), $user = document.getElementById('userBtn'), $new = document.getElementById('newBtn');
  function chrome() {
    var inApp = !!(S.token && S.user) && S.route !== 'sign';
    $nav.classList.toggle('hidden', !inApp); $user.classList.toggle('hidden', !inApp); $new.classList.toggle('hidden', !inApp);
    document.body.classList.toggle('signing', S.route === 'sign');
    if (inApp) $user.textContent = initials(S.user.name) || '?';
    Array.prototype.forEach.call($nav.querySelectorAll('a'), function (a) { a.classList.toggle('on', a.dataset.r === S.section); });
  }
  $user.addEventListener('click', function (e) {
    e.stopPropagation(); var old = document.querySelector('.menu'); if (old) return old.remove();
    var m = h('div', { class: 'menu' }, h('div', { class: 'me' }, h('b', null, S.user.name), S.user.email, h('div', null, h('span', { class: 'pill' + (isAdmin() ? ' dark' : '') }, isAdmin() ? 'Admin' : 'Agent'))),
      h('button', { type: 'button', onclick: function () { m.remove(); go('#/profile'); } }, 'Profile & email' + (S.gmail && !S.gmail.connected ? ' · connect' : '')),
      h('button', { type: 'button', onclick: function () { m.remove(); api('logout').catch(function () { }); setSession(null); go('#/login'); } }, 'Sign out'));
    document.body.appendChild(m); setTimeout(function () { document.addEventListener('click', function z(ev) { if (!m.contains(ev.target)) { m.remove(); document.removeEventListener('click', z); } }); });
  });
  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }
  function parseRoute() {
    var raw = location.hash.replace(/^#\/?/, ''), q = {}, qi = raw.indexOf('?');
    if (qi >= 0) { raw.slice(qi + 1).split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ''); }); raw = raw.slice(0, qi); }
    var parts = raw.split('/').filter(Boolean); return { name: parts[0] || '', arg: parts[1] || '', q: q };
  }
  var lastHash = location.hash;
  window.addEventListener('hashchange', function () {
    if (S.dirty && !confirm('Leave this page? Your changes will be lost.')) { history.replaceState(null, '', lastHash || '#/'); return; }
    S.dirty = false; render();
  });
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });
  var ROUTES = {};
  function render() {
    lastHash = location.hash; var r = parseRoute(); S.route = r.name; closeModal();
    var old = document.querySelector('.menu'); if (old) old.remove();
    $app.className = ''; clear($app); window.scrollTo(0, 0);
    if (!API) { S.section = ''; chrome(); return comingSoon(); }
    if (r.name === 'sign') { S.section = ''; chrome(); return ROUTES.sign(r); }
    if (!S.token || r.name === 'login') { S.section = ''; S.route = 'login'; chrome(); if (S.token && r.name === 'login') return go('#/'); return ROUTES.login(r); }
    if (S.gmail === null && (r.name === 'new' || r.name === 'onboarding' || r.name === 'connect' || r.name === 'profile')) { loading(); return refreshMe().then(render, function (er) { fatal(er, render); }); }
    if ((r.name === 'new' || r.name === 'onboarding') && S.gmail && !S.gmail.connected) { S.section = 'envelopes'; S.afterConnect = location.hash; chrome(); return ROUTES.connect({ q: { blocked: '1' } }); }
    var fn = ROUTES[r.name || 'envelopes'] || ROUTES.envelopes;
    S.section = { '': 'envelopes', envelopes: 'envelopes', envelope: 'envelopes', 'new': 'envelopes', templates: 'templates', template: 'templates', onboarding: 'onboarding', documents: 'documents' }[r.name] || 'envelopes';
    chrome(); fn(r);
  }
  function loading(msg) { clear($app).appendChild(h('div', { class: 'loading' }, msg || 'Loading…')); }
  function fatal(err, retry) { clear($app); $app.appendChild(h('div', { style: { maxWidth: '560px', margin: '40px auto' } }, errBox(err.message || String(err)), retry ? h('button', { class: 'btn', type: 'button', onclick: retry }, 'Try again') : null)); }
  function testBar() { return S.testMode ? h('div', { class: 'testbar' }, h('b', null, 'Test mode'), ' · emails only go to the test allowlist (enrique@enesmabroker.com). Other recipients are skipped and logged.') : null; }

  function comingSoon() {
    $app.appendChild(h('div', { class: 'auth' }, h('div', { class: 'card', style: { maxWidth: '520px' } },
      h('img', { class: 'logo', src: 'assets/esign-logo-light.svg', alt: 'ENESMA E-Sign' }),
      h('div', { class: 'soon' }, h('span', { class: 'dot' }), h('div', null, h('b', null, 'E-Sign is coming soon'), h('span', null, 'ENESMA’s own e-signature platform is being connected. Sign in will open here with your Transaction Center email and password.'))),
      h('ul', { class: 'sub', style: { textAlign: 'left', margin: '0 0 0 18px', padding: 0 } },
        h('li', null, 'Send PDFs for signature, in order or all at once'), h('li', null, 'Templates and one-click onboarding packets'), h('li', null, 'Signed packets with a Certificate of Completion'), h('li', null, 'Documents organized in folders')))));
  }

  /* ---------- login ---------- */
  ROUTES.login = function () {
    var em = h('input', { type: 'email', autocomplete: 'username', inputmode: 'email', required: true, id: 'em' });
    var pw = h('input', { type: 'password', autocomplete: 'current-password', required: true, id: 'pw' });
    var msg = h('div'), btn = h('button', { class: 'btn red wide', type: 'submit' }, 'Sign in');
    var form = h('form', { novalidate: true, onsubmit: function (e) {
      e.preventDefault(); clear(msg);
      if (!emailOk(em.value) || !pw.value) return msg.appendChild(errBox('Enter your email and password.'));
      busy(btn, true, 'Signing in…');
      api('login', { email: em.value.trim(), password: pw.value }).then(function (d) {
        pw.value = ''; setSession(d.token, d.user); S.gmail = d.gmail || { connected: true, legacy: true }; var to = S.afterLogin && !/login/.test(S.afterLogin) ? S.afterLogin : '#/'; S.afterLogin = ''; if (S.gmail && !S.gmail.connected) { S.afterConnect = to; to = '#/connect'; } go(to);
      }).catch(function (err) { busy(btn, false); msg.appendChild(errBox(err.message)); });
    } }, h('div', { class: 'f' }, h('label', { for: 'em' }, 'Email'), em), h('div', { class: 'f' }, h('label', { for: 'pw' }, 'Password'), pw), msg, btn);
    $app.appendChild(h('div', { class: 'auth' }, h('div', { class: 'card' }, h('img', { class: 'logo', src: 'assets/esign-logo-light.svg', alt: 'ENESMA E-Sign' }),
      h('p', { class: 'sub' }, 'Sign in with your Transaction Center email and password. For ENESMA agents and admins.'), form,
      h('p', { class: 'hint', style: { textAlign: 'center', marginTop: '16px' } }, 'Forgot your password? Reset it in the Transaction Center.'))));
    setTimeout(function () { em.focus(); }, 30);
  };

  function refreshMe() { return api('me').then(function (d) { S.user = d.user; S.testMode = !!d.testMode; S.gmail = d.gmail || { connected: true, legacy: true }; try { localStorage.setItem('es_user', JSON.stringify(d.user)); } catch (e) { } chrome(); }); }

  /* ---------- Google email connection (per-user OAuth, gmail.send only) ---------- */
  function gmailStart(btn) {
    busy(btn, true, 'Opening Google…');
    api('gmailStart').then(function (d) { try { sessionStorage.setItem('es_after_connect', S.afterConnect || '#/'); } catch (e) { } location.href = d.url; })
      .catch(function (er) { busy(btn, false); toast(er.message); });
  }
  function gmailCard(blocked) {
    var g = S.gmail || {}, btn = h('button', { class: 'btn red wide', type: 'button', id: 'connectBtn', onclick: function (ev) { gmailStart(ev.currentTarget); } }, g.error ? 'Reconnect your Google email' : 'Connect your Google email');
    return h('div', { class: 'card connect' }, h('span', { class: 'rule' }), h('h1', null, blocked ? 'Connect your email to send' : 'Connect your Google email'),
      h('p', { class: 'sub' }, 'Invitations, reminders and completion emails go out from your own Gmail — ', h('b', null, S.user.email), ' — so clients see you as the sender and replies come straight to you.'),
      g.error ? errBox('Your connection stopped working: ' + g.error) : null,
      g.configured === false ? errBox('Google sign-in is not set up yet. Ask the admin to finish the OAuth setup.') : null,
      h('ul', { class: 'hint connect-list' }, h('li', null, 'Sign in with ', h('b', null, S.user.email), ' on the Google screen.'), h('li', null, 'E-Sign asks only for permission to send email. It cannot read your inbox.'),
        h('li', null, 'Signed PDFs and certificates are stored in ENESMA’s business Drive, never in your Drive.')),
      btn, h('p', { class: 'hint', style: { textAlign: 'center', marginTop: '12px' } }, h('a', { href: '#/' }, blocked ? 'Back to envelopes' : 'Do this later'), ' · you can’t send envelopes until it’s connected.'));
  }
  ROUTES.connect = function (r) { add($app, [h('div', { class: 'auth' }, gmailCard(r && r.q && r.q.blocked))]); };
  ROUTES.profile = function () {
    var g = S.gmail || {};
    var status = g.connected ? h('div', { class: 'ok', id: 'gstatus' }, h('b', null, 'Connected'), ' · sending as ' + g.email + (g.connectedAt ? ' · since ' + fmtDate(g.connectedAt) : ''))
      : h('div', { class: 'err', id: 'gstatus' }, h('b', null, g.error ? 'Needs reconnecting' : 'Not connected'), g.error ? ' · ' + g.error : ' · you can’t send envelopes yet');
    var acts = h('div', { class: 'actions' }, h('button', { class: 'btn ' + (g.connected ? 'ghost' : 'red'), type: 'button', id: 'reconnectBtn', onclick: function (ev) { S.afterConnect = '#/profile'; gmailStart(ev.currentTarget); } }, g.connected || g.error ? 'Reconnect' : 'Connect your Google email'),
      g.connected ? h('button', { class: 'btn plain', type: 'button', onclick: function (ev) { if (!confirm('Disconnect your Gmail? You won’t be able to send until you connect again.')) return; var b = ev.currentTarget; busy(b, true); api('gmailDisconnect').then(function (d) { S.gmail = d; render(); }).catch(function (er) { busy(b, false); toast(er.message); }); } }, 'Disconnect') : null);
    add($app, [h('div', { class: 'head' }, h('div', null, h('span', { class: 'rule' }), h('h1', null, 'Profile'))),
      h('div', { class: 'card', style: { maxWidth: '640px' } }, h('h2', null, S.user.name), h('p', { class: 'hint' }, S.user.email + ' · ' + (isAdmin() ? 'Admin' : 'Agent')),
        h('h2', { style: { marginTop: '18px' } }, 'Sending email'), status,
        h('p', { class: 'hint' }, 'Every invitation, resend and completion email is sent through Gmail from your own address. E-Sign only has permission to send — it can’t read your mail. Files stay in ENESMA’s business Drive.'), acts)]);
  };
  function fmtDate(iso) { try { return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return iso; } }
  function handleOAuthReturn() {
    var q = new URLSearchParams(location.search); if (!q.get('state') || !(q.get('code') || q.get('error'))) return false;
    var back = '#/'; try { back = sessionStorage.getItem('es_after_connect') || '#/'; sessionStorage.removeItem('es_after_connect'); } catch (e) { }
    S.afterConnect = back;
    history.replaceState(null, '', location.pathname + '#/connect');
    if (!S.token) { render(); return true; }
    if (q.get('error')) { toast(q.get('error') === 'access_denied' ? 'Google connection was cancelled.' : 'Google sign-in failed: ' + q.get('error')); render(); return true; }
    loading('Connecting your Google email…');
    api('gmailConnect', { code: q.get('code'), state: q.get('state') }).then(function (d) { S.gmail = d; toast('Connected — emails now go out from ' + d.email + '.'); history.replaceState(null, '', location.pathname + back); render(); })
      .catch(function (er) { refreshMe().catch(function () { }).then(function () { render(); clear($app); $app.appendChild(h('div', { class: 'auth' }, h('div', null, errBox(er.message), gmailCard(false)))); }); });
    return true;
  }

  /* ---------- envelopes ---------- */
  ROUTES.envelopes = function () {
    var st = { tab: S.envTab || 'active', scope: S.envScope || 'mine', q: '' }, data = null;
    var body = h('div'), listEl = h('div');
    function load() {
      clear(listEl).appendChild(h('div', { class: 'loading' }, 'Loading envelopes…'));
      api('listEnvelopes', { scope: st.scope === 'all' ? 'all' : '' }).then(function (d) { data = d.envelopes || []; if (!S.envTab && !data.some(TABS[0][2])) st.tab = 'all'; draw(); }).catch(function (e) { clear(listEl).appendChild(errBox(e.message)); });
    }
    var TABS = [['active', 'Out for signature', function (e) { return e.status === 'sent' || e.status === 'finalizing'; }], ['completed', 'Completed', function (e) { return e.status === 'completed'; }],
      ['declined', 'Declined / voided', function (e) { return e.status === 'declined' || e.status === 'voided'; }], ['all', 'All', function () { return true; }]];
    var tabsEl = h('div', { class: 'tabs', role: 'tablist' });
    function draw() {
      clear(tabsEl); TABS.forEach(function (t) {
        tabsEl.appendChild(h('button', { class: 'tab' + (st.tab === t[0] ? ' on' : ''), type: 'button', role: 'tab', onclick: function () { st.tab = S.envTab = t[0]; draw(); } }, t[1], h('span', { class: 'n' }, data ? data.filter(t[2]).length : '')));
      });
      clear(listEl); if (!data) return;
      var f = TABS.filter(function (t) { return t[0] === st.tab; })[0][2], q = st.q.toLowerCase();
      var rows = data.filter(f).filter(function (e) { return !q || (e.name + ' ' + e.recipients.map(function (r) { return r.name + ' ' + r.email; }).join(' ') + ' ' + e.ownerName).toLowerCase().indexOf(q) >= 0; });
      if (!rows.length) return listEl.appendChild(h('div', { class: 'list' }, h('div', { class: 'empty' }, h('b', null, data.length ? 'Nothing here' : 'No envelopes yet'), data.length ? 'Try another tab or search.' : 'Upload a PDF, add signers, place fields and send.', !data.length ? h('div', { style: { marginTop: '14px' } }, h('a', { class: 'btn red', href: '#/new' }, 'New envelope')) : null)));
      listEl.appendChild(h('div', { class: 'list' }, rows.map(function (e) {
        var signed = e.recipients.filter(function (r) { return r.status === 'signed'; }).length;
        return h('a', { class: 'item', href: '#/envelope/' + e.id }, h('div', { style: { minWidth: 0 } }, h('div', { class: 't' }, e.name),
          h('div', { class: 'm' }, e.recipients.map(function (r) { return r.name; }).join(', ') + (st.scope === 'all' ? ' · from ' + e.ownerName : '')),
          h('div', { class: 'm' }, (e.status === 'completed' ? 'Completed ' + fmt(e.completedAt, false) : 'Sent ' + fmt(e.sentAt, false)) + ' · ' + signed + ' of ' + e.recipients.length + ' signed' + (e.orderMode === 'sequential' ? ' · in order' : ''))),
          h('div', { class: 'r' }, badge(e.status)));
      })));
    }
    var search = h('input', { type: 'search', placeholder: 'Search envelopes, signers…', 'aria-label': 'Search', oninput: function () { st.q = search.value; draw(); } });
    var scope = isAdmin() ? h('div', { class: 'seg' }, [['mine', 'Mine'], ['all', 'All agents']].map(function (s) {
      return h('button', { type: 'button', class: st.scope === s[0] ? 'on' : '', onclick: function () { st.scope = S.envScope = s[0]; Array.prototype.forEach.call(scope.children, function (b, i) { b.className = (i === 0) === (s[0] === 'mine') ? 'on' : ''; }); load(); } }, s[1]);
    })) : null;
    add(body, [testBar(), h('div', { class: 'head' }, h('div', null, h('span', { class: 'rule' }), h('h1', null, 'Envelopes'), h('p', { class: 'sub' }, 'Track what’s out for signature and what’s done.')),
      h('div', { class: 'toolbar', style: { margin: 0 } }, h('a', { class: 'btn ghost', href: '#/templates' }, 'Use a template'), h('a', { class: 'btn red', href: '#/new' }, 'New envelope'))),
      h('div', { class: 'toolbar' }, search, scope), tabsEl, listEl]);
    $app.appendChild(body); draw(); load(); refreshMe().then(function () { var tb = testBar(); if (tb && !body.querySelector('.testbar')) body.insertBefore(tb, body.firstChild); }).catch(function () { });
  };

  ROUTES.envelope = function (r) {
    var id = r.arg, polls = 0;
    loading();
    function load() { return api('getEnvelope', { id: id }).then(function (d) { draw(d.envelope); }).catch(function (e) { fatal(e, load); }); }
    function draw(e) {
      clear($app);
      if (e.status === 'finalizing' && polls < 20) { polls++; setTimeout(function () { if (S.route === 'envelope' && parseRoute().arg === id) load(); }, 6000); }
      var acts = h('div', { class: 'actions', style: { marginTop: 0 } });
      if (e.status === 'completed') { acts.appendChild(h('button', { class: 'btn red', type: 'button', onclick: function (ev) { dl(ev.currentTarget, true); } }, 'Download signed PDF'));
        acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function (ev) { dl(ev.currentTarget, 'cert'); } }, 'Certificate PDF')); }
      acts.appendChild(h('button', { class: 'btn ghost', type: 'button', onclick: function (ev) { dl(ev.currentTarget, false); } }, 'Original PDF'));
      if (e.status === 'sent') acts.appendChild(h('button', { class: 'btn plain', type: 'button', onclick: voidIt }, 'Void'));
      if (e.status === 'completed' && e.mailError) acts.appendChild(h('button', { class: 'btn', type: 'button', onclick: function (ev) { var b = ev.currentTarget; busy(b, true, 'Sending…'); api('resendCompletion', { id: id }).then(function () { toast('Completion email sent from your Gmail.'); load(); }).catch(function (er) { busy(b, false); toast(er.message); }); } }, 'Resend completion email'));
      if (e.status === 'finalizing' && e.finalizeError) acts.appendChild(h('button', { class: 'btn', type: 'button', onclick: function (ev) { var b = ev.currentTarget; busy(b, true); api('retryFinalize', { id: id }).then(function (d) { toast('Finishing up… this takes a minute.'); draw(d.envelope); }).catch(function (er) { busy(b, false); toast(er.message); }); } }, 'Retry finishing'));
      function dl(btn, final) { busy(btn, true, 'Preparing…'); api('getEnvelopePdf', { id: id, final: final === true, certificate: final === 'cert' }).then(function (d) { busy(btn, false); downloadPdf(d.name + (final === 'cert' ? ' - Certificate' : final ? ' - Signed' : ''), d.pdf); }).catch(function (er) { busy(btn, false); toast(er.message); }); }
      function voidIt() {
        var reason = h('input', { type: 'text', maxlength: 200, placeholder: 'e.g. Sent the wrong version' }), msg = h('div');
        var b = h('button', { class: 'btn red', type: 'button', onclick: function () { if (!reason.value.trim()) return reason.focus(); busy(b, true); api('voidEnvelope', { id: id, reason: reason.value.trim() }).then(function (d) { closeModal(); toast('Envelope voided. Signing links no longer work.'); draw(d.envelope); }).catch(function (er) { busy(b, false); clear(msg).appendChild(errBox(er.message)); }); } }, 'Void envelope');
        openModal('Void this envelope?', h('div', null, h('p', { class: 'sub' }, 'Signers can no longer open or sign it. This can’t be undone.'), h('div', { class: 'f' }, h('label', null, 'Reason (shown to you only)'), reason), msg, h('div', { class: 'actions' }, b)));
      }
      var signers = h('div', null, e.recipients.map(function (rc) {
        var evs = (rc.events || []).filter(function (x) { return x.t !== 'viewed' || x === (rc.events || []).filter(function (y) { return y.t === 'viewed'; })[0]; });
        var canFix = e.status === 'sent' && rc.status !== 'signed' && rc.status !== 'declined';
        var st = rc.state || rc.status, ts = [['Sent', rc.sentAt], ['Viewed', rc.viewedAt], ['Signed', rc.signedAt], ['Declined', rc.declinedAt]].filter(function (x) { return x[1]; });
        return h('div', { class: 'signer', 'data-rid': rc.id, 'data-state': st }, h('div', { class: 'top' }, h('div', { style: { minWidth: 0 } }, h('div', { class: 'who' }, (e.orderMode === 'sequential' ? rc.order + '. ' : '') + rc.name), h('div', { class: 'em' }, rc.email + (rc.roleLabel ? ' · ' + rc.roleLabel : ''))), badge(st)),
          h('div', { class: 'ts em' }, ts.length ? ts.map(function (x) { return x[0] + ' ' + fmt(x[1]); }).join(' · ') : (st === 'waiting' ? 'Invitation goes out when it’s their turn' : '')),
          h('ul', { class: 'ev' }, evs.map(function (x) { return h('li', null, ({ sent: 'Invited', resent: 'Invite resent', viewed: 'First viewed', signed: 'Signed', declined: 'Declined', corrected: 'Email corrected', completed: 'Completed copy sent' }[x.t] || x.t) + ' · ' + fmt(x.at)); }),
            rc.declineReason ? h('li', null, 'Reason: ' + rc.declineReason) : null),
          canFix ? h('div', { class: 'acts' }, (st === 'sent' || st === 'viewed') ? h('button', { class: 'link resend', type: 'button', onclick: function (ev) { var b = ev.currentTarget; b.disabled = true; api('resendInvite', { id: id, recipientId: rc.id }).then(function (d) { toast('Invite resent to ' + rc.email); draw(d.envelope); }).catch(function (er) { b.disabled = false; toast(er.message); }); } }, 'Resend') : null,
            h('button', { class: 'link', type: 'button', onclick: function () { fix(rc); } }, 'Fix name / email')) : null);
      }));
      function fix(rc) {
        var n = h('input', { type: 'text', value: rc.name, maxlength: 120 }), em = h('input', { type: 'email', value: rc.email }), msg = h('div');
        var b = h('button', { class: 'btn', type: 'button', onclick: function () { if (!n.value.trim() || !emailOk(em.value)) return clear(msg).appendChild(errBox('Enter a name and a valid email.')); busy(b, true); api('updateRecipient', { id: id, recipientId: rc.id, name: n.value.trim(), email: em.value.trim() }).then(function (d) { closeModal(); toast('Signer updated. Their old link no longer works.'); draw(d.envelope); }).catch(function (er) { busy(b, false); clear(msg).appendChild(errBox(er.message)); }); } }, 'Save & send new link');
        openModal('Fix signer', h('div', null, h('div', { class: 'f' }, h('label', null, 'Name'), n), h('div', { class: 'f' }, h('label', null, 'Email'), em), msg, h('div', { class: 'actions' }, b)));
      }
      var info = h('dl', { class: 'kv' }, h('dt', null, 'Envelope ID'), h('dd', { class: 'hash' }, e.id), h('dt', null, 'From'), h('dd', null, e.ownerName), h('dt', null, 'Signing order'), h('dd', null, e.orderMode === 'sequential' ? 'In order' : 'Everyone at once'),
        h('dt', null, 'Sent'), h('dd', null, fmt(e.sentAt)), e.completedAt ? [h('dt', null, 'Completed'), h('dd', null, fmt(e.completedAt))] : null, e.voidedAt ? [h('dt', null, 'Voided'), h('dd', null, fmt(e.voidedAt) + (e.voidReason ? ' · ' + e.voidReason : ''))] : null,
        h('dt', null, 'Pages'), h('dd', null, e.pages + ' · ' + e.fields + ' fields'), h('dt', null, 'Original SHA-256'), h('dd', { class: 'hash' }, e.originalHash), e.finalHash ? [h('dt', null, 'Signed SHA-256'), h('dd', { class: 'hash' }, e.finalHash)] : null);
      add($app, [h('a', { class: 'back', href: '#/' }, '‹ Envelopes'), h('div', { class: 'head' }, h('div', { style: { minWidth: 0 } }, h('span', { class: 'rule' }), h('h1', { style: { wordBreak: 'break-word' } }, e.name), h('p', { class: 'sub' }, badge(e.status), ' ', e.subject)), acts),
        e.mailError ? h('div', { class: 'err mailerr' }, 'An email could not be sent from your Gmail: ' + e.mailError + ' — check ', h('a', { href: '#/profile' }, 'your Google connection'), ', then use Resend.') : null,
        e.status === 'finalizing' ? h('div', { class: 'ok' }, e.finalizeError ? 'Finishing the signed copy hit a problem: ' + e.finalizeError : 'Everyone signed. The signed PDF and certificate are being prepared and emailed to all parties — usually within a minute.') : null,
        h('div', { class: 'detail' }, h('div', { class: 'card' }, h('h2', null, 'Signers'), signers), h('div', { class: 'card' }, h('h2', null, 'Details'), info, e.message ? h('p', { class: 'hint', style: { marginTop: '14px', whiteSpace: 'pre-wrap' } }, e.message) : null))]);
    }
    load();
  };

  /* ---------- field editor ---------- */
  var DEF_PT = { signature: [170, 40], initials: [64, 34], date: [100, 20], name: [150, 20], email: [180, 20], company: [150, 20], title: [130, 20], text: [150, 20], checkbox: [16, 16] };
  var fseq = 1;
  /** Drag-and-drop field placement over a rendered PDF. who = [{key,label}] (signers or roles). */
  function Editor(opts) {
    var E = { fields: (opts.fields || []).map(function (f) { var o = Object.assign({ _id: 'f' + (fseq++) }, f); o.required = isReq(o); return o; }), who: opts.who, cur: opts.who[0] && opts.who[0].key, sel: null, pages: [] };
    var docEl = h('div', { class: 'ed-doc' }), pagesEl = h('div', { class: 'pages' }), whoEl = h('div', { class: 'who-list' }), selEl = h('div'), palEl = h('div', { class: 'palette' });
    docEl.appendChild(pagesEl);
    function colorOf(key) { var i = E.who.map(function (w) { return w.key; }).indexOf(key); return 'c' + ((i < 0 ? 0 : i) % 5); }
    function numOf(key) { return E.who.map(function (w) { return w.key; }).indexOf(key) + 1; }
    function drawWho() {
      clear(whoEl); E.who.forEach(function (w, i) {
        var n = E.fields.filter(function (f) { return f.recipient === w.key; }).length;
        whoEl.appendChild(h('button', { type: 'button', class: E.cur === w.key ? 'on' : '', onclick: function () { E.cur = w.key; drawWho(); } }, h('i', { class: 'sw ' + colorOf(w.key) }, i + 1), h('span', null, w.label), h('small', null, n + ' field' + (n === 1 ? '' : 's'))));
      });
    }
    Object.keys(FT).forEach(function (t) {
      var b = h('div', { class: 'pal', role: 'button', tabindex: '0', 'data-type': t, title: 'Drag onto the page, or tap to add' }, svg(FT[t][1]), FT[t][0]);
      b.addEventListener('pointerdown', function (e) { startPaletteDrag(e, t); });
      b.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); addAtVisible(t); } });
      palEl.appendChild(b);
    });
    function pageAt(x, y) { for (var i = 0; i < E.pages.length; i++) { var r = E.pages[i].el.getBoundingClientRect(); if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { i: i, r: r }; } return null; }
    function sizeFor(type, pi) { var pt = DEF_PT[type], p = E.pages[pi]; return { w: pt[0] / p.w, h: pt[1] / p.h }; }
    function addField(type, pi, cx, cy) {
      if (!E.cur) return toast('Add a signer first.');
      var s = sizeFor(type, pi), f = { _id: 'f' + (fseq++), type: type, recipient: E.cur, page: pi + 1, w: s.w, h: s.h, x: clamp(cx - s.w / 2, 0, 1 - s.w), y: clamp(cy - s.h / 2, 0, 1 - s.h), required: !!REQ_DEF[type], label: '' };
      E.fields.push(f); place(f);
      if (type === 'signature') {   // auto-place a matching "Date signed" (independent once created)
        var p = E.pages[pi], ds = sizeFor('date', pi), gap = 8 / p.w, d = { _id: 'f' + (fseq++), type: 'date', recipient: E.cur, page: pi + 1, w: ds.w, h: ds.h, required: true, label: '' };
        if (f.x + f.w + gap + ds.w <= 1) { d.x = f.x + f.w + gap; d.y = clamp(f.y + f.h - ds.h, 0, 1 - ds.h); }
        else if (f.y + f.h + 4 / p.h + ds.h <= 1) { d.x = f.x; d.y = f.y + f.h + 4 / p.h; }
        else { d.x = f.x; d.y = clamp(f.y - 4 / p.h - ds.h, 0, 1 - ds.h); }
        E.fields.push(d); place(d);
      }
      select(f); drawWho(); changed();
    }
    function addAtVisible(type) {
      var vis = 0, best = -1, dr = docEl.getBoundingClientRect();
      E.pages.forEach(function (p, i) { var r = p.el.getBoundingClientRect(), v = Math.min(r.bottom, Math.min(dr.bottom, innerHeight)) - Math.max(r.top, Math.max(dr.top, 0)); if (v > best) { best = v; vis = i; } });
      var r = E.pages[vis].el.getBoundingClientRect(), cy = ((Math.max(r.top, dr.top) + Math.min(r.bottom, dr.bottom, innerHeight)) / 2 - r.top) / r.height;
      addField(type, vis, 0.5, clamp(cy, 0.05, 0.95));
    }
    function startPaletteDrag(e, type) {
      e.preventDefault(); var sx = e.clientX, sy = e.clientY, moved = false, ghost = null;
      function mv(ev) {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return; moved = true;
        if (!ghost) { ghost = h('div', { class: 'fld dragghost ' + colorOf(E.cur) }, h('span', { class: 'lbl' }, FT[type][0])); document.body.appendChild(ghost); }
        var hit = pageAt(ev.clientX, ev.clientY), pi = hit ? hit.i : 0, s = sizeFor(type, pi), pr = (hit ? hit.r : E.pages[0].el.getBoundingClientRect());
        ghost.style.width = s.w * pr.width + 'px'; ghost.style.height = s.h * pr.height + 'px'; ghost.style.left = ev.clientX - s.w * pr.width / 2 + 'px'; ghost.style.top = ev.clientY - s.h * pr.height / 2 + 'px';
      }
      function up(ev) {
        document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up); if (ghost) ghost.remove();
        if (!E.pages.length) return;
        if (!moved) return addAtVisible(type);
        var hit = pageAt(ev.clientX, ev.clientY); if (!hit) return;
        addField(type, hit.i, (ev.clientX - hit.r.left) / hit.r.width, (ev.clientY - hit.r.top) / hit.r.height);
      }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function label(f) { return (f.type === 'text' && f.label ? f.label : FT[f.type][0]) + ' · ' + numOf(f.recipient); }
    function place(f) {
      var p = E.pages[f.page - 1]; if (!p || E.fields.indexOf(f) < 0) return;
      if (!f._el) {
        f._el = h('div', { class: 'fld', tabindex: '0', 'data-type': f.type }, h('span', { class: 'lbl' }), h('button', { class: 'x', type: 'button', 'aria-label': 'Remove field', title: 'Remove field', onpointerdown: function (e) { e.stopPropagation(); }, onmousedown: function (e) { e.stopPropagation(); }, ontouchstart: function (e) { e.stopPropagation(); }, onclick: function (e) { e.preventDefault(); e.stopPropagation(); remove(f); } }, '×'), h('span', { class: 'rz' }));
        f._el.addEventListener('pointerdown', function (e) { if (e.target.closest('.x')) return; startMove(e, f, e.target.classList.contains('rz')); });
        f._el.addEventListener('keydown', function (e) { if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(f); } });
      }
      if (f._el.parentNode !== p.el) p.el.appendChild(f._el);
      f._el.className = 'fld ' + colorOf(f.recipient) + (E.sel === f ? ' sel' : '');
      f._el.querySelector('.lbl').textContent = label(f) + (isReq(f) ? '' : ' (optional)');
      f._el.classList.toggle('optional', !isReq(f));
      Object.assign(f._el.style, { left: f.x * 100 + '%', top: f.y * 100 + '%', width: f.w * 100 + '%', height: f.h * 100 + '%' });
    }
    function startMove(e, f, resize) {
      e.preventDefault(); e.stopPropagation(); select(f);
      var r = E.pages[f.page - 1].el.getBoundingClientRect(), sx = e.clientX, sy = e.clientY, o = { x: f.x, y: f.y, w: f.w, h: f.h };
      function mv(ev) {
        var dx = (ev.clientX - sx) / r.width, dy = (ev.clientY - sy) / r.height;
        if (resize) { f.w = clamp(o.w + dx, 0.015, 1 - f.x); f.h = f.type === 'checkbox' ? clamp(f.w * r.width / r.height, 0.008, 1 - f.y) : clamp(o.h + dy, 0.008, 1 - f.y); }
        else {
          var hit = pageAt(ev.clientX, ev.clientY);
          if (hit && hit.i !== f.page - 1) { var c = { x: (ev.clientX - hit.r.left) / hit.r.width, y: (ev.clientY - hit.r.top) / hit.r.height }; f.page = hit.i + 1; r = hit.r; sx = ev.clientX; sy = ev.clientY; o = { x: clamp(c.x - f.w / 2, 0, 1 - f.w), y: clamp(c.y - f.h / 2, 0, 1 - f.h), w: f.w, h: f.h }; f.x = o.x; f.y = o.y; }
          else { f.x = clamp(o.x + dx, 0, 1 - f.w); f.y = clamp(o.y + dy, 0, 1 - f.h); }
        }
        place(f);
      }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up); changed(); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    }
    function remove(f) { if (E.sel === f) select(null); E.fields = E.fields.filter(function (x) { return x !== f; }); if (f._el) f._el.remove(); f._el = null; drawWho(); changed(); }
    function select(f) {
      var prev = E.sel; E.sel = f; if (prev && prev._el) place(prev); if (f) { place(f); f._el.focus({ preventScroll: true }); }
      clear(selEl); if (!f) return selEl.appendChild(h('p', { class: 'hint', style: { margin: 0 } }, 'Drag a field onto the page (or tap it to drop it on the page you’re viewing). Drag to move, use the dot to resize.'));
      var who = h('select', { onchange: function () { f.recipient = who.value; place(f); drawWho(); changed(); } }, E.who.map(function (w, i) { return h('option', { value: w.key, selected: w.key === f.recipient }, (i + 1) + '. ' + w.label); }));
      var box = h('div', { class: 'selbox' }, h('b', null, FT[f.type][0] + ' field'), h('div', { class: 'f' }, h('label', null, 'Filled by'), who));
      if (f.type === 'text') { var lb = h('input', { type: 'text', value: f.label || '', maxlength: 60, placeholder: 'e.g. Phone number', oninput: function () { f.label = lb.value; place(f); changed(); } }); box.appendChild(h('div', { class: 'f' }, h('label', null, 'Label shown to signer'), lb)); }
      box.appendChild(h('div', { class: 'f' }, h('label', null, 'Signer must complete'), h('div', { class: 'seg reqseg' }, [[true, 'Required'], [false, 'Optional']].map(function (o) {
        return h('button', { type: 'button', class: isReq(f) === o[0] ? 'on' : '', 'aria-pressed': String(isReq(f) === o[0]), 'data-req': String(o[0]), onclick: function (e) { f.required = o[0]; Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (b) { var on = b === e.currentTarget; b.className = on ? 'on' : ''; b.setAttribute('aria-pressed', String(on)); }); place(f); changed(); } }, o[1]); }))));
      box.appendChild(h('button', { class: 'link danger', type: 'button', onclick: function () { remove(f); } }, 'Remove field'));
      selEl.appendChild(box);
    }
    docEl.addEventListener('pointerdown', function (e) { if (!e.target.closest('.fld')) select(null); });
    document.addEventListener('keydown', function onDel(e) {
      if (!document.contains(E.el)) return document.removeEventListener('keydown', onDel);
      if ((e.key !== 'Delete' && e.key !== 'Backspace') || !E.sel || e.defaultPrevented) return;
      var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (!document.querySelector('#modal.hidden') && document.querySelector('#modal')) return;
      e.preventDefault(); remove(E.sel);
    });
    function changed() { S.dirty = true; if (opts.onChange) opts.onChange(); }
    E.load = async function (bytes) {
      clear(pagesEl); pagesEl.appendChild(h('div', { class: 'loading' }, 'Opening document…'));
      var tmp = h('div', { class: 'pages', style: { display: 'contents' } });
      E.pages = await renderPdf(bytes, tmp); clear(pagesEl); while (tmp.firstChild) pagesEl.appendChild(tmp.firstChild);
      E.fields = E.fields.filter(function (f) { return f.page >= 1 && f.page <= E.pages.length; });
      E.fields.forEach(place); drawWho(); select(null);
    };
    E.setWho = function (who) {
      var keys = who.map(function (w) { return w.key; }); E.who = who; if (keys.indexOf(E.cur) < 0) E.cur = keys[0];
      E.fields.filter(function (f) { return keys.indexOf(f.recipient) < 0; }).forEach(function (f) { if (f._el) f._el.remove(); });
      E.fields = E.fields.filter(function (f) { return keys.indexOf(f.recipient) >= 0; }); E.fields.forEach(place); drawWho();
    };
    E.out = function () { return E.fields.map(function (f) { return { type: f.type, recipient: f.recipient, page: f.page, x: +f.x.toFixed(4), y: +f.y.toFixed(4), w: +f.w.toFixed(4), h: +f.h.toFixed(4), required: isReq(f), label: f.label || '' }; }); };
    E.missing = function () { return E.who.filter(function (w) { return !E.fields.some(function (f) { return f.recipient === w.key && (f.type === 'signature' || f.type === 'initials'); }); }); };
    E.panel = h('div', { class: 'ed-panel' }, opts.top || null, h('div', null, h('h3', null, opts.whoTitle || 'Signers'), whoEl, h('p', { class: 'hint', style: { margin: '6px 0 0' } }, 'Pick who fills the next field you add.')), h('div', null, h('h3', null, 'Fields'), palEl), h('div', { class: 'grp-hide' }, selEl), opts.foot || null);
    E.el = h('div', { class: 'ed' }, E.panel, docEl);
    drawWho(); return E;
  }

  /* ---------- contacts picker (CRM + Transaction Center, read-only) ---------- */
  var contactsCache = null;
  function pickContact(onPick) {
    var tabs = h('div', { class: 'seg' }), body = h('div'), mode = 'crm';
    var q = h('input', { type: 'search', placeholder: 'Search…', 'aria-label': 'Search contacts', oninput: function () { draw(); } });
    function setMode(m) { mode = m; Array.prototype.forEach.call(tabs.children, function (b) { b.className = b.dataset.m === m ? 'on' : ''; }); draw(); }
    [['crm', 'CRM contacts'], ['txn', 'Transactions']].forEach(function (t) { tabs.appendChild(h('button', { type: 'button', 'data-m': t[0], class: t[0] === mode ? 'on' : '', onclick: function () { setMode(t[0]); } }, t[1])); });
    function choose(c) { if (!emailOk(c.email)) return toast('That contact has no email address.'); onPick({ name: c.name, email: c.email }); toast(c.name + ' added'); }
    function draw() {
      clear(body); if (!contactsCache) return body.appendChild(h('div', { class: 'loading' }, 'Loading contacts…'));
      if (!contactsCache.available) return body.appendChild(errBox(contactsCache.reason || 'Contacts aren’t available right now. Add the signer by hand.'));
      var s = q.value.trim().toLowerCase();
      if (mode === 'crm') {
        var rows = contactsCache.crm.filter(function (c) { return !s || (c.name + ' ' + c.email + ' ' + c.type).toLowerCase().indexOf(s) >= 0; }).slice(0, 200);
        body.appendChild(rows.length ? h('div', { class: 'picklist' }, rows.map(function (c) { return h('button', { type: 'button', disabled: !c.email, onclick: function () { choose(c); } }, h('span', null, c.name, h('br'), h('small', null, c.email || 'No email')), h('small', null, c.type)); })) : h('p', { class: 'hint' }, 'No CRM contacts match.'));
      } else {
        var tx = contactsCache.txns.filter(function (t) { return !s || (t.title + ' ' + t.status).toLowerCase().indexOf(s) >= 0; }).slice(0, 200);
        body.appendChild(tx.length ? h('div', { class: 'picklist' }, tx.map(function (t) { return h('button', { type: 'button', onclick: function () { openTxn(t); } }, h('span', null, t.title, h('br'), h('small', null, [t.typeLabel, t.status].filter(Boolean).join(' · '))), h('small', null, '›')); })) : h('p', { class: 'hint' }, 'No transactions match.'));
      }
    }
    function openTxn(t) {
      clear(body).appendChild(h('div', { class: 'loading' }, 'Loading contacts for ' + t.title + '…'));
      api('txnContacts', { id: t.id }).then(function (d) {
        clear(body); body.appendChild(h('button', { class: 'link', type: 'button', onclick: draw }, '‹ All transactions'));
        body.appendChild(d.contacts.length ? h('div', { class: 'picklist' }, d.contacts.map(function (c) { return h('button', { type: 'button', disabled: !c.email, onclick: function () { choose(c); } }, h('span', null, c.name, h('br'), h('small', null, c.email || 'No email')), h('small', null, c.label)); })) : h('p', { class: 'hint' }, 'This transaction has no contacts with an email yet.'));
      }).catch(function (e) { clear(body).appendChild(errBox(e.message)); });
    }
    openModal('Add from contacts', h('div', null, h('p', { class: 'sub', style: { margin: '0 0 12px' } }, 'From the Transaction Center and CRM (read-only).'), h('div', { class: 'toolbar' }, tabs, q), body), { lg: true });
    draw();
    if (!contactsCache) api('contacts').then(function (d) { contactsCache = d; draw(); }).catch(function (e) { contactsCache = { available: false, reason: e.message }; draw(); });
  }

  /* ---------- wizard: new envelope / template ---------- */
  var rk = 1;
  function Wizard(mode, init) {   // mode: 'envelope' | 'template'
    var T = mode === 'template';
    var W = Object.assign({ step: 1, name: '', files: [], merged: null, mergedFrom: '', who: [], orderMode: 'parallel', fields: [], subject: '', message: '', description: '', category: 'general', shared: false, templateId: '', id: '', pdfChanged: false }, init || {});
    if (!W.who.length) W.who = T ? [{ key: 'role' + (rk++), label: 'Client', name: '', email: '', order: 1 }] : [];
    var ed = null;
    function stepsBar() { return h('div', { class: 'steps' }, [T ? 'Template details' : 'Documents & signers', 'Place fields', T ? 'Save' : 'Review & send'].map(function (l, i) { return h('div', { class: 'step' + (W.step === i + 1 ? ' on' : W.step > i + 1 ? ' done' : '') }, h('i', null, W.step > i + 1 ? '✓' : i + 1), l); })); }
    function draw() { $app.className = W.step === 2 ? 'wide' : ''; clear($app); [null, step1, step2, step3][W.step](); }
    function filesKey() { return W.files.map(function (f) { return f.name + f.bytes.length; }).join('|'); }
    /* step 1 */
    function step1() {
      var msg = h('div'), fileList = h('ul', { class: 'files' }), whoList = h('div'), inp = h('input', { type: 'file', accept: 'application/pdf,.pdf', multiple: true, class: 'hidden', onchange: function () { addFiles(inp.files); inp.value = ''; } });
      var drop = h('div', { class: 'drop', tabindex: '0', role: 'button', onclick: function () { inp.click(); }, onkeydown: function (e) { if (e.key === 'Enter') inp.click(); } }, svg(I.up), h('b', null, 'Upload PDFs'), h('span', { class: 'hint' }, 'Drop files here or tap to choose. Several PDFs are combined into one packet.'), inp);
      ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
      drop.addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });
      async function addFiles(list) {
        for (var i = 0; i < list.length; i++) {
          var f = list[i]; if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { toast(f.name + ' is not a PDF'); continue; }
          if (f.size > 14 * 1024 * 1024) { toast(f.name + ' is over 14 MB'); continue; }
          W.files.push({ name: f.name.replace(/\.pdf$/i, ''), bytes: await readFile(f) }); W.pdfChanged = true; S.dirty = true;
        }
        if (!W.name && W.files[0]) { W.name = W.files[0].name; nameIn.value = W.name; }
        drawFiles();
      }
      function drawFiles() {
        clear(fileList); W.files.forEach(function (f, i) {
          fileList.appendChild(h('li', null, h('span', null, (i + 1) + '. ' + f.name), W.files.length > 1 ? [h('button', { class: 'icon', type: 'button', 'aria-label': 'Move up', disabled: i === 0, onclick: function () { W.files.splice(i - 1, 0, W.files.splice(i, 1)[0]); W.pdfChanged = true; drawFiles(); } }, svg(I.arrowUp)), h('button', { class: 'icon', type: 'button', 'aria-label': 'Move down', disabled: i === W.files.length - 1, onclick: function () { W.files.splice(i + 1, 0, W.files.splice(i, 1)[0]); W.pdfChanged = true; drawFiles(); } }, svg(I.arrowDn))] : null,
            h('button', { class: 'icon', type: 'button', 'aria-label': 'Remove ' + f.name, onclick: function () { W.files.splice(i, 1); W.pdfChanged = true; drawFiles(); } }, svg(I.x))));
        });
        if (W.files.length && W.fields.length && W.pdfChanged && W.mergedFrom) fileList.appendChild(h('li', { class: 'hint' }, 'You changed the files — check field positions on the next step.'));
      }
      function drawWho() {
        clear(whoList); var seq = W.orderMode === 'sequential';
        W.who.forEach(function (w, i) {
          var row = h('div', { class: 'rcp' },
            seq ? h('input', { class: 'ord', type: 'number', min: 1, max: 20, value: w.order || i + 1, 'aria-label': 'Signing order', oninput: function (e) { w.order = parseInt(e.target.value, 10) || 1; } }) : h('i', { class: 'sw c' + (i % 5) }, i + 1),
            T ? h('input', { type: 'text', value: w.label, placeholder: 'Role, e.g. Buyer', maxlength: 60, 'aria-label': 'Role', oninput: function (e) { w.label = e.target.value; } })
              : h('input', { type: 'text', value: w.name, placeholder: 'Full name', maxlength: 120, autocomplete: 'off', 'aria-label': 'Signer name', oninput: function (e) { w.name = e.target.value; } }),
            T ? h('input', { class: 'em', type: 'email', value: w.email || '', placeholder: 'Default email (optional)', 'aria-label': 'Default email', oninput: function (e) { w.email = e.target.value; } })
              : h('input', { class: 'em', type: 'email', value: w.email, placeholder: 'Email', autocomplete: 'off', 'aria-label': 'Signer email', oninput: function (e) { w.email = e.target.value; } }),
            h('button', { class: 'icon del', type: 'button', 'aria-label': 'Remove', onclick: function () { W.who.splice(i, 1); W.fields = W.fields.filter(function (f) { return f.recipient !== w.key; }); drawWho(); } }, svg(I.x)),
            !T && w.roleLabel ? h('div', { class: 'role' }, 'Role: ' + w.roleLabel) : null,
            T ? h('div', { class: 'role' }, h('input', { type: 'text', value: w.name || '', placeholder: 'Default name (optional, e.g. the broker)', style: { minHeight: '38px', fontSize: '14px' }, oninput: function (e) { w.name = e.target.value; } })) : null);
          whoList.appendChild(row);
        });
        if (!W.who.length) whoList.appendChild(h('p', { class: 'hint' }, T ? 'Add at least one role.' : 'Add the people who need to sign.'));
      }
      function addWho(p) { W.who.push(Object.assign({ key: (T ? 'role' : 'r') + (rk++), label: '', name: '', email: '', order: W.who.length + 1 }, p || {})); drawWho(); S.dirty = true; }
      var orderSeg = h('div', { class: 'seg' }, [['parallel', 'Everyone at once'], ['sequential', 'In order']].map(function (o) { return h('button', { type: 'button', class: W.orderMode === o[0] ? 'on' : '', onclick: function () { W.orderMode = o[0]; Array.prototype.forEach.call(orderSeg.children, function (b, j) { b.className = (j === 0) === (o[0] === 'parallel') ? 'on' : ''; }); drawWho(); } }, o[1]); }));
      var nameIn = h('input', { type: 'text', value: W.name, maxlength: 150, placeholder: T ? 'e.g. Residential Listing Agreement' : 'e.g. Listing Agreement – 88 Canyon Crest', oninput: function () { W.name = nameIn.value; } });
      var extra = null;
      if (T) {
        var cat = isAdmin() ? h('div', { class: 'f' }, h('label', null, 'Type'), h('div', { class: 'seg' }, [['general', 'General'], ['onboarding', 'Onboarding (new hires)']].map(function (o) { return h('button', { type: 'button', class: W.category === o[0] ? 'on' : '', onclick: function (e) { W.category = o[0]; Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (b) { b.className = ''; }); e.currentTarget.className = 'on'; shareRow.classList.toggle('hidden', o[0] === 'onboarding'); } }, o[1]); })), h('small', null, 'Onboarding templates are shared with everyone and show up in the Onboarding packet.')) : null;
        var shareRow = h('label', { class: 'check' + (W.category === 'onboarding' ? ' hidden' : '') }, h('input', { type: 'checkbox', checked: W.shared, onchange: function (e) { W.shared = e.target.checked; } }), 'Share with all ENESMA agents');
        extra = [h('div', { class: 'f' }, h('label', null, 'Description (optional)'), h('input', { type: 'text', value: W.description, maxlength: 300, oninput: function (e) { W.description = e.target.value; } })), cat, h('div', { class: 'f' }, shareRow)];
      }
      add($app, [h('a', { class: 'back', href: T ? '#/templates' : '#/' }, T ? '‹ Templates' : '‹ Envelopes'), h('span', { class: 'rule' }), h('h1', null, T ? (W.id ? 'Edit template' : 'New template') : (W.templateId ? 'Send “' + W.tplName + '”' : 'New envelope')), stepsBar(), testBar(),
        h('div', { class: 'detail' },
          h('div', { class: 'card' }, h('div', { class: 'f' }, h('label', null, T ? 'Template name' : 'Envelope name'), nameIn), extra, h('h2', { style: { marginTop: '8px' } }, 'Documents'), W.templateId && !T ? h('p', { class: 'hint' }, 'From the template. You can add more PDFs after it.') : null, drop, fileList),
          h('div', { class: 'card' }, h('h2', null, T ? 'Roles' : 'Signers'), h('div', { class: 'f' }, h('label', null, 'Signing order'), orderSeg), whoList,
            h('div', { class: 'actions', style: { marginTop: '10px' } }, h('button', { class: 'btn sm ghost', type: 'button', onclick: function () { addWho(T ? { label: 'Signer ' + (W.who.length + 1) } : null); } }, T ? 'Add role' : 'Add signer'),
              !T ? h('button', { class: 'btn sm plain', type: 'button', onclick: function () { addWho({ name: S.user.name, email: S.user.email }); } }, 'Add me') : null,
              !T ? h('button', { class: 'btn sm plain', type: 'button', onclick: function () { pickContact(function (c) { var blank = W.who.filter(function (w) { return !w.name && !w.email; })[0]; if (blank) { blank.name = c.name; blank.email = c.email; drawWho(); } else addWho(c); }); } }, 'From contacts') : null))),
        msg, h('div', { class: 'actions' }, h('span', { class: 'sp' }), h('button', { class: 'btn red', type: 'button', onclick: function (e) { next(e.currentTarget); } }, 'Next: place fields'))]);
      drawFiles(); drawWho();
      async function next(btn) {
        clear(msg);
        var problems = [];
        if (!W.files.length) problems.push('Upload at least one PDF.');
        if (!W.who.length) problems.push(T ? 'Add at least one role.' : 'Add at least one signer.');
        var seen = {};
        W.who.forEach(function (w, i) {
          if (T) { if (!w.label.trim()) problems.push('Name role ' + (i + 1) + '.'); if (w.email && !emailOk(w.email)) problems.push('Check the default email for ' + (w.label || 'role ' + (i + 1)) + '.'); }
          else { if (!w.name.trim()) problems.push('Enter a name for signer ' + (i + 1) + '.'); if (!emailOk(w.email)) problems.push('Enter a valid email for ' + (w.name || 'signer ' + (i + 1)) + '.'); var k = String(w.email).trim().toLowerCase(); if (k && seen[k]) problems.push(w.email + ' is listed twice.'); seen[k] = 1; }
        });
        if (problems.length) return msg.appendChild(errBox(problems[0]));
        busy(btn, true, 'Preparing…');
        try {
          if (filesKey() !== W.mergedFrom) { var m = W.files.length === 1 && !W.pdfChanged ? { bytes: W.files[0].bytes, pages: null } : await mergePdfs(W.files.map(function (f) { return f.bytes; })); W.merged = m.bytes; W.mergedFrom = filesKey(); }
          W.step = 2; draw();
        } catch (e) { busy(btn, false); msg.appendChild(errBox(e.message)); }
      }
    }
    /* step 2 */
    function whoForEditor() { return W.who.map(function (w, i) { return { key: w.key, label: T ? (w.label || 'Role ' + (i + 1)) : (w.name || w.email) }; }); }
    function step2() {
      var msg = h('div');
      ed = Editor({ who: whoForEditor(), fields: W.fields, whoTitle: T ? 'Roles' : 'Signers', onChange: function () { W.fields = ed.fields; },
        top: h('div', null, h('a', { class: 'back', href: 'javascript:void 0', onclick: function () { keep(); W.step = 1; draw(); } }, '‹ Back'), h('b', { style: { display: 'block' } }, W.name || 'Untitled'), h('span', { class: 'hint' }, 'Signature or initials needed for each ' + (T ? 'role' : 'signer') + '.')),
        foot: h('div', { class: 'ed-foot' }, msg, h('button', { class: 'btn plain', type: 'button', onclick: function () { keep(); W.step = 1; draw(); } }, 'Back'), h('button', { class: 'btn red', type: 'button', onclick: function () {
          clear(msg); var miss = ed.missing(); if (miss.length) return msg.appendChild(errBox('Add a signature or initials field for ' + miss.map(function (m) { return m.label; }).join(', ') + '.'));
          keep(); W.step = 3; draw(); } }, T ? 'Next: save' : 'Next: review')) });
      $app.appendChild(ed.el);
      ed.load(W.merged).then(function () { W.pages = ed.pages.length; W.fields = ed.fields; }).catch(function (e) { msg.appendChild(errBox('Could not open the PDF: ' + e.message)); });
    }
    function keep() { if (ed) { W.fields = ed.fields; W.fields.forEach(function (f) { delete f._el; }); W.pages = ed.pages.length || W.pages; } }
    /* step 3 */
    function step3() {
      var msg = h('div'), btn;
      var subj = h('input', { type: 'text', maxlength: 150, value: W.subject || ('Please sign: ' + (W.name || 'documents')), oninput: function () { W.subject = subj.value; } });
      var note = h('textarea', { maxlength: 2000, placeholder: 'Optional message to signers', oninput: function () { W.message = note.value; } }); note.value = W.message || '';
      var byWho = W.who.map(function (w, i) { var n = W.fields.filter(function (f) { return f.recipient === w.key; }).length; return h('div', { class: 'signer' }, h('div', { class: 'top' }, h('div', null, h('div', { class: 'who' }, (W.orderMode === 'sequential' ? (w.order || i + 1) + '. ' : '') + (T ? w.label : w.name)), h('div', { class: 'em' }, T ? (w.email ? 'Default: ' + (w.name ? w.name + ' · ' : '') + w.email : 'Filled in when sending') : w.email)), h('span', { class: 'badge' }, n + ' field' + (n === 1 ? '' : 's')))); });
      btn = h('button', { class: 'btn red', type: 'button', onclick: submit }, T ? 'Save template' : 'Send for signature');
      add($app, [h('a', { class: 'back', href: 'javascript:void 0', onclick: function () { W.step = 2; draw(); } }, '‹ Place fields'), h('span', { class: 'rule' }), h('h1', null, W.name || 'Untitled'), stepsBar(), testBar(),
        h('div', { class: 'detail' }, h('div', { class: 'card' }, h('h2', null, T ? 'Default email' : 'Email to signers'), h('div', { class: 'f' }, h('label', null, 'Subject'), subj), h('div', { class: 'f' }, h('label', null, 'Message'), note),
          h('p', { class: 'hint' }, T ? 'Used when this template is sent. It can be changed each time.' : 'Each signer gets a private link — no account needed. When everyone has signed, all parties get the signed PDF and its Certificate of Completion (a separate PDF).')),
          h('div', { class: 'card' }, h('h2', null, T ? 'Roles' : 'Signers'), h('p', { class: 'hint', style: { marginTop: '-6px' } }, W.orderMode === 'sequential' ? 'In order — each person is emailed after the one before signs.' : 'Everyone is emailed at once.'), byWho, h('p', { class: 'hint' }, W.pages + ' page' + (W.pages === 1 ? '' : 's') + ' · ' + W.fields.length + ' fields'))),
        msg, h('div', { class: 'actions' }, h('button', { class: 'btn plain', type: 'button', onclick: function () { W.step = 2; draw(); } }, 'Back'), h('span', { class: 'sp' }), btn)]);
      async function submit() {
        clear(msg); busy(btn, true, T ? 'Saving…' : 'Sending…');
        var fields = W.fields.map(function (f) { return { type: f.type, recipient: f.recipient, page: f.page, x: +f.x.toFixed(4), y: +f.y.toFixed(4), w: +f.w.toFixed(4), h: +f.h.toFixed(4), required: isReq(f), label: f.label || '' }; });
        try {
          if (T) {
            var p = { id: W.id || undefined, name: W.name, description: W.description, category: W.category, shared: W.shared, orderMode: W.orderMode, subject: W.subject, message: W.message, pages: W.pages, fields: fields,
              roles: W.who.map(function (w, i) { return { key: w.key, label: w.label, order: W.orderMode === 'sequential' ? (w.order || i + 1) : i + 1, defaultName: w.name, defaultEmail: w.email }; }) };
            if (!W.id || W.pdfChanged) p.pdf = b64FromBytes(W.merged);
            var d = await api('saveTemplate', p); S.dirty = false; toast('Template saved'); go('#/templates');
          } else {
            var e = await api('createEnvelope', { name: W.name, subject: W.subject || ('Please sign: ' + W.name), message: W.message, orderMode: W.orderMode, pages: W.pages, templateId: W.templateId || '', fields: fields, pdf: b64FromBytes(W.merged),
              recipients: W.who.map(function (w, i) { return { key: w.key, name: w.name.trim(), email: w.email.trim(), roleLabel: w.roleLabel || '', order: w.order || i + 1 }; }) });
            S.dirty = false; toast('Sent for signature'); go('#/envelope/' + e.envelope.id);
          }
        } catch (err) { busy(btn, false); msg.appendChild(errBox(err.message)); }
      }
    }
    draw();
  }
  async function loadTemplateForWizard(id) {
    var d = await api('getTemplate', { id: id, withPdf: true }), t = d.template, bytes = bytesFromB64(t.pdf);
    return { t: t, bytes: bytes };
  }
  ROUTES['new'] = function (r) {
    if (!r.q.t) return Wizard('envelope');
    loading('Opening template…');
    loadTemplateForWizard(r.q.t).then(function (x) {
      var t = x.t;
      Wizard('envelope', { name: t.name, templateId: t.id, tplName: t.name, files: [{ name: t.name, bytes: x.bytes }], merged: x.bytes, mergedFrom: t.name + x.bytes.length, pages: t.pages, orderMode: t.orderMode, subject: t.subject, message: t.message,
        who: t.roles.map(function (ro) { return { key: ro.key, roleLabel: ro.label, name: ro.defaultName || '', email: ro.defaultEmail || '', order: ro.order }; }),
        fields: t.fields.map(function (f) { return Object.assign({}, f); }) });
    }).catch(function (e) { fatal(e); });
  };
  ROUTES.template = function (r) {
    if (r.arg === 'new') return Wizard('template', r.q.cat === 'onboarding' && isAdmin() ? { category: 'onboarding', who: [{ key: 'role' + (rk++), label: 'New hire', name: '', email: '', order: 1 }, { key: 'role' + (rk++), label: 'Broker', name: S.user.name, email: S.user.email, order: 2 }], orderMode: 'sequential' } : null);
    loading('Opening template…');
    loadTemplateForWizard(r.arg).then(function (x) {
      var t = x.t; if (!t.canEdit) return fatal(new Error('You can use this template but not edit it.'));
      Wizard('template', { id: t.id, name: t.name, description: t.description, category: t.category, shared: t.shared, files: [{ name: t.name, bytes: x.bytes }], merged: x.bytes, mergedFrom: t.name + x.bytes.length, pages: t.pages, orderMode: t.orderMode, subject: t.subject, message: t.message,
        who: t.roles.map(function (ro) { return { key: ro.key, label: ro.label, name: ro.defaultName || '', email: ro.defaultEmail || '', order: ro.order }; }), fields: t.fields.map(function (f) { return Object.assign({}, f); }) });
    }).catch(function (e) { fatal(e); });
  };

  /* ---------- templates ---------- */
  ROUTES.templates = function () {
    loading('Loading templates…');
    api('listTemplates').then(function (d) {
      clear($app); var ts = d.templates || [];
      function card(t) {
        return h('div', { class: 'card tpl' + (t.category === 'onboarding' ? ' onb' : '') }, h('div', null, t.category === 'onboarding' ? h('span', { class: 'pill' }, 'Onboarding') : t.shared ? h('span', { class: 'pill dark' }, 'Shared') : null),
          h('p', { class: 'nm' }, t.name), h('p', { class: 'ds' }, t.description || (t.roles.map(function (r) { return r.label; }).join(', '))),
          h('p', { class: 'hint', style: { margin: 0 } }, t.pages + ' page' + (t.pages === 1 ? '' : 's') + ' · ' + t.fieldCount + ' fields · ' + t.roles.length + ' role' + (t.roles.length === 1 ? '' : 's') + (t.ownerName ? ' · by ' + t.ownerName : '')),
          h('div', { class: 'acts' }, h('a', { class: 'btn sm red', href: '#/new?t=' + encodeURIComponent(t.id) }, 'Use'), t.canEdit ? h('a', { class: 'btn sm ghost', href: '#/template/' + encodeURIComponent(t.id) }, 'Edit') : null,
            t.canEdit ? h('button', { class: 'btn sm plain', type: 'button', onclick: function () { confirmBox('Delete template?', '“' + t.name + '” will no longer be available. Envelopes already sent are not affected.', 'Delete', true).then(function (ok) { if (ok) api('deleteTemplate', { id: t.id }).then(function () { toast('Template deleted'); ROUTES.templates(); }).catch(function (e) { toast(e.message); }); }); } }, 'Delete') : null));
      }
      var onb = ts.filter(function (t) { return t.category === 'onboarding'; }), gen = ts.filter(function (t) { return t.category !== 'onboarding'; });
      add($app, [h('div', { class: 'head' }, h('div', null, h('span', { class: 'rule' }), h('h1', null, 'Templates'), h('p', { class: 'sub' }, 'Reusable documents with roles and fields already placed.')),
        h('div', { class: 'toolbar', style: { margin: 0 } }, isAdmin() ? h('a', { class: 'btn ghost', href: '#/template/new?cat=onboarding' }, 'New onboarding template') : null, h('a', { class: 'btn red', href: '#/template/new' }, 'New template'))),
        h('h2', null, 'General'), gen.length ? h('div', { class: 'cards' }, gen.map(card)) : h('div', { class: 'list' }, h('div', { class: 'empty' }, h('b', null, 'No templates yet'), 'Save documents you send often — listing agreements, disclosures — with fields already placed.')),
        h('h2', { style: { marginTop: '28px' } }, 'Onboarding'), onb.length ? h('div', { class: 'cards' }, onb.map(card)) : h('div', { class: 'list' }, h('div', { class: 'empty' }, h('b', null, 'No onboarding templates yet'), isAdmin() ? 'Upload each new-hire document once (ICA, W-9, policies…) as an onboarding template, then send them all from Onboarding in a few clicks.' : 'Your broker adds these.'))]);
    }).catch(function (e) { fatal(e, ROUTES.templates); });
  };

  /* ---------- onboarding packet ---------- */
  ROUTES.onboarding = function () {
    loading('Loading onboarding templates…');
    api('listTemplates').then(function (d) {
      clear($app); var ts = (d.templates || []).filter(function (t) { return t.category === 'onboarding'; });
      add($app, [h('span', { class: 'rule' }), h('h1', null, 'Onboarding'), h('p', { class: 'sub' }, 'Send a new hire their whole onboarding packet as one envelope.'), testBar()]);
      if (!isAdmin()) return $app.appendChild(h('div', { class: 'list' }, h('div', { class: 'empty' }, h('b', null, 'For admins'), 'Onboarding packets are sent by an ENESMA admin.')));
      if (!ts.length) return $app.appendChild(h('div', { class: 'list' }, h('div', { class: 'empty' }, h('b', null, 'Add your onboarding documents first'), 'Create one onboarding template per document (ICA, W-9, policy acknowledgements…).', h('div', { style: { marginTop: '14px' } }, h('a', { class: 'btn red', href: '#/template/new?cat=onboarding' }, 'New onboarding template')))));
      var sel = {}; ts.forEach(function (t) { sel[t.id] = true; });
      var hn = h('input', { type: 'text', maxlength: 120, autocomplete: 'off', placeholder: 'Full legal name' }), he = h('input', { type: 'email', autocomplete: 'off', placeholder: 'Personal email' });
      var rolesEl = h('div'), msg = h('div'), roleVals = {};
      function roleList() {   // merge roles by label across the chosen templates
        var out = [], idx = {};
        ts.filter(function (t) { return sel[t.id]; }).forEach(function (t) { t.roles.forEach(function (r) { var k = r.label.trim().toLowerCase(); if (!(k in idx)) { idx[k] = out.length; out.push({ k: k, label: r.label, order: r.order, defaultName: r.defaultName, defaultEmail: r.defaultEmail }); } else out[idx[k]].order = Math.min(out[idx[k]].order, r.order); }); });
        return out.sort(function (a, b) { return a.order - b.order; });
      }
      function hireKey(list) { var m = list.filter(function (r) { return /hire|agent|associate|new|recruit|employee|contractor/i.test(r.label) && !r.defaultEmail; })[0] || list.filter(function (r) { return !r.defaultEmail; })[0]; return m ? m.k : null; }
      function drawRoles() {
        clear(rolesEl); var list = roleList(), hk = hireKey(list);
        list.filter(function (r) { return r.k !== hk; }).forEach(function (r) {
          var v = roleVals[r.k] = roleVals[r.k] || { name: r.defaultName || '', email: r.defaultEmail || '' };
          rolesEl.appendChild(h('div', { class: 'row2', style: { marginBottom: '10px' } }, h('div', null, h('label', null, r.label + ' — name'), h('input', { type: 'text', value: v.name, oninput: function (e) { v.name = e.target.value; } })), h('div', null, h('label', null, r.label + ' — email'), h('input', { type: 'email', value: v.email, oninput: function (e) { v.email = e.target.value; } }))));
        });
        if (hk) rolesEl.insertBefore(h('p', { class: 'hint' }, 'The new hire signs as “' + list.filter(function (r) { return r.k === hk; })[0].label + '”.'), rolesEl.firstChild);
      }
      var picks = h('div', { class: 'list' }, ts.map(function (t) { return h('label', { class: 'item check', style: { cursor: 'pointer', display: 'flex' } }, h('input', { type: 'checkbox', checked: true, onchange: function (e) { sel[t.id] = e.target.checked; drawRoles(); } }), h('div', { style: { minWidth: 0 } }, h('div', { class: 't' }, t.name), h('div', { class: 'm' }, t.pages + (t.pages === 1 ? ' page · ' : ' pages · ') + t.roles.map(function (r) { return r.label; }).join(', ')))); }));
      var btn = h('button', { class: 'btn red', type: 'button', onclick: send }, 'Send onboarding packet');
      add($app, [h('div', { class: 'detail' }, h('div', { class: 'card' }, h('h2', null, '1. New hire'), h('div', { class: 'f' }, h('label', null, 'Name'), hn), h('div', { class: 'f' }, h('label', null, 'Email'), he), h('h2', { style: { marginTop: '18px' } }, '2. Other signers'), rolesEl),
        h('div', { class: 'card' }, h('h2', null, '3. Documents'), h('p', { class: 'hint', style: { marginTop: '-6px' } }, 'Combined into one envelope, in this order.'), picks)), msg, h('div', { class: 'actions' }, h('span', { class: 'sp' }), btn)]);
      drawRoles();
      async function send() {
        clear(msg); var chosen = ts.filter(function (t) { return sel[t.id]; });
        if (!hn.value.trim() || !emailOk(he.value)) return msg.appendChild(errBox('Enter the new hire’s name and a valid email.'));
        if (!chosen.length) return msg.appendChild(errBox('Pick at least one document.'));
        var list = roleList(), hk = hireKey(list), who = {};
        for (var i = 0; i < list.length; i++) {
          var r = list[i], v = r.k === hk ? { name: hn.value.trim(), email: he.value.trim() } : roleVals[r.k];
          if (!v || !v.name.trim() || !emailOk(v.email)) return msg.appendChild(errBox('Enter a name and email for ' + r.label + '.'));
          who[r.k] = { key: 'o' + (i + 1), name: v.name.trim(), email: v.email.trim(), roleLabel: r.label, order: r.order };
        }
        var emails = {}; for (var k in who) { var em = who[k].email.toLowerCase(); if (emails[em]) return msg.appendChild(errBox(who[k].email + ' is used for two roles.')); emails[em] = 1; }
        busy(btn, true, 'Building packet…');
        try {
          var full = [], bytes = [];
          for (var j = 0; j < chosen.length; j++) { var x = await loadTemplateForWizard(chosen[j].id); full.push(x.t); bytes.push(x.bytes); }
          var m = await mergePdfs(bytes), fields = [];
          full.forEach(function (t, ti) {
            var keyOf = {}; t.roles.forEach(function (r) { keyOf[r.key] = who[r.label.trim().toLowerCase()].key; });
            t.fields.forEach(function (f) { fields.push({ type: f.type, recipient: keyOf[f.recipient], page: f.page + m.offsets[ti], x: f.x, y: f.y, w: f.w, h: f.h, required: isReq(f), label: f.label || '' }); });
          });
          var seq = full.some(function (t) { return t.orderMode === 'sequential'; });
          busy(btn, true, 'Sending…');
          var d2 = await api('createEnvelope', { name: 'Onboarding – ' + hn.value.trim(), subject: 'Welcome to ENESMA Realty – your onboarding documents', templateId: full[0].id, orderMode: seq ? 'sequential' : 'parallel', pages: m.pages, fields: fields, pdf: b64FromBytes(m.bytes),
            message: 'Welcome to ENESMA Realty! Please review and sign your onboarding documents.', recipients: Object.keys(who).map(function (k) { return who[k]; }) });
          toast('Onboarding packet sent'); go('#/envelope/' + d2.envelope.id);
        } catch (e) { busy(btn, false); msg.appendChild(errBox(e.message)); }
      }
    }).catch(function (e) { fatal(e, ROUTES.onboarding); });
  };

  /* ---------- documents ---------- */
  ROUTES.documents = function () {
    var st = { view: S.docView || 'all', scope: S.docScope || 'mine', q: '' }, D = null;
    var side = h('div', { class: 'side' }), listEl = h('div'), headAct = h('div', { class: 'toolbar', style: { margin: 0 } });
    function load() { clear(listEl).appendChild(h('div', { class: 'loading' }, 'Loading documents…')); api('listDocuments', { scope: st.scope === 'all' ? 'all' : '' }).then(function (d) { D = d; draw(); }).catch(function (e) { clear(listEl).appendChild(errBox(e.message)); }); }
    function inView(doc) {
      if (st.view === 'archived') return doc.archived; if (doc.archived) return false;
      if (st.view === 'all') return true; if (st.view === 'unfiled') return !doc.folderId || !D.folders.some(function (f) { return f.id === doc.folderId; }); return doc.folderId === st.view;
    }
    function draw() {
      clear(side); clear(listEl); clear(headAct); if (!D) return;
      var cnt = function (v) { var s = st.view; st.view = v; var n = D.documents.filter(inView).length; st.view = s; return n; };
      function sb(v, label) { return h('button', { type: 'button', class: st.view === v ? 'on' : '', onclick: function () { st.view = S.docView = v; draw(); } }, h('span', null, label), h('span', { class: 'n' }, cnt(v))); }
      add(side, [sb('all', 'All documents'), sb('unfiled', 'Unfiled'), h('hr'), D.folders.map(function (f) { return sb(f.id, '📁 ' + f.name); }),
        h('button', { type: 'button', onclick: newFolder }, h('span', null, '+ New folder')), h('hr'), sb('archived', 'Archived')]);
      var folder = D.folders.filter(function (f) { return f.id === st.view; })[0];
      if (folder) add(headAct, [h('button', { class: 'btn sm plain', type: 'button', onclick: function () { promptBox('Rename folder', 'Folder name', folder.name).then(function (n) { if (n) api('saveFolder', { id: folder.id, name: n }).then(function () { load(); }).catch(function (e) { toast(e.message); }); }); } }, 'Rename folder'),
        h('button', { class: 'btn sm plain', type: 'button', onclick: function () { confirmBox('Delete folder “' + folder.name + '”?', 'The folder is removed. The documents in it are NOT deleted — they move back to Unfiled.', 'Delete folder', true).then(function (ok) { if (ok) api('deleteFolder', { id: folder.id }).then(function (r) { toast('Folder deleted · ' + r.moved + ' document' + (r.moved === 1 ? '' : 's') + ' moved to Unfiled'); st.view = S.docView = 'unfiled'; load(); }).catch(function (e) { toast(e.message); }); }); } }, 'Delete folder')]);
      var q = st.q.toLowerCase(), rows = D.documents.filter(inView).filter(function (d) { return !q || (d.name + ' ' + d.signers + ' ' + d.ownerName).toLowerCase().indexOf(q) >= 0; });
      if (!rows.length) return listEl.appendChild(h('div', { class: 'list' }, h('div', { class: 'empty' }, h('b', null, D.documents.length ? 'Nothing here' : 'No signed documents yet'), D.documents.length ? (folder ? 'Move documents here from All documents.' : '') : 'Completed envelopes land here automatically.')));
      listEl.appendChild(h('div', { class: 'list' }, rows.map(function (d) {
        var mine = d.ownerId === S.user.id;
        var mv = mine ? h('select', { 'aria-label': 'Move to folder', style: { width: 'auto', minHeight: '36px', padding: '4px 30px 4px 10px', fontSize: '14px' }, onchange: function (e) { api('moveDocument', { id: d.id, folderId: e.target.value }).then(function () { toast('Moved'); load(); }).catch(function (er) { toast(er.message); }); } },
          h('option', { value: '', selected: !d.folderId }, 'Unfiled'), D.folders.map(function (f) { return h('option', { value: f.id, selected: d.folderId === f.id }, f.name); })) : null;
        return h('div', { class: 'item' }, h('div', { style: { minWidth: 0 } }, h('div', { class: 't' }, d.name), h('div', { class: 'm' }, 'Signed by ' + (d.signers || '—') + (st.scope === 'all' ? ' · ' + d.ownerName : '')),
          h('div', { class: 'm' }, 'Completed ' + fmt(d.completedAt, false) + ' · auto-deletes ' + fmt(d.deleteAfter, false))),
          h('div', { class: 'r' }, h('button', { class: 'btn sm', type: 'button', onclick: function (ev) { var b = ev.currentTarget; busy(b, true, '…'); api('getDocumentPdf', { id: d.id }).then(function (x) { busy(b, false); downloadPdf(x.name, x.pdf); }).catch(function (er) { busy(b, false); toast(er.message); }); } }, 'Download'), mv,
            mine || isAdmin() ? h('button', { class: 'btn sm plain', type: 'button', onclick: function () { api('archiveDocument', { id: d.id, archived: !d.archived }).then(function () { toast(d.archived ? 'Restored from archive' : 'Archived'); load(); }).catch(function (er) { toast(er.message); }); } }, d.archived ? 'Unarchive' : 'Archive') : null,
            D.canDelete ? h('button', { class: 'btn sm plain', type: 'button', style: { color: '#9A0007' }, onclick: function () { confirmBox('Delete document?', '“' + d.name + '” and its signed PDF will be permanently deleted for everyone. This can’t be undone.', 'Delete permanently', true).then(function (ok) { if (ok) api('deleteDocument', { id: d.id }).then(function () { toast('Document deleted'); load(); }).catch(function (er) { toast(er.message); }); }); } }, 'Delete') : null));
      })));
    }
    function newFolder() { promptBox('New folder', 'Folder name', '', 'Create').then(function (n) { if (n) api('saveFolder', { name: n }).then(function (r) { st.view = S.docView = r.folder.id; load(); }).catch(function (e) { toast(e.message); }); }); }
    var search = h('input', { type: 'search', placeholder: 'Search documents…', 'aria-label': 'Search documents', oninput: function () { st.q = search.value; draw(); } });
    var scope = isAdmin() ? h('div', { class: 'seg' }, [['mine', 'Mine'], ['all', 'All agents']].map(function (s) { return h('button', { type: 'button', class: st.scope === s[0] ? 'on' : '', onclick: function (e) { st.scope = S.docScope = s[0]; Array.prototype.forEach.call(e.currentTarget.parentNode.children, function (b) { b.className = ''; }); e.currentTarget.className = 'on'; load(); } }, s[1]); })) : null;
    add($app, [h('div', { class: 'head' }, h('div', null, h('span', { class: 'rule' }), h('h1', null, 'Documents'), h('p', { class: 'sub' }, 'Every completed packet, with its Certificate of Completion. Kept for 3 years, then deleted automatically.')), headAct),
      h('div', { class: 'toolbar' }, search, scope), h('div', { class: 'split' }, side, listEl)]);
    load();
  };

  /* ---------- signer page (no login; per-signer token) ---------- */
  function clientIp() {
    var ctl = 'AbortController' in window ? new AbortController() : null, t = setTimeout(function () { if (ctl) ctl.abort(); }, 3000);
    return fetch('https://api.ipify.org?format=json', { signal: ctl && ctl.signal, credentials: 'omit', cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { clearTimeout(t); return String(j.ip || ''); }).catch(function () { return ''; });
  }
  ROUTES.sign = function (r) {
    var token = r.arg, ip = '', X = null, vals = {}, adopted = { signature: '', initials: '' };
    loading('Opening your documents…');
    clientIp().then(function (v) { ip = v; return api('signLoad', { token: token, ip: ip, userAgent: navigator.userAgent.slice(0, 250) }); }).then(function (d) { X = d; route(); })
      .catch(function (e) { clear($app); $app.appendChild(h('div', { class: 'done-hero' }, h('img', { src: 'assets/esign-logo-light.svg', alt: 'ENESMA E-Sign', style: { width: '200px', margin: '0 auto 20px', display: 'block' } }), errBox(e.message))); });
    function route() { if (X.signer.status === 'signed' || X.completed) return doneView(); consentView(); }
    function hero(title, text, extra) { clear($app); $app.appendChild(h('div', { class: 'done-hero' }, h('div', { class: 'tick' }, svg(I.tick)), h('h1', null, title), h('p', { class: 'sub' }, text), extra || null)); }
    function doneView(justSigned, all) {
      var dl = h('button', { class: 'btn red', type: 'button', onclick: function () { busy(dl, true, 'Preparing…'); api('signDownload', { token: token }).then(function (d) { busy(dl, false); downloadPdf(d.name + ' - Signed', d.pdf); }).catch(function (e) { busy(dl, false); toast(e.message); }); } }, 'Download signed PDF');
      var dc = h('button', { class: 'btn ghost', type: 'button', onclick: function () { busy(dc, true, 'Preparing…'); api('signDownload', { token: token, certificate: true }).then(function (d) { busy(dc, false); downloadPdf(d.name + ' - Certificate', d.pdf); }).catch(function (e) { busy(dc, false); toast(e.message); }); } }, 'Certificate PDF');
      if (X.completed) return hero('All signed', '“' + X.envelope.name + '” is complete. Download the signed copy and its Certificate of Completion.', h('div', { class: 'acts-row' }, dl, dc));
      hero(justSigned ? 'Thank you, ' + X.signer.name.split(' ')[0] + '!' : 'You already signed', all ? 'Everyone has signed. You’ll get an email with the signed PDF and Certificate of Completion in a minute or two.' : 'Your signature is saved. When everyone has signed, you’ll get an email with the final signed PDF.');
    }
    function consentView() {
      clear($app); var cb = h('input', { type: 'checkbox', id: 'cons' }), go2 = h('button', { class: 'btn red wide', type: 'button', disabled: true, onclick: docView }, 'Review & sign');
      cb.addEventListener('change', function () { go2.disabled = !cb.checked; });
      $app.appendChild(h('div', { class: 'consent card' }, h('img', { src: 'assets/esign-logo-light.svg', alt: 'ENESMA E-Sign', style: { width: '180px', display: 'block', marginBottom: '16px' } }),
        h('h1', { style: { fontSize: '22px' } }, X.envelope.name), h('p', { class: 'sub' }, X.envelope.sender + ' (' + X.envelope.senderEmail + ') sent you documents to review and sign.'),
        X.envelope.message ? h('div', { class: 'ok', style: { whiteSpace: 'pre-wrap' } }, X.envelope.message) : null,
        h('p', { class: 'hint' }, 'Signing as ', h('b', null, X.signer.name + ' · ' + X.signer.email), '. ' + X.fields.filter(isReq).length + ' required field' + (X.fields.filter(isReq).length === 1 ? '' : 's') + ' to complete.'),
        h('label', { class: 'check', for: 'cons', style: { margin: '16px 0' } }, cb, h('span', null, 'I agree to use electronic records and signatures for these documents, and that my electronic signature is the legal equivalent of my handwritten signature (ESIGN Act / UETA). I can download a copy, and I may ask the sender for a paper copy.')),
        go2, h('p', { style: { textAlign: 'center', marginTop: '14px' } }, h('button', { class: 'link', type: 'button', onclick: decline }, 'Decline to sign'))));
    }
    function decline() {
      var rs = h('textarea', { maxlength: 300, placeholder: 'Let the sender know why (optional)' }), msg = h('div');
      var b = h('button', { class: 'btn red', type: 'button', onclick: function () { busy(b, true); api('signDecline', { token: token, reason: rs.value.trim() }).then(function () { closeModal(); clear($app); $app.appendChild(h('div', { class: 'done-hero' }, h('h1', null, 'You declined'), h('p', { class: 'sub' }, 'We let ' + X.envelope.sender + ' know. You can close this page.'))); }).catch(function (e) { busy(b, false); clear(msg).appendChild(errBox(e.message)); }); } }, 'Decline');
      openModal('Decline to sign?', h('div', null, h('p', { class: 'sub' }, 'The envelope is cancelled for everyone and the sender is notified.'), h('div', { class: 'f' }, rs), msg, h('div', { class: 'actions' }, b, h('button', { class: 'btn plain', type: 'button', onclick: closeModal }, 'Cancel'))));
    }
    var today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'America/Los_Angeles' });
    function docView() {
      clear($app); $app.className = 'wide';
      var pagesEl = h('div', { class: 'pages' }), prog = h('span', { class: 'p' }), nextB = h('button', { class: 'btn', type: 'button', onclick: nextField }, 'Next field'), fin = h('button', { class: 'btn red', type: 'button', onclick: finish }, 'Finish');
      add($app, [h('div', { class: 'sbar' }, h('div', { class: 't' }, h('b', null, X.envelope.name), h('span', null, 'From ' + X.envelope.sender)), h('button', { class: 'link', type: 'button', onclick: decline }, 'Decline')),
        h('div', { class: 'sdoc' }, pagesEl), h('div', { class: 'sfoot' }, prog, nextB, fin)]);
      var els = [];
      renderPdf(bytesFromB64(X.pdf), pagesEl).then(function (pages) {
        X.fields.forEach(function (f) { var p = pages[f.page - 1]; if (!p) return; var el = h('div', { class: 'sfld', onclick: function (e) { tapField(el, e); }, style: { left: f.x * 100 + '%', top: f.y * 100 + '%', width: f.w * 100 + '%', height: f.h * 100 + '%' } }); el._f = f; p.el.appendChild(el); els.push(el); paint(el); });
        update();
      }).catch(function (e) { pagesEl.appendChild(errBox('Could not open the document: ' + e.message)); });
      function need(f) { return isReq(f); }
      function filled(f) { if (f.type === 'signature' || f.type === 'initials') return !!adopted[f.type] && (need(f) || !!vals[f.id]); if (f.type === 'date' || f.type === 'name' || f.type === 'email') return true; if (f.type === 'checkbox') return !!vals[f.id]; return !!String(vals[f.id] || '').trim(); }
      function paint(el) {
        var f = el._f; clear(el); el.className = 'sfld ' + (filled(f) ? 'done' : need(f) ? 'need' : 'opt');
        if (!need(f) && !filled(f)) el.appendChild(h('span', { class: 'optl' }, 'Optional'));
        if (f.type === 'signature' || f.type === 'initials') {
          el.appendChild(h('button', { class: 'sg', type: 'button', 'aria-label': FT[f.type][0] + (need(f) ? '' : ' (optional)') }, filled(f) ? h('img', { src: adopted[f.type], alt: FT[f.type][0] }) : (f.type === 'signature' ? 'Sign here' : 'Initial')));
        } else if (f.type === 'date') el.appendChild(h('span', { class: 'auto' }, today));
        else if (f.type === 'name') el.appendChild(h('span', { class: 'auto' }, X.signer.name));
        else if (f.type === 'email') el.appendChild(h('span', { class: 'auto' }, X.signer.email));
        else if (f.type === 'checkbox') el.appendChild(h('input', { type: 'checkbox', 'aria-label': f.label || 'Checkbox', checked: !!vals[f.id], onclick: function (e) { e.stopPropagation(); }, onchange: function (e) { vals[f.id] = e.target.checked; el.className = 'sfld ' + (filled(f) ? 'done' : need(f) ? 'need' : 'opt'); update(); } }));
        else { var inp = h('input', { type: 'text', maxlength: 300, value: vals[f.id] || '', placeholder: f.label || (f.type !== 'text' ? FT[f.type][0] : f.required ? 'Required' : 'Optional'), 'aria-label': f.label || FT[f.type][0], oninput: function () { vals[f.id] = inp.value; el.className = 'sfld ' + (filled(f) ? 'done' : need(f) ? 'need' : 'opt'); update(); } }); el.appendChild(inp); }
      }
      function todo() { return els.filter(function (el) { return need(el._f) && !filled(el._f); }); }
      function update() { var t = todo(), n = els.filter(function (el) { return need(el._f); }).length; prog.textContent = t.length ? (n - t.length) + ' of ' + n + ' required fields done' : 'All set — tap Finish to sign.'; nextB.classList.toggle('hidden', !t.length); fin.disabled = !!t.length; }
      function nextField() { var t = todo()[0]; if (!t) return; els.forEach(function (e) { e.classList.remove('cur'); }); t.classList.add('cur'); t.scrollIntoView({ behavior: 'smooth', block: 'center' }); var i = t.querySelector('input,button'); if (i) setTimeout(function () { i.focus({ preventScroll: true }); }, 350); }
      // Mouse / tap anywhere on a field acts on it (not only keyboard).
      function tapField(el, e) {
        var f = el._f; els.forEach(function (x) { x.classList.remove('cur'); });
        if (f.type === 'signature' || f.type === 'initials') { e.preventDefault(); if (adopted[f.type] && !need(f) && !vals[f.id]) { vals[f.id] = '1'; paint(el); update(); } else adopt(f.type, f); }
        else if (f.type === 'checkbox') { if (e.target.tagName === 'INPUT') return; vals[f.id] = !vals[f.id]; paint(el); update(); }
        else { var i = el.querySelector('input'); if (i && e.target !== i) i.focus(); }
      }
      function adopt(kind, f0) {
        signaturePad(kind, X.signer.name, function (png) { adopted[kind] = png; if (f0 && !need(f0)) vals[f0.id] = '1'; els.forEach(function (el) { if (el._f.type === kind) paint(el); }); update(); });
      }
      function finish() {
        if (todo().length) return nextField();
        busy(fin, true, 'Signing…');
        api('signSubmit', { token: token, values: vals, signature: adopted.signature, initials: adopted.initials, consent: true, ip: ip, userAgent: navigator.userAgent.slice(0, 250) })
          .then(function (d) { $app.className = ''; doneView(true, d.allSigned); }).catch(function (e) { busy(fin, false); toast(e.message); });
      }
    }
  };
  /** Adopt a signature or initials: draw or type (Great Vibes). Calls cb(pngDataUrl). */
  function signaturePad(kind, name, cb) {
    var isSig = kind === 'signature', mode = 'type', W = isSig ? 600 : 300, H = isSig ? 180 : 150;
    var txt = h('input', { type: 'text', maxlength: 60, value: isSig ? name : initials(name), 'aria-label': isSig ? 'Your name' : 'Your initials' });
    var prev = h('div', { class: 'typed' }); function upd() { prev.textContent = txt.value || ' '; } txt.addEventListener('input', upd); upd();
    var cv = h('canvas'), pad = h('div', { class: 'pad' }, cv, h('div', { class: 'base' }), h('button', { class: 'btn sm plain clr', type: 'button', onclick: function () { strokes = []; redraw(); } }, 'Clear'));
    var strokes = [], cur = null, ctx = cv.getContext('2d');
    function fit() { var r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); redraw(); }
    function redraw() { var d = cv.width / (cv.getBoundingClientRect().width || 1); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#000007'; ctx.lineWidth = 2.6;
      strokes.forEach(function (s) { ctx.beginPath(); s.forEach(function (p, i) { if (!i) ctx.moveTo(p[0], p[1]); else { var q = s[i - 1]; ctx.quadraticCurveTo(q[0], q[1], (q[0] + p[0]) / 2, (q[1] + p[1]) / 2); } }); if (s.length === 1) ctx.lineTo(s[0][0] + 0.1, s[0][1] + 0.1); ctx.stroke(); }); }
    function pt(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = [pt(e)]; strokes.push(cur); redraw(); });
    cv.addEventListener('pointermove', function (e) { if (!cur) return; cur.push(pt(e)); redraw(); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { cv.addEventListener(ev, function () { cur = null; }); });
    var typeBox = h('div', null, h('div', { class: 'f' }, h('label', null, isSig ? 'Type your name' : 'Type your initials'), txt), prev), drawBox = h('div', { class: 'hidden' }, h('p', { class: 'hint', style: { marginTop: 0 } }, 'Draw with your finger, mouse or stylus.'), pad);
    var seg = h('div', { class: 'seg', style: { marginBottom: '14px' } }, [['type', 'Type'], ['draw', 'Draw']].map(function (m) { return h('button', { type: 'button', class: m[0] === mode ? 'on' : '', onclick: function (e) { mode = m[0]; Array.prototype.forEach.call(seg.children, function (b) { b.className = ''; }); e.currentTarget.className = 'on'; typeBox.classList.toggle('hidden', mode !== 'type'); drawBox.classList.toggle('hidden', mode !== 'draw'); if (mode === 'draw') setTimeout(fit, 20); } }, m[1]); }));
    var msg = h('div');
    var ok = h('button', { class: 'btn red', type: 'button', onclick: function () {
      clear(msg); var out = document.createElement('canvas'), o = out.getContext('2d'); out.width = W; out.height = H;
      if (mode === 'type') {
        var t = txt.value.trim(); if (!t) return msg.appendChild(errBox('Type your ' + (isSig ? 'name' : 'initials') + '.'));
        var fs = H * 0.62; o.font = fs + 'px "Great Vibes"'; while (o.measureText(t).width > W - 30 && fs > 20) { fs -= 2; o.font = fs + 'px "Great Vibes"'; }
        o.fillStyle = '#000007'; o.textBaseline = 'middle'; o.fillText(t, 15, H * 0.55);
      } else {
        if (!strokes.length) return msg.appendChild(errBox('Draw your ' + (isSig ? 'signature' : 'initials') + '.'));
        var b = cropBox(cv); if (!b) return msg.appendChild(errBox('Draw your ' + (isSig ? 'signature' : 'initials') + '.'));
        var sc = Math.min((W - 20) / b.w, (H - 20) / b.h); o.drawImage(cv, b.x, b.y, b.w, b.h, (W - b.w * sc) / 2, (H - b.h * sc) / 2, b.w * sc, b.h * sc);
      }
      var tb = cropBox(out); if (tb) { var c2 = document.createElement('canvas'); c2.width = tb.w + 8; c2.height = tb.h + 8; c2.getContext('2d').drawImage(out, tb.x, tb.y, tb.w, tb.h, 4, 4, tb.w, tb.h); out = c2; }
      closeModal(); cb(out.toDataURL('image/png'));
    } }, isSig ? 'Adopt and sign' : 'Adopt initials');
    var fontReady = document.fonts && document.fonts.load ? document.fonts.load('40px "Great Vibes"') : Promise.resolve();
    fontReady.then(function () { }, function () { });
    openModal(isSig ? 'Adopt your signature' : 'Adopt your initials', h('div', null, seg, typeBox, drawBox, msg, h('p', { class: 'hint' }, 'By selecting Adopt, I agree this mark is my electronic ' + (isSig ? 'signature' : 'initials') + ' for every ' + (isSig ? 'signature' : 'initials') + ' field in these documents.'), h('div', { class: 'actions' }, ok)), { sticky: true, noFocus: true });
  }
  function cropBox(c) {
    var w = c.width, hh = c.height, d = c.getContext('2d').getImageData(0, 0, w, hh).data, x0 = w, y0 = hh, x1 = -1, y1 = -1;
    for (var y = 0; y < hh; y++) for (var x = 0; x < w; x++) if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  /* ---------- boot ---------- */
  if (!handleOAuthReturn()) { if (!location.hash) history.replaceState(null, '', '#/'); render(); }
})();
