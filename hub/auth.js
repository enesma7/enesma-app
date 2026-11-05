(function (w) {
  var CFG = w.HUB || {};
  var S = { token: '', user: null };

  function cookieDomain() {
    return /(^|\.)enesmarealty\.com$/.test(location.hostname) ? '; Domain=.enesmarealty.com' : '';
  }
  function getCookie(n) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + n.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function setCookie(n, v, maxAge) {
    var secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = n + '=' + encodeURIComponent(v) + '; Path=/; Max-Age=' + maxAge + '; SameSite=Lax' + secure + cookieDomain();
  }
  function clearCookie(n) {
    document.cookie = n + '=; Path=/; Max-Age=0; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '') + cookieDomain();
  }
  function storeToken(tok) {
    S.token = tok || '';
    try { sessionStorage.removeItem('hub_t'); } catch (e) { }
    if (tok) {
      try { sessionStorage.setItem('hub_t', tok); } catch (e) { }
      setCookie('enesma_sso', tok, 24 * 60 * 60);
    } else {
      clearCookie('enesma_sso');
    }
  }
  function finishLogin(d) {
    if (!d || !d.token) throw new Error('Sign-in did not complete. Please try again.');
    if (d.deviceToken) setCookie('enesma_dt', d.deviceToken, 30 * 24 * 60 * 60);
    storeToken(d.token);
    S.user = d.user;
    return d;
  }
  function signOut() {
    var tok = S.token;
    if (tok && CFG.API_URL) {
      fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'logout', token: tok }), redirect: 'follow', credentials: 'omit', cache: 'no-store' }).catch(function () { });
    }
    storeToken(null);
    S.user = null;
  }
  function api(action, params) {
    if (!CFG.API_URL) return Promise.reject(Object.assign(new Error('The sign-in service is not connected yet.'), { code: 'SETUP' }));
    var body = Object.assign({ action: action, token: S.token }, params || {});
    return fetch(CFG.API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('Server error ' + r.status); return r.json(); }, function () { throw new Error('Could not reach the server. Check your connection and try again.'); })
      .then(function (res) {
        if (res && res.ok) return res.data;
        var e = new Error((res && res.error) || 'Something went wrong.');
        e.code = res && res.code;
        if (e.code === 'AUTH') { storeToken(null); S.user = null; }
        throw e;
      });
  }
  function bootSession() {
    var tok = '';
    try { tok = sessionStorage.getItem('hub_t') || ''; } catch (e) { }
    if (!tok) tok = getCookie('enesma_sso') || '';
    if (tok) storeToken(tok);
    return tok;
  }

  w.HubAuth = {
    S: S,
    api: api,
    getCookie: getCookie,
    setCookie: setCookie,
    clearCookie: clearCookie,
    storeToken: storeToken,
    finishLogin: finishLogin,
    signOut: signOut,
    bootSession: bootSession
  };
})(window);
