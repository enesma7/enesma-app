/* Transaction Center demo backend: in-memory sample data, nothing leaves the browser. Mirrors Code.gs response shapes. */
(function () {
'use strict';
var CHECKLISTS = {
  listing: [
    { code: 'LISTING', title: 'Listing', forms: 'RLA · Residential Listing Agreement', req: true },
    { code: 'AD_L', title: 'Disclosure Regarding Real Estate Agency Relationship', forms: 'AD', req: true },
    { code: 'PRBS_L', title: 'Possible Representation of More Than One Buyer or Seller', forms: 'PRBS', req: true },
    { code: 'FHDA_L', title: 'Fair Housing & Discrimination Advisory', forms: 'FHDA', req: true },
    { code: 'SBSA_L', title: 'Statewide Buyer and Seller Advisory', forms: 'SBSA', req: true },
    { code: 'SA', title: "Seller's Advisory", forms: 'SA', req: true },
    { code: 'WFA_L', title: 'Wire Fraud and Electronic Funds Transfer Advisory', forms: 'WFA', req: true },
    { code: 'MCA_L', title: 'Market Conditions Advisory', forms: 'MCA', req: false },
    { code: 'SPQ', title: 'Seller Property Questionnaire', forms: 'SPQ', req: true },
    { code: 'TDS', title: 'Real Estate Transfer Disclosure Statement', forms: 'TDS', req: true },
    { code: 'NHD', title: 'Natural Hazard Disclosure Statement & Report', forms: 'NHD', req: true },
    { code: 'WHSD', title: 'Water Heater & Smoke/CO Detector Statement of Compliance', forms: 'WHSD', req: true },
    { code: 'FLD_L', title: 'Lead-Based Paint Disclosure (pre-1978 homes)', forms: 'FLD', req: false },
    { code: 'SELI', title: 'MLS Input / Seller Instruction to Exclude Listing', forms: 'MLS · SELI', req: false },
    { code: 'MISC_L1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_L2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_LISTING', title: 'Cancellation of Listing', forms: 'CL · Required to request cancellation', req: false, cancel: true }
  ],
  // Items added when a listing converts to a purchase (we represent the seller).
  purchase_seller: [
    { code: 'RPA', title: 'Residential Purchase Agreement', forms: 'RPA', req: true },
    { code: 'COUNTERS', title: 'Counter Offers', forms: 'SCO · BCO · SMCO', req: false },
    { code: 'ADDENDA', title: 'Addenda & Amendments', forms: 'ADM · AEA', req: false },
    { code: 'ESCROW', title: 'Escrow Instructions', forms: 'Escrow opening & signed instructions', req: true },
    { code: 'EMD', title: 'Earnest Money Deposit Receipt', forms: 'EMD receipt from escrow', req: true },
    { code: 'DISCL_SIGNED', title: 'Seller Disclosures Signed by Buyer', forms: 'TDS · SPQ · NHD · AVID', req: true },
    { code: 'RR', title: 'Request for Repair & Seller Response', forms: 'RR · RRRR', req: false },
    { code: 'CR', title: 'Contingency Removal', forms: 'CR-B', req: true },
    { code: 'VP', title: 'Verification of Property Condition', forms: 'VP', req: true },
    { code: 'CDA', title: 'Commission Instructions', forms: 'CDA', req: true },
    { code: 'CLOSING', title: 'Final Closing Statement', forms: 'Final settlement statement', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_P2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Contract', forms: 'CC · Required to request cancellation', req: false, cancel: true }
  ],
  // Purchase where we represent the buyer.
  purchase_buyer: [
    { code: 'BRBC', title: 'Buyer Representation and Broker Compensation Agreement', forms: 'BRBC', req: true },
    { code: 'AD_B', title: 'Disclosure Regarding Real Estate Agency Relationship', forms: 'AD', req: true },
    { code: 'PRBS_B', title: 'Possible Representation of More Than One Buyer or Seller', forms: 'PRBS', req: true },
    { code: 'FHDA_B', title: 'Fair Housing & Discrimination Advisory', forms: 'FHDA', req: true },
    { code: 'SBSA_B', title: 'Statewide Buyer and Seller Advisory', forms: 'SBSA', req: true },
    { code: 'BIA', title: "Buyer's Inspection Advisory", forms: 'BIA', req: true },
    { code: 'WFA_B', title: 'Wire Fraud and Electronic Funds Transfer Advisory', forms: 'WFA', req: true },
    { code: 'PREAPPROVAL', title: 'Pre-Approval / Proof of Funds', forms: 'Lender letter or POF', req: true },
    { code: 'RPA', title: 'Residential Purchase Agreement', forms: 'RPA', req: true },
    { code: 'COUNTERS', title: 'Counter Offers', forms: 'SCO · BCO · SMCO', req: false },
    { code: 'ADDENDA', title: 'Addenda & Amendments', forms: 'ADM · AEA', req: false },
    { code: 'ESCROW', title: 'Escrow Instructions', forms: 'Escrow opening & signed instructions', req: true },
    { code: 'EMD', title: 'Earnest Money Deposit Receipt', forms: 'EMD receipt from escrow', req: true },
    { code: 'DISCL_RECEIVED', title: 'Seller Disclosures Received & Signed', forms: 'TDS · SPQ · NHD · AVID', req: true },
    { code: 'FLD_B', title: 'Lead-Based Paint Disclosure (pre-1978 homes)', forms: 'FLD', req: false },
    { code: 'INSPECTION', title: 'Inspection Reports', forms: 'Home inspection & other reports', req: false },
    { code: 'RR', title: 'Request for Repair & Seller Response', forms: 'RR · RRRR', req: false },
    { code: 'CR', title: 'Contingency Removal', forms: 'CR-B', req: true },
    { code: 'VP', title: 'Verification of Property Condition', forms: 'VP', req: true },
    { code: 'CDA', title: 'Commission Instructions', forms: 'CDA', req: true },
    { code: 'CLOSING', title: 'Final Closing Statement', forms: 'Final settlement statement', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_P2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Contract', forms: 'CC · Required to request cancellation', req: false, cancel: true }
  ],
  lease_listing: [
    { code: 'LISTING', title: 'Listing', forms: 'LL · Lease Listing Agreement', req: true },
    { code: 'AD_L', title: 'Disclosure Regarding Real Estate Agency Relationship', forms: 'AD', req: true },
    { code: 'FHDA_L', title: 'Fair Housing & Discrimination Advisory', forms: 'FHDA', req: true },
    { code: 'WFA_L', title: 'Wire Fraud and Electronic Funds Transfer Advisory', forms: 'WFA', req: true },
    { code: 'FLD_L', title: 'Lead-Based Paint Disclosure (pre-1978 homes)', forms: 'FLD', req: false },
    { code: 'MISC_L1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_L2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_LISTING', title: 'Cancellation of Listing', forms: 'CL · Required to request cancellation', req: false, cancel: true }
  ],
  // Added when a lease listing converts to a lease (tenant found), or used for a lease we start on the landlord side.
  lease_landlord: [
    { code: 'LR', title: 'Residential Lease or Month-to-Month Rental Agreement', forms: 'LR', req: true },
    { code: 'LRA', title: 'Application to Rent & Screening', forms: 'LRA', req: true },
    { code: 'MIMO', title: 'Move In / Move Out Inspection', forms: 'MIMO', req: true },
    { code: 'BBD', title: 'Bed Bug Disclosure', forms: 'BBD', req: true },
    { code: 'LEASE_ADD', title: 'Lease Addenda', forms: 'ADM · Pet, parking or HOA addenda', req: false },
    { code: 'DEPOSIT', title: 'Security Deposit / Move-In Funds Receipt', forms: 'Receipt', req: true },
    { code: 'CDA', title: 'Commission Instructions', forms: 'CDA', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_P2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Contract', forms: 'CC · Required to request cancellation', req: false, cancel: true }
  ],
  // Lease where we represent the tenant.
  lease_tenant: [
    { code: 'AD_B', title: 'Disclosure Regarding Real Estate Agency Relationship', forms: 'AD', req: true },
    { code: 'FHDA_B', title: 'Fair Housing & Discrimination Advisory', forms: 'FHDA', req: true },
    { code: 'WFA_B', title: 'Wire Fraud and Electronic Funds Transfer Advisory', forms: 'WFA', req: true },
    { code: 'LRA', title: 'Application to Rent & Screening', forms: 'LRA', req: true },
    { code: 'LR', title: 'Residential Lease or Month-to-Month Rental Agreement', forms: 'LR', req: true },
    { code: 'MIMO', title: 'Move In / Move Out Inspection', forms: 'MIMO', req: true },
    { code: 'BBD', title: 'Bed Bug Disclosure', forms: 'BBD', req: true },
    { code: 'FLD_B', title: 'Lead-Based Paint Disclosure (pre-1978 homes)', forms: 'FLD', req: false },
    { code: 'CDA', title: 'Commission Instructions', forms: 'CDA', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'MISC_P2', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Contract', forms: 'CC · Required to request cancellation', req: false, cancel: true }
  ],
  referral: [
    { code: 'RFA', title: 'Referral Agreement', forms: 'RFA · Signed by both brokers', req: true },
    { code: 'REF_CLIENT', title: 'Client Contact / Introduction Confirmation', forms: 'Email or signed intro', req: false },
    { code: 'REF_CLOSE', title: 'Proof of Close', forms: 'Closing statement or receiving broker confirmation', req: true },
    { code: 'CDA', title: 'Commission Instructions / Referral Fee Invoice', forms: 'CDA · Invoice', req: true },
    { code: 'MISC_P1', title: 'Misc', forms: 'Rename to what you uploaded', req: false, misc: true },
    { code: 'CANCEL_CONTRACT', title: 'Cancellation of Referral', forms: 'Written cancellation · Required to request cancellation', req: false, cancel: true }
  ]
};

/** Which template groups apply for a type/side. Order matters: first group's items come first. */
function checklistGroups_(type, side) {
  if (type === 'listing') return ['listing'];
  if (type === 'purchase') {
    if (side === 'seller') return ['listing', 'purchase_seller'];
    if (side === 'both') return ['listing', 'purchase_buyer'];
    return ['purchase_buyer'];
  }
  if (type === 'lease_listing') return ['lease_listing'];
  if (type === 'lease') {
    if (side === 'landlord') return ['lease_listing', 'lease_landlord'];
    if (side === 'both') return ['lease_listing', 'lease_tenant'];
    return ['lease_tenant'];
  }
  if (type === 'referral') return ['referral'];
  throw new Error('Unknown transaction type');
}

/** Flattened template list for a type/side, de-duplicated by code; a later CANCEL_CONTRACT replaces CANCEL_LISTING. */
function checklistTemplate_(type, side) {
  var groups = checklistGroups_(type, side), out = [], seen = {};
  groups.forEach(function (g) {
    CHECKLISTS[g].forEach(function (it) {
      if (seen[it.code]) return;
      seen[it.code] = true;
      var copy = {}; for (var k in it) copy[k] = it[k];
      copy.phase = g;
      out.push(copy);
    });
  });
  return out;
}

/** Intake field definitions (server-side validation; the frontend renders the same keys). */
var INTAKE_REQUIRED = {
  listing: ['address', 'city', 'zip', 'listingDate', 'expirationDate', 'listPrice', 'sellers', 'listingCommission'],
  purchase: ['address', 'city', 'zip', 'side', 'contractDate', 'estCloseDate', 'purchasePrice', 'buyers', 'sellers', 'escrowCompany', 'commission'],
  lease_listing: ['address', 'city', 'zip', 'listingDate', 'expirationDate', 'monthlyRent', 'landlords', 'listingCommission'],
  lease: ['address', 'city', 'zip', 'side', 'leaseStart', 'monthlyRent', 'landlords', 'tenants', 'commission'],
  referral: ['clientName', 'referredTo', 'referralFee', 'location']
};

var TYPE_LABELS = { listing: 'Listing', purchase: 'Purchase', lease_listing: 'Lease Listing', lease: 'Lease', referral: 'Referral' };
var STATUSES = ['Active', 'In Escrow', 'Closed', 'Expired Contract', 'Cancelled'];
function Fail(msg, code) { var e = new Error(msg); e.code = code || 'ERR'; e.tc = true; throw e; }
var seq = 100;
function nid(p) { return p + (++seq).toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase(); }
function now() { return new Date().toISOString(); }
function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d.toISOString(); }
function day(n) { return daysAgo(-n).slice(0, 10); }
function addYears(iso, y) { var d = new Date(String(iso).slice(0, 10) + 'T12:00:00'); d.setFullYear(d.getFullYear() + y); return d.toISOString().slice(0, 10); }
function num(v) { return Number(String(v || '').replace(/[^0-9.]/g, '')) || 0; }
function names(a) { return (a || []).map(function (p) { return p.name; }).join(', '); }
var PDF_B64 = 'JVBERi0xLjQKMSAwIG9iajw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+ZW5kb2JqCjIgMCBvYmo8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PmVuZG9iagozIDAgb2JqPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgNCAwIFIvUmVzb3VyY2VzPDwvRm9udDw8L0YxIDUgMCBSPj4+Pj4+ZW5kb2JqCjQgMCBvYmo8PC9MZW5ndGggNTk+PnN0cmVhbQpCVCAvRjEgMjQgVGYgNzIgNzAwIFRkIChEZW1vIGRvY3VtZW50IC0gc2FtcGxlIG9ubHkpIFRqIEVUCmVuZHN0cmVhbQplbmRvYmoKNSAwIG9iajw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+ZW5kb2JqCnRyYWlsZXI8PC9Sb290IDEgMCBSPj4KJSVFT0YK';

var DB = { users: [], txns: [], items: [], docs: [], notes: [], audit: [], sessions: {} };
DB.users.push({ id: 'U1', username: 'admin', pw: 'demo', name: 'Enrique Esparza', email: 'enrique@example.com', phone: '', role: 'admin', owner: true, active: true, mustChange: false, lastLogin: daysAgo(1), locked: false });
DB.users.push({ id: 'U2', username: 'agent', pw: 'demo', name: 'Zina (sample agent)', email: 'agent@example.com', phone: '', role: 'agent', owner: false, active: true, mustChange: false, lastLogin: daysAgo(2), locked: false });
DB.users.push({ id: 'U3', username: 'sample.agent', pw: 'demo', name: 'Sample Agent', email: 'sample@example.com', phone: '', role: 'agent', owner: false, active: true, mustChange: true, lastLogin: '', locked: false });

function user(id) { return DB.users.filter(function (u) { return u.id === id; })[0]; }
function pub(u) { return { id: u.id, username: u.username, name: u.name, email: u.email, role: u.role, owner: !!u.owner, mustChange: !!u.mustChange }; }
function txn(id) { return DB.txns.filter(function (t) { return t.id === id; })[0]; }
function itemsOf(id) { return DB.items.filter(function (i) { return i.txnId === id; }); }
function docsOfItem(id) { return DB.docs.filter(function (d) { return d.itemId === id && !d.removed; }); }
function isFinal(t) { return t.status === 'Closed' || t.status === 'Cancelled'; }
function audit(t, by, action) { DB.audit.push({ txnId: t, ts: now(), by: by, action: action }); }
function addItems(t) {
  var have = {}; itemsOf(t.id).forEach(function (i) { have[i.code] = i; });
  var tpl = checklistTemplate_(t.type, t.side), added = 0, codes = {};
  tpl.forEach(function (x) {
    codes[x.code] = 1;
    if (have[x.code]) { have[x.code].active = true; return; }
    DB.items.push({ id: nid('I'), txnId: t.id, code: x.code, title: x.title, customTitle: '', forms: x.forms, phase: x.phase, req: !!x.req, misc: !!x.misc, cancel: !!x.cancel, active: true, status: 'Missing', reviewNote: '', reviewedAt: '' });
    added++;
  });
  itemsOf(t.id).forEach(function (i) { if (!codes[i.code]) i.active = false; });
  return added;
}
function recompute(i) {
  var docs = docsOfItem(i.id), s = 'Missing';
  if (docs.length) {
    if (docs.some(function (d) { return d.status === 'Pending'; })) s = 'Pending';
    else { var r = docs.filter(function (d) { return d.reviewedAt; }).sort(function (a, b) { return String(b.reviewedAt).localeCompare(String(a.reviewedAt)); }); s = r.length ? r[0].status : 'Pending'; }
  }
  i.status = s;
}
function progress(items) {
  var p = { required: 0, approved: 0, rejected: 0, pending: 0 };
  items.forEach(function (i) { if (!i.active) return; if (i.status === 'Rejected') p.rejected++; if (i.status === 'Pending') p.pending++; if (i.req) { p.required++; if (i.status === 'Approved') p.approved++; } });
  return p;
}
function title(t) { return t.address ? t.address + (t.city ? ', ' + t.city : '') : 'Referral – ' + ((t.intake || {}).clientName || ''); }
function clientLine(t) {
  var i = t.intake || {};
  if (t.type === 'listing') return 'Sellers: ' + names(i.sellers);
  if (t.type === 'purchase') return t.side === 'seller' ? 'Sellers: ' + names(i.sellers) : 'Buyers: ' + names(i.buyers);
  if (t.type === 'lease_listing') return 'Landlords: ' + names(i.landlords);
  if (t.type === 'lease') return t.side === 'landlord' ? 'Landlords: ' + names(i.landlords) : 'Tenants: ' + names(i.tenants);
  return 'Client: ' + (i.clientName || '');
}
function keyDate(t) {
  var i = t.intake || {};
  if (t.status === 'Closed') return 'Closed ' + String(t.closedAt).slice(0, 10);
  if (t.status === 'Cancelled') return 'Cancelled ' + String(t.cancelledAt).slice(0, 10);
  if (t.type === 'listing' || t.type === 'lease_listing') return 'Expires ' + (i.expirationDate || '');
  if (t.type === 'purchase') return 'Est. close ' + (i.estCloseDate || '');
  if (t.type === 'lease') return 'Lease start ' + (i.leaseStart || '');
  return 'Est. close ' + (i.expectedClose || '');
}
function summary(t) {
  return { id: t.id, type: t.type, typeLabel: TYPE_LABELS[t.type], side: t.side, status: t.status, title: title(t), clients: clientLine(t), keyDate: keyDate(t),
    agentName: (user(t.agentId) || {}).name, agentId: t.agentId, progress: progress(itemsOf(t.id)), cancelPending: !!(t.cancelRequest && t.cancelRequest.state === 'pending'), updatedAt: t.updatedAt, escrowNumber: (t.intake || {}).escrowNumber || '' };
}
function relistQ(t) { return (t.type === 'purchase' && t.side !== 'buyer') || (t.type === 'lease' && t.side !== 'tenant'); }
function validSide(type, side) {
  if (type === 'purchase') return ['buyer', 'seller', 'both'].indexOf(side) >= 0 ? side : Fail('Choose who we represent.', 'INTAKE');
  if (type === 'lease') return ['tenant', 'landlord', 'both'].indexOf(side) >= 0 ? side : Fail('Choose who we represent.', 'INTAKE');
  return type === 'listing' ? 'seller' : type === 'lease_listing' ? 'landlord' : 'referral';
}
function requireIntake(type, intake) {
  var miss = INTAKE_REQUIRED[type].filter(function (k) { var v = intake[k]; return Array.isArray(v) ? !v.length : !String(v || '').trim(); });
  if (miss.length) Fail('Please complete: ' + miss.join(', '), 'INTAKE');
}
function mkTxn(type, intake, agentId, extra) {
  intake.side = validSide(type, intake.side);
  var t = Object.assign({ id: nid('T'), type: type, side: intake.side, status: (type === 'purchase' || type === 'lease') ? 'In Escrow' : 'Active', agentId: agentId, address: intake.address || '', city: intake.city || '', zip: intake.zip || '',
    intake: intake, parentId: '', childId: '', convertedFrom: '', cancelRequest: null, createdAt: now(), updatedAt: now(), closedAt: '', cancelledAt: '', retentionUntil: '' }, extra || {});
  DB.txns.push(t); addItems(t); return t;
}
function addDoc(t, item, name, by, status, extra) {
  var d = Object.assign({ id: nid('D'), txnId: t.id, itemId: item ? item.id : '', name: name, mime: 'application/pdf', size: 1024, pages: 1, kind: 'file', sourceDocId: '', pageRange: '', status: item ? (status || 'Pending') : 'Stored',
    uploadedBy: by, uploadedAt: now(), reviewNote: '', reviewedAt: status === 'Approved' || status === 'Rejected' ? now() : '', removed: false, removedAt: '', removedBy: '', removeReason: '', purgeStatus: '', b64: PDF_B64 }, extra || {});
  DB.docs.push(d); if (item) recompute(item); return d;
}
function seedApprove(t, n, by) { itemsOf(t.id).filter(function (i) { return i.active && i.req; }).slice(0, n).forEach(function (i) { addDoc(t, i, i.title + '.pdf', by, 'Approved'); }); }
function P(n, ph, em) { return { name: n, phone: ph || '', email: em || '' }; }
(function seed() {
  var a = mkTxn('listing', { address: '1420 Vista Del Mar', city: 'Riverside', zip: '92506', propertyType: 'Single Family', listingDate: day(-20), expirationDate: day(160), listPrice: '849000', sellers: [P('Maria Lopez', '951-555-0101')], listingCommission: '2.5%', mlsNumber: 'IV26100001' }, 'U2');
  seedApprove(a, 6, 'U2');
  var it = itemsOf(a.id); addDoc(a, it.filter(function (i) { return i.code === 'SPQ'; })[0], 'SPQ signed.pdf', 'U2', 'Pending');
  var rj = it.filter(function (i) { return i.code === 'TDS'; })[0]; var rd = addDoc(a, rj, 'TDS.pdf', 'U2', 'Rejected'); rd.reviewNote = 'Page 3 is missing the seller initials.'; recompute(rj); rj.reviewNote = rd.reviewNote;
  DB.notes.push({ id: nid('N'), txnId: a.id, itemId: rj.id, userId: 'U1', kind: 'rejection', text: 'Page 3 is missing the seller initials.', createdAt: daysAgo(1) });
  addDoc(a, null, 'Listing packet (full).pdf', 'U2', '', { kind: 'packet', pages: 14 });
  var b = mkTxn('purchase', { address: '88 Canyon Crest Dr', city: 'Corona', zip: '92882', side: 'buyer', contractDate: day(-12), estCloseDate: day(18), purchasePrice: '615000', buyers: [P('James & Ana Rivera')], sellers: [P('Owner of record')], escrowCompany: 'Inland Escrow', escrowNumber: 'IE-44821', commission: '2.5%' }, 'U2');
  seedApprove(b, 9, 'U2'); addDoc(b, itemsOf(b.id)[9], 'Inspection report.pdf', 'U2', 'Pending');
  var c = mkTxn('purchase', { address: '3021 Mission Inn Ave', city: 'Riverside', zip: '92507', side: 'seller', contractDate: day(-50), estCloseDate: day(-20), purchasePrice: '730000', finalPrice: '725000', buyers: [P('K. Nguyen')], sellers: [P('Robert Hall')], escrowCompany: 'Inland Escrow', commission: '2.5%' }, 'U1', { status: 'Closed', closedAt: day(-20), retentionUntil: addYears(day(-20), 7) });
  seedApprove(c, 40, 'U1');
  var d = mkTxn('purchase', { address: '9 Orchard Ln', city: 'Fontana', zip: '92335', side: 'both', contractDate: day(-140), estCloseDate: day(-110), purchasePrice: '540000', finalPrice: '540000', buyers: [P('L. Chen')], sellers: [P('S. Patel')], escrowCompany: 'First Escrow', commission: '5%' }, 'U2', { status: 'Closed', closedAt: day(-110), retentionUntil: addYears(day(-110), 7) });
  seedApprove(d, 40, 'U2');
  var e = mkTxn('purchase', { address: '510 Lemon St', city: 'Riverside', zip: '92501', side: 'buyer', contractDate: day(-260), estCloseDate: day(-230), purchasePrice: '480000', finalPrice: '475000', buyers: [P('D. Morales')], sellers: [P('T. King')], escrowCompany: 'Inland Escrow', commission: '2.5%' }, 'U1', { status: 'Closed', closedAt: day(-230), retentionUntil: addYears(day(-230), 7) });
  seedApprove(e, 40, 'U1');
  var f = mkTxn('lease_listing', { address: '77 Magnolia Ave #4', city: 'Riverside', zip: '92506', listingDate: day(-8), expirationDate: day(80), monthlyRent: '2400', landlords: [P('Westside Holdings LLC')], listingCommission: 'One month' }, 'U2');
  seedApprove(f, 2, 'U2');
  var g = mkTxn('lease', { address: '12 Arlington Ave', city: 'Riverside', zip: '92503', side: 'landlord', leaseStart: day(-30), monthlyRent: '2900', landlords: [P('A. Gomez')], tenants: [P('M. Brooks')], commission: 'One month' }, 'U1', { status: 'Closed', closedAt: day(-30), retentionUntil: addYears(day(-30), 7) });
  seedApprove(g, 40, 'U1');
  var hh = mkTxn('referral', { clientName: 'Paula Diaz', referredTo: 'Agent in Phoenix, AZ', referralFee: '25%', location: 'Phoenix, AZ', expectedClose: day(45) }, 'U2');
  var i2 = mkTxn('listing', { address: '450 Palm Dr', city: 'Moreno Valley', zip: '92553', listingDate: day(-200), expirationDate: day(-20), listPrice: '520000', sellers: [P('Grace Kim')], listingCommission: '2.5%' }, 'U1', { status: 'Expired Contract', retentionUntil: addYears(day(-20), 7) });
  seedApprove(i2, 5, 'U1');
  var j = mkTxn('purchase', { address: '2205 Sunset Ridge', city: 'Norco', zip: '92860', side: 'seller', contractDate: day(-6), estCloseDate: day(24), purchasePrice: '1150000', buyers: [P('B. Allen')], sellers: [P('C. Ortiz')], escrowCompany: 'First Escrow', commission: '2%' }, 'U2', { convertedFrom: 'listing' });
  seedApprove(j, 12, 'U2');
  var ci = itemsOf(j.id).filter(function (x) { return x.cancel && x.active; })[0]; addDoc(j, ci, 'Cancellation of Contract signed.pdf', 'U2', 'Pending');
  j.cancelRequest = { state: 'pending', requestedAt: daysAgo(0), requestedBy: 'U2', requestedByName: 'Zina (sample agent)', reason: 'Buyer could not qualify for the loan.', relist: true };
  DB.txns.forEach(function (t, k) { t.updatedAt = daysAgo(k); audit(t.id, (user(t.agentId) || {}).username, 'transaction_created'); });
})();
function access(u, id) { var t = txn(id); if (!t || (u.role !== 'admin' && t.agentId !== u.id)) Fail('Transaction not found.'); return t; }
function needAdmin(u) { if (u.role !== 'admin') Fail('Admins only.', 'FORBIDDEN'); }
function touch(t) { t.updatedAt = now(); }
function tmpPw() { return 'Tmp-' + Math.random().toString(36).slice(2, 8) + '7'; }
var A = {};
A.ping = function () { return { pong: true }; };
A.login = function (b) {
  var u = DB.users.filter(function (x) { return x.username === String(b.username || '').trim().toLowerCase(); })[0];
  if (!u || u.pw !== b.password || !u.active) Fail('Wrong username or password.');
  var tok = nid('S') + nid('S'); DB.sessions[tok] = u.id; u.lastLogin = now();
  return { token: tok, user: pub(u) };
};
A.logout = function (b) { delete DB.sessions[b.token]; return {}; };
A.me = function (b, u) { return { user: pub(u) }; };
A.changePassword = function (b, u) {
  if (b.current !== u.pw) Fail('Your current password is not correct.');
  var p = String(b.newPassword || ''); if (p.length < 10 || !/[A-Za-z]/.test(p) || !/\d/.test(p)) Fail('Use at least 10 characters with letters and numbers.');
  u.pw = p; u.mustChange = false; return { user: pub(u) };
};
A.listUsers = function (b, u) { needAdmin(u); return DB.users.map(function (x) { return { id: x.id, username: x.username, name: x.name, email: x.email, phone: x.phone, role: x.role, owner: !!x.owner, active: x.active, mustChange: x.mustChange, lastLogin: x.lastLogin, locked: x.locked }; }); };
A.createUser = function (b, u) {
  needAdmin(u); if (b.role === 'admin' && !u.owner) Fail('Only the owner can create admins.');
  if (!String(b.name || '').trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.username || '')) Fail('Enter a name and a valid email.');
  if (DB.users.some(function (x) { return x.username === b.username; })) Fail('That username already exists.');
  var pw = tmpPw(), nu = { id: nid('U'), username: b.username, pw: pw, name: b.name.trim(), email: b.email, phone: b.phone || '', role: b.role === 'admin' ? 'admin' : 'agent', owner: false, active: true, mustChange: true, lastLogin: '', locked: false };
  DB.users.push(nu); return { user: pub(nu), tempPassword: pw };
};
A.resetPassword = function (b, u) { needAdmin(u); var x = user(b.userId); if (!x) Fail('User not found.'); if (x.owner && !u.owner) Fail('Only the owner can reset this account.'); x.pw = tmpPw(); x.mustChange = true; x.locked = false; return { tempPassword: x.pw }; };
A.setUserActive = function (b, u) { needAdmin(u); var x = user(b.userId); if (!x || x.owner) Fail('Cannot change this user.'); x.active = !!b.active; return {}; };
A.createTransaction = function (b, u) {
  if (!TYPE_LABELS[b.type]) Fail('Choose a transaction type.');
  var intake = Object.assign({}, b.intake || {}); intake.side = validSide(b.type, intake.side); requireIntake(b.type, intake);
  var agentId = (b.agentId && u.role === 'admin') ? b.agentId : u.id;
  var t = mkTxn(b.type, intake, agentId); audit(t.id, u.username, 'transaction_created'); return { id: t.id };
};
A.updateIntake = function (b, u) {
  var t = access(u, b.id); if (isFinal(t) && u.role !== 'admin') Fail('This file is ' + t.status + '.');
  var intake = Object.assign({}, t.intake, b.intake || {}); intake.side = t.side; requireIntake(t.type, intake);
  t.intake = intake; t.address = intake.address || t.address; t.city = intake.city || t.city; t.zip = intake.zip || t.zip; touch(t); audit(t.id, u.username, 'intake_updated'); return {};
};
A.convert = function (b, u) {
  var t = access(u, b.id), to = { listing: 'purchase', lease_listing: 'lease' }[t.type];
  if (!to) Fail('Only listings and lease listings can be converted.'); if (isFinal(t)) Fail('This file is ' + t.status + '.');
  if (t.cancelRequest && t.cancelRequest.state === 'pending') Fail('A cancellation request is pending on this file.');
  var intake = Object.assign({}, t.intake, b.intake || {}), side = b.side || intake.side;
  side = to === 'purchase' ? (side === 'both' ? 'both' : 'seller') : (side === 'both' ? 'both' : 'landlord'); intake.side = side; requireIntake(to, intake);
  var from = t.type; Object.assign(t, { type: to, side: side, status: 'In Escrow', intake: intake, convertedFrom: from, address: intake.address, city: intake.city, zip: intake.zip }); touch(t);
  var added = addItems(t); audit(t.id, u.username, 'converted'); return { id: t.id, added: added };
};
A.dashboard = function (b, u) {
  var scope = u.role === 'admin' && b.scope === 'company' ? 'company' : 'personal';
  var list = DB.txns.filter(function (t) { return scope === 'company' || t.agentId === u.id; });
  var counts = { listings: 0, purchases: 0, leaseListings: 0, leases: 0, referrals: 0, Active: 0, 'In Escrow': 0, Closed: 0, 'Expired Contract': 0, Cancelled: 0 };
  var st = { closedCount: 0, sellerSides: 0, buyerSides: 0, sellerVolume: 0, buyerVolume: 0, combinedVolume: 0, leaseCount: 0, referralCount: 0 }, cut = daysAgo(365).slice(0, 10);
  list.forEach(function (t) {
    counts[{ listing: 'listings', purchase: 'purchases', lease_listing: 'leaseListings', lease: 'leases', referral: 'referrals' }[t.type]]++; counts[t.status]++;
    if (t.status === 'Closed' && String(t.closedAt).slice(0, 10) >= cut) {
      st.closedCount++; var p = num(t.intake.finalPrice || t.intake.purchasePrice);
      if (t.type === 'purchase') { if (t.side !== 'buyer') { st.sellerSides++; st.sellerVolume += p; } if (t.side !== 'seller') { st.buyerSides++; st.buyerVolume += p; } }
      else if (t.type === 'lease') st.leaseCount++; else if (t.type === 'referral') st.referralCount++;
    }
  });
  st.combinedVolume = st.sellerVolume + st.buyerVolume;
  var tx = list.slice().sort(function (a, c) { return (isFinal(a) ? 1 : 0) - (isFinal(c) ? 1 : 0) || String(c.updatedAt).localeCompare(String(a.updatedAt)); }).map(summary);
  var pr = 0, cr = 0;
  if (u.role === 'admin') { DB.items.forEach(function (i) { if (i.active && i.status === 'Pending') pr++; }); DB.txns.forEach(function (t) { if (t.cancelRequest && t.cancelRequest.state === 'pending') cr++; }); }
  return { scope: scope, counts: counts, stats: st, transactions: tx, pendingReview: pr, cancelRequests: cr };
};
A.search = function (b, u) {
  var q = String(b.q || '').toLowerCase().trim(); if (q.length < 2) return { results: [] };
  var terms = q.split(/\s+/);
  return { results: DB.txns.filter(function (t) {
    if (u.role !== 'admin' && t.agentId !== u.id) return false;
    var i = t.intake, hay = [t.id, t.address, t.city, t.zip, TYPE_LABELS[t.type], t.status, i.escrowNumber, i.mlsNumber, i.clientName, i.escrowCompany, names(i.sellers), names(i.buyers), names(i.landlords), names(i.tenants), (user(t.agentId) || {}).name].join(' ').toLowerCase();
    return terms.every(function (x) { return hay.indexOf(x) >= 0; });
  }).slice(0, 25).map(summary) };
};
function docOut(d, u) { return { id: d.id, itemId: d.itemId, name: d.name, mime: d.mime, size: d.size, pages: d.pages, kind: d.kind, sourceDocId: d.sourceDocId, pageRange: d.pageRange, status: d.status, uploadedBy: d.uploadedBy, uploadedAt: d.uploadedAt, reviewNote: d.reviewNote, reviewedAt: d.reviewedAt, removed: d.removed, removedAt: d.removedAt, removeReason: u.role === 'admin' ? d.removeReason : '', purgeStatus: u.role === 'admin' ? d.purgeStatus : '', uploadedByName: (user(d.uploadedBy) || {}).name }; }
A.getTransaction = function (b, u) {
  var t = access(u, b.id), items = itemsOf(t.id).filter(function (i) { return i.active || u.role === 'admin'; });
  return {
    txn: { id: t.id, type: t.type, typeLabel: TYPE_LABELS[t.type], side: t.side, status: t.status, agentId: t.agentId, agentName: (user(t.agentId) || {}).name, address: t.address, city: t.city, zip: t.zip, intake: t.intake, parentId: t.parentId, childId: t.childId, convertedFrom: t.convertedFrom,
      cancelRequest: t.cancelRequest, createdAt: t.createdAt, updatedAt: t.updatedAt, closedAt: t.closedAt, cancelledAt: t.cancelledAt, retentionUntil: t.retentionUntil, title: title(t), progress: progress(items), relistQuestion: relistQ(t) },
    items: items.map(function (i) { return { id: i.id, code: i.code, title: i.customTitle || i.title, baseTitle: i.title, customTitle: i.customTitle, forms: i.forms, phase: i.phase, req: i.req, misc: i.misc, cancel: i.cancel, active: i.active, status: i.status, reviewNote: i.reviewNote, reviewedAt: i.reviewedAt }; }),
    documents: DB.docs.filter(function (d) { return d.txnId === t.id && (!d.removed || u.role === 'admin'); }).map(function (d) { return docOut(d, u); }),
    notes: DB.notes.filter(function (n) { return n.txnId === t.id; }).map(function (n) { return { id: n.id, itemId: n.itemId, kind: n.kind, text: n.text, createdAt: n.createdAt, by: (user(n.userId) || {}).name }; }),
    activity: DB.audit.filter(function (a) { return a.txnId === t.id; }).slice(-60).reverse()
  };
};
function itemIn(t, id) { if (!id) return null; var i = DB.items.filter(function (x) { return x.id === id && x.txnId === t.id; })[0]; if (!i) Fail('Checklist item not found.'); return i; }
A.upload = function (b, u) {
  var t = access(u, b.txnId); if (isFinal(t) && u.role !== 'admin') Fail('This file is ' + t.status + '.');
  if (!b.base64) Fail('Empty file.'); var size = Math.floor(b.base64.length * 3 / 4); if (size > 20 * 1024 * 1024) Fail('File is larger than 20 MB.');
  var i = itemIn(t, b.itemId);
  var d = addDoc(t, i, String(b.name || 'file').slice(0, 150), u.id, 'Pending', { mime: b.mime || 'application/octet-stream', size: size, b64: b.base64, kind: b.kind || 'file', sourceDocId: b.sourceDocId || '', pageRange: b.pageRange || '', pages: b.pages || '' });
  touch(t); audit(t.id, u.username, 'document_uploaded'); return { doc: docOut(d, u) };
};
A.assignDocument = function (b, u) {
  var d = DB.docs.filter(function (x) { return x.id === b.docId && !x.removed; })[0]; if (!d) Fail('Document not found.');
  var t = access(u, d.txnId); if (isFinal(t) && u.role !== 'admin') Fail('This file is ' + t.status + '.');
  if (u.role !== 'admin' && d.itemId && d.status !== 'Pending') Fail('Reviewed documents can only be moved by an admin.');
  var old = d.itemId ? DB.items.filter(function (x) { return x.id === d.itemId; })[0] : null, tg = itemIn(t, b.itemId);
  Object.assign(d, { itemId: tg ? tg.id : '', status: tg ? 'Pending' : 'Stored', reviewNote: '', reviewedAt: '' });
  if (old) recompute(old); if (tg) recompute(tg); touch(t); audit(t.id, u.username, 'document_assigned'); return {};
};
A.renameMisc = function (b, u) { var i = DB.items.filter(function (x) { return x.id === b.itemId; })[0]; if (!i || !i.misc) Fail('Only Misc items can be renamed.'); access(u, i.txnId); i.customTitle = String(b.title || '').trim().slice(0, 80); return {}; };
A.addNote = function (b, u) { var t = access(u, b.txnId), x = String(b.text || '').trim(); if (!x) Fail('Write a note first.'); DB.notes.push({ id: nid('N'), txnId: t.id, itemId: b.itemId || '', userId: u.id, kind: 'note', text: x, createdAt: now() }); touch(t); return {}; };
A.resubmit = function (b, u) {
  var i = DB.items.filter(function (x) { return x.id === b.itemId; })[0]; if (!i) Fail('Item not found.'); var t = access(u, i.txnId);
  if (i.status !== 'Rejected') Fail('Only rejected items can be resubmitted.'); var x = String(b.note || '').trim(); if (!x) Fail('Add an explanation note for the reviewer.');
  DB.notes.push({ id: nid('N'), txnId: t.id, itemId: i.id, userId: u.id, kind: 'resubmit', text: x, createdAt: now() });
  docsOfItem(i.id).forEach(function (d) { if (d.status === 'Rejected') d.status = 'Pending'; }); recompute(i); touch(t); audit(t.id, u.username, 'item_resubmitted'); return {};
};
A.getFile = function (b, u) { var d = DB.docs.filter(function (x) { return x.id === b.docId; })[0]; if (!d || (d.removed && u.role !== 'admin')) Fail('Document not found.'); access(u, d.txnId); return { name: d.name, mime: d.mime, base64: d.b64 }; };
A.reviewQueue = function (b, u) {
  needAdmin(u);
  var items = DB.items.filter(function (i) { return i.active && i.status === 'Pending'; }).map(function (i) {
    var t = txn(i.txnId), docs = docsOfItem(i.id);
    return { itemId: i.id, itemTitle: i.customTitle || i.title, forms: i.forms, txnId: t.id, txnTitle: title(t), typeLabel: TYPE_LABELS[t.type], agentName: (user(t.agentId) || {}).name,
      submittedAt: docs.reduce(function (m, d) { return d.uploadedAt > m ? d.uploadedAt : m; }, ''), docs: docs.map(function (d) { return { id: d.id, name: d.name, status: d.status, uploadedAt: d.uploadedAt, pageRange: d.pageRange, size: d.size }; }),
      notes: DB.notes.filter(function (n) { return n.itemId === i.id; }).slice(-5).map(function (n) { return { kind: n.kind, text: n.text, by: (user(n.userId) || {}).name, createdAt: n.createdAt }; }) };
  });
  var cancels = DB.txns.filter(function (t) { return t.cancelRequest && t.cancelRequest.state === 'pending'; }).map(function (t) { return { txnId: t.id, title: title(t), typeLabel: TYPE_LABELS[t.type], side: t.side, agentName: (user(t.agentId) || {}).name, request: t.cancelRequest }; });
  return { items: items, cancellations: cancels };
};
A.reviewItem = function (b, u) {
  needAdmin(u); var i = DB.items.filter(function (x) { return x.id === b.itemId; })[0]; if (!i) Fail('Item not found.');
  var dec = b.decision === 'approve' ? 'Approved' : b.decision === 'reject' ? 'Rejected' : Fail('Choose approve or reject.'), note = String(b.note || '').trim();
  if (dec === 'Rejected' && !note) Fail('Add a note explaining what to fix.');
  docsOfItem(i.id).forEach(function (d) { if (d.status === 'Pending') { d.status = dec; d.reviewNote = note; d.reviewedAt = now(); } });
  recompute(i); i.reviewNote = note; i.reviewedAt = now();
  if (note) DB.notes.push({ id: nid('N'), txnId: i.txnId, itemId: i.id, userId: u.id, kind: dec === 'Rejected' ? 'rejection' : 'approval', text: note, createdAt: now() });
  touch(txn(i.txnId)); audit(i.txnId, u.username, dec === 'Approved' ? 'item_approved' : 'item_rejected'); return {};
};
A.removeDocument = function (b, u) {
  needAdmin(u); var d = DB.docs.filter(function (x) { return x.id === b.docId && !x.removed; })[0]; if (!d) Fail('Document not found.');
  var r = String(b.reason || '').trim(); if (!r) Fail('Give a reason for removing this document.');
  Object.assign(d, { removed: true, removedBy: u.id, removedAt: now(), removeReason: r, purgeStatus: 'pending_enrique_approval' });
  if (d.itemId) recompute(DB.items.filter(function (x) { return x.id === d.itemId; })[0]); audit(d.txnId, u.username, 'document_removed'); return {};
};
A.restoreDocument = function (b, u) {
  needAdmin(u); var d = DB.docs.filter(function (x) { return x.id === b.docId && x.removed; })[0]; if (!d) Fail('Document not found.');
  Object.assign(d, { removed: false, removedAt: '', removeReason: '', purgeStatus: '' }); if (d.itemId) recompute(DB.items.filter(function (x) { return x.id === d.itemId; })[0]); audit(d.txnId, u.username, 'document_restored'); return {};
};
A.purgeQueue = function (b, u) { needAdmin(u); return { docs: DB.docs.filter(function (d) { return d.removed; }).map(function (d) { var t = txn(d.txnId); return { id: d.id, name: d.name, txnId: d.txnId, txnTitle: t.address || '', removedAt: d.removedAt, removedBy: (user(d.removedBy) || {}).name, reason: d.removeReason, retentionUntil: t.retentionUntil || '(open file)', purgeStatus: d.purgeStatus }; }) }; };
A.requestCancel = function (b, u) {
  var t = access(u, b.id); if (isFinal(t)) Fail('This file is ' + t.status + '.'); if (t.cancelRequest && t.cancelRequest.state === 'pending') Fail('A cancellation request is already pending.');
  var ci = itemsOf(t.id).filter(function (i) { return i.cancel && i.active; })[0];
  if (!ci || !docsOfItem(ci.id).length) Fail('Upload the signed ' + (ci ? ci.title : 'cancellation') + ' first.', 'CANCEL_DOC_REQUIRED');
  var relist = '';
  if (relistQ(t)) { if (b.relist !== true && b.relist !== false) Fail('Is the property going back on the market?', 'RELIST_REQUIRED'); relist = b.relist; }
  t.cancelRequest = { state: 'pending', requestedAt: now(), requestedBy: u.id, requestedByName: u.name, reason: String(b.reason || '').trim(), relist: relist };
  touch(t); audit(t.id, u.username, 'cancel_requested'); return {};
};
A.decideCancel = function (b, u) {
  needAdmin(u); var t = txn(b.id); if (!t || !t.cancelRequest || t.cancelRequest.state !== 'pending') Fail('No pending cancellation request.');
  var cr = t.cancelRequest; cr.decidedAt = now(); cr.decidedBy = u.name; cr.note = String(b.note || '');
  if (!b.approve) { cr.state = 'denied'; touch(t); audit(t.id, u.username, 'cancel_denied'); return {}; }
  cr.state = 'approved'; t.status = 'Cancelled'; t.cancelledAt = now(); t.retentionUntil = addYears(now(), 7); touch(t); audit(t.id, u.username, 'cancel_approved');
  var newId = '';
  if (cr.relist === true) {
    var nt = t.type === 'lease' ? 'lease_listing' : 'listing', intake = Object.assign({}, t.intake); intake.side = '';
    var n = mkTxn(nt, intake, t.agentId, { parentId: t.id }); t.childId = n.id; newId = n.id;
    var byCode = {}; itemsOf(n.id).forEach(function (i) { byCode[i.code] = i; });
    itemsOf(t.id).forEach(function (oi) { var ni = byCode[oi.code]; if (!ni || oi.cancel || (oi.phase !== 'listing' && oi.phase !== 'lease_listing')) return; docsOfItem(oi.id).forEach(function (d) { addDoc(n, ni, d.name, d.uploadedBy, d.status, { b64: d.b64, mime: d.mime, size: d.size }); }); });
    audit(n.id, u.username, 'relisted_from_cancellation');
  }
  return { relistedId: newId };
};
A.setStatus = function (b, u) {
  needAdmin(u); var t = txn(b.id); if (!t) Fail('Transaction not found.'); var s = String(b.status || '');
  if (['Active', 'In Escrow', 'Closed', 'Expired Contract'].indexOf(s) < 0) Fail(s === 'Cancelled' ? 'Use the cancellation request so the signed cancellation is on file.' : 'Unknown status.');
  if (s === 'Closed') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.closeDate || '')) Fail('Enter the close of escrow date.');
    if (t.type === 'purchase') { var fp = num(b.finalPrice || t.intake.purchasePrice); if (!fp) Fail('Enter the final sales price.'); t.intake.finalPrice = String(fp); }
    t.closedAt = b.closeDate; t.retentionUntil = addYears(b.closeDate, 7);
  } else if (s === 'Expired Contract') t.retentionUntil = addYears(t.intake.expirationDate || now(), 7);
  else { t.closedAt = ''; t.retentionUntil = ''; }
  t.status = s; touch(t); audit(t.id, u.username, 'status_changed'); return {};
};
var OPEN = { ping: 1, login: 1 };
window.TC_MOCK = {
  call: function (body) {
    return new Promise(function (res) {
      setTimeout(function () {
        try {
          var fn = A[body.action]; if (!fn) Fail('Unknown action.');
          var u = null;
          if (!OPEN[body.action]) {
            u = user(DB.sessions[body.token]); if (!u || !u.active) Fail('Please sign in again.', 'AUTH');
            if (u.mustChange && ['me', 'changePassword', 'logout'].indexOf(body.action) < 0) Fail('Choose a new password first.', 'MUST_CHANGE');
          }
          var data = fn(JSON.parse(JSON.stringify(body)), u);
          res({ ok: true, data: JSON.parse(JSON.stringify(data)) });
        } catch (e) { if (!e.tc) console.error(e); res({ ok: false, error: e.message, code: e.code || 'ERR' }); }
      }, 120);
    });
  }
};
})();
