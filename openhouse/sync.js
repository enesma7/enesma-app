/* Push one sign-in into the agent's CRM. Safe to run again: a second pass finds the same client and will not add a second copy of the note. */
(function (root, factory) {
  var api = factory(function () {
    if (root.OHLogic) return root.OHLogic;
    if (typeof require === 'function') return require('./logic.js');
    throw new Error('Open House logic is missing.');
  });
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OHSync = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (getLogic) {
  'use strict';

  function refLine(id) { return 'Ref: ' + id; }
  function hasRef(notes, id) {
    var needle = refLine(id);
    var i;
    for (i = 0; i < (notes || []).length; i++) if (String(notes[i].text || '').indexOf(needle) >= 0) return true;
    return false;
  }
  function saveClient(api, guest, house, boot) {
    var L = getLogic();
    var plan = L.crmPlan(guest, house, boot || {});
    var body = plan.matchId ? { id: plan.matchId, client: plan.client } : { client: plan.client };
    return api('crmSaveClient', body).then(function (r) {
      return { id: (r && (r.id || (r.client && r.client.id))) || plan.matchId, plan: plan };
    }).catch(function (e) {
      if (e.code !== 'DUPLICATE') throw e;
      return api('crmBoot', {}).then(function (again) {
        var plan2 = L.crmPlan(guest, house, again || {});
        if (!plan2.matchId) return api('crmSaveClient', { client: plan2.client, allowDuplicate: true }).then(function (r) { return { id: r && r.id, plan: plan2 }; });
        return api('crmSaveClient', { id: plan2.matchId, client: plan2.client }).then(function (r) { return { id: (r && r.id) || plan2.matchId, plan: plan2 }; });
      });
    });
  }
  function ensureNote(api, clientId, plan) {
    if (!clientId || !plan || !plan.ref) return Promise.resolve();
    return api('crmGetClient', { id: clientId }).then(function (pack) {
      if (hasRef(pack && pack.notes, plan.ref)) return;
      if (!plan.matchId) return; /* the create call already stored the note */
      return api('crmAddNote', { clientId: clientId, text: plan.note });
    }).catch(function () {
      if (plan.matchId) return api('crmAddNote', { clientId: clientId, text: plan.note });
    });
  }
  function syncGuest(api, guest, house) {
    if (!guest || guest.crmStatus === 'synced') return Promise.resolve(guest);
    return api('crmBoot', {}).then(function (boot) {
      return saveClient(api, guest, house, boot);
    }).then(function (saved) {
      if (!saved.id) throw new Error('CRM did not return a client.');
      return ensureNote(api, saved.id, saved.plan).then(function () { return saved.id; });
    }).then(function (clientId) {
      return api('markCrm', { id: guest.id, crmClientId: clientId, crmStatus: 'synced', crmError: '' }).then(function (r) {
        return (r && r.guest) || Object.assign({}, guest, { crmClientId: clientId, crmStatus: 'synced', crmError: '' });
      });
    }).catch(function (e) {
      return api('markCrm', { id: guest.id, crmClientId: guest.crmClientId || '', crmStatus: 'pending', crmError: e.message || 'CRM sync failed' }).catch(function () { return null; }).then(function () {
        throw e;
      });
    });
  }

  return { syncGuest: syncGuest, hasRef: hasRef };
});
