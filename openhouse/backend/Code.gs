/**
 * ENESMA Open House — Apps Script web app.
 * Paste this whole file into a NEW Apps Script project. Do not paste it over Transaction Center.
 * Deploy steps are in DEPLOY.md. This file is not deployed by the git pull.
 *
 * Agents sign in with the existing Transaction Center token. Visitors submit with a per-sheet
 * key and receive only the property line, never the guest list. CRM writes use that agent's
 * token against the existing Transaction Center web app (crmSaveClient / crmAddNote).
 */
var OH_VERSION = '1.0.0';
var DEFAULT_TC = 'https://script.google.com/macros/s/AKfycbzYtmzYv74D0yi0sVy-_JaLDYlNLSU795sqhREsqbGYYU1BEDR5KDAB7Du9Mm0Gp4ba/exec';
var HOUSE_HEADERS = ['id', 'agentId', 'agentName', 'address', 'unit', 'city', 'state', 'zip', 'date', 'startTime', 'endTime', 'status', 'publicKey', 'createdAt', 'updatedAt'];
var GUEST_HEADERS = ['id', 'houseId', 'agentId', 'firstName', 'lastName', 'phone', 'email', 'intent', 'hasAgent', 'otherAgent', 'preApproved', 'timeframe', 'note', 'via', 'createdAt', 'crmClientId', 'crmStatus', 'crmError'];
var AUTH_HEADERS = ['agentId', 'tcToken', 'updatedAt'];

function setupOpenHouse() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.create('ENESMA Open House');
  ensureSheet_(ss, 'Houses', HOUSE_HEADERS);
  ensureSheet_(ss, 'Guests', GUEST_HEADERS);
  ensureSheet_(ss, 'Auth', AUTH_HEADERS);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  if (!props.getProperty('TC_API_URL')) props.setProperty('TC_API_URL', DEFAULT_TC);
  Logger.log(ss.getUrl());
  return ss.getUrl();
}

function doGet() {
  return ContentService.createTextOutput('ENESMA Open House API ' + OH_VERSION);
}
function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return json_({ ok: true, data: handle_(body) });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || 'Something went wrong.'), code: err && err.code || 'ERR' });
  }
}

function handle_(body) {
  body = body || {};
  var action = String(body.action || '');
  if (action === 'ping') return { pong: true, service: 'openhouse', version: OH_VERSION };
  if (action === 'publicSheet') {
    var ph = houseByKey_(body.key);
    if (!ph) fail_('This sign-in link is not valid.', 'NOT_FOUND');
    return publicSheet_(ph);
  }
  if (action === 'publicSubmit') return publicSubmit_(body);

  var user = requireAgent_(body);
  if (action === 'listHouses') return { houses: listHouses_(user.id) };
  if (action === 'getHouse') return getHouse_(user, body.id);
  if (action === 'kioskSheet') {
    var kh = ownHouse_(user, body.id);
    return { id: kh.id, status: kh.status, addressLine: addressLine_(kh), whenLabel: whenLabel_(kh), host: kh.agentName || '' };
  }
  if (action === 'saveHouse') return { house: saveHouse_(user, body) };
  if (action === 'setHouseStatus') return { house: setStatus_(user, body) };
  if (action === 'deleteHouse') { deleteHouse_(user, body.id); return {}; }
  if (action === 'addGuest') return { guest: addGuest_(user, body) };
  if (action === 'markCrm') return { guest: markCrm_(user, body) };
  fail_('Unknown action.');
}

