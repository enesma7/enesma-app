/* How a completed E-Sign envelope is filed on a CDA checklist item.
   The Apps Script copy of these rules lives in the Transaction Center Cda.gs artifact.
   Latest signed version queues E-Books. An older completion does not replace it.
   A repeat of the same envelope files nothing new. The checklist document stays pending review. */
function cdaFileDecision(versions, envelopeId) {
  var match = null;
  (versions || []).forEach(function (v) { if (String(v.envelopeId) === String(envelopeId)) match = v; });
  if (!match) return { action: 'reject', reason: 'envelope' };
  if (match.status === 'executed' && match.signedDocId) return { action: 'already', version: match.version, docId: match.signedDocId, queueEbooks: false, approve: false };
  if (match.status !== 'sent') return { action: 'reject', reason: 'status' };
  var newerExecuted = (versions || []).some(function (v) { return Number(v.version) > Number(match.version) && v.status === 'executed'; });
  return {
    action: newerExecuted ? 'file-historical' : 'file-latest',
    version: match.version,
    docStatus: 'Pending',
    approve: false,
    queueEbooks: !newerExecuted,
    supersedeOlder: !newerExecuted
  };
}
if (typeof module !== 'undefined') module.exports = { cdaFileDecision: cdaFileDecision };
