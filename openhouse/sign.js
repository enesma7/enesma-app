/* Public sign-in. This file can submit a guest and read the property line. It never asks for the guest list. */
(function () {
  'use strict';
  var CFG = window.OH_CONFIG || {};
  var params = new URLSearchParams(location.search);
  var key = params.get('k') || '';
  var demo = params.get('demo') === '1' || !String(CFG.API_URL || '').trim();
  var root = document.getElementById('app');

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function viewOf(data) {
    data = data || {};
    return {
      addressLine: String(data.addressLine || ''),
      whenLabel: String(data.whenLabel || ''),
      host: String(data.host || ''),
      open: data.open === true
    };
  }
  function post(action, extra) {
    if (demo) return window.OHDemo.call(Object.assign({ action: action, key: key }, extra || {}));
    return fetch(CFG.API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action, key: key }, extra || {})),
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('Server error ' + r.status);
      return r.json();
    }, function () {
      throw new Error('Could not reach the sign-in service.');
    }).then(function (res) {
      if (res && res.ok) return res.data;
      var e = new Error((res && res.error) || 'Something went wrong.');
      e.code = res && res.code;
      throw e;
    });
  }
  function showError(msg) {
    root.innerHTML = '<article class="sheet"><h1>Sign-In Unavailable</h1><div class="err" role="alert">' + esc(msg) + '</div></article>';
  }
  function show(data) {
    var view = viewOf(data);
    if (!view.open) {
      root.innerHTML = '<article class="sheet"><h1 class="addr">' + esc(view.addressLine || 'Open House') + '</h1>' +
        (view.whenLabel ? '<p class="when">' + esc(view.whenLabel) + '</p>' : '') +
        '<div class="ok" role="status">This open house sign-in is closed.</div><pre class="disc">' + esc(window.OHLogic.DISCLOSURE) + '</pre></article>';
      return;
    }
    root.innerHTML = window.OHSheet.html(view);
    window.OHSheet.wire(root, function (guest) {
      return post('publicSubmit', { guest: guest }).then(function () {
        var body = root.querySelector('#sheetBody');
        if (body) body.innerHTML = window.OHSheet.thanks();
      });
    });
  }
  if (!key) return showError('This sign-in link is not valid.');
  post('publicSheet').then(show).catch(function (err) { showError(err.message || 'This sign-in link is not valid.'); });
})();
