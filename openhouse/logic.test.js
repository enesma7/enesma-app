/* node --test openhouse/logic.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./logic.js');

const DISCLOSURE = [
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

test('disclosure is the owner text, word for word', function () {
  assert.equal(L.DISCLOSURE, DISCLOSURE);
  assert.match(L.DISCLOSURE, /COMMUNICATION WITH AGENT ARE NOT CONFIDENTIAL/);
  assert.match(L.DISCLOSURE, /Property Showing and Representation Agreement \(C\.A\.R\. Form PSRA\)/);
  assert.match(L.DISCLOSURE, /Buyer Representation and Broker Compensation Agreement \(C\.A\.R\. Form BRBC\)/);
});

test('phone normalizes a leading 1 and rejects short numbers', function () {
  assert.equal(L.formatPhone('+1 (951) 555-0100'), '951-555-0100');
  assert.equal(L.phoneDigits('9515550100'), '9515550100');
  assert.equal(L.validateGuest({ firstName: 'A', lastName: 'B', phone: '951-555', intent: 'buyer', hasAgent: 'no', preApproved: 'yes', timeframe: 'now' }), 'Phone must be a 10-digit number (000-000-0000).');
});

test('tags and note follow the answers', function () {
  const house = { address: '1420 Vista Del Mar', city: 'Riverside', state: 'CA', zip: '92506', date: '2026-11-09', startTime: '13:00', endTime: '16:00' };
  const guest = L.normalizeGuest({ id: 'g1', firstName: 'Jordan', lastName: 'Lee', phone: '9515550100', email: 'J@Example.com', intent: 'buyer', hasAgent: 'no', preApproved: 'yes', timeframe: '30', note: 'Needs a yard', via: 'kiosk' });
  guest.id = 'g1';
  guest.via = 'kiosk';
  assert.deepEqual(L.buildTags(guest, house), ['Open House', '1420 Vista Del Mar', 'Buyer', 'No Agent', 'Pre-approved', '1–3 months']);
  const note = L.buildNote(guest, house);
  assert.match(note, /Open house sign-in — 1420 Vista Del Mar, Riverside, CA 92506/);
  assert.match(note, /Looking to: Buyer/);
  assert.match(note, /Has an agent: No/);
  assert.match(note, /Pre-approved: Yes/);
  assert.match(note, /Timeframe: 1–3 months/);
  assert.match(note, /Signed in: iPad kiosk/);
  assert.match(note, /Visitor note: Needs a yard/);
  assert.match(note, /Ref: g1/);
  assert.equal(guest.email, 'j@example.com');
});

test('seller with an agent is tagged and noted', function () {
  const house = { address: '9 Orchard Ln', city: 'Fontana', state: 'CA', zip: '92335', date: '2026-11-01' };
  const guest = Object.assign(L.normalizeGuest({ firstName: 'Sam', lastName: 'Patel', phone: '9515550199', intent: 'seller', hasAgent: 'yes', otherAgent: 'Riley Chen', preApproved: 'unsure', timeframe: '90' }), { id: 'g2', via: 'phone' });
  assert.ok(L.buildTags(guest, house).indexOf('Seller') >= 0);
  assert.ok(L.buildTags(guest, house).indexOf('Has Agent') >= 0);
  assert.match(L.buildNote(guest, house), /Has an agent: Yes — Riley Chen/);
  assert.match(L.buildNote(guest, house), /Signed in: Visitor phone/);
});

test('address typeahead matches Transaction Center streets and ignores short queries', function () {
  assert.equal(L.filterAddresses(L.DEMO_ADDRESSES, 'v').length, 0);
  const hits = L.filterAddresses(L.DEMO_ADDRESSES, 'vista');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].address, '1420 Vista Del Mar');
  assert.equal(L.filterAddresses(L.DEMO_ADDRESSES, 'riverside 92506').length >= 2, true);
  const parsed = L.parseTitle('1420 Vista Del Mar, Riverside');
  assert.equal(parsed.address, '1420 Vista Del Mar');
  assert.equal(parsed.city, 'Riverside');
  assert.equal(L.parseTitle('Referral – Paula Diaz').address, '');
});

test('public sheet exposes no guest fields', function () {
  const house = {
    id: 'h1', status: 'open', agentName: 'Alex Rivera', agentEmail: 'alex@enesmarealty.com', publicKey: 'secret-key',
    address: '1420 Vista Del Mar', city: 'Riverside', state: 'CA', zip: '92506', date: '2026-11-09', startTime: '13:00', endTime: '16:00',
    guests: [{ firstName: 'Jordan', lastName: 'Lee', phone: '951-555-0100', email: 'j@example.com', note: 'private' }]
  };
  const pub = L.toPublicSheet(house);
  assert.deepEqual(Object.keys(pub).sort(), L.PUBLIC_KEYS.slice().sort());
  const blob = JSON.stringify(pub);
  assert.equal(blob.indexOf('Jordan'), -1);
  assert.equal(blob.indexOf('951-555'), -1);
  assert.equal(blob.indexOf('secret-key'), -1);
  assert.equal(blob.indexOf('alex@'), -1);
  assert.equal(pub.open, true);
  assert.match(pub.addressLine, /1420 Vista Del Mar/);
  assert.equal(L.toPublicSheet(Object.assign({}, house, { status: 'closed' })).open, false);
});

test('CRM plan updates a matching client and creates a buyer when new', function () {
  const house = { address: '1420 Vista Del Mar', city: 'Riverside', state: 'CA', zip: '92506', date: '2026-11-09' };
  const guest = Object.assign(L.normalizeGuest({ firstName: 'Jordan', lastName: 'Lee', phone: '951-555-0100', email: 'j@example.com', intent: 'buyer', hasAgent: 'no', preApproved: 'yes', timeframe: 'now' }), { id: 'g9', via: 'agent' });
  const boot = {
    types: { buyer: 'Buyer', seller: 'Seller' },
    clients: [{ id: 'c1', firstName: 'Jordan', lastName: 'Lee', phone: '951-555-0100', email: 'j@example.com', type: 'buyer', status: 'Active', source: 'Referral', tags: ['VIP'], groups: ['g'], txnIds: ['t'], address: '1 Home St' }]
  };
  const plan = L.crmPlan(guest, house, boot);
  assert.equal(plan.matchId, 'c1');
  assert.equal(plan.client.status, 'Active');
  assert.equal(plan.client.source, 'Referral');
  assert.match(plan.client.tags, /VIP/);
  assert.match(plan.client.tags, /Open House/);
  assert.match(plan.client.tags, /Pre-approved/);
  assert.equal(plan.client.note, undefined);
  const created = L.crmPlan(Object.assign({}, guest, { id: 'g10', phone: '951-555-0198', email: 'new@example.com' }), house, boot);
  assert.equal(created.matchId, '');
  assert.equal(created.client.type, 'buyer');
  assert.equal(created.client.status, 'New Lead');
  assert.equal(created.client.source, 'Open House');
  assert.equal(created.client.note, created.note);
});

test('upcoming is still open and not yet ended; YTD is this calendar year', function () {
  const now = new Date(2026, 10, 10, 15, 0, 0); // Tue Nov 10, 2026, 3:00 PM local
  const today = { status: 'open', date: '2026-11-10', startTime: '13:00', endTime: '16:00' };
  const laterToday = { status: 'open', date: '2026-11-10', startTime: '11:00', endTime: '14:00' };
  const tomorrow = { status: 'open', date: '2026-11-14', startTime: '11:00', endTime: '14:00' };
  const ended = { status: 'closed', date: '2026-11-14', startTime: '11:00', endTime: '14:00' };
  const past = { status: 'open', date: '2026-11-04', startTime: '12:00', endTime: '15:00' };
  const noEnd = { status: 'open', date: '2026-11-10' };
  const lastYear = { status: 'closed', date: '2025-12-20', startTime: '11:00', endTime: '14:00' };
  const nextYear = { status: 'open', date: '2027-01-03', startTime: '11:00', endTime: '14:00' };
  assert.equal(L.isUpcoming(today, now), true);
  assert.equal(L.isUpcoming(laterToday, now), false);
  assert.equal(L.isUpcoming(tomorrow, now), true);
  assert.equal(L.isUpcoming(ended, now), false);
  assert.equal(L.isUpcoming(past, now), false);
  assert.equal(L.isUpcoming(noEnd, now), true);
  assert.equal(L.isUpcoming({ status: 'open' }, now), false);
  assert.equal(L.isOpenHouseYtd(today, now), true);
  assert.equal(L.isOpenHouseYtd(past, now), true);
  assert.equal(L.isOpenHouseYtd(ended, now), true);
  assert.equal(L.isOpenHouseYtd(lastYear, now), false);
  assert.equal(L.isOpenHouseYtd(nextYear, now), false);
  assert.equal(L.isUpcoming(nextYear, now), true);
});

test('house validation accepts a typed address and rejects a backwards time', function () {
  assert.equal(L.validateHouse({ address: '10 Main St', city: 'Riverside', state: 'ca', zip: '92501', date: '2026-11-09', startTime: '13:00', endTime: '16:00' }), '');
  assert.match(L.validateHouse({ address: '10', city: 'Riverside', date: '2026-11-09' }), /street address/);
  assert.match(L.validateHouse({ address: '10 Main St', city: 'Riverside', date: '2026-11-09', startTime: '16:00', endTime: '13:00' }), /End time/);
});
