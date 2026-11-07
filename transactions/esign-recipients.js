/* Signer identity for ENESMA E-Sign. Same email may sign two different roles.
   The same email may not occupy one role twice. A signature is one recipient row. */
'use strict';

function emailNorm(v) {
  var e = String(v || '').trim().toLowerCase();
  if (!/^[^\s@<>,;"']+@[^\s@<>,;"']+\.[a-z]{2,}$/i.test(e) || e.length > 200) return '';
  return e;
}
function lineNorm(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 200);
}
function roleKey(label) {
  return String(label || '').replace(/\s+/g, ' ').trim().toLowerCase();
}
function signerSlot(email, roleLabel) {
  return emailNorm(email) + '\n' + roleKey(roleLabel);
}
function bad(msg) {
  var e = new Error(msg);
  e.code = 'BAD_REQUEST';
  return e;
}
function prepareRecipients(recs, orderMode) {
  if (!Array.isArray(recs) || !recs.length) throw bad('Add at least one signer.');
  if (recs.length > 20) throw bad('Up to 20 signers per envelope.');
  var seenSlot = {}, seenKey = {};
  return recs.map(function (r, i) {
    var em = emailNorm(r && r.email);
    if (!em) throw bad('Enter a valid email for signer ' + (i + 1) + '.');
    var nm = lineNorm(r && r.name, 120);
    if (!nm) throw bad('Enter a name for signer ' + (i + 1) + '.');
    var key = String((r && r.key) || ('R' + (i + 1))).slice(0, 20);
    if (seenKey[key]) throw bad('Each signer needs their own key.');
    seenKey[key] = 1;
    var slot = signerSlot(em, r && r.roleLabel);
    if (seenSlot[slot]) throw bad(em + ' is listed twice for the same role.');
    seenSlot[slot] = 1;
    var ord = orderMode === 'sequential' ? Math.max(1, Math.min(99, parseInt(r.order, 10) || (i + 1))) : 1;
    return { key: key, name: nm, email: em, roleLabel: lineNorm(r && r.roleLabel, 60), ord: ord };
  });
}
function emailTakenForRole(recipients, selfId, email, roleLabel) {
  var slot = signerSlot(email, roleLabel);
  if (!emailNorm(email)) return false;
  return (recipients || []).some(function (x) { return x.id !== selfId && signerSlot(x.email, x.roleLabel) === slot; });
}
/* Mirrors signSubmit: only this recipient id is signed. Same email on another row stays unsigned. */
function signRecipient(recipients, currentOrder, recipientId) {
  var r = null;
  (recipients || []).forEach(function (x) { if (x.id === recipientId) r = x; });
  if (!r) throw bad('Signer not found.');
  if (r.status === 'signed') {
    var done = new Error('You already signed this envelope.');
    done.code = 'DONE';
    throw done;
  }
  if (Number(r.ord) > Number(currentOrder)) {
    var wait = new Error('It’s not your turn yet.');
    wait.code = 'NOT_YET';
    throw wait;
  }
  r.status = 'signed';
  var rest = recipients.filter(function (y) { return y.status !== 'signed'; });
  if (!rest.length) return { allSigned: true, currentOrder: currentOrder, inviteIds: [] };
  var next = 99;
  rest.forEach(function (y) { next = Math.min(next, Number(y.ord)); });
  var advanced = next > Number(currentOrder);
  var invite = advanced ? rest.filter(function (y) { return Number(y.ord) === next; }) : [];
  return { allSigned: false, currentOrder: advanced ? next : currentOrder, inviteIds: invite.map(function (y) { return y.id; }) };
}
function bindFields(recipients, fields) {
  var map = {};
  recipients.forEach(function (r, i) { map[r.key] = r.id || ('R' + (i + 1)); });
  return (fields || []).map(function (f) {
    if (!Object.prototype.hasOwnProperty.call(map, f.recipient)) throw bad('Every field must belong to a signer.');
    return { type: f.type, recipient: map[f.recipient] };
  });
}

module.exports = {
  emailNorm: emailNorm, roleKey: roleKey, signerSlot: signerSlot, prepareRecipients: prepareRecipients,
  emailTakenForRole: emailTakenForRole, signRecipient: signRecipient, bindFields: bindFields
};
