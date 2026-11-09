/* ENESMA Realty · Open House Dashboard. Agent sign-in is the Transaction Center username and password. */
(function () {
  'use strict';
  var $app = document.getElementById('app');
  var S = { user: null, addresses: null, kiosk: '' };
  var paint = 0;
  var tick = 0;

  function timeRange(item) {
    var a = window.OHLogic.fmtTime(item.startTime), b = window.OHLogic.fmtTime(item.endTime);
    if (!a) return '';
    return (b ? a + '–' + b : a).replace(/ /g, '\u00a0');
  }
  function h(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function api(action, params) { return window.OHApi.api(action, params); }
  function toast(msg, bad) {
    var t = document.createElement('div');
    t.className = 'toast' + (bad ? ' bad' : '');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, bad ? 6000 : 3200);
  }
  function uName(u) {
    if (!u) return '';
    var fl = [u.firstName, u.lastName].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' ');
    return fl || u.name || u.email || u.username || '';
  }
  function initials(n) { return String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join('').toUpperCase(); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function shiftIso(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function dayWord(iso) {
    if (iso === todayIso()) return 'Today';
    if (iso === shiftIso(1)) return 'Tomorrow';
    if (iso === shiftIso(-1)) return 'Yesterday';
    return window.OHLogic.fmtDay(iso);
  }
  function titleMark(size, tone) {
    return '<span class="oh-title ' + size + ' ' + tone + '" role="img" aria-label="Open House Dashboard"><span class="oh-t1" aria-hidden="true"><span class="w">Open</span><span class="w">House</span></span><span class="oh-t2" aria-hidden="true">Dashboard</span></span>';
  }
  function cookieDomain() { return /(^|\.)enesmarealty\.com$/.test(location.hostname) ? '; Domain=.enesmarealty.com' : ''; }
  function getCookie(n) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function setCookie(n, v, maxAge) {
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = n + '=' + encodeURIComponent(v) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + secure + cookieDomain();
  }
  function clearCookie(n) {
    document.cookie = n + '=; Path=/; Max-Age=0; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '') + cookieDomain();
  }
  function storeToken(tok) {
    window.OHApi.setToken(tok || '');
    try { sessionStorage.removeItem('oh_t'); } catch (e) { /* ignore */ }
    if (tok) {
      try { sessionStorage.setItem('oh_t', tok); } catch (e2) { /* ignore */ }
      setCookie('enesma_sso', tok, 24 * 60 * 60);
    } else clearCookie('enesma_sso');
  }
  function signOutLocal() {
    storeToken('');
    S.user = null;
    unlockKiosk();
  }
  function mode() { return window.OHApi.mode(); }
  function publicUrl(key) {
    var base = location.origin + location.pathname.replace(/[^/]*$/, '');
    var q = 'k=' + encodeURIComponent(key);
    if (mode() === 'demo') q += '&demo=1';
    return base + 'sign.html?' + q;
  }
  function lockKiosk(id) { S.kiosk = id; try { sessionStorage.setItem('oh_kiosk', id); } catch (e) { /* ignore */ } }
  function unlockKiosk() { S.kiosk = ''; try { sessionStorage.removeItem('oh_kiosk'); } catch (e) { /* ignore */ } }
  function clearTick() { if (tick) clearInterval(tick); tick = 0; }

  function shell(active, inner) {
    var banner = mode() === 'demo'
      ? '<div class="demo"><b>DEMO PREVIEW</b> · sample data stays in this browser · agent@demo.test / demo · <a href="#" id="exitDemo">exit demo</a></div>'
      : mode() === 'local'
        ? '<div class="demo"><b>THIS BROWSER ONLY</b> · add the Open House web app URL before visitors use a QR code on their own phones</div>'
        : '';
    var nav = '<a href="#/" class="' + (active === 'home' || active === 'house' ? 'on' : '') + '">Open Houses</a><a href="#/new" class="' + (active === 'new' ? 'on' : '') + '">New</a>';
    return banner + '<header id="hdr"><button class="nbtn" id="nbtn" type="button" aria-label="Menu" aria-expanded="false" aria-controls="mnav"><span></span><span></span><span></span></button>' +
      '<a class="brand" href="#/" aria-label="Open House Dashboard Home">' + titleMark('oh-sm', 'oh-on-dark') + '</a>' +
      '<nav class="main" id="mnav" aria-label="Main">' + nav + '</nav><div class="hspace"></div>' +
      '<a class="hub" href="https://agent.enesmarealty.com">Agent Hub</a>' +
      '<div class="umenu"><button class="ubtn" id="ubtn" type="button" aria-label="Account">' + h(initials(uName(S.user))) + '</button>' +
      '<div class="udrop hidden" id="udrop"><div class="who"><b>' + h(uName(S.user)) + '</b>' + h(S.user.email || S.user.username || '') + '</div>' +
      '<a href="https://app.enesmarealty.com/transactions/#/account">Change Password</a><button type="button" id="signout">Sign Out</button></div></div></header><main>' + inner + '</main>';
  }
  function wireShell() {
    var exit = qs('#exitDemo');
    if (exit) exit.onclick = function (e) { e.preventDefault(); try { sessionStorage.removeItem('oh_demo'); } catch (err) { /* ignore */ } signOutLocal(); location.href = location.pathname; };
    var nb = qs('#nbtn');
    if (nb) nb.onclick = function () { var open = document.getElementById('hdr').classList.toggle('navopen'); nb.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    var ub = qs('#ubtn');
    if (ub) ub.onclick = function (e) { e.stopPropagation(); qs('#udrop').classList.toggle('hidden'); };
    var so = qs('#signout');
    if (so) so.onclick = function () {
      api('logout').catch(function () { /* still leave locally */ });
      signOutLocal();
      location.hash = '#/';
      render();
    };
  }
  document.addEventListener('click', function (e) {
    if (!e.target.closest || !e.target.closest('.umenu')) { var u = qs('#udrop'); if (u) u.classList.add('hidden'); }
  });

  function loading() { $app.innerHTML = '<div class="loading"><span class="spin"></span>Loading…</div>'; }
  function failView(err) {
    $app.innerHTML = shell('', '<div class="err" role="alert">' + h(err && err.message ? err.message : 'Something went wrong.') + '</div>');
    wireShell();
  }

  function loginView(msg) {
    $app.innerHTML = '<div class="login"><form class="box" id="lf" autocomplete="on"><div class="mark">' + titleMark('oh-lg', 'oh-on-light') + '</div>' +
      (msg ? '<div class="err" role="alert">' + h(msg) + '</div>' : '') +
      (mode() === 'demo' ? '<div class="ok">Demo preview. Username <b>agent@demo.test</b>, password <b>demo</b>.</div>' : '') +
      '<div class="f"><label for="lu">Username</label><input id="lu" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" required></div>' +
      '<div class="f"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn" id="lb" type="submit">Sign in</button><p class="fine"><a href="#" id="lc">First Time or Forgot Password?</a><br>Same sign-in as Transaction Center.</p></form></div>';
    qs('#lc').onclick = function (e) { e.preventDefault(); codeView(qs('#lu').value.trim()); };
    qs('#lf').onsubmit = function (e) {
      e.preventDefault();
      var b = qs('#lb'); b.disabled = true; b.textContent = 'Signing in…';
      var username = qs('#lu').value.trim().toLowerCase();
      api('login', { email: username, username: username, password: qs('#lp').value, deviceToken: getCookie('enesma_dt') || '' }).then(function (d) {
        if (d && d.needsOtp) return otpView(d);
        return finishLogin(d);
      }).catch(function (err) { loginView(err.message); qs('#lu').value = username; qs('#lp').focus(); });
    };
  }
  function finishLogin(d) {
    if (!d || !d.token) throw new Error('Sign-in did not complete. Please try again.');
    if (d.deviceToken) setCookie('enesma_dt', d.deviceToken, 30 * 24 * 60 * 60);
    storeToken(d.token);
    S.user = d.user;
    return afterSession().then(render);
  }
  function afterSession() {
    if (mode() === 'live' || !S.user) return Promise.resolve();
    return api('bindSession', { user: S.user }).catch(function () { return null; });
  }
  function otpView(ch, msg) {
    var hint = (ch && ch.emailHint) || 'your account email';
    $app.innerHTML = '<div class="login"><form class="box" id="of"><div class="mark">' + titleMark('oh-lg', 'oh-on-light') + '</div>' +
      '<h2>Enter Your Sign-In Code</h2><p class="sub">We emailed a 6-digit code to <b>' + h(hint) + '</b>.</p>' +
      (msg ? '<div class="err" role="alert">' + h(msg) + '</div>' : '') +
      '<div class="f"><label for="oc">Code</label><input id="oc" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></div>' +
      '<button class="btn" type="submit">Verify and Sign in</button><p class="fine"><a href="#" id="obk">Back to Sign in</a></p></form></div>';
    qs('#obk').onclick = function (e) { e.preventDefault(); loginView(); };
    qs('#of').onsubmit = function (e) {
      e.preventDefault();
      api('verifyLoginOtp', { challengeId: ch.challengeId, code: qs('#oc').value.trim(), rememberDevice: true, deviceLabel: (navigator.userAgent || '').slice(0, 120) })
        .then(finishLogin).catch(function (err) { otpView(ch, err.message); });
    };
  }
  function codeView(email, step, msg) {
    var two = step === 2;
    $app.innerHTML = '<div class="login"><form class="box" id="cf"><div class="mark">' + titleMark('oh-lg', 'oh-on-light') + '</div>' +
      '<h2>' + (two ? 'Enter Your Code' : 'Set Up or Reset Your Password') + '</h2>' +
      (msg ? '<div class="err" role="alert">' + h(msg) + '</div>' : '') +
      (two
        ? '<input type="hidden" id="ce" value="' + h(email) + '"><div class="f"><label for="cc">Code</label><input id="cc" inputmode="numeric" maxlength="6" required></div><div class="f"><label for="c1">New Password</label><input id="c1" type="password" minlength="10" required></div><div class="f"><label for="c2">Repeat New Password</label><input id="c2" type="password" required></div>'
        : '<div class="f"><label for="ce">Username</label><input id="ce" type="text" autocomplete="username" value="' + h(email || '') + '" required></div>') +
      '<button class="btn" type="submit">' + (two ? 'Save Password and Sign in' : 'Email Me a Code') + '</button><p class="fine"><a href="#" id="cbk">Back to Sign in</a></p></form></div>';
    qs('#cbk').onclick = function (e) { e.preventDefault(); loginView(); };
    qs('#cf').onsubmit = function (e) {
      e.preventDefault();
      var em = qs('#ce').value.trim().toLowerCase();
      if (!two) {
        api('requestPasswordCode', { email: em }).then(function () { codeView(em, 2, ''); }).catch(function (err) { codeView(em, 1, err.message); });
        return;
      }
      var p1 = qs('#c1').value;
      if (p1 !== qs('#c2').value) return codeView(em, 2, 'The new passwords do not match.');
      api('resetPasswordWithCode', { email: em, code: qs('#cc').value.trim(), newPassword: p1 }).then(finishLogin).catch(function (err) { codeView(em, 2, err.message); });
    };
  }
  function passwordView() {
    $app.innerHTML = shell('', '<h1>Set Your Password</h1><p class="sub">Choose a password before continuing. At least 10 characters with letters and numbers.</p>' +
      '<form class="card gb" id="pf"><div id="pe"></div><div class="f"><label for="p0">Current Password</label><input id="p0" type="password" required></div>' +
      '<div class="f"><label for="p1">New Password</label><input id="p1" type="password" required></div>' +
      '<div class="f"><label for="p2">Repeat New Password</label><input id="p2" type="password" required></div>' +
      '<div class="actions"><button class="btn" type="submit">Save Password</button></div></form>');
    wireShell();
    qs('#pf').onsubmit = function (e) {
      e.preventDefault();
      if (qs('#p1').value !== qs('#p2').value) { qs('#pe').innerHTML = '<div class="err">The new passwords do not match.</div>'; return; }
      api('changePassword', { current: qs('#p0').value, newPassword: qs('#p1').value }).then(function (d) {
        if (d.token) storeToken(d.token);
        S.user = d.user;
        toast('Password saved.');
        render();
      }).catch(function (err) { qs('#pe').innerHTML = '<div class="err">' + h(err.message) + '</div>'; });
    };
  }

  function syncGuests(list, house) {
    var n = 0, i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve(n);
      var g = list[i++];
      return window.OHSync.syncGuest(api, g, house).then(function () { n++; return next(); }).catch(function () { return next(); });
    }
    return next();
  }
  function syncHouses(houses) {
    var queue = (houses || []).filter(function (item) { return item.pendingCount > 0; });
    var i = 0, changed = false;
    function next() {
      if (i >= queue.length) return Promise.resolve(changed);
      var id = queue[i++].id;
      return api('getHouse', { id: id }).then(function (d) {
        var pending = (d.guests || []).filter(function (g) { return g.crmStatus !== 'synced'; });
        return syncGuests(pending, d.house);
      }).then(function (n) { if (n) changed = true; return next(); }).catch(function () { return next(); });
    }
    return next();
  }

  function dashView() {
    var gen = ++paint;
    loading();
    api('listHouses').then(function (d) {
      if (gen !== paint) return;
      drawDash(d.houses || []);
      syncHouses(d.houses || []).then(function (changed) {
        if (changed && gen === paint && (location.hash === '' || location.hash === '#/' || location.hash === '#')) dashView();
      });
    }).catch(failView);
  }
  function drawDash(houses) {
    var open = houses.filter(function (item) { return item.status === 'open'; }).length;
    var guests = houses.reduce(function (n, item) { return n + (item.guestCount || 0); }, 0);
    var crm = houses.reduce(function (n, item) { return n + (item.crmCount || 0); }, 0);
    var cards = houses.length ? houses.map(function (item) {
      var line = window.OHLogic.addressLine(item);
      return '<a class="hcard gb" href="#/h/' + h(item.id) + '"><div class="pills"><span class="pill ' + (item.status === 'open' ? 'p-ok' : 'p-dark') + '">' + (item.status === 'open' ? 'Open' : 'Closed') + '</span>' +
        '<span class="pill p-pend">' + h(dayWord(item.date)) + '</span></div><h2>' + h(item.address || line) + '</h2><p>' + h([item.city, [item.state, item.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ')) + '</p>' +
        '<p class="meta">' + h(window.OHLogic.fmtDay(item.date)) + (timeRange(item) ? '<br>' + timeRange(item) : '') + '</p><p class="count"><b>' + item.guestCount + '</b> ' + (item.guestCount === 1 ? 'guest' : 'guests') + ' · <b>' + item.crmCount + '</b> in CRM' +
        (item.pendingCount ? ' · <span class="wait">' + item.pendingCount + ' waiting</span>' : '') + '</p></a>';
    }).join('') : '<div class="empty gb"><h2>No Open Houses Yet</h2><p>Start a sign-in sheet with the property address. You can type it, or pick it from your Transaction Center files.</p><a class="btn" href="#/new">New Open House</a></div>';
    $app.innerHTML = shell('home', '<div class="top"><div><h1>Open Houses</h1><p class="sub">Sign-in sheets for your open houses. Every guest is saved here and sent to your CRM.</p></div><a class="btn" href="#/new">New Open House</a></div>' +
      '<div class="stats"><div class="stat gb"><b>' + open + '</b><span>Open Now</span></div><div class="stat gb"><b>' + guests + '</b><span>Guests</span></div><div class="stat gb"><b>' + crm + '</b><span>In CRM</span></div></div>' +
      '<div class="f searchline"><label for="hq">Search History</label><input id="hq" type="search" placeholder="Address or city" autocomplete="off"></div>' +
      '<div class="houses" id="houses">' + cards + '</div>');
    wireShell();
    var q = qs('#hq');
    if (q) q.addEventListener('input', function () {
      var n = q.value.toLowerCase().trim();
      qsa('.hcard').forEach(function (card) { card.hidden = n && card.textContent.toLowerCase().indexOf(n) < 0; });
    });
  }

  function loadAddresses() {
    if (S.addresses) return Promise.resolve(S.addresses);
    return api('dashboard', { scope: 'personal' }).then(function (d) {
      S.addresses = (d.transactions || []).map(function (t) {
        var parsed = window.OHLogic.parseTitle(t.title || '');
        return { id: t.id, address: t.address || parsed.address, city: t.city || parsed.city, state: t.state || 'CA', zip: t.zip || parsed.zip || '', unit: t.unit || '' };
      }).filter(function (a) { return a.address && /\d/.test(a.address); });
      return S.addresses;
    }).catch(function () { S.addresses = []; return S.addresses; });
  }
  function houseForm(existing) {
    var x = existing || { state: 'CA', date: todayIso(), startTime: '13:00', endTime: '16:00' };
    $app.innerHTML = shell(existing ? 'house' : 'new', '<div class="top"><div><h1>' + (existing ? 'Edit Open House' : 'New Open House') + '</h1><p class="sub">Type the address, or choose one from your Transaction Center files.</p></div></div>' +
      '<form class="card gb" id="hf" autocomplete="off"><div id="he"></div><div class="fgrid">' +
      '<div class="f w3 combo"><label for="ha">Street Address <span class="req">*</span></label><input id="ha" required maxlength="120" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="hsug" aria-autocomplete="list" value="' + h(x.address || '') + '"><div class="sugg hidden" id="hsug" role="listbox"></div></div>' +
      '<div class="f"><label for="hu">Apt / Unit</label><input id="hu" maxlength="20" value="' + h(x.unit || '') + '"></div>' +
      '<div class="f"><label for="hc">City <span class="req">*</span></label><input id="hc" required maxlength="60" value="' + h(x.city || '') + '"></div>' +
      '<div class="f"><label for="hs">State</label><input id="hs" maxlength="2" value="' + h(x.state || 'CA') + '"></div>' +
      '<div class="f"><label for="hz">ZIP</label><input id="hz" inputmode="numeric" maxlength="10" value="' + h(x.zip || '') + '"></div>' +
      '<div class="f"><label for="hd">Date <span class="req">*</span></label><input id="hd" type="date" required value="' + h(x.date || '') + '"></div>' +
      '<div class="f"><label for="h1">Starts</label><input id="h1" type="time" value="' + h(x.startTime || '') + '"></div>' +
      '<div class="f"><label for="h2">Ends</label><input id="h2" type="time" value="' + h(x.endTime || '') + '"></div>' +
      '</div><div class="actions"><a class="ub" href="' + (existing ? '#/h/' + h(existing.id) : '#/') + '">Cancel</a><button class="btn" type="submit">' + (existing ? 'Save' : 'Create Sign-In Sheet') + '</button></div></form>');
    wireShell();
    var box = qs('#hsug'), input = qs('#ha'), open = false;
    function show(list) {
      if (!list.length) { box.classList.add('hidden'); input.setAttribute('aria-expanded', 'false'); return; }
      box.innerHTML = list.map(function (a, i) {
        var label = window.OHLogic.addressLine(a);
        return '<button type="button" role="option" data-i="' + i + '">' + h(label) + '</button>';
      }).join('');
      box.classList.remove('hidden');
      input.setAttribute('aria-expanded', 'true');
      box._list = list;
    }
    function pick(a) {
      if (!a) return;
      qs('#ha').value = a.address || '';
      if (a.unit) qs('#hu').value = a.unit;
      if (a.city) qs('#hc').value = a.city;
      if (a.state) qs('#hs').value = a.state;
      if (a.zip) qs('#hz').value = a.zip;
      box.classList.add('hidden');
      if (a.id) {
        api('getTransaction', { id: a.id }).then(function (d) {
          var t = (d && d.txn) || {};
          if (t.address) qs('#ha').value = t.address;
          if (t.city) qs('#hc').value = t.city;
          if (t.zip) qs('#hz').value = t.zip;
          var intake = t.intake || {};
          if (intake.unit) qs('#hu').value = intake.unit;
          if (intake.state) qs('#hs').value = intake.state;
        }).catch(function () { /* the typed line still stands */ });
      }
    }
    var timer;
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var q = input.value;
        loadAddresses().then(function (catalog) {
          var local = window.OHLogic.filterAddresses(catalog, q);
          if (q.trim().length < 2) return show(local);
          api('search', { q: q.trim() }).then(function (d) {
            var extra = (d.results || []).map(function (r) {
              var parsed = window.OHLogic.parseTitle(r.title || '');
              return { id: r.id, address: r.address || parsed.address, city: r.city || parsed.city, state: r.state || 'CA', zip: r.zip || '', unit: r.unit || '' };
            }).filter(function (a) { return a.address; });
            var seen = {}, merged = [];
            local.concat(extra).forEach(function (a) {
              var k = (a.id || window.OHLogic.addressLine(a)).toLowerCase();
              if (seen[k]) return;
              seen[k] = 1;
              merged.push(a);
            });
            show(merged.slice(0, 8));
          }).catch(function () { show(local); });
        });
      }, 180);
    });
    box.addEventListener('mousedown', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      e.preventDefault();
      pick((box._list || [])[Number(b.getAttribute('data-i'))]);
    });
    document.addEventListener('click', function (e) { if (!e.target.closest('.combo')) box.classList.add('hidden'); });
    qs('#hf').onsubmit = function (e) {
      e.preventDefault();
      var house = { address: qs('#ha').value, unit: qs('#hu').value, city: qs('#hc').value, state: qs('#hs').value, zip: qs('#hz').value, date: qs('#hd').value, startTime: qs('#h1').value, endTime: qs('#h2').value };
      var err = window.OHLogic.validateHouse(house);
      if (err) { qs('#he').innerHTML = '<div class="err" role="alert">' + h(err) + '</div>'; return; }
      qs('#hf button[type=submit]').disabled = true;
      api('saveHouse', { id: existing && existing.id, house: house }).then(function (r) {
        toast(existing ? 'Saved.' : 'Sign-in sheet ready.');
        location.hash = '#/h/' + r.house.id;
      }).catch(function (ex) { qs('#hf button[type=submit]').disabled = false; qs('#he').innerHTML = '<div class="err">' + h(ex.message) + '</div>'; });
    };
    loadAddresses();
  }

  function tagsHtml(guest, house) {
    return window.OHLogic.buildTags(guest, house).map(function (t) { return '<span class="tag">' + h(t) + '</span>'; }).join('');
  }
  function guestCard(guest, house) {
    var name = [guest.firstName, guest.lastName].filter(Boolean).join(' ');
    var crm = guest.crmStatus === 'synced' ? '<span class="pill p-ok">In CRM</span>' : '<span class="pill p-pend">CRM Pending</span>';
    return '<article class="guest gb"><div class="grow"><div class="pills">' + crm + '<span class="pill p-pend">' + h(window.OHLogic.displayOf(window.OHLogic.INTENT, guest.intent)) + '</span></div>' +
      '<h3>' + h(name) + '</h3><p>' + h(guest.phone) + (guest.email ? ' · ' + h(guest.email) : '') + '</p>' +
      '<p class="meta">' + h(window.OHLogic.VIA[guest.via] || 'Sign-In') + ' · ' + h(new Date(guest.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</p>' +
      '<div class="tags">' + tagsHtml(guest, house) + '</div>' +
      '<details><summary>CRM Note</summary><pre class="note">' + h(window.OHLogic.buildNote(guest, house)) + '</pre></details></div>' +
      (guest.crmStatus !== 'synced' ? '<button type="button" class="ub retry" data-g="' + h(guest.id) + '">Send to CRM</button>' : '') +
      (guest.crmError ? '<p class="errtext">' + h(guest.crmError) + '</p>' : '') + '</article>';
  }
  function houseView(id, skipSync) {
    var gen = ++paint;
    loading();
    api('getHouse', { id: id }).then(function (d) {
      if (gen !== paint) return;
      drawHouse(d);
      if (skipSync) return;
      var pending = (d.guests || []).filter(function (g) { return g.crmStatus !== 'synced'; });
      syncGuests(pending, d.house).then(function (n) { if (n && gen === paint && location.hash === '#/h/' + id) houseView(id, true); });
    }).catch(failView);
  }
  function drawHouse(d) {
    var house = d.house, guests = d.guests || [];
    var sheetHouse = { addressLine: house.addressLine, whenLabel: house.whenLabel, host: house.agentName };
    var actions = '<div class="actions start">' +
      (house.status === 'open' ? '<a class="btn" href="#/kiosk/' + h(house.id) + '">iPad Sign-In</a>' : '') +
      '<a class="ub" href="#/qr/' + h(house.id) + '">QR Code</a>' +
      '<a class="ub" href="#/h/' + h(house.id) + '/edit">Edit</a>' +
      (house.status === 'open' ? '<button type="button" class="ub" id="end">End Open House</button>' : '<button type="button" class="ub" id="reopen">Reopen</button>') +
      (!guests.length ? '<button type="button" class="ub danger" id="del">Delete</button>' : '') +
      '</div>';
    $app.innerHTML = shell('house', '<p class="crumb"><a href="#/">Open Houses</a></p><div class="top"><div><div class="pills"><span class="pill ' + (house.status === 'open' ? 'p-ok' : 'p-dark') + '">' + (house.status === 'open' ? 'Open' : 'Closed') + '</span><span class="pill p-pend">' + h(dayWord(house.date)) + '</span></div>' +
      '<h1>' + h(house.address) + '</h1><p class="sub">' + h(house.addressLine) + (house.whenLabel ? ' · ' + h(house.whenLabel) : '') + '</p></div></div>' + actions +
      (house.status === 'open' ? '<h2 class="sec">Sign-In Sheet</h2>' + window.OHSheet.html(sheetHouse) : '<div class="ok">This sign-in sheet is closed. Guests and CRM notes stay in the history below.</div>') +
      '<h2 class="sec">Guests <span class="countline">' + guests.length + '</span></h2>' +
      (guests.length ? '<div class="guestlist">' + guests.map(function (g) { return guestCard(g, house); }).join('') + '</div>' : '<div class="empty gb"><p>No guests yet. Use the sign-in sheet, hand the iPad to visitors, or show the QR code.</p></div>'));
    wireShell();
    if (house.status === 'open') {
      window.OHSheet.wire($app, function (guest) {
        return api('addGuest', { houseId: house.id, via: 'agent', guest: guest }).then(function (r) {
          return window.OHSync.syncGuest(api, r.guest, house).catch(function (err) { toast(err.message || 'Saved here. CRM will retry.', 1); });
        }).then(function () { toast('Guest signed in and sent to your CRM.'); houseView(house.id, true); });
      });
    }
    var end = qs('#end');
    if (end) end.onclick = function () { api('setHouseStatus', { id: house.id, status: 'closed' }).then(function () { toast('Open house ended.'); houseView(house.id, true); }).catch(function (e) { toast(e.message, 1); }); };
    var reopen = qs('#reopen');
    if (reopen) reopen.onclick = function () { api('setHouseStatus', { id: house.id, status: 'open' }).then(function () { toast('Sign-in is open again.'); houseView(house.id, true); }).catch(function (e) { toast(e.message, 1); }); };
    var del = qs('#del');
    if (del) del.onclick = function () {
      if (!confirm('Delete this empty open house?')) return;
      api('deleteHouse', { id: house.id }).then(function () { toast('Deleted.'); location.hash = '#/'; }).catch(function (e) { toast(e.message, 1); });
    };
    qsa('.retry').forEach(function (b) {
      b.onclick = function () {
        var g = guests.filter(function (x) { return x.id === b.getAttribute('data-g'); })[0];
        b.disabled = true;
        window.OHSync.syncGuest(api, g, house).then(function () { toast('Sent to CRM.'); houseView(house.id, true); }).catch(function (e) { b.disabled = false; toast(e.message, 1); });
      };
    });
  }

  function kioskView(id) {
    var gen = ++paint;
    clearTick();
    lockKiosk(id);
    loading();
    api('kioskSheet', { id: id }).then(function (sheet) {
      if (gen !== paint) return;
      if (sheet.status !== 'open') {
        unlockKiosk();
        location.hash = '#/h/' + id;
        return;
      }
      drawKiosk(id, sheet);
      tick = setInterval(function () { quietSync(id); }, 15000);
      quietSync(id);
    }).catch(function (err) { unlockKiosk(); failView(err); });
  }
  function quietSync(id) {
    return api('getHouse', { id: id }).then(function (d) {
      var pending = (d.guests || []).filter(function (g) { return g.crmStatus !== 'synced'; });
      return syncGuests(pending, d.house);
    }).catch(function () { return 0; });
  }
  function drawKiosk(id, sheet) {
    document.body.classList.add('kiosk-mode');
    $app.innerHTML = '<div class="kiosk"><div class="kbar"><span class="brand">' + titleMark('oh-sm', 'oh-on-dark') + '</span><button type="button" class="kiosk-exit" id="kexit">Agent</button></div>' +
      window.OHSheet.html(sheet) + '</div>';
    window.OHSheet.wire($app, function (guest) {
      return api('addGuest', { houseId: id, via: 'kiosk', guest: guest }).then(function (r) {
        return api('getHouse', { id: id }).then(function (d) {
          return window.OHSync.syncGuest(api, r.guest, d.house).catch(function () { /* the house page retries */ });
        });
      }).then(function () {
        qs('#sheetBody').innerHTML = window.OHSheet.thanks();
        setTimeout(function () { if (S.kiosk === id) kioskView(id); }, 3500);
      });
    });
    qs('#kexit').onclick = function () { kioskGate(id); };
  }
  function kioskGate(id) {
    var hold = document.createElement('div');
    hold.className = 'modal';
    hold.innerHTML = '<form class="box" id="kf"><h2>Back to the Dashboard</h2><p class="sub">Enter your password. The iPad stays on the sign-in sheet until you do.</p><div id="ke"></div>' +
      '<div class="f"><label for="kp">Password</label><input id="kp" type="password" autocomplete="current-password" required></div>' +
      '<div class="actions"><button type="button" class="ub" id="kx">Stay Here</button><button class="btn" type="submit">Continue</button></div></form>';
    document.body.appendChild(hold);
    qs('#kp', hold).focus();
    qs('#kx', hold).onclick = function () { hold.remove(); };
    hold.addEventListener('submit', function (e) {
      e.preventDefault();
      var username = (S.user.username || S.user.email || '').trim().toLowerCase();
      api('login', { email: username, username: username, password: qs('#kp', hold).value, deviceToken: getCookie('enesma_dt') || '' }).then(function (d) {
        if (d && d.needsOtp) { qs('#ke', hold).innerHTML = '<div class="err">A sign-in code was emailed. Finish that on the sign-in page. This iPad will stay on the sheet.</div>'; return; }
        if (d && d.token) storeToken(d.token);
        if (d && d.user) S.user = d.user;
        return afterSession().then(function () {
        hold.remove();
        unlockKiosk();
        document.body.classList.remove('kiosk-mode');
        location.hash = '#/h/' + id;
        });
      }).catch(function (err) { qs('#ke', hold).innerHTML = '<div class="err">' + h(err.message) + '</div>'; });
    });
  }

  function makeQr(url) {
    if (typeof qrcode !== 'function') return null;
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    var qr = qrcode(0, 'M');
    qr.addData(url);
    qr.make();
    return qr;
  }
  function qrSvg(url) {
    var qr = makeQr(url);
    if (!qr) return '<p>QR codes need the bundled library.</p>';
    var n = qr.getModuleCount(), margin = 4, s = n + margin * 2, d = '', r, c;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + margin) + ' ' + (r + margin) + 'h1v1h-1z';
    return '<svg class="qr" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + ' ' + s + '" shape-rendering="crispEdges" role="img" aria-label="QR code for this sign-in sheet"><rect width="100%" height="100%" fill="#fff"/><path fill="#000007" d="' + d + '"/></svg>';
  }
  function downloadQr(url, filename) {
    var qr = makeQr(url);
    if (!qr) return;
    var cell = 14, margin = cell * 4, n = qr.getModuleCount(), size = n * cell + margin * 2;
    var canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000007';
    var r, c;
    for (r = 0; r < n; r++) for (c = 0; c < n; c++) if (qr.isDark(r, c)) ctx.fillRect(margin + c * cell, margin + r * cell, cell, cell);
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function qrView(id) {
    var gen = ++paint;
    loading();
    api('getHouse', { id: id }).then(function (d) {
      if (gen !== paint) return;
      var house = d.house;
      var url = publicUrl(house.publicKey);
      var file = 'open-house-' + String(house.address || 'sheet').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
      $app.innerHTML = shell('house', '<p class="crumb"><a href="#/h/' + h(house.id) + '">' + h(house.address) + '</a></p><div class="top"><div><h1>QR Code</h1><p class="sub">Visitors scan this and sign in on their own phone. The page only accepts a sign-in. It does not show other guests.</p></div></div>' +
        '<div class="qrwrap gb"><div class="qrbox">' + qrSvg(url) + '</div><h2>' + h(house.addressLine) + '</h2><p class="when">' + h(house.whenLabel) + '</p>' +
        '<p class="url">' + h(url) + '</p><div class="actions"><button type="button" class="btn" id="qdl">Download PNG</button><button type="button" class="ub" id="qpr">Print</button></div></div>');
      wireShell();
      qs('#qdl').onclick = function () { downloadQr(url, file); };
      qs('#qpr').onclick = function () { window.print(); };
    }).catch(failView);
  }

  function route() {
    qsa('.toast').forEach(function (t) { t.remove(); });
    clearTick();
    document.body.classList.remove('kiosk-mode');
    qsa('.modal').forEach(function (m) { m.remove(); });
    var hs = location.hash.replace(/^#/, '') || '/';
    if (S.kiosk && hs !== '/kiosk/' + S.kiosk) { location.hash = '#/kiosk/' + S.kiosk; return; }
    if (hs === '/new') return houseForm(null);
    var edit = hs.match(/^\/h\/([A-Za-z0-9_-]+)\/edit$/);
    if (edit) {
      loading();
      return api('getHouse', { id: edit[1] }).then(function (d) { houseForm(d.house); }).catch(failView);
    }
    var kiosk = hs.match(/^\/kiosk\/([A-Za-z0-9_-]+)$/);
    if (kiosk) return kioskView(kiosk[1]);
    var qr = hs.match(/^\/qr\/([A-Za-z0-9_-]+)$/);
    if (qr) return qrView(qr[1]);
    var house = hs.match(/^\/h\/([A-Za-z0-9_-]+)$/);
    if (house) return houseView(house[1]);
    return dashView();
  }
  function render() {
    if (!window.OHApi.getToken()) return loginView();
    if (!S.user) {
      loading();
      return api('me').then(function (d) {
        S.user = d.user;
        return afterSession();
      }).then(render).catch(function (err) {
        if (err.code !== 'AUTH') { signOutLocal(); loginView(err.message); }
      });
    }
    if (S.user.mustChange) return passwordView();
    route();
  }
  window.addEventListener('hashchange', function () { if (S.user && !S.user.mustChange) route(); });
  try { S.kiosk = sessionStorage.getItem('oh_kiosk') || ''; } catch (e) { S.kiosk = ''; }
  var bootTok = '';
  try { bootTok = sessionStorage.getItem('oh_t') || ''; } catch (e2) { bootTok = ''; }
  if (!bootTok) bootTok = getCookie('enesma_sso') || '';
  if (bootTok) storeToken(bootTok);
  render();
})();
