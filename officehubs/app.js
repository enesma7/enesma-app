/* ENESMA REALTY · Office Hubs: landing page + reservation form (talks to the Apps Script API in config.js). */
(function () {
'use strict';
var CFG = window.OH_CONFIG || {};
var API = String(CFG.API_URL || '').trim();
var TZ = 'America/Los_Angeles';
var $app = document.getElementById('app');
var ACCESS_LINE = 'Your access code is emailed with your reservation confirmation.';

var LOCATIONS = [{
  id: 'rc', slug: 'rancho-cucamonga', name: 'Rancho Cucamonga',
  address: '8311 Haven Ave #150, Rancho Cucamonga, CA 91730',
  maps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('8311 Haven Ave #150, Rancho Cucamonga, CA 91730'),
  host: { name: 'Integrity Home Finance', logo: 'assets/integrity-home-finance-logo.png' },
  spaces: [
    { id: 'rc-desk1', label: 'Desk 1', group: 'Private Office' },
    { id: 'rc-desk2', label: 'Desk 2', group: 'Private Office' },
    { id: 'rc-desk3', label: 'Desk 3', group: 'Private Office' },
    { id: 'rc-conf', label: 'Conference Room', group: 'Conference Room' }
  ]
}];
var RULES = { open: '07:00', close: '21:00', step: 15, min: 30, max: 720, daysAhead: 90 };
var S = { backend: null, bookingOpen: false, calIds: {}, tab: 'rc-desk1', busy: null, sending: false };
Object.keys(CFG.CALENDARS || {}).forEach(function (k) { if (CFG.CALENDARS[k]) S.calIds[k] = CFG.CALENDARS[k]; });

/* ---------- utils ---------- */
function h(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function qs(s, r) { return (r || document).querySelector(s); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function toMin(t) { var p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
function fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
function human(t) { var m = toMin(t), hh = Math.floor(m / 60), ap = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12; return hh + ':' + pad(m % 60) + ' ' + ap; }
function laToday() {
  var p = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return p.slice(0, 10);
}
function addDays(ymd, n) { var d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function longDate(ymd) { return new Date(ymd + 'T12:00:00Z').toLocaleDateString('en-US', { timeZone: 'UTC', weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }
function spaceById(id) { for (var i = 0; i < LOCATIONS.length; i++) for (var j = 0; j < LOCATIONS[i].spaces.length; j++) if (LOCATIONS[i].spaces[j].id === id) return LOCATIONS[i].spaces[j]; return null; }
function spaceName(s) { return s.group === s.label ? s.label : s.group + ' – ' + s.label; }
function embedUrl(calId) {
  return 'https://calendar.google.com/calendar/embed?src=' + encodeURIComponent(calId) + '&ctz=' + encodeURIComponent(TZ) + '&mode=WEEK&showPrint=0&showCalendars=0&showTabs=1&showTitle=0';
}
var KEY_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="kg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAD59E"/><stop offset="1" stop-color="#D5BE87"/></linearGradient></defs><g fill="none" stroke="url(#kg)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.5"/><path d="M11.5 11.5L20 3M16.5 6.5l2.5 2.5M14 9l2 2"/></g></svg>';
var CAL_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAD59E"/><stop offset="1" stop-color="#D5BE87"/></linearGradient></defs><g fill="none" stroke="url(#cg)" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></g></svg>';
var TICK = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#000007" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* ---------- API ---------- */
function api(action, params) {
  if (!API) return Promise.reject(Object.assign(new Error('Booking opens soon.'), { code: 'SETUP' }));
  return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action: action }, params || {})), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error('Server error ' + r.status); return r.json(); }, function () { throw new Error('Could not reach the booking server. Check your connection and try again.'); })
    .then(function (res) { if (res && res.ok) return res.data; var e = new Error((res && res.error) || 'Something went wrong.'); e.code = res && res.code; throw e; });
}
function loadBackend() {
  if (!API) { S.backend = 'none'; return Promise.resolve(); }
  return api('config').then(function (d) {
    S.backend = 'ok'; S.bookingOpen = !!d.bookingOpen;
    if (d.rules) RULES = d.rules;
    (d.locations || []).forEach(function (L) { (L.spaces || []).forEach(function (s) { if (s.calendarId && !S.calIds[s.id]) S.calIds[s.id] = s.calendarId; }); });
  }).catch(function () { S.backend = 'down'; });
}
function open_() { return S.backend === 'ok' && S.bookingOpen; }

/* ---------- views ---------- */
function soonBanner() {
  if (open_()) return '';
  var msg = S.backend === 'down' ? 'Online booking is temporarily unavailable. Please try again shortly.' : 'Online reservations for desks and the conference room open shortly. You can look around now.';
  return '<div class="soon" role="status"><i class="dot"></i><div><b>Booking opens soon</b><span>' + h(msg) + '</span></div></div>';
}
function accessNote() { return '<div class="note">' + KEY_ICON + '<span>' + h(ACCESS_LINE) + '</span></div>'; }

function viewHome() {
  document.title = 'Office Hubs';
  $app.innerHTML = '<i class="rule"></i><h1>Office Hubs</h1><p class="sub">Reserve a desk in the private office or the conference room at one of our office hubs.</p>' + soonBanner() +
    '<h2>Locations</h2><div class="locs">' + LOCATIONS.map(function (L) {
      var groups = {}; L.spaces.forEach(function (s) { (groups[s.group] = groups[s.group] || []).push(s.label); });
      return '<article class="card loc"><p class="city">' + h(L.name) + '</p>' +
        '<p class="addr"><a href="' + h(L.maps) + '" target="_blank" rel="noopener">' + h(L.address) + '</a></p>' +
        '<div class="host"><img src="' + h(L.host.logo) + '" alt="' + h(L.host.name) + '" width="88" height="36"><span>Located at ' + h(L.host.name) + '</span></div>' +
        '<div class="chips">' + Object.keys(groups).map(function (g) { return '<span class="chip">' + h(g === groups[g][0] ? g : g + ': ' + groups[g].join(', ')) + '</span>'; }).join('') + '</div>' +
        accessNote() +
        '<a class="btn" href="#/' + h(L.slug) + '">' + (open_() ? 'View calendars &amp; book' : 'View spaces &amp; calendars') + '</a></article>';
    }).join('') + '</div>';
}

function timeOptions(from, to, sel) {
  var out = '<option value="">Select</option>';
  for (var m = toMin(from); m <= toMin(to); m += RULES.step) { var t = fromMin(m); out += '<option value="' + t + '"' + (t === sel ? ' selected' : '') + '>' + human(t) + '</option>'; }
  return out;
}

function viewLocation(L) {
  document.title = 'Office Hubs · ' + L.name;
  var dis = open_() ? '' : ' disabled';
  var today = laToday();
  var groups = [];
  L.spaces.forEach(function (s) { var g = groups.filter(function (x) { return x.n === s.group; })[0]; if (!g) groups.push(g = { n: s.group, s: [] }); g.s.push(s); });
  $app.innerHTML = '<a class="back" href="#/">&larr; All locations</a>' +
    '<div class="lochead"><div><i class="rule"></i><h1>' + h(L.name) + '</h1><p class="sub" style="margin:0"><a href="' + h(L.maps) + '" target="_blank" rel="noopener">' + h(L.address) + '</a></p>' +
    '<div class="host" style="margin-top:10px"><img src="' + h(L.host.logo) + '" alt="' + h(L.host.name) + '" width="88" height="36"><span>Located at ' + h(L.host.name) + '</span></div></div>' +
    '<a class="btn ghost" href="#book" id="jump">Reserve a space</a></div>' + soonBanner() +
    '<div class="grid"><section class="card"><h2>Availability</h2><div class="tabs" role="tablist">' + L.spaces.map(function (s) {
      return '<button class="tab' + (s.id === S.tab ? ' on' : '') + '" role="tab" data-tab="' + s.id + '">' + h(s.label) + (s.group !== s.label ? '<small>' + h(s.group) + '</small>' : '<small>&nbsp;</small>') + '</button>';
    }).join('') + '</div><div class="cal" id="cal"></div><p class="small" style="margin:10px 0 0">Booked times show as busy. Times are Pacific Time.</p></section>' +
    '<section class="card" id="book"><h2>Reserve a space</h2>' +
    '<form id="f" novalidate autocomplete="on">' +
    '<div class="f"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" maxlength="80" required' + dis + '></div>' +
    '<div class="f"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" inputmode="email" maxlength="120" required' + dis + '></div>' +
    '<div class="f"><label for="space">Space</label><select id="space" name="space" required' + dis + '><option value="">Select a space</option>' + groups.map(function (g) {
      return '<optgroup label="' + h(g.n) + '">' + g.s.map(function (s) { return '<option value="' + s.id + '"' + (s.id === S.tab ? ' selected' : '') + '>' + h(spaceName(s)) + '</option>'; }).join('') + '</optgroup>';
    }).join('') + '</select></div>' +
    '<div class="f"><label for="date">Date</label><input id="date" name="date" type="date" min="' + today + '" max="' + addDays(today, RULES.daysAhead) + '" required' + dis + '></div>' +
    '<div class="row2"><div class="f"><label for="start">Start time</label><select id="start" name="start" required' + dis + '>' + timeOptions(RULES.open, fromMin(toMin(RULES.close) - RULES.min), '') + '</select></div>' +
    '<div class="f"><label for="end">End time</label><select id="end" name="end" required' + dis + '>' + timeOptions(fromMin(toMin(RULES.open) + RULES.min), RULES.close, '') + '</select></div></div>' +
    '<div class="busy" id="busy"></div>' +
    '<div class="hp" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>' +
    '<div id="msg"></div>' +
    '<button class="btn" type="submit" id="go" style="width:100%"' + dis + '>' + (open_() ? 'Reserve' : 'Booking opens soon') + '</button>' +
    '<div style="margin-top:14px">' + accessNote() + '</div></form></section></div>';
  renderCal();
  Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
    b.onclick = function () { S.tab = b.getAttribute('data-tab'); Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (x) { x.classList.toggle('on', x === b); }); renderCal(); };
  });
  qs('#jump').onclick = function (e) { e.preventDefault(); qs('#book').scrollIntoView({ behavior: 'smooth' }); };
  var f = qs('#f');
  f.space.onchange = function () { if (f.space.value) { S.tab = f.space.value; Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (x) { x.classList.toggle('on', x.getAttribute('data-tab') === S.tab); }); renderCal(); } loadBusy(); };
  f.date.onchange = loadBusy;
  f.start.onchange = function () {
    if (f.start.value && (!f.end.value || toMin(f.end.value) <= toMin(f.start.value))) { var e = Math.min(toMin(f.start.value) + 60, toMin(RULES.close)); f.end.value = fromMin(e); }
  };
  f.onsubmit = submit;
}

