/* The sign-in sheet shared by the agent form, the iPad kiosk, and the public phone page. */
(function (w) {
  'use strict';
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function choices(name, legend, list) {
    return '<fieldset class="choices"><legend>' + esc(legend) + ' <span class="req">*</span></legend>' +
      list.map(function (o) {
        return '<button type="button" class="choice" data-name="' + name + '" data-v="' + esc(o.k) + '" aria-pressed="false">' + esc(o.ui || o.label) + '</button>';
      }).join('') + '</fieldset>';
  }
  function html(house) {
    var L = w.OHLogic;
    house = house || {};
    var mark = '<span class="oh-title oh-sm oh-on-light sheet-mark" role="img" aria-label="Open House Dashboard"><span class="oh-t1" aria-hidden="true"><span class="w">Open</span><span class="w">House</span></span><span class="oh-t2" aria-hidden="true">Dashboard</span></span>';
    return '<article class="sheet"><div class="sheet-top">' + mark + '<p class="eyebrow">ENESMA Realty</p>' +
      '<h1 class="addr">' + esc(house.addressLine || 'Open House') + '</h1>' +
      (function () {
        var bits = String(house.whenLabel || '').split(' · ').filter(Boolean);
        return bits.map(function (part, i) {
          var text = (i === bits.length - 1 ? esc(part).replace(/ /g, '\u00a0') : esc(part));
          return '<p class="when">' + text + '</p>';
        }).join('');
      })() +
      (house.host ? '<p class="host">Hosted by ' + esc(house.host) + '</p>' : '') +
      '</div><div id="sheetBody"><form id="sheetForm" autocomplete="off" novalidate>' +
      '<div id="sheetErr"></div><div class="fgrid">' +
      '<div class="f"><label for="sfF">First Name <span class="req">*</span></label><input id="sfF" name="oh-first" maxlength="50" autocomplete="off" autocapitalize="words" required></div>' +
      '<div class="f"><label for="sfL">Last Name <span class="req">*</span></label><input id="sfL" name="oh-last" maxlength="50" autocomplete="off" autocapitalize="words" required></div>' +
      '<div class="f"><label for="sfP">Phone <span class="req">*</span></label><input id="sfP" name="oh-phone" type="tel" inputmode="tel" maxlength="12" placeholder="000-000-0000" autocomplete="off" required></div>' +
      '<div class="f"><label for="sfE">Email</label><input id="sfE" name="oh-email" type="email" maxlength="120" autocapitalize="none" spellcheck="false" autocomplete="off"></div>' +
      '</div>' +
      choices('intent', 'I Am Here to', L.INTENT) +
      choices('hasAgent', 'I Already Have an Agent', [{ k: 'no', label: 'No' }, { k: 'yes', label: 'Yes' }]) +
      '<div class="f other" id="otherWrap" hidden><label for="sfA">Your Agent’s Name</label><input id="sfA" maxlength="80" autocomplete="off"></div>' +
      choices('preApproved', 'Are You Pre-Approved?', L.PRE) +
      choices('timeframe', 'Timeframe', L.TIME) +
      '<div class="f note"><label for="sfN">Anything Else? <span class="opt">Optional</span></label><textarea id="sfN" maxlength="2000" autocomplete="off"></textarea></div>' +
      '<button class="btn xl" id="sfB" type="submit">Sign in</button></form></div>' +
      '<pre class="disc">' + esc(L.DISCLOSURE) + '</pre></article>';
  }
  function selected(root, name) {
    var b = root.querySelector('.choice[data-name="' + name + '"][aria-pressed="true"]');
    return b ? b.getAttribute('data-v') : '';
  }
  function wire(root, onSubmit) {
    var L = w.OHLogic;
    var form = root.querySelector('#sheetForm');
    if (!form) return;
    var phone = root.querySelector('#sfP');
    phone.addEventListener('input', function () {
      var caret = phone.selectionStart == null ? phone.value.length : phone.selectionStart;
      var digitsBefore = phone.value.slice(0, caret).replace(/\D/g, '').length;
      var next = L.maskPhone(phone.value);
      if (phone.value === next) return;
      phone.value = next;
      var i = 0, n = 0;
      while (i < next.length && n < digitsBefore) { if (/\d/.test(next.charAt(i))) n++; i++; }
      try { phone.setSelectionRange(i, i); } catch (e) { /* some mobile browsers */ }
    });
    root.querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () {
        var name = b.getAttribute('data-name');
        root.querySelectorAll('.choice[data-name="' + name + '"]').forEach(function (o) {
          var on = o === b;
          o.setAttribute('aria-pressed', on ? 'true' : 'false');
          o.classList.toggle('on', on);
        });
        if (name === 'hasAgent') root.querySelector('#otherWrap').hidden = b.getAttribute('data-v') !== 'yes';
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var guest = {
        firstName: root.querySelector('#sfF').value,
        lastName: root.querySelector('#sfL').value,
        phone: root.querySelector('#sfP').value,
        email: root.querySelector('#sfE').value,
        intent: selected(root, 'intent'),
        hasAgent: selected(root, 'hasAgent'),
        otherAgent: root.querySelector('#sfA').value,
        preApproved: selected(root, 'preApproved'),
        timeframe: selected(root, 'timeframe'),
        note: root.querySelector('#sfN').value
      };
      var err = L.validateGuest(guest);
      var box = root.querySelector('#sheetErr');
      if (err) { box.innerHTML = '<div class="err" role="alert">' + esc(err) + '</div>'; box.scrollIntoView({ block: 'nearest' }); return; }
      box.innerHTML = '';
      var btn = root.querySelector('#sfB');
      btn.disabled = true;
      Promise.resolve(onSubmit(L.normalizeGuest(guest))).then(function () {
        btn.disabled = false;
      }).catch(function (ex) {
        btn.disabled = false;
        box.innerHTML = '<div class="err" role="alert">' + esc(ex && ex.message ? ex.message : 'Could not save the sign-in.') + '</div>';
      });
    });
  }
  function thanks() {
    return '<div class="thanks" role="status"><b>You’re signed in.</b><p>Enjoy the open house.</p></div>';
  }
  w.OHSheet = { html: html, wire: wire, thanks: thanks };
})(window);
