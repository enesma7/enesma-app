(function () {
  var statusEl = document.getElementById('status');
  var infoEl = document.getElementById('info');
  var cfg = window.ES_CONFIG || {};
  var api = String(cfg.API_URL || '').trim();

  function setStatus(text, cls) {
    statusEl.className = 'status ' + (cls || 'muted');
    statusEl.textContent = text;
  }

  function text(id, value) {
    document.getElementById(id).textContent = value || '—';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-US', { timeZone: 'America/Los_Angeles', dateStyle: 'medium', timeStyle: 'short' }) + ' PT';
  }

  if (!api) {
    setStatus('E-Sign is not configured on this site yet.', 'err');
    return;
  }

  fetch(api, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'verifySeal' }),
    redirect: 'follow',
    credentials: 'omit',
    cache: 'no-store'
  }).then(function (r) { return r.json(); }).then(function (res) {
    if (!res || !res.ok || !res.data) {
      setStatus((res && res.error) ? res.error : 'The completion seal is not available yet.', 'err');
      return;
    }
    var d = res.data;
    text('subject', d.subject);
    text('issuer', d.issuer);
    text('fingerprint', d.fingerprintColon || d.fingerprint);
    var validity = [fmtDate(d.validFrom), fmtDate(d.validTo)].filter(Boolean).join('  —  ');
    text('validity', validity || '—');
    text('subfilter', d.subFilter);
    text('pem', d.certPem);
    infoEl.hidden = false;
    setStatus('Public seal certificate loaded. Compare the fingerprint with a signed file.', 'ok');
  }).catch(function () {
    setStatus('Could not reach the E-Sign backend. Try again later.', 'err');
  });
})();