function renderCal() {
  var box = qs('#cal'); if (!box) return;
  var id = S.calIds[S.tab], sp = spaceById(S.tab);
  box.innerHTML = id ? '<iframe title="' + h(sp ? spaceName(sp) : '') + ' calendar" src="' + h(embedUrl(id)) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>'
    : '<div class="ph">' + CAL_ICON + '<b style="color:#000007">' + h(sp ? spaceName(sp) : '') + '</b><span>The live calendar for this space appears here when booking opens.</span></div>';
}

function loadBusy() {
  var f = qs('#f'), out = qs('#busy'); if (!f || !out) return;
  S.busy = null; out.innerHTML = '';
  if (!open_() || !f.space.value || !f.date.value) return;
  var key = f.space.value + '|' + f.date.value;
  out.textContent = 'Checking availability…';
  api('availability', { space: f.space.value, date: f.date.value }).then(function (d) {
    if (key !== f.space.value + '|' + f.date.value) return;
    S.busy = d.busy || [];
    var sp = spaceById(f.space.value);
    out.innerHTML = S.busy.length ? '<b>Already booked</b> for ' + h(sp.label) + ': ' + S.busy.map(function (b) { return b.allDay ? 'all day' : h(human(b.start) + '–' + human(b.end)); }).join(', ')
      : h(sp.label) + ' is open all day on this date.';
  }).catch(function () { out.textContent = ''; });
}

