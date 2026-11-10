/* node --test openhouse/demo.test.js */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const demo = require('./demo.js');
const sync = require('./sync.js');
const L = require('./logic.js');

function guest(over) {
  return Object.assign({
    firstName: 'Mina', lastName: 'Ortiz', phone: '951-555-0123', email: 'mina@example.com',
    intent: 'buyer', hasAgent: 'no', preApproved: 'yes', timeframe: 'now', note: 'Wants a single story'
  }, over || {});
}

test('public sign-in cannot read other guests', async function () {
  demo.reset();
  const sheet = await demo.call({ action: 'publicSheet', key: 'demo-vista-key' });
  assert.deepEqual(Object.keys(sheet).sort(), L.PUBLIC_KEYS.slice().sort());
  const blob = JSON.stringify(sheet);
  assert.equal(blob.includes('Jordan'), false);
  assert.equal(blob.includes('951-555-0142'), false);
  assert.equal(blob.includes('demo-vista-key'), false);
  await demo.call({ action: 'publicSubmit', key: 'demo-vista-key', guest: guest() });
  const again = await demo.call({ action: 'publicSheet', key: 'demo-vista-key' });
  assert.equal(JSON.stringify(again).includes('Mina'), false);
  await assert.rejects(demo.call({ action: 'listHouses' }), /sign in/i);
  await assert.rejects(demo.call({ action: 'getHouse', id: 'h_vista' }), /sign in/i);
  const closed = await demo.call({ action: 'publicSheet', key: 'demo-canyon-key' });
  assert.equal(closed.open, false);
  await assert.rejects(demo.call({ action: 'publicSubmit', key: 'demo-canyon-key', guest: guest({ phone: '951-555-0191', email: 'x@example.com' }) }), /closed/i);
});

test('a signed-in agent keeps history and the CRM plan is applied once', async function () {
  demo.reset();
  const login = await demo.call({ action: 'login', username: 'agent@demo.test', password: 'demo' });
  const token = login.token;
  const added = await demo.call({ action: 'addGuest', token: token, houseId: 'h_sunset', via: 'kiosk', guest: guest({ phone: '951-555-0108', email: 'mina.sunset@example.com' }) });
  assert.equal(added.guest.crmStatus, 'pending');
  assert.equal(added.guest.via, 'kiosk');
  const house = (await demo.call({ action: 'getHouse', token: token, id: 'h_sunset' })).house;
  const api = function (action, params) { return demo.call(Object.assign({ action: action, token: token }, params || {})); };
  const saved = await sync.syncGuest(api, added.guest, house);
  assert.equal(saved.crmStatus, 'synced');
  const boot = await demo.call({ action: 'crmBoot', token: token });
  const client = boot.clients.filter(function (c) { return c.email === 'mina.sunset@example.com'; })[0];
  assert.ok(client);
  assert.ok(client.tags.indexOf('Open House') >= 0);
  assert.ok(client.tags.indexOf('2205 Sunset Ridge') >= 0);
  assert.ok(client.tags.indexOf('Buyer') >= 0);
  assert.ok(client.tags.indexOf('No Agent') >= 0);
  assert.ok(client.tags.indexOf('Pre-approved') >= 0);
  assert.ok(client.tags.indexOf('Ready now') >= 0);
  assert.equal(client.source, 'Open House');
  const pack = await demo.call({ action: 'crmGetClient', token: token, id: client.id });
  assert.equal(pack.notes.length, 1);
  assert.match(pack.notes[0].text, /Wants a single story/);
  assert.match(pack.notes[0].text, /Has an agent: No/);
  await sync.syncGuest(api, saved, house);
  const pack2 = await demo.call({ action: 'crmGetClient', token: token, id: client.id });
  assert.equal(pack2.notes.length, 1);
  const list = await demo.call({ action: 'listHouses', token: token });
  assert.equal(list.houses.some(function (h) { return h.id === 'h_vista' && h.guestCount === 3; }), true);
});

test('the public page source does not request guest history', function () {
  const sign = fs.readFileSync(path.join(__dirname, 'sign.js'), 'utf8');
  ['listHouses', 'getHouse', 'kioskSheet', 'crmBoot', 'crmGetClient', 'addGuest'].forEach(function (name) {
    assert.equal(sign.includes(name), false, name);
  });
  assert.equal(sign.includes('publicSheet'), true);
  assert.equal(sign.includes('publicSubmit'), true);
});

test('dashboard copy uses the wordmark, Upcoming, and Guests in CRM', function () {
  const sheet = fs.readFileSync(path.join(__dirname, 'sheet.js'), 'utf8');
  const app = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  const gs = fs.readFileSync(path.join(__dirname, 'backend', 'Code.gs'), 'utf8');
  assert.equal(sheet.includes('>ENESMA Realty<'), false);
  assert.equal(sheet.includes('I Am Here to'), false);
  assert.equal(sheet.includes('logo-black.png?v=1'), true);
  assert.equal(sheet.includes('I Am:'), true);
  assert.equal(sheet.includes('>Sign In<'), true);
  assert.equal(app.includes('Open Houses YTD'), true);
  assert.equal(app.includes('>Upcoming<'), true);
  assert.equal(app.includes('Guests in CRM'), true);
  assert.equal(app.includes('Open Now'), false);
  assert.equal(app.includes('head: false'), true);
  assert.match(gs, /OH_VERSION = '1\.1\.1'/);
  assert.match(gs, /method:\s*'get'/);
});

test('the Apps Script file keeps the same CRM tags and a submit-only public response', function () {
  const gs = fs.readFileSync(path.join(__dirname, 'backend', 'Code.gs'), 'utf8');
  ['Open House', 'Has Agent', 'No Agent', 'Pre-approved', 'Not Pre-approved', 'Ready now', '1–3 months'].forEach(function (tag) {
    assert.equal(gs.includes(tag), true, tag);
  });
  assert.equal(gs.includes('received: true'), true);
  assert.equal(gs.includes("action === 'listHouses'"), true);
  assert.equal(gs.includes('requireAgent_'), true);
});
