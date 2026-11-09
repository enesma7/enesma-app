/* Open House Dashboard — shared rules for the sign-in sheet, CRM tags, and the public response.
   Used by the browser and by node tests. The Apps Script copy in backend/Code.gs must stay in step. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.OHLogic = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Word for word, including the heading grammar in item 3. Shown at the bottom of every sign-in sheet. */
  var DISCLOSURE = [
    '1. AGENT DOES NOT REPRESENT VISITOR:',
    'Unless otherwise agreed in writing, Agent is not working with and has not entered into a representation agreement with Visitor that would apply to the Property.',
    '',
    '2. COMMUNICATION WITH AGENT AT OPEN HOUSE/PROPERTY TOUR FOR BENEFIT OF SELLER:',
    'Any communication or sharing of information that Agent has with Visitor during the open house/property tour regarding the Property is for the benefit of the seller. All acts of Agent at the open house/property tour, even those that assist Visitor in deciding whether to make an offer on the Property are for the benefit of the seller exclusively.',
    '',
    '3. COMMUNICATION WITH AGENT ARE NOT CONFIDENTIAL:',
    'Any information that Visitor reveals to Agent at the open house/property tour may be conveyed to the seller.',
    '',
    '4. IF VISITOR WRITES AN OFFER ON THE PROPERTY:',
    'If Visitor writes an offer on the Property through Agent, at that time Agent will disclose if Agent and Agent\'s Broker represent the seller exclusively or both the seller and the Visitor.',
    '',
    '5. IF VISITOR WANTS TO BE REPRESENTED BY THE AGENT HOLDING THE OPEN HOUSE:',
    'Visitor should sign a representation agreement with the Agent holding the open house such as a Property Showing and Representation Agreement (C.A.R. Form PSRA) or Buyer Representation and Broker Compensation Agreement (C.A.R. Form BRBC). If Visitor is in an exclusive relationship with another agent, this is not intended as a solicitation of Visitor.',
    '',
    '6. COMMISSIONS:',
    'Real estate broker commissions are not set by law and are fully negotiable.'
  ].join('\n');

  var INTENT = [
    { k: 'buyer', label: 'Buyer' },
    { k: 'seller', label: 'Seller' },
    { k: 'both', label: 'Buyer and seller', ui: 'Buyer and Seller' },
    { k: 'looking', label: 'Just looking', ui: 'Just Looking' }
  ];
  var PRE = [
    { k: 'yes', label: 'Yes', tag: 'Pre-approved' },
    { k: 'no', label: 'No', tag: 'Not Pre-approved' },
    { k: 'cash', label: 'Paying cash', tag: 'Cash', ui: 'Paying Cash' },
    { k: 'unsure', label: 'Not sure', tag: 'Pre-approval not sure', ui: 'Not Sure' }
  ];
  var TIME = [
    { k: 'now', label: 'Ready now', tag: 'Ready now', ui: 'Ready Now' },
    { k: '30', label: '1–3 months', tag: '1–3 months' },
    { k: '90', label: '3–6 months', tag: '3–6 months' },
    { k: '180', label: '6+ months', tag: '6+ months' },
    { k: 'browsing', label: 'Just browsing', tag: 'Just browsing', ui: 'Just Browsing' }
  ];
  var VIA = { agent: 'Entered by the agent', kiosk: 'iPad kiosk', phone: 'Visitor phone' };

  var DEMO_ADDRESSES = [
    { id: 'T-vista', address: '1420 Vista Del Mar', city: 'Riverside', state: 'CA', zip: '92506' },
    { id: 'T-canyon', address: '88 Canyon Crest Dr', city: 'Corona', state: 'CA', zip: '92882' },
    { id: 'T-mission', address: '3021 Mission Inn Ave', city: 'Riverside', state: 'CA', zip: '92507' },
    { id: 'T-orchard', address: '9 Orchard Ln', city: 'Fontana', state: 'CA', zip: '92335' },
    { id: 'T-lemon', address: '510 Lemon St', city: 'Riverside', state: 'CA', zip: '92501' },
    { id: 'T-magnolia', address: '77 Magnolia Ave', unit: '4', city: 'Riverside', state: 'CA', zip: '92506' },
    { id: 'T-arlington', address: '12 Arlington Ave', city: 'Riverside', state: 'CA', zip: '92503' },
    { id: 'T-palm', address: '450 Palm Dr', city: 'Moreno Valley', state: 'CA', zip: '92553' },
    { id: 'T-sunset', address: '2205 Sunset Ridge', city: 'Norco', state: 'CA', zip: '92860' }
  ];

  function labelOf(list, k) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i].k === k) return list[i].label;
    return '';
  }
  /* Button and pill text. `label` stays the CRM note/tag wording. */
  function displayOf(list, k) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i].k === k) return list[i].ui || list[i].label;
    return '';
  }
  function tagOf(list, k) {
    var i;
    for (i = 0; i < list.length; i++) if (list[i].k === k) return list[i].tag || list[i].label;
    return '';
  }
  function phoneDigits(v) {
    var d = String(v == null ? '' : v).replace(/\D/g, '');
    if (d.charAt(0) === '1' && d.length === 11) d = d.slice(1);
    return d;
  }
  function maskPhone(v) {
    var d = phoneDigits(v).slice(0, 10);
    if (d.length > 6) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
    if (d.length > 3) return d.slice(0, 3) + '-' + d.slice(3);
    return d;
  }
  function formatPhone(v) { return phoneDigits(v).length === 10 ? maskPhone(v) : ''; }
  function phoneOk(v) { return /^\d{3}-\d{3}-\d{4}$/.test(formatPhone(v)) && phoneDigits(v).length === 10; }
  function tagSafe(s) { return String(s || '').replace(/[,]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function clean(s, max) { s = String(s == null ? '' : s).replace(/[\u0000-\u001F]/g, ' ').trim(); if (max && s.length > max) s = s.slice(0, max); return s; }

  function addressLine(h) {
    h = h || {};
    var street = clean(h.address, 120);
    var unit = clean(h.unit, 20);
    if (unit && street.toLowerCase().indexOf(unit.toLowerCase()) < 0) street = (street + ' #' + unit.replace(/^#\s*/, '')).trim();
    var stateZip = [clean(h.state, 2).toUpperCase(), clean(h.zip, 10)].filter(Boolean).join(' ');
    var cityLine = [clean(h.city, 60), stateZip].filter(Boolean).join(', ');
    return [street, cityLine].filter(Boolean).join(', ');
  }
  function fmtTime(t) {
    var m = /^(\d{2}):(\d{2})$/.exec(String(t || ''));
    if (!m) return '';
    var h = parseInt(m[1], 10), ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return h + ':' + m[2] + ' ' + ap;
  }
  function fmtDay(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    if (!m) return '';
    var d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }
  function whenLabel(h) {
    var day = fmtDay(h && h.date);
    var a = fmtTime(h && h.startTime), b = fmtTime(h && h.endTime);
    var t = a && b ? a + '–' + b : (a || b);
    return [day, t].filter(Boolean).join(' · ');
  }
  function parseTitle(title) {
    var s = String(title || '').trim();
    if (!s || /^referral\b/i.test(s)) return { address: '', city: '', state: 'CA', zip: '' };
    var i = s.lastIndexOf(',');
    if (i < 0) return { address: s, city: '', state: 'CA', zip: '' };
    return { address: s.slice(0, i).trim(), city: s.slice(i + 1).trim(), state: 'CA', zip: '' };
  }
  function addrHay(a) { return (String(a.address || '') + ' ' + String(a.unit || '') + ' ' + String(a.city || '') + ' ' + String(a.zip || '')).toLowerCase(); }
  function filterAddresses(catalog, q) {
    var n = String(q || '').toLowerCase().trim();
    if (n.length < 2) return [];
    var terms = n.split(/\s+/);
    var out = [], i;
    for (i = 0; i < (catalog || []).length; i++) {
      var hay = addrHay(catalog[i]);
      if (!terms.every(function (t) { return hay.indexOf(t) >= 0; })) continue;
      out.push(catalog[i]);
      if (out.length === 8) break;
    }
    return out;
  }

  function normalizeGuest(g) {
    g = g || {};
    return {
      firstName: clean(g.firstName, 50),
      lastName: clean(g.lastName, 50),
      phone: phoneDigits(g.phone).length === 10 ? formatPhone(g.phone) : clean(g.phone, 20),
      email: clean(g.email, 120).toLowerCase(),
      intent: clean(g.intent, 20),
      hasAgent: g.hasAgent === 'yes' ? 'yes' : g.hasAgent === 'no' ? 'no' : '',
      otherAgent: g.hasAgent === 'yes' ? clean(g.otherAgent, 80) : '',
      preApproved: clean(g.preApproved, 20),
      timeframe: clean(g.timeframe, 20),
      note: clean(g.note, 2000)
    };
  }
  function validateGuest(raw) {
    var g = normalizeGuest(raw);
    if (!g.firstName) return 'Enter a first name.';
    if (!g.lastName) return 'Enter a last name.';
    if (phoneDigits(raw && raw.phone).length !== 10) return 'Phone must be a 10-digit number (000-000-0000).';
    if (g.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(g.email)) return 'Email address is not valid.';
    if (!labelOf(INTENT, g.intent)) return 'Choose whether you are buying, selling, or just looking.';
    if (!g.hasAgent) return 'Let us know if you already have an agent.';
    if (!labelOf(PRE, g.preApproved)) return 'Let us know if you are pre-approved.';
    if (!labelOf(TIME, g.timeframe)) return 'Choose a timeframe.';
    return '';
  }
  function validateHouse(raw) {
    raw = raw || {};
    var address = clean(raw.address, 120), city = clean(raw.city, 60), state = clean(raw.state || 'CA', 2).toUpperCase(), zip = clean(raw.zip, 10);
    var date = clean(raw.date, 10), start = clean(raw.startTime, 5), end = clean(raw.endTime, 5);
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

  function buildTags(guest, house) {
    var tags = ['Open House', tagSafe(house && house.address), labelOf(INTENT, guest.intent), guest.hasAgent === 'yes' ? 'Has Agent' : 'No Agent', tagOf(PRE, guest.preApproved), tagOf(TIME, guest.timeframe)];
    var seen = {}, out = [], i, t, k;
    for (i = 0; i < tags.length; i++) {
      t = tagSafe(tags[i]);
      k = t.toLowerCase();
      if (!t || seen[k]) continue;
      seen[k] = 1;
      out.push(t);
    }
    return out;
  }
  function buildNote(guest, house) {
    var lines = ['Open house sign-in — ' + addressLine(house)];
    var when = whenLabel(house);
    if (when) lines.push(when);
    lines.push('Looking to: ' + labelOf(INTENT, guest.intent));
    lines.push('Has an agent: ' + (guest.hasAgent === 'yes' ? 'Yes' + (guest.otherAgent ? ' — ' + guest.otherAgent : '') : 'No'));
    lines.push('Pre-approved: ' + labelOf(PRE, guest.preApproved));
    lines.push('Timeframe: ' + labelOf(TIME, guest.timeframe));
    lines.push('Signed in: ' + (VIA[guest.via] || 'Sign-in sheet'));
    if (guest.note) lines.push('Visitor note: ' + guest.note);
    if (guest.id) lines.push('Ref: ' + guest.id);
    return lines.join('\n');
  }

  function pickType(types, intent) {
    var keys = Object.keys(types || {}), i, k, tests, j;
    tests = intent === 'seller' ? [/sell/i] : intent === 'both' ? [/both/i, /buy/i] : [/buy/i];
    for (j = 0; j < tests.length; j++) {
      for (i = 0; i < keys.length; i++) {
        k = keys[i];
        if (tests[j].test(k) || tests[j].test(String(types[k] || ''))) return k;
      }
    }
    return keys[0] || (intent === 'seller' ? 'seller' : 'buyer');
  }
  function sameTag(list, tag) {
    var n = String(tag || '').toLowerCase(), i;
    for (i = 0; i < (list || []).length; i++) if (String(list[i] || '').toLowerCase() === n) return true;
    return false;
  }
  function crmPlan(guest, house, boot) {
    boot = boot || {};
    var clients = boot.clients || [];
    var tags = buildTags(guest, house);
    var note = buildNote(guest, house);
    var phone = phoneDigits(guest.phone);
    var email = String(guest.email || '').toLowerCase();
    var i, c, cp, ce, match = null;
    for (i = 0; i < clients.length; i++) {
      c = clients[i];
      cp = phoneDigits(c.phone);
      ce = String(c.email || '').toLowerCase();
      if ((email && ce === email) || (phone && cp && cp === phone)) { match = c; break; }
    }
    if (match) {
      var merged = (match.tags || []).slice(), t;
      for (i = 0; i < tags.length; i++) if (!sameTag(merged, tags[i])) merged.push(tags[i]);
      return {
        matchId: match.id,
        note: note,
        ref: guest.id,
        client: {
          firstName: match.firstName || guest.firstName,
          lastName: match.lastName || guest.lastName,
          phone: match.phone || guest.phone,
          email: match.email || guest.email || '',
          address: match.address || addressLine(house),
          type: match.type,
          status: match.status || 'New Lead',
          source: match.source || 'Open House',
          tags: merged.join(', '),
          groups: match.groups || [],
          txnIds: match.txnIds || []
        }
      };
    }
    return {
      matchId: '',
      note: note,
      ref: guest.id,
      client: {
        firstName: guest.firstName,
        lastName: guest.lastName,
        phone: guest.phone,
        email: guest.email || '',
        address: addressLine(house),
        type: pickType(boot.types, guest.intent),
        status: 'New Lead',
        source: 'Open House',
        tags: tags.join(', '),
        groups: [],
        txnIds: [],
        note: note
      }
    };
  }

  /* Public sign-in may see only these fields. Guest rows never ride along. */
  var PUBLIC_KEYS = ['addressLine', 'whenLabel', 'host', 'open'];
  function toPublicSheet(house) {
    var open = !!(house && house.status === 'open');
    return {
      addressLine: addressLine(house || {}),
      whenLabel: whenLabel(house || {}),
      host: clean(house && house.agentName, 80),
      open: open
    };
  }

  return {
    DISCLOSURE: DISCLOSURE,
    INTENT: INTENT,
    PRE: PRE,
    TIME: TIME,
    VIA: VIA,
    DEMO_ADDRESSES: DEMO_ADDRESSES,
    PUBLIC_KEYS: PUBLIC_KEYS,
    labelOf: labelOf,
    displayOf: displayOf,
    phoneDigits: phoneDigits,
    maskPhone: maskPhone,
    formatPhone: formatPhone,
    phoneOk: phoneOk,
    addressLine: addressLine,
    fmtTime: fmtTime,
    fmtDay: fmtDay,
    whenLabel: whenLabel,
    parseTitle: parseTitle,
    filterAddresses: filterAddresses,
    normalizeGuest: normalizeGuest,
    validateGuest: validateGuest,
    validateHouse: validateHouse,
    buildTags: buildTags,
    buildNote: buildNote,
    pickType: pickType,
    crmPlan: crmPlan,
    toPublicSheet: toPublicSheet,
    clean: clean
  };
});