function showErr(msg) { qs('#msg').innerHTML = '<div class="err" role="alert"><span class="rt">Can’t reserve yet. </span>' + h(msg) + '</div>'; }

function submit(e) {
  e.preventDefault();
  if (!open_() || S.sending) return;
  var f = qs('#f'); qs('#msg').innerHTML = '';
  var d = { name: f.name.value.trim(), email: f.email.value.trim(), space: f.space.value, date: f.date.value, start: f.start.value, end: f.end.value, website: f.website.value };
  if (d.name.length < 2) return showErr('Please enter your full name.');
  if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) return showErr('Please enter a valid email address.');
  if (!d.space) return showErr('Please choose a space.');
  if (!d.date) return showErr('Please choose a date.');
  if (!d.start || !d.end) return showErr('Please choose a start and end time.');
  if (toMin(d.end) - toMin(d.start) < RULES.min) return showErr('The end time must be at least ' + RULES.min + ' minutes after the start time.');
  if (S.busy && S.busy.some(function (b) { return b.allDay || (toMin(b.start) < toMin(d.end) && (b.end === '00:00' ? 1440 : toMin(b.end)) > toMin(d.start)); }))
    return showErr('That time overlaps an existing booking for this space. Please pick another time or space.');
  S.sending = true; var go = qs('#go'); go.disabled = true; go.textContent = 'Reserving…';
  api('book', d).then(function (r) {
    var sp = spaceById(d.space), L = LOCATIONS[0];
    $app.innerHTML = '<section class="card done" style="max-width:640px;margin:0 auto"><div class="tick">' + TICK + '</div><h1>You’re booked</h1>' +
      '<p class="sub" style="margin:0">A confirmation was sent to <b>' + h(d.email) + '</b>.</p>' +
      '<dl><dt>Reservation</dt><dd>' + h(r.id) + '</dd><dt>Space</dt><dd>' + h(spaceName(sp)) + '</dd><dt>When</dt><dd>' + h(longDate(d.date) + ', ' + human(d.start) + ' to ' + human(d.end)) + ' PT</dd><dt>Address</dt><dd>' + h(L.address) + '</dd></dl>' +
      accessNote() + '<p style="margin:18px 0 0"><a class="btn ghost" href="#/' + L.slug + '" id="again">Make another reservation</a></p></section>';
    qs('#again').onclick = function (ev) { ev.preventDefault(); route(true); };
    window.scrollTo(0, 0);
  }).catch(function (err) {
    showErr(err.message || 'Something went wrong. Please try again.');
    if (err.code === 'CONFLICT') loadBusy();
  }).then(function () { S.sending = false; var g = qs('#go'); if (g) { g.disabled = !open_(); g.textContent = open_() ? 'Reserve' : 'Booking opens soon'; } });
}

function route(force) {
  var hsh = location.hash.replace(/^#\/?/, '');
  if (hsh === 'book' && !force) return;
  var L = LOCATIONS.filter(function (x) { return x.slug === hsh || x.id === hsh; })[0];
  if (L) viewLocation(L); else viewHome();
  if (!force) window.scrollTo(0, 0);
}
window.addEventListener('hashchange', function () { route(false); });
loadBackend().then(function () { route(false); });
})();