function publicSheet_(house) {
  return { addressLine: addressLine_(house), whenLabel: whenLabel_(house), host: clean_(house.agentName, 80), open: house.status === 'open' };
}
function publicSubmit_(body) {
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    rateLimit_(String(body.key || ''));
    var house = houseByKey_(body.key);
    if (!house) fail_('This sign-in link is not valid.', 'NOT_FOUND');
    if (house.status !== 'open') fail_('This open house sign-in is closed.', 'CLOSED');
    var err = validateGuest_(body.guest || {});
    if (err) fail_(err, 'FIELDS');
    var guest = normalizeGuest_(body.guest || {});
    var digits = phoneDigits_(guest.phone);
    var recent = guestsOf_(house.id).some(function (g) {
      return phoneDigits_(g.phone) === digits && (Date.now() - new Date(g.createdAt).getTime()) < 120000;
    });
    if (!recent) {
      guest.id = nid_('g_');
      guest.houseId = house.id;
      guest.agentId = house.agentId;
      guest.via = 'phone';
      guest.createdAt = new Date().toISOString();
      guest.crmClientId = '';
      guest.crmStatus = 'pending';
      guest.crmError = '';
      append_('Guests', GUEST_HEADERS, guest);
      house.updatedAt = guest.createdAt;
      update_('Houses', HOUSE_HEADERS, house.id, house);
      try { pushCrm_(house.agentId, guest, house); } catch (crmErr) { markGuest_(guest.id, guest.crmClientId, 'pending', crmErr.message); }
    }
    return { received: true };
  } finally {
    lock.releaseLock();
  }
}

function requireAgent_(body) {
  var token = String(body.token || '');
  if (!token) fail_('Please sign in again.', 'AUTH');
  var cache = CacheService.getScriptCache();
  var key = 'me:' + tokenKey_(token);
  var hit = cache.get(key);
  var user = null;
  if (hit) { try { user = JSON.parse(hit); } catch (e) { user = null; } }
  if (!user) {
    var me = tcCall_(token, 'me', {});
    var u = me.user || {};
    if (!u.id) fail_('Please sign in again.', 'AUTH');
    user = { id: String(u.id), name: personName_(u), email: String(u.email || ''), role: String(u.role || '') };
    try { cache.put(key, JSON.stringify(user), 60); } catch (e2) { /* cache is optional */ }
  }
  saveAuth_(user.id, token);
  return user;
}
function saveAuth_(agentId, token) {
  var rows = readAll_('Auth', AUTH_HEADERS);
  var now = new Date().toISOString();
  var i;
  for (i = 0; i < rows.length; i++) if (rows[i].agentId === agentId) {
    rows[i].tcToken = token;
    rows[i].updatedAt = now;
    update_('Auth', AUTH_HEADERS, agentId, rows[i]);
    return;
  }
  append_('Auth', AUTH_HEADERS, { agentId: agentId, tcToken: token, updatedAt: now });
}
function tokenFor_(agentId) {
  var rows = readAll_('Auth', AUTH_HEADERS);
  var i;
  for (i = 0; i < rows.length; i++) if (rows[i].agentId === agentId && rows[i].tcToken) return rows[i].tcToken;
  return '';
}

