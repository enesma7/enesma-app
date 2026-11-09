/* In-browser Open House store. Used for the demo preview and before the Apps Script URL is set.
   Nothing here is sent to Transaction Center. Sign-in for the demo is local; a connected preview
   still signs in through Transaction Center and only keeps houses in this browser. */
(function (root, factory) {
  var api = factory(function () {
    if (root.OHLogic) return root.OHLogic;
    if (typeof require === 'function') return require('./logic.js');
    throw new Error('Open House logic is missing.');
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OHDemo = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (getLogic) {
  'use strict';
  var KEY = 'oh_demo_v1';
  var memory = {};
  var db = null;

  function storage() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage) {
        var t = '__oh';
        localStorage.setItem(t, '1');
        localStorage.removeItem(t);
        return localStorage;
      }
    } catch (e) { /* private mode */ }
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null; },
      setItem: function (k, v) { memory[k] = String(v); },
      removeItem: function (k) { delete memory[k]; }
    };
  }
  function L() { return getLogic(); }
  function day(n) {
    var d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() + n);
    var m = d.getMonth() + 1, dd = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
  }
  function now() { return new Date().toISOString(); }
  function nid(p) {
    var s = '';
    try { s = crypto.randomUUID().replace(/-/g, ''); } catch (e) { s = String(Math.random()).slice(2) + String(Date.now()); }
    return p + s.slice(0, 12);
  }
  function fail(msg, code) { var e = new Error(msg); e.code = code || 'ERR'; throw e; }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function save() { storage().setItem(KEY, JSON.stringify(db)); }
  function pub(u) {
    return { id: u.id, username: u.username, name: u.name, firstName: u.firstName || '', lastName: u.lastName || '', email: u.email, role: u.role, owner: !!u.owner, mustChange: !!u.mustChange };
  }
  function userById(id) { var i; for (i = 0; i < db.users.length; i++) if (db.users[i].id === id) return db.users[i]; return null; }
  function userByName(v) {
    v = String(v || '').trim().toLowerCase();
    var i; for (i = 0; i < db.users.length; i++) if (db.users[i].username === v || db.users[i].email === v) return db.users[i];
    return null;
  }
  function sessionUser(token) {
    var id = db.sessions[token || ''];
    var u = id && userById(id);
    if (!u) fail('Please sign in again.', 'AUTH');
    return u;
  }

  function seed() {
    var agent = { id: 'U2', username: 'agent@demo.test', email: 'agent@demo.test', password: 'demo', name: 'Alex Rivera', firstName: 'Alex', lastName: 'Rivera', role: 'agent', owner: false, mustChange: false };
    var admin = { id: 'U1', username: 'admin@demo.test', email: 'admin@demo.test', password: 'demo', name: 'Enrique Esparza', firstName: 'Enrique', lastName: 'Esparza', role: 'admin', owner: true, mustChange: false };
    function g(id, houseId, first, last, phone, email, intent, hasAgent, other, pre, time, note, via, agoMin) {
      return {
        id: id, houseId: houseId, agentId: 'U2', firstName: first, lastName: last, phone: phone, email: email,
        intent: intent, hasAgent: hasAgent, otherAgent: other || '', preApproved: pre, timeframe: time, note: note || '',
        via: via, createdAt: new Date(Date.now() - agoMin * 60000).toISOString(), crmClientId: 'c_' + id, crmStatus: 'synced', crmError: ''
      };
    }
    db = {
      version: 1,
      users: [admin, agent],
      sessions: {},
      codes: {},
      houses: [
        { id: 'h_vista', agentId: 'U2', agentName: 'Alex Rivera', address: '1420 Vista Del Mar', unit: '', city: 'Riverside', state: 'CA', zip: '92506', date: day(0), startTime: '13:00', endTime: '16:00', status: 'open', publicKey: 'demo-vista-key', createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: now() },
        { id: 'h_sunset', agentId: 'U2', agentName: 'Alex Rivera', address: '2205 Sunset Ridge', unit: '', city: 'Norco', state: 'CA', zip: '92860', date: day(1), startTime: '11:00', endTime: '14:00', status: 'open', publicKey: 'demo-sunset-key', createdAt: now(), updatedAt: now() },
        { id: 'h_canyon', agentId: 'U2', agentName: 'Alex Rivera', address: '88 Canyon Crest Dr', unit: '', city: 'Corona', state: 'CA', zip: '92882', date: day(-6), startTime: '12:00', endTime: '15:00', status: 'closed', publicKey: 'demo-canyon-key', createdAt: new Date(Date.now() - 8 * 86400000).toISOString(), updatedAt: new Date(Date.now() - 6 * 86400000).toISOString() }
      ],
      guests: [
        g('g_jordan', 'h_vista', 'Jordan', 'Lee', '951-555-0142', 'jordan.lee@example.com', 'buyer', 'no', '', 'yes', '30', 'Looking for a yard for a dog.', 'kiosk', 40),
        g('g_sam', 'h_vista', 'Sam', 'Patel', '951-555-0177', 'sam.patel@example.com', 'seller', 'yes', 'Riley Chen', 'unsure', '90', '', 'phone', 25),
        g('g_casey', 'h_vista', 'Casey', 'Nguyen', '951-555-0133', '', 'looking', 'no', '', 'no', 'browsing', '', 'agent', 10),
        g('g_riley', 'h_canyon', 'Riley', 'Brooks', '951-555-0188', 'riley.brooks@example.com', 'buyer', 'no', '', 'cash', 'now', '', 'kiosk', 8000),
        g('g_avery', 'h_canyon', 'Avery', 'Kim', '951-555-0160', 'avery.kim@example.com', 'both', 'yes', 'Morgan Diaz', 'yes', '180', 'Also thinking of selling their condo.', 'phone', 7900)
      ],
      clients: [],
      notes: []
    };
    db.guests.forEach(function (guest) {
      var house = db.houses.filter(function (h) { return h.id === guest.houseId; })[0];
      var plan = L().crmPlan(guest, house, { types: { buyer: 'Buyer', seller: 'Seller' }, clients: db.clients });
      var client = plan.client;
      delete client.note;
      if (typeof client.tags === 'string') client.tags = client.tags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      client.id = guest.crmClientId;
      client.ownerId = 'U2';
      db.clients.push(client);
      db.notes.push({ id: nid('n_'), clientId: guest.crmClientId, text: plan.note, createdAt: guest.createdAt });
    });
  }
  function load() {
    if (db) return;
    var raw = null;
    try { raw = JSON.parse(storage().getItem(KEY) || 'null'); } catch (e) { raw = null; }
    if (!raw || raw.version !== 1 || !raw.houses) seed();
    else db = raw;
  }
  function reset() { storage().removeItem(KEY); db = null; load(); }

  function houseById(id) { var i; for (i = 0; i < db.houses.length; i++) if (db.houses[i].id === id) return db.houses[i]; return null; }
  function houseByKey(key) {
    key = String(key || '');
    var i; for (i = 0; i < db.houses.length; i++) if (db.houses[i].publicKey === key) return db.houses[i];
    return null;
  }
  function guestsOf(id) { return db.guests.filter(function (g) { return g.houseId === id; }); }
  function counts(id) {
    var gs = guestsOf(id);
    return { guestCount: gs.length, crmCount: gs.filter(function (g) { return g.crmStatus === 'synced'; }).length, pendingCount: gs.filter(function (g) { return g.crmStatus !== 'synced'; }).length };
  }
  function houseOut(h) {
    var c = counts(h.id);
    return {
      id: h.id, agentId: h.agentId, agentName: h.agentName, address: h.address, unit: h.unit || '', city: h.city, state: h.state, zip: h.zip,
      date: h.date, startTime: h.startTime || '', endTime: h.endTime || '', status: h.status, publicKey: h.publicKey,
      createdAt: h.createdAt, updatedAt: h.updatedAt, guestCount: c.guestCount, crmCount: c.crmCount, pendingCount: c.pendingCount,
      addressLine: L().addressLine(h), whenLabel: L().whenLabel(h)
    };
  }
  function guestOut(g) {
    return {
      id: g.id, houseId: g.houseId, agentId: g.agentId, firstName: g.firstName, lastName: g.lastName, phone: g.phone, email: g.email || '',
      intent: g.intent, hasAgent: g.hasAgent, otherAgent: g.otherAgent || '', preApproved: g.preApproved, timeframe: g.timeframe, note: g.note || '',
      via: g.via, createdAt: g.createdAt, crmClientId: g.crmClientId || '', crmStatus: g.crmStatus || 'pending', crmError: g.crmError || ''
    };
  }
  function ownHouse(u, id) {
    var h = houseById(id);
    if (!h || h.agentId !== u.id) fail('Open house not found.');
    return h;
  }
  function addrResults(q) {
    return L().filterAddresses(L().DEMO_ADDRESSES, q).map(function (a) {
      var title = a.address + (a.city ? ', ' + a.city : '');
      return { id: a.id, title: title, address: a.address, unit: a.unit || '', city: a.city, state: a.state, zip: a.zip };
    });
  }

  function dispatch(body) {
    load();
    body = body || {};
    var action = body.action;
    if (action === 'ping') return { pong: true, service: 'openhouse-demo', version: '1.0.0' };
    if (action === 'login') {
      var u = userByName(body.username || body.email);
      if (!u || u.password !== String(body.password || '')) fail('Invalid username or password.');
      var tok = nid('s');
      db.sessions[tok] = u.id;
      save();
      return { token: tok, user: pub(u) };
    }
    if (action === 'requestPasswordCode') {
      var em = String(body.email || '').trim().toLowerCase();
      if (!userByName(em)) return { sent: true };
      db.codes[em] = '123456';
      save();
      return { sent: true, demoCode: '123456' };
    }
    if (action === 'resetPasswordWithCode') {
      var email = String(body.email || '').trim().toLowerCase();
      var who = userByName(email);
      if (!who || db.codes[email] !== String(body.code || '').trim()) fail('That code is invalid or expired. Request a new one.');
      var pw = String(body.newPassword || '');
      if (pw.length < 10 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) fail('Use at least 10 characters with letters and numbers.');
      who.password = pw;
      who.mustChange = false;
      delete db.codes[email];
      var t2 = nid('s');
      db.sessions[t2] = who.id;
      save();
      return { token: t2, user: pub(who) };
    }
    if (action === 'logout') { delete db.sessions[body.token]; save(); return {}; }
    if (action === 'bindSession') {
      if (!body.token || !body.user || !body.user.id) return {};
      db.sessions[body.token] = body.user.id;
      if (!userById(body.user.id)) {
        db.users.push({ id: body.user.id, username: body.user.username || body.user.email || body.user.id, email: body.user.email || '', password: '', name: body.user.name || '', firstName: body.user.firstName || '', lastName: body.user.lastName || '', role: body.user.role || 'agent', mustChange: false });
      }
      save();
      return {};
    }

    if (action === 'publicSheet') {
      var ph = houseByKey(body.key);
      if (!ph) fail('This sign-in link is not valid.', 'NOT_FOUND');
      return L().toPublicSheet(ph);
    }
    if (action === 'publicSubmit') {
      var hs = houseByKey(body.key);
      if (!hs) fail('This sign-in link is not valid.', 'NOT_FOUND');
      if (hs.status !== 'open') fail('This open house sign-in is closed.', 'CLOSED');
      var err = L().validateGuest(body.guest || {});
      if (err) fail(err, 'FIELDS');
      var guest = L().normalizeGuest(body.guest || {});
      var digits = L().phoneDigits(guest.phone);
      var dup = db.guests.some(function (g) {
        return g.houseId === hs.id && L().phoneDigits(g.phone) === digits && (Date.now() - new Date(g.createdAt).getTime()) < 120000;
      });
      if (!dup) {
        guest.id = nid('g_');
        guest.houseId = hs.id;
        guest.agentId = hs.agentId;
        guest.via = 'phone';
        guest.createdAt = now();
        guest.crmClientId = '';
        guest.crmStatus = 'pending';
        guest.crmError = '';
        db.guests.push(guest);
        hs.updatedAt = now();
        save();
      }
      return { received: true };
    }

    var me = sessionUser(body.token);
    if (action === 'me') return { user: pub(me) };
    if (action === 'changePassword') {
      if (body.current !== me.password) fail('Your current password is not correct.');
      var np = String(body.newPassword || '');
      if (np.length < 10 || !/[A-Za-z]/.test(np) || !/\d/.test(np)) fail('Use at least 10 characters with letters and numbers.');
      me.password = np;
      me.mustChange = false;
      save();
      return { user: pub(me), token: body.token };
    }
    if (action === 'dashboard') {
      return { transactions: L().DEMO_ADDRESSES.map(function (a) { return { id: a.id, title: a.address + ', ' + a.city, address: a.address, city: a.city, zip: a.zip }; }) };
    }
    if (action === 'search') return { results: addrResults(body.q || '') };
    if (action === 'getTransaction') {
      var found = null, ai;
      for (ai = 0; ai < L().DEMO_ADDRESSES.length; ai++) if (L().DEMO_ADDRESSES[ai].id === body.id) found = L().DEMO_ADDRESSES[ai];
      if (!found) fail('Transaction not found.');
      return { txn: { id: found.id, address: found.address, city: found.city, zip: found.zip, intake: { unit: found.unit || '', state: found.state || 'CA' } } };
    }
    if (action === 'crmBoot') {
      return {
        types: { buyer: 'Buyer', seller: 'Seller', both: 'Buyer and seller' },
        statuses: ['New Lead', 'Active', 'Under Contract', 'Closed', 'Past Client', 'Inactive'],
        sources: ['Open House', 'Referral'],
        clients: db.clients.filter(function (c) { return c.ownerId === me.id; }),
        groups: [],
        me: me.id,
        admin: me.role === 'admin',
        lendersReady: false
      };
    }
    if (action === 'crmGetClient') {
      var gc = null, gi;
      for (gi = 0; gi < db.clients.length; gi++) if (db.clients[gi].id === body.id && db.clients[gi].ownerId === me.id) gc = db.clients[gi];
      if (!gc) fail('Client not found.');
      return { client: gc, notes: db.notes.filter(function (n) { return n.clientId === gc.id; }), txns: [], reminders: [] };
    }
    if (action === 'crmSaveClient') {
      var incoming = body.client || {};
      if (body.id) {
        var cur = null, cj;
        for (cj = 0; cj < db.clients.length; cj++) if (db.clients[cj].id === body.id && db.clients[cj].ownerId === me.id) cur = db.clients[cj];
        if (!cur) fail('Client not found.');
        ['firstName', 'lastName', 'phone', 'email', 'address', 'type', 'status', 'source'].forEach(function (k) { if (incoming[k] !== undefined) cur[k] = incoming[k]; });
        if (incoming.tags !== undefined) cur.tags = String(incoming.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean);
        if (incoming.groups) cur.groups = incoming.groups;
        if (incoming.txnIds) cur.txnIds = incoming.txnIds;
        save();
        return { id: cur.id };
      }
      var phone = L().phoneDigits(incoming.phone), em2 = String(incoming.email || '').toLowerCase();
      if (!body.allowDuplicate) {
        var clash = db.clients.some(function (c) {
          return c.ownerId === me.id && ((em2 && String(c.email || '').toLowerCase() === em2) || (phone && L().phoneDigits(c.phone) === phone));
        });
        if (clash) fail('A client with this phone or email is already in the CRM.', 'DUPLICATE');
      }
      var created = {
        id: nid('c_'), ownerId: me.id, firstName: incoming.firstName || '', lastName: incoming.lastName || '', phone: incoming.phone || '',
        email: incoming.email || '', address: incoming.address || '', type: incoming.type || 'buyer', status: incoming.status || 'New Lead',
        source: incoming.source || 'Open House', tags: String(incoming.tags || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean),
        groups: incoming.groups || [], txnIds: incoming.txnIds || []
      };
      db.clients.push(created);
      if (incoming.note) db.notes.push({ id: nid('n_'), clientId: created.id, text: String(incoming.note), createdAt: now() });
      save();
      return { id: created.id };
    }
    if (action === 'crmAddNote') {
      var owner = null, ck;
      for (ck = 0; ck < db.clients.length; ck++) if (db.clients[ck].id === body.clientId && db.clients[ck].ownerId === me.id) owner = db.clients[ck];
      if (!owner) fail('Client not found.');
      var text = String(body.text || '').trim();
      if (!text) fail('Write a note first.');
      db.notes.push({ id: nid('n_'), clientId: owner.id, text: text, createdAt: now() });
      save();
      return {};
    }

    if (action === 'listHouses') {
      var list = db.houses.filter(function (h) { return h.agentId === me.id; }).map(houseOut);
      list.sort(function (a, b) {
        var ao = a.status === 'open' ? 0 : 1, bo = b.status === 'open' ? 0 : 1;
        if (ao !== bo) return ao - bo;
        return String(b.date).localeCompare(String(a.date)) || String(b.createdAt).localeCompare(String(a.createdAt));
      });
      return { houses: list, mode: 'demo' };
    }
    if (action === 'getHouse') {
      var h = ownHouse(me, body.id);
      var guests = guestsOf(h.id).map(guestOut).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      return { house: houseOut(h), guests: guests };
    }
    if (action === 'saveHouse') {
      var herr = L().validateHouse(body.house || {});
      if (herr) fail(herr, 'FIELDS');
      var src = body.house || {};
      var rec = body.id ? ownHouse(me, body.id) : null;
      if (!rec) {
        rec = { id: nid('h_'), agentId: me.id, agentName: [me.firstName, me.lastName].filter(Boolean).join(' ') || me.name, publicKey: nid('k'), createdAt: now(), status: 'open' };
        db.houses.push(rec);
      }
      rec.address = L().clean(src.address, 120);
      rec.unit = L().clean(src.unit, 20);
      rec.city = L().clean(src.city, 60);
      rec.state = L().clean(src.state || 'CA', 2).toUpperCase();
      rec.zip = L().clean(src.zip, 10);
      rec.date = L().clean(src.date, 10);
      rec.startTime = L().clean(src.startTime, 5);
      rec.endTime = L().clean(src.endTime, 5);
      rec.updatedAt = now();
      save();
      return { house: houseOut(rec) };
    }
    if (action === 'setHouseStatus') {
      var sh = ownHouse(me, body.id);
      if (body.status !== 'open' && body.status !== 'closed') fail('Unknown status.');
      sh.status = body.status;
      sh.updatedAt = now();
      save();
      return { house: houseOut(sh) };
    }
    if (action === 'deleteHouse') {
      var dh = ownHouse(me, body.id);
      if (guestsOf(dh.id).length) fail('This open house already has guests. End it instead of deleting it.');
      db.houses = db.houses.filter(function (h) { return h.id !== dh.id; });
      save();
      return {};
    }
    if (action === 'kioskSheet') {
      var kh = ownHouse(me, body.id);
      return { id: kh.id, status: kh.status, addressLine: L().addressLine(kh), whenLabel: L().whenLabel(kh), host: kh.agentName || '' };
    }
    if (action === 'addGuest') {
      var ah = ownHouse(me, body.houseId);
      if (ah.status !== 'open') fail('This open house sign-in is closed.', 'CLOSED');
      var gerr = L().validateGuest(body.guest || {});
      if (gerr) fail(gerr, 'FIELDS');
      var ng = L().normalizeGuest(body.guest || {});
      ng.id = nid('g_');
      ng.houseId = ah.id;
      ng.agentId = me.id;
      ng.via = body.via === 'kiosk' ? 'kiosk' : 'agent';
      ng.createdAt = now();
      ng.crmClientId = '';
      ng.crmStatus = 'pending';
      ng.crmError = '';
      db.guests.push(ng);
      ah.updatedAt = now();
      save();
      return { guest: guestOut(ng) };
    }
    if (action === 'markCrm') {
      var mg = null, mi;
      for (mi = 0; mi < db.guests.length; mi++) if (db.guests[mi].id === body.id && db.guests[mi].agentId === me.id) mg = db.guests[mi];
      if (!mg) fail('Guest not found.');
      mg.crmClientId = String(body.crmClientId || '');
      mg.crmStatus = body.crmStatus === 'synced' ? 'synced' : 'pending';
      mg.crmError = String(body.crmError || '').slice(0, 300);
      save();
      return { guest: guestOut(mg) };
    }
    fail('Unknown action.');
  }

  function call(body) {
    return new Promise(function (resolve, reject) {
      try { resolve(clone(dispatch(body))); }
      catch (e) { reject(e); }
    });
  }

  return { call: call, reset: reset };
});
