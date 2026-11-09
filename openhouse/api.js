/* Routes each action to Transaction Center, the Open House Apps Script, or the in-browser demo. */
(function (w) {
  'use strict';
  var CFG = w.OH_CONFIG || {};
  var DEMO = /(?:^|[?&])demo=1(?:&|$)/.test(w.location.search);
  try {
    if (DEMO) w.sessionStorage.setItem('oh_demo', '1');
    else if (w.sessionStorage.getItem('oh_demo') === '1') DEMO = true;
  } catch (e) { /* sessionStorage can be blocked */ }
  var TC = { ping: 1, login: 1, me: 1, logout: 1, requestPasswordCode: 1, resetPasswordWithCode: 1, verifyLoginOtp: 1, resendLoginOtp: 1, changePassword: 1, dashboard: 1, search: 1, getTransaction: 1, crmBoot: 1, crmSaveClient: 1, crmAddNote: 1, crmGetClient: 1 };
  var token = '';

  function mode() {
    if (DEMO) return 'demo';
    if (!String(CFG.API_URL || '').trim()) return 'local';
    return 'live';
  }
  function post(url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow',
      credentials: 'omit',
      cache: 'no-store'
    }).then(function (r) {
      if (!r.ok) throw new Error('Server error ' + r.status);
      return r.json();
    }, function () {
      throw new Error('Could not reach the server. Check your connection and try again.');
    }).then(function (res) {
      if (res && res.ok) return res.data;
      var e = new Error((res && res.error) || 'Something went wrong.');
      e.code = res && res.code;
      e.fields = res && res.fields;
      throw e;
    });
  }
  function api(action, params) {
    var body = Object.assign({ action: action, token: token }, params || {});
    var tc = !!TC[action];
    var localOh = !tc && mode() !== 'live';
    var localTc = tc && DEMO;
    if (localOh || localTc || action === 'bindSession') {
      if (action === 'bindSession' && mode() === 'live') return Promise.resolve({});
      return w.OHDemo.call(body);
    }
    var url = tc ? CFG.TC_API_URL : CFG.API_URL;
    if (!url) return Promise.reject(new Error(tc ? 'Transaction Center is not connected.' : 'The Open House service is not connected yet.'));
    return post(url, body);
  }

  w.OHApi = {
    api: api,
    setToken: function (t) { token = t || ''; },
    getToken: function () { return token; },
    mode: mode,
    DEMO: DEMO,
    CFG: CFG
  };
})(window);