function listHouses_(agentId) {
  return readAll_('Houses', HOUSE_HEADERS).filter(function (h) { return h.agentId === agentId; }).map(houseOut_).sort(function (a, b) {
    var ao = a.status === 'open' ? 0 : 1, bo = b.status === 'open' ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return String(b.date).localeCompare(String(a.date));
  });
}
function getHouse_(user, id) {
  var house = ownHouse_(user, id);
  var guests = guestsOf_(house.id).map(guestOut_).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return { house: houseOut_(house), guests: guests };
}
function saveHouse_(user, body) {
  var err = validateHouse_(body.house || {});
  if (err) fail_(err, 'FIELDS');
  var src = body.house || {};
  var rec = body.id ? ownHouse_(user, body.id) : null;
  var now = new Date().toISOString();
  if (!rec) {
    rec = { id: nid_('h_'), agentId: user.id, agentName: user.name, publicKey: nid_('k') + nid_(''), status: 'open', createdAt: now };
  }
  rec.address = clean_(src.address, 120);
  rec.unit = clean_(src.unit, 20);
  rec.city = clean_(src.city, 60);
  rec.state = clean_(src.state || 'CA', 2).toUpperCase();
  rec.zip = clean_(src.zip, 10);
  rec.date = clean_(src.date, 10);
  rec.startTime = clean_(src.startTime, 5);
  rec.endTime = clean_(src.endTime, 5);
  rec.updatedAt = now;
  if (body.id) update_('Houses', HOUSE_HEADERS, rec.id, rec);
  else append_('Houses', HOUSE_HEADERS, rec);
  return houseOut_(rec);
}
function setStatus_(user, body) {
  var house = ownHouse_(user, body.id);
  if (body.status !== 'open' && body.status !== 'closed') fail_('Unknown status.');
  house.status = body.status;
  house.updatedAt = new Date().toISOString();
  update_('Houses', HOUSE_HEADERS, house.id, house);
  return houseOut_(house);
}
function deleteHouse_(user, id) {
  var house = ownHouse_(user, id);
  if (guestsOf_(house.id).length) fail_('This open house already has guests. End it instead of deleting it.');
  deleteId_('Houses', house.id);
}
function addGuest_(user, body) {
  var house = ownHouse_(user, body.houseId);
  if (house.status !== 'open') fail_('This open house sign-in is closed.', 'CLOSED');
  var err = validateGuest_(body.guest || {});
  if (err) fail_(err, 'FIELDS');
  var guest = normalizeGuest_(body.guest || {});
  guest.id = nid_('g_');
  guest.houseId = house.id;
  guest.agentId = user.id;
  guest.via = body.via === 'kiosk' ? 'kiosk' : 'agent';
  guest.createdAt = new Date().toISOString();
  guest.crmClientId = '';
  guest.crmStatus = 'pending';
  guest.crmError = '';
  append_('Guests', GUEST_HEADERS, guest);
  house.updatedAt = guest.createdAt;
  update_('Houses', HOUSE_HEADERS, house.id, house);
  try { pushCrm_(user.id, guest, house); } catch (crmErr) { markGuest_(guest.id, guest.crmClientId, 'pending', crmErr.message); }
  return guestOut_(findGuest_(guest.id));
}
function markCrm_(user, body) {
  var guest = findGuest_(body.id);
  if (!guest || guest.agentId !== user.id) fail_('Guest not found.');
  var status = body.crmStatus === 'synced' ? 'synced' : 'pending';
  markGuest_(guest.id, String(body.crmClientId || ''), status, String(body.crmError || '').slice(0, 300));
  return guestOut_(findGuest_(guest.id));
}

function pushCrm_(agentId, guest, house) {
  var token = tokenFor_(agentId);
  if (!token) fail_('Sign in again so this guest can be sent to the CRM.', 'AUTH');
  var boot = tcCall_(token, 'crmBoot', {});
  var plan = crmPlan_(guest, house, boot || {});
  var saved;
  try {
    saved = plan.matchId ? tcCall_(token, 'crmSaveClient', { id: plan.matchId, client: plan.client }) : tcCall_(token, 'crmSaveClient', { client: plan.client });
  } catch (e) {
    if (e.code !== 'DUPLICATE') throw e;
    boot = tcCall_(token, 'crmBoot', {});
    plan = crmPlan_(guest, house, boot || {});
    saved = plan.matchId ? tcCall_(token, 'crmSaveClient', { id: plan.matchId, client: plan.client }) : tcCall_(token, 'crmSaveClient', { client: plan.client, allowDuplicate: true });
  }
  var clientId = (saved && (saved.id || (saved.client && saved.client.id))) || plan.matchId;
  if (!clientId) fail_('CRM did not return a client.');
  if (plan.matchId) {
    var pack = {};
    try { pack = tcCall_(token, 'crmGetClient', { id: clientId }); } catch (ignore) { pack = {}; }
    var notes = pack.notes || [];
    var ref = 'Ref: ' + guest.id;
    var exists = notes.some(function (n) { return String(n.text || '').indexOf(ref) >= 0; });
    if (!exists) tcCall_(token, 'crmAddNote', { clientId: clientId, text: plan.note });
  }
  markGuest_(guest.id, clientId, 'synced', '');
  guest.crmClientId = clientId;
  guest.crmStatus = 'synced';
  guest.crmError = '';
}

/* ---------- CRM text (keep in step with openhouse/logic.js) ---------- */
function buildTags_(guest, house) {
  var intent = { buyer: 'Buyer', seller: 'Seller', both: 'Buyer and seller', looking: 'Just looking' }[guest.intent] || '';
  var pre = { yes: 'Pre-approved', no: 'Not Pre-approved', cash: 'Cash', unsure: 'Pre-approval not sure' }[guest.preApproved] || '';
  var time = { now: 'Ready now', '30': '1–3 months', '90': '3–6 months', '180': '6+ months', browsing: 'Just browsing' }[guest.timeframe] || '';
  var tags = ['Open House', tagSafe_(house.address), intent, guest.hasAgent === 'yes' ? 'Has Agent' : 'No Agent', pre, time];
  var seen = {}, out = [], i, t;
  for (i = 0; i < tags.length; i++) {
    t = tagSafe_(tags[i]);
    if (!t || seen[t.toLowerCase()]) continue;
    seen[t.toLowerCase()] = 1;
    out.push(t);
  }
  return out;
}
function buildNote_(guest, house) {
  var intent = { buyer: 'Buyer', seller: 'Seller', both: 'Buyer and seller', looking: 'Just looking' }[guest.intent] || '';
  var pre = { yes: 'Yes', no: 'No', cash: 'Paying cash', unsure: 'Not sure' }[guest.preApproved] || '';
  var time = { now: 'Ready now', '30': '1–3 months', '90': '3–6 months', '180': '6+ months', browsing: 'Just browsing' }[guest.timeframe] || '';
  var via = { agent: 'Entered by the agent', kiosk: 'iPad kiosk', phone: 'Visitor phone' }[guest.via] || 'Sign-in sheet';
  var lines = ['Open house sign-in — ' + addressLine_(house)];
  var when = whenLabel_(house);
  if (when) lines.push(when);
  lines.push('Looking to: ' + intent);
  lines.push('Has an agent: ' + (guest.hasAgent === 'yes' ? 'Yes' + (guest.otherAgent ? ' — ' + guest.otherAgent : '') : 'No'));
  lines.push('Pre-approved: ' + pre);
  lines.push('Timeframe: ' + time);
  lines.push('Signed in: ' + via);
  if (guest.note) lines.push('Visitor note: ' + guest.note);
  if (guest.id) lines.push('Ref: ' + guest.id);
  return lines.join('\n');
}
function pickType_(types, intent) {
  var keys = Object.keys(types || {});
  var tests = intent === 'seller' ? [/sell/i] : intent === 'both' ? [/both/i, /buy/i] : [/buy/i];
  var j, i, k;
  for (j = 0; j < tests.length; j++) for (i = 0; i < keys.length; i++) {
    k = keys[i];
    if (tests[j].test(k) || tests[j].test(String(types[k] || ''))) return k;
  }
  return keys[0] || (intent === 'seller' ? 'seller' : 'buyer');
}
function tagList_(value) {
  if (Array.isArray(value)) return value;
  return String(value || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
}
function crmPlan_(guest, house, boot) {
  var tags = buildTags_(guest, house);
  var note = buildNote_(guest, house);
  var clients = (boot && boot.clients) || [];
  var phone = phoneDigits_(guest.phone);
  var email = String(guest.email || '').toLowerCase();
  var match = null, i, c;
  for (i = 0; i < clients.length; i++) {
    c = clients[i];
    var cp = phoneDigits_(c.phone), ce = String(c.email || '').toLowerCase();
    if ((email && ce === email) || (phone && cp && cp === phone)) { match = c; break; }
  }
  if (match) {
    var merged = tagList_(match.tags);
    tags.forEach(function (t) { if (!merged.some(function (x) { return String(x).toLowerCase() === t.toLowerCase(); })) merged.push(t); });
    return { matchId: match.id, note: note, client: { firstName: match.firstName || guest.firstName, lastName: match.lastName || guest.lastName, phone: match.phone || guest.phone, email: match.email || guest.email || '', address: match.address || addressLine_(house), type: match.type, status: match.status || 'New Lead', source: match.source || 'Open House', tags: merged.join(', '), groups: match.groups || [], txnIds: match.txnIds || [] } };
  }
  return { matchId: '', note: note, client: { firstName: guest.firstName, lastName: guest.lastName, phone: guest.phone, email: guest.email || '', address: addressLine_(house), type: pickType_(boot && boot.types, guest.intent), status: 'New Lead', source: 'Open House', tags: tags.join(', '), groups: [], txnIds: [], note: note } };
}

function validateGuest_(raw) {
  var g = normalizeGuest_(raw || {});
  if (!g.firstName) return 'Enter a first name.';
  if (!g.lastName) return 'Enter a last name.';
  if (phoneDigits_(raw && raw.phone).length !== 10) return 'Phone must be a 10-digit number (000-000-0000).';
  if (g.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email)) return 'Email address is not valid.';
  if (!{ buyer: 1, seller: 1, both: 1, looking: 1 }[g.intent]) return 'Choose whether you are buying, selling, or just looking.';
  if (!g.hasAgent) return 'Let us know if you already have an agent.';
  if (!{ yes: 1, no: 1, cash: 1, unsure: 1 }[g.preApproved]) return 'Let us know if you are pre-approved.';
  if (!{ now: 1, '30': 1, '90': 1, '180': 1, browsing: 1 }[g.timeframe]) return 'Choose a timeframe.';
  return '';
}
function validateHouse_(raw) {
  raw = raw || {};
  var address = clean_(raw.address, 120), city = clean_(raw.city, 60), state = clean_(raw.state || 'CA', 2).toUpperCase(), zip = clean_(raw.zip, 10);
  var date = clean_(raw.date, 10), start = clean_(raw.startTime, 5), end = clean_(raw.endTime, 5);
  if (address.length < 4) return 'Enter the property street address.';
  if (!city) return 'Enter the city.';
  if (!/^[A-Z]{2}$/.test(state)) return 'Enter a 2-letter state.';
  if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) return 'ZIP must be 5 digits.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Choose the open house date.';
  if (start && !/^\d{2}:\d{2}$/.test(start)) return 'Start time is not valid.';
  if (end && !/^\d{2}:\d{2}$/.test(end)) return 'End time is not valid.';
  if (start && end && end <= start) return 'End time must be after the start time.';
  return '';
}
function normalizeGuest_(g) {
  g = g || {};
  var phone = phoneDigits_(g.phone).length === 10 ? formatPhone_(g.phone) : clean_(g.phone, 20);
  return {
    firstName: clean_(g.firstName, 50), lastName: clean_(g.lastName, 50), phone: phone,
    email: clean_(g.email, 120).toLowerCase(), intent: clean_(g.intent, 20),
    hasAgent: g.hasAgent === 'yes' ? 'yes' : g.hasAgent === 'no' ? 'no' : '',
    otherAgent: g.hasAgent === 'yes' ? clean_(g.otherAgent, 80) : '',
    preApproved: clean_(g.preApproved, 20), timeframe: clean_(g.timeframe, 20), note: clean_(g.note, 2000)
  };
}

function phoneDigits_(v) {
  var d = String(v == null ? '' : v).replace(/\D/g, '');
  if (d.charAt(0) === '1' && d.length === 11) d = d.slice(1);
  return d;
}
function formatPhone_(v) {
  var d = phoneDigits_(v);
  if (d.length !== 10) return '';
  return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
}
function clean_(s, max) {
  s = String(s == null ? '' : s).replace(/[\u0000-\u001F]/g, ' ').trim();
  if (max && s.length > max) s = s.slice(0, max);
  return s;
}
function tagSafe_(s) { return String(s || '').replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim(); }
function addressLine_(h) {
  h = h || {};
  var street = clean_(h.address, 120);
  var unit = clean_(h.unit, 20);
  if (unit && street.toLowerCase().indexOf(unit.toLowerCase()) < 0) street = (street + ' #' + unit.replace(/^#\s*/, '')).trim();
  var stateZip = [clean_(h.state, 2).toUpperCase(), clean_(h.zip, 10)].filter(Boolean).join(' ');
  var cityLine = [clean_(h.city, 60), stateZip].filter(Boolean).join(', ');
  return [street, cityLine].filter(Boolean).join(', ');
}
function fmtTime_(t) {
  var m = /^(\d{2}):(\d{2})$/.exec(String(t || ''));
  if (!m) return '';
  var h = parseInt(m[1], 10), ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m[2] + ' ' + ap;
}
function whenLabel_(h) {
  var day = '';
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(h && h.date || ''));
  if (m) {
    var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  var a = fmtTime_(h && h.startTime), b = fmtTime_(h && h.endTime);
  var t = a && b ? a + '–' + b : (a || b);
  return [day, t].filter(Boolean).join(' · ');
}
function personName_(u) {
  var fl = [u.firstName, u.lastName].map(function (x) { return String(x || '').trim(); }).filter(Boolean).join(' ');
  return fl || u.name || u.email || 'Agent';
}
function counts_(id) {
  var gs = guestsOf_(id);
  return { guestCount: gs.length, crmCount: gs.filter(function (g) { return g.crmStatus === 'synced'; }).length, pendingCount: gs.filter(function (g) { return g.crmStatus !== 'synced'; }).length };
}
function houseOut_(h) {
  var c = counts_(h.id);
  return {
    id: h.id, agentId: h.agentId, agentName: h.agentName, address: h.address, unit: h.unit || '', city: h.city, state: h.state, zip: h.zip,
    date: h.date, startTime: h.startTime || '', endTime: h.endTime || '', status: h.status, publicKey: h.publicKey,
    createdAt: h.createdAt, updatedAt: h.updatedAt, guestCount: c.guestCount, crmCount: c.crmCount, pendingCount: c.pendingCount,
    addressLine: addressLine_(h), whenLabel: whenLabel_(h)
  };
}
function guestOut_(g) {
  return {
    id: g.id, houseId: g.houseId, agentId: g.agentId, firstName: g.firstName, lastName: g.lastName, phone: g.phone, email: g.email || '',
    intent: g.intent, hasAgent: g.hasAgent, otherAgent: g.otherAgent || '', preApproved: g.preApproved, timeframe: g.timeframe, note: g.note || '',
    via: g.via, createdAt: g.createdAt, crmClientId: g.crmClientId || '', crmStatus: g.crmStatus || 'pending', crmError: g.crmError || ''
  };
}

function rateLimit_(key) {
  if (!key) return;
  var cache = CacheService.getScriptCache();
  var id = 'rl:' + tokenKey_(key);
  var n = Number(cache.get(id) || '0') + 1;
  if (n > 40) fail_('Too many sign-ins from this link. Wait a few minutes and try again.', 'RATE');
  cache.put(id, String(n), 600);
}
function tcCall_(token, action, params) {
  var url = PropertiesService.getScriptProperties().getProperty('TC_API_URL') || DEFAULT_TC;
  var body = Object.assign({ action: action, token: token }, params || {});
  var res = postJson_(url, body);
  if (!res || res.ok !== true) {
    var err = new Error((res && res.error) || 'Transaction Center rejected the request.');
    err.code = (res && res.code) || 'TC';
    throw err;
  }
  return res.data || {};
}
function postJson_(url, body) {
  var payload = JSON.stringify(body);
  var res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'text/plain;charset=utf-8', payload: payload, muteHttpExceptions: true, followRedirects: false });
  var code = res.getResponseCode();
  if (code >= 300 && code < 400) {
    var headers = res.getHeaders();
    var loc = headers.Location || headers.location;
    if (!loc) fail_('Transaction Center redirect had no location.');
    res = UrlFetchApp.fetch(loc, { method: 'post', contentType: 'text/plain;charset=utf-8', payload: payload, muteHttpExceptions: true, followRedirects: true });
  }
  try { return JSON.parse(res.getContentText() || ''); }
  catch (e) { fail_('Transaction Center did not return JSON.'); }
}

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) fail_('Open House storage is not set up. In the Apps Script editor, run setupOpenHouse.', 'SETUP');
  return SpreadsheetApp.openById(id);
}
function sheet_(name) {
  var sh = ss_().getSheetByName(name);
  if (!sh) fail_('Missing sheet ' + name + '. Run setupOpenHouse.', 'SETUP');
  return sh;
}
function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  sh.getRange(1, 1, Math.max(sh.getMaxRows(), 50), headers.length).setNumberFormat('@');
  return sh;
}
function readAll_(name, headers) {
  var values = sheet_(name).getDataRange().getValues();
  var out = [], r, c, o;
  for (r = 1; r < values.length; r++) {
    if (values[r][0] === '' || values[r][0] == null) continue;
    o = {};
    for (c = 0; c < headers.length; c++) {
      var v = values[r][c];
      if (v instanceof Date) v = Utilities.formatDate(v, 'America/Los_Angeles', "yyyy-MM-dd'T'HH:mm:ssXXX");
      o[headers[c]] = v == null ? '' : String(v);
    }
    out.push(o);
  }
  return out;
}
function append_(name, headers, obj) {
  var sh = sheet_(name);
  sh.appendRow(headers.map(function (key) { return obj[key] == null ? '' : String(obj[key]); }));
  sh.getRange(sh.getLastRow(), 1, 1, headers.length).setNumberFormat('@');
}
function update_(name, headers, id, obj) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var r;
  for (r = 1; r < values.length; r++) if (String(values[r][0]) === String(id)) {
    sh.getRange(r + 1, 1, 1, headers.length).setNumberFormat('@').setValues([headers.map(function (key) { return obj[key] == null ? '' : String(obj[key]); })]);
    return;
  }
  fail_('Record not found.');
}
function deleteId_(name, id) {
  var sh = sheet_(name);
  var values = sh.getDataRange().getValues();
  var r;
  for (r = values.length - 1; r >= 1; r--) if (String(values[r][0]) === String(id)) sh.deleteRow(r + 1);
}
function houseByKey_(key) {
  key = String(key || '');
  if (!key) return null;
  var rows = readAll_('Houses', HOUSE_HEADERS);
  var i;
  for (i = 0; i < rows.length; i++) if (rows[i].publicKey.length === key.length && keyEq_(rows[i].publicKey, key)) return rows[i];
  return null;
}
function ownHouse_(user, id) {
  var rows = readAll_('Houses', HOUSE_HEADERS);
  var i;
  for (i = 0; i < rows.length; i++) if (rows[i].id === String(id || '') && rows[i].agentId === user.id) return rows[i];
  fail_('Open house not found.');
}
function guestsOf_(houseId) { return readAll_('Guests', GUEST_HEADERS).filter(function (g) { return g.houseId === houseId; }); }
function findGuest_(id) {
  var rows = readAll_('Guests', GUEST_HEADERS);
  var i;
  for (i = 0; i < rows.length; i++) if (rows[i].id === id) return rows[i];
  return null;
}
function markGuest_(id, clientId, status, error) {
  var guest = findGuest_(id);
  if (!guest) return;
  guest.crmClientId = clientId || '';
  guest.crmStatus = status;
  guest.crmError = String(error || '').slice(0, 300);
  update_('Guests', GUEST_HEADERS, id, guest);
}
function keyEq_(a, b) {
  var n = 0, i;
  for (i = 0; i < a.length; i++) n |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return n === 0;
}
function tokenKey_(token) {
  var dig = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(token));
  return Utilities.base64EncodeWebSafe(dig).replace(/[^A-Za-z0-9]/g, '').slice(0, 40);
}
function nid_(prefix) { return prefix + Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function fail_(message, code) { var err = new Error(message); err.code = code || 'ERR'; throw err; }
