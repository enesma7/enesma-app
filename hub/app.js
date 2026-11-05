(function () {
  var CFG = window.HUB || {};
  var C = window.HUB_CONTENT || {};
  var Auth = window.HubAuth;
  var S = Auth.S;
  var $app = document.getElementById('app');
  var view = 'boot';
  var otpCh = null;
  var searchOpen = false;

  function h(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function path() {
    var p = (location.hash || '#/').replace(/^#/, '');
    if (!p || p === '/') return '/';
    if (p.charAt(0) !== '/') p = '/' + p;
    return p.replace(/\/+$/, '') || '/';
  }
  function userName() {
    var u = S.user || {};
    return u.name || [u.firstName, u.lastName].filter(Boolean).join(' ') || u.email || 'Agent';
  }
  function upcomingEvents() {
    var now = Date.now();
    var until = now + 30 * 24 * 60 * 60 * 1000;
    return (C.events || []).filter(function (e) {
      var t = Date.parse(e.start);
      if (!isFinite(t) || t < now || t > until) return false;
      if (!e.free) return false;
      var host = String(e.host || '');
      return /C\.A\.R|CVAR/i.test(host);
    });
  }

  function tile(t) {
    var href = t.href || '#/';
    var ext = t.ext || /^https?:/i.test(href);
    var open = ext ? ' target="_blank" rel="noopener"' : '';
    if (t.kind === 'tc') {
      return '<a class="tile solid" href="' + h(href) + '"' + open + '><div class="tc-lockup"><p class="kicker">TRANSACTION CENTER</p><div class="dash"></div><h3>' + h(t.title) + '</h3><p>' + h(t.sub) + '</p><p class="steps">' + h(t.steps || '') + '</p></div></a>';
    }
    return '<a class="tile" href="' + h(href) + '"' + open + ' style="background-image:url(\'' + h(t.img) + '\')"><div class="cap"><div class="dash"></div><h3>' + h(t.title) + '</h3><p>' + h(t.sub || '') + '</p></div></a>';
  }
  function grid(items) { return '<div class="grid-2">' + (items || []).map(tile).join('') + '</div>'; }
  function pageHero(title, img) {
    return '<section class="page-hero" style="background-image:url(\'' + h(img) + '\')"><h1>' + h(title) + '</h1></section>';
  }
  function sectionHead(title, sub) {
    return '<div class="section-head"><h2>' + h(title) + '</h2><div class="gold-rule"></div>' + (sub ? '<p>' + h(sub) + '</p>' : '') + '</div>';
  }
  function headerHtml() {
    var p = path();
    function on(prefix) { return p === prefix || (prefix !== '/' && p.indexOf(prefix) === 0) ? ' on' : ''; }
    return '<header class="top" id="top">' +
      '<a class="brand" href="#/"><img src="assets/logo-white.png" alt="ENESMA Realty"><span class="hub-label">AGENT HUB</span></a>' +
      '<button class="menu-btn icon-btn" id="menuBtn" aria-label="Menu"><span></span><span></span><span></span></button>' +
      '<nav class="nav" id="nav">' +
        '<a href="#/" class="' + on('/') + (p !== '/' ? '' : ' on') + '">Home</a>' +
        '<div class="drop">' +
          '<button class="link' + on('/compliance') + '" type="button">Compliance <i class="caret"></i></button>' +
          '<div class="drop-menu">' +
            '<a href="#/compliance/transaction-checklists">Transaction Checklists</a>' +
            '<a href="#/compliance/c-a-r-legal-hotline">C.A.R. Legal Hotline</a>' +
            '<a href="#/compliance/office-documents">Office Documents</a>' +
            '<a href="#/compliance/office-policies">Office Policies</a>' +
          '</div>' +
        '</div>' +
        '<div class="drop">' +
          '<button class="link' + on('/marketing-templates') + '" type="button">Marketing <i class="caret"></i></button>' +
          '<div class="drop-menu"><a href="#/marketing-templates">Templates</a><a href="#/marketing-templates/holidays">Holidays</a></div>' +
        '</div>' +
        '<a href="#/technology" class="' + on('/technology') + '">Technology</a>' +
        '<a href="#/listings" class="' + on('/listings') + '">Listings</a>' +
        '<a href="#/training" class="' + on('/training') + '">Training</a>' +
        '<div class="drop">' +
          '<button class="link' + on('/calculators') + '" type="button">Calculators <i class="caret"></i></button>' +
          '<div class="drop-menu">' +
            '<a href="#/calculators/flip-calculator">Flip Calculator</a>' +
            '<a href="#/calculators/net-sheet">Net Sheet</a>' +
            '<a href="#/calculators/mortgage-calculator">Mortgage Calculator</a>' +
          '</div>' +
        '</div>' +
        '<a href="#/refer" class="' + on('/refer') + '">Refer</a>' +
        '<div class="drop">' +
          '<button class="link' + on('/agents') + '" type="button">Agents <i class="caret"></i></button>' +
          '<div class="drop-menu"><a href="#/agents/enrique-esparza">Enrique Esparza</a><a href="#/agents/lilia-amador">Lilia Amador</a></div>' +
        '</div>' +
        '<div class="nav-tools">' +
          '<button class="icon-btn" id="searchBtn" aria-label="Search">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="sgr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EAD59E"/><stop offset="1" stop-color="#D5BE87"/></linearGradient></defs><g fill="none" stroke="url(#sgr)" stroke-width="2.4" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="7"/><path d="M16 16l5 5"/></g></svg>' +
          '</button>' +
          '<span class="user-chip">' + h(userName()) + '</span>' +
          '<button class="signout" id="signOut" type="button">Sign out</button>' +
        '</div>' +
      '</nav></header>';
  }
  function appsBar() {
    return '<div class="apps-bar">' +
      '<a href="' + h(CFG.TC) + '">Transaction Center</a>' +
      '<a href="' + h(CFG.ESIGN) + '">E-Sign</a>' +
      '<a href="' + h(CFG.MYBOOKS) + '">My E-Books</a>' +
      '</div>';
  }
  function footerHtml() {
    return '<div class="foot-wrap"><footer class="foot">' +
      '<div><img src="assets/logo-white.png" alt="ENESMA Realty" style="height:48px;width:auto">' +
      '<p class="tag">UNDERPROMISE &amp; OVERDELIVER</p>' +
      '<div class="eho"><img src="assets/eho-white.png" alt="">DRE# 01926362</div></div>' +
      '<div><h4>Hub</h4><ul>' +
        '<li><a href="#/">Resources</a></li><li><a href="#/training">Training</a></li>' +
        '<li><a href="#/listings">Office Listings</a></li><li><a href="#/technology">Technology</a></li>' +
      '</ul></div>' +
      '<div><h4>Support</h4><ul>' +
        '<li><a href="#/agents/enrique-esparza">Contact the Broker</a></li>' +
        '<li><a href="#/compliance/office-policies">Office Policies</a></li>' +
        '<li><a href="#/preferred-partners">Preferred Partners</a></li>' +
      '</ul></div>' +
      '<div><h4>Broker</h4><ul>' +
        '<li><a href="#/agents/enrique-esparza">Enrique Esparza</a></li>' +
        '<li>DRE# 01926362</li><li>Southern California</li>' +
      '</ul></div></footer></div>' +
      '<p class="legal">© 2026 ENESMA Realty. For agent use only.</p>';
  }
  function searchIndex() {
    var items = [
      { t: 'Home', s: 'Agent resources and upcoming events', h: '#/' },
      { t: 'Compliance', s: 'Contracts, disclosures & addenda', h: '#/compliance' },
      { t: 'Transaction Checklists', s: 'Required documents for every file type', h: '#/compliance/transaction-checklists' },
      { t: 'C.A.R. Legal Hotline', s: 'Member Legal Services (213) 739-8282', h: '#/compliance/c-a-r-legal-hotline' },
      { t: 'Office Documents', s: 'CDA, invoice and brokerage forms', h: '#/compliance/office-documents' },
      { t: 'Office Policies', s: 'Policies & procedures manual', h: '#/compliance/office-policies' },
      { t: 'Marketing Templates', s: 'Logos, colors and Canva templates', h: '#/marketing-templates' },
      { t: 'Holidays', s: 'Holiday social graphics', h: '#/marketing-templates/holidays' },
      { t: 'Technology', s: 'CRM, MLS and tools', h: '#/technology' },
      { t: 'Office Listings', s: 'Current ENESMA listings', h: '#/listings' },
      { t: 'Training Library', s: 'Recorded sessions and coaching', h: '#/training' },
      { t: 'Calculators', s: 'Flip, net sheet and mortgage', h: '#/calculators' },
      { t: 'Refer an Agent', s: 'Referral addendum and incentives', h: '#/refer' },
      { t: 'Agents', s: 'ENESMA agents', h: '#/agents' },
      { t: 'Preferred Partners', s: 'Escrow, lenders, inspectors and more', h: '#/preferred-partners' }
    ];
    (C.agents || []).forEach(function (a) { items.push({ t: a.name, s: a.role + ' · DRE# ' + a.dre, h: '#/agents/' + a.slug }); });
    (C.partners || []).forEach(function (p) { items.push({ t: p.title, s: p.sub, h: p.href }); });
    (C.tech || []).forEach(function (p) { items.push({ t: p.title, s: p.sub, h: p.href }); });
    (C.checklists || []).forEach(function (p) { items.push({ t: p.title, s: 'Transaction checklist', h: '#/compliance/transaction-checklists' }); });
    return items;
  }
  function searchOverlay() {
    if (!searchOpen) return '';
    return '<div class="search-scrim" id="searchScrim"><div class="search-box"><input id="searchIn" type="search" placeholder="Search the Hub" autofocus><div id="searchHits"></div></div></div>';
  }

  function pageHome() {
    var ev = upcomingEvents();
    var evHtml = ev.length ? ev.map(function (e) {
      return '<a class="event" href="' + h(e.href) + '" target="_blank" rel="noopener" style="background-image:url(\'' + h(e.img) + '\')">' +
        '<div class="cap"><div class="date">' + h(e.mon) + '<b>' + h(e.day) + '</b></div>' +
        '<div class="dash"></div><h3>' + h(e.title) + '</h3><p>' + h(e.meta) + '</p></div></a>';
    }).join('') : '<p class="note" style="text-align:center">No upcoming free C.A.R. or CVAR events in the next 30 days.</p>';
    return '<section class="hero" style="background-image:url(\'assets/hero.jpg\')"><img class="lockup" src="assets/hero-lockup.png" alt="ENESMA Realty Agent Hub. Underpromise &amp; Overdeliver."></section>' +
      '<section class="section"><div class="wrap">' + sectionHead('Agent Resources', 'Forms, tools, and support to help you close with confidence.') + grid(C.homeTiles) + '</div></section>' +
      '<section class="section" style="padding-top:0"><div class="wrap">' + sectionHead('Upcoming Events', '') +
      (ev.length ? '<div class="grid-2">' + evHtml + '</div>' : evHtml) + '</div></section>' +
      '<div class="pills"><a class="pill" href="' + h(CFG.ADD_IOS) + '" target="_blank" rel="noopener">Add to iPhone</a>' +
      '<a class="pill" href="' + h(CFG.ADD_ANDROID) + '" target="_blank" rel="noopener">Add to Android</a></div>';
  }
  function pageCompliance() {
    return pageHero('COMPLIANCE', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap">' + grid(C.complianceTiles) + '</div></section>';
  }
  function pageChecklists() {
    var cards = (C.checklists || []).map(function (x) {
      var src = 'https://docs.google.com/spreadsheets/d/' + x.id + '/preview';
      var open = 'https://docs.google.com/spreadsheets/d/' + x.id + '/edit';
      return '<div style="margin:0 0 28px"><h3 style="margin:0 0 10px">' + h(x.title) + '</h3>' +
        '<p class="note" style="margin:0 0 10px"><a href="' + h(open) + '" target="_blank" rel="noopener">Open in Google Sheets</a> · File › Make a copy</p>' +
        '<iframe class="embed" src="' + h(src) + '" title="' + h(x.title) + '" loading="lazy"></iframe></div>';
    }).join('');
    return pageHero('TRANSACTION CHECKLISTS', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap">' + cards + '</div></section>';
  }
  function pageLegal() {
    var L = C.legal || {};
    var qa = (L.items || []).map(function (it) {
      return '<h3>' + h(it.q) + '</h3>' + it.a;
    }).join('');
    return pageHero('C.A.R. LEGAL HOTLINE', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap"><div class="prose">' +
      '<h2 style="text-align:center;margin:0 0 8px">' + h(L.title || 'Member Legal Services') + '</h2>' +
      '<p style="text-align:center"><a href="tel:+12137398282">' + h(L.tel) + '</a><br>' + h(L.revised) + '</p>' +
      '<p>Designated REALTORS®, Broker/Owners, and Office Managers may also call <a href="tel:+12137398350">' + h(L.brokerTel) + '</a>.</p></div>' +
      '<div class="qa">' + qa + '</div></div></section>';
  }
  function pageOfficeDocs() {
    var cards = (C.officeDocs || []).map(function (d) {
      return '<a class="card-plain" href="' + h(d.href) + '" target="_blank" rel="noopener"><h3>' + h(d.title) + '</h3><p>' + h(d.sub) + '</p></a>';
    }).join('');
    return pageHero('OFFICE DOCUMENTS', 'assets/banners/compliance.jpg') +
      '<section class="section"><div class="wrap"><div class="grid-2">' + cards + '</div></div></section>';
  }
  function pagePolicies() {
    var id = C.policiesDocId;
    var preview = 'https://docs.google.com/document/d/' + id + '/preview';
    var pdf = 'https://docs.google.com/document/d/' + id + '/export?format=pdf';
    return pageHero('OFFICE POLICIES', 'assets/banners/policies.jpg') +
      '<section class="section"><div class="wrap">' +
      '<div class="section-head"><h2>Office Policies &amp; Procedures Manual</h2><div class="gold-rule"></div>' +
      '<p>ENESMA Realty · DRE# 01926362 · Broker Enrique Esparza</p></div>' +
      '<p class="note" style="text-align:center;margin:0 0 18px"><a href="' + h(pdf) + '" target="_blank" rel="noopener">Download PDF</a> · <a href="' + h('https://docs.google.com/document/d/' + id + '/edit') + '" target="_blank" rel="noopener">Open in Google Docs</a></p>' +
      '<iframe class="embed" src="' + h(preview) + '" title="Office Policies &amp; Procedures Manual" loading="lazy"></iframe>' +
      '</div></section>';
  }
  function pageMarketing() {
    var colors = (C.colors || []).map(function (c) {
      var bg = c.bg || c.hex;
      return '<figure class="swatch"><div class="chip" style="background:' + h(bg) + (c.hex === '#FBFBFB' ? ';border-bottom:1px solid #ececec' : '') + '"></div>' +
        '<figcaption><b>' + h(c.name) + '</b><code>' + h(c.hex) + '</code>' + (c.note ? '<span style="display:block;color:#6b6b70;margin-top:4px">' + h(c.note) + '</span>' : '') + '</figcaption></figure>';
    }).join('');
    var canva = (C.canva || []).map(function (x) {
      return '<a class="card-plain" href="' + h(x.href) + '" target="_blank" rel="noopener"><h3>' + h(x.title) + '</h3><p>' + h(x.sub) + '</p></a>';
    }).join('');
    return pageHero('MARKETING', 'assets/banners/marketing.jpg') +
      '<section class="section"><div class="wrap">' +
      sectionHead('Logos', 'Download the wordmark for dark or light backgrounds.') +
      '<div class="grid-2" style="margin-bottom:48px">' +
        '<a class="card-plain" href="assets/logo-white.png" download><div style="background:#000007;border-radius:6px;padding:22px;margin-bottom:12px;display:grid;place-items:center"><img src="assets/logo-white.png" alt="White wordmark" style="height:64px;width:auto"></div><h3>White wordmark</h3><p>Use on black or photography.</p></a>' +
        '<a class="card-plain" href="assets/logo-black.png" download><div style="background:#FBFBFB;border-radius:6px;padding:22px;margin-bottom:12px;display:grid;place-items:center"><img src="assets/logo-black.png" alt="Black wordmark" style="height:64px;width:auto"></div><h3>Black wordmark</h3><p>Use on light backgrounds.</p></a>' +
      '</div>' +
      sectionHead('Colors', 'Official ENESMA brand palette.') +
      '<div class="swatches">' + colors + '</div>' +
      sectionHead('Templates', 'Open a Canva design or folder.') +
      '<div class="grid-2">' + canva + '<a class="card-plain" href="#/marketing-templates/holidays"><h3>Holidays</h3><p>Right-click or press and hold an image to save it.</p></a></div>' +
      '</div></section>';
  }
  function pageHolidays() {
    var figs = (C.holidays || []).map(function (x) {
      return '<figure><img src="' + h(x.img) + '" alt="' + h(x.title) + '"><figcaption>' + h(x.title) + '</figcaption></figure>';
    }).join('');
    return pageHero('HOLIDAYS', 'assets/banners/marketing.jpg') +
      '<section class="section"><div class="wrap">' +
      '<p class="save-hint">Right-click or press and hold an image to save it. Add your name, phone and DRE# in the space at the bottom.</p>' +
      '<div class="holidays">' + figs + '</div></div></section>';
  }
  function pageTech() {
    var cards = (C.tech || []).map(function (t) {
      var logo = t.img ? '<img src="' + h(t.img) + '" alt="">' : '<div class="word">' + h(t.word || t.title) + '</div>';
      return '<a class="tech-card" href="' + h(t.href) + '" target="_blank" rel="noopener"><div class="logo-box">' + logo + '</div><div class="dash"></div><h3>' + h(t.title) + '</h3><p>' + h(t.sub) + '</p></a>';
    }).join('');
    return pageHero('TECHNOLOGY', 'assets/banners/technology.jpg') +
      '<section class="section"><div class="wrap"><div class="tech-grid">' + cards + '</div></div></section>';
  }
  function pageListings() {
    var L = C.listing || {};
    return pageHero('OFFICE LISTINGS', 'assets/banners/listings.jpg') +
      '<section class="section"><div class="wrap"><a class="listing-card" href="' + h(L.href) + '" target="_blank" rel="noopener">' +
      '<img src="' + h(L.img) + '" alt="' + h(L.title) + '"><div><h2>' + h(L.title) + '</h2><p>' + h(L.sub) + '</p><p class="note">' + h(L.agent) + '</p></div></a></div></section>';
  }
  function pageTraining() {
    var cards = (C.training || []).map(function (t) {
      return '<a class="tile" href="https://www.youtube.com/watch?v=' + h(t.id) + '" target="_blank" rel="noopener" style="background-image:url(\'assets/training/' + h(t.id) + '.jpg\')">' +
        '<div class="cap"><div class="dash"></div><h3>' + h(t.title) + '</h3></div></a>';
    }).join('');
    return pageHero('TRAINING LIBRARY', 'assets/banners/training.jpg') +
      '<section class="section"><div class="wrap"><div class="prose">' + (C.trainingDisclaimer || '') + '</div>' +
      '<div class="grid-2" style="margin-top:28px">' + cards + '</div></div></section>';
  }
  function pageCalcs() {
    return pageHero('CALCULATORS', 'assets/banners/calculators.jpg') +
      '<section class="section"><div class="wrap">' + grid(C.calcTiles) + '</div></section>';
  }
  function pageCalcEmbed(info) {
    return pageHero(info.title, 'assets/banners/calculators.jpg') +
      '<section class="section"><div class="wrap"><iframe class="embed" src="' + h(info.src) + '" title="' + h(info.title) + '" loading="lazy"></iframe></div></section>';
  }
  function pageRefer() {
    var R = C.refer || {};
    var rows = (R.capRows || []).map(function (r) {
      return '<tr><td>' + h(r.volume) + '</td><td>' + h(r.reduction) + '</td></tr>';
    }).join('');
    return pageHero('REFER AN AGENT', 'assets/banners/refer.jpg') +
      '<section class="section"><div class="wrap"><div class="prose">' +
      '<p><strong>' + h(R.lead) + '</strong></p><p>' + h(R.intro) + '</p>' +
      '<h3>1. Cap reduction for referring a Producing Agent</h3>' +
      '<p>If the agent you refer is a Producing Agent, meaning they closed transactions totaling one of the sales volume thresholds below during the preceding 12 months, your cap is reduced:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:0 0 16px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Referred agent’s sales volume (preceding 12 months)</th><th style="text-align:left;padding:8px;border-bottom:1px solid #ddd">Your cap reduction</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p>' + h(R.capNote) + '</p>' +
      '<h3>2. Referral Production Incentive: 1% of their GCI</h3>' +
      '<p>' + h(R.gci) + '</p>' +
      '<h3>How to refer</h3>' +
      '<p>There is no form on this page yet. Contact Enrique and he will reach out to the agent personally.</p>' +
      '<p><a class="btn" href="#/agents/enrique-esparza">Contact the Broker</a></p>' +
      '<p class="note">' + h(R.legal) + '</p></div></div></section>';
  }
  function pageAgents() {
    var cards = (C.agents || []).map(function (a) {
      return '<a class="card-plain" href="#/agents/' + h(a.slug) + '"><img src="' + h(a.img) + '" alt="" style="width:100%;height:220px;object-fit:cover;border-radius:6px;margin-bottom:12px"><h3>' + h(a.name) + '</h3><p>' + h(a.role) + ' · DRE# ' + h(a.dre) + '</p></a>';
    }).join('');
    return pageHero('REAL ESTATE AGENTS', 'assets/banners/agents.jpg') +
      '<section class="section"><div class="wrap"><div class="grid-2">' + cards + '</div></div></section>';
  }
  function pageAgent(a) {
    return pageHero(a.name.toUpperCase(), 'assets/banners/agents.jpg') +
      '<section class="section"><div class="wrap"><div class="agent">' +
      '<img src="' + h(a.img) + '" alt="' + h(a.name) + '"><div>' +
      '<h2>' + h(a.name) + '</h2><p class="meta">' + h(a.role) + ' · DRE# ' + h(a.dre) + '</p>' +
      '<p><a href="tel:' + h(a.phone.replace(/[^\d+]/g, '')) + '">' + h(a.phone) + '</a><br>' +
      '<a href="mailto:' + h(a.email) + '">' + h(a.email) + '</a><br>' +
      '<a href="' + h(a.web) + '" target="_blank" rel="noopener">' + h(a.webLabel) + '</a></p>' +
      (a.bioHtml || '') + '</div></div></div></section>';
  }
  function pagePartners() {
    var cards = (C.partners || []).map(function (p) {
      var ext = /^https?:|^mailto:/i.test(p.href);
      return '<a class="card-plain" href="' + h(p.href) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '><h3>' + h(p.title) + '</h3><p>' + h(p.sub) + '</p></a>';
    }).join('');
    return pageHero('PREFERRED PARTNERS', 'assets/banners/partners.jpg') +
      '<section class="section"><div class="wrap"><div class="partners">' + cards + '</div></div></section>';
  }
  function page404() {
    return '<section class="section"><div class="wrap" style="text-align:center"><h2>Page not found</h2><div class="gold-rule"></div><p><a href="#/">Back to the Hub</a></p></div></section>';
  }

  function pageFor(p) {
    if (p === '/') return pageHome();
    if (p === '/compliance') return pageCompliance();
    if (p === '/compliance/transaction-checklists' || p === '/compliance/checklists') return pageChecklists();
    if (p === '/compliance/c-a-r-legal-hotline' || p === '/compliance/legal-hotline') return pageLegal();
    if (p === '/compliance/office-documents') return pageOfficeDocs();
    if (p === '/compliance/office-policies') return pagePolicies();
    if (p === '/marketing-templates') return pageMarketing();
    if (p === '/marketing-templates/holidays') return pageHolidays();
    if (p === '/technology') return pageTech();
    if (p === '/listings') return pageListings();
    if (p === '/training') return pageTraining();
    if (p === '/calculators') return pageCalcs();
    if (C.calcs && C.calcs[p]) return pageCalcEmbed(C.calcs[p]);
    if (p === '/refer') return pageRefer();
    if (p === '/agents') return pageAgents();
    if (p.indexOf('/agents/') === 0) {
      var slug = p.slice('/agents/'.length);
      var a = (C.agents || []).filter(function (x) { return x.slug === slug; })[0];
      return a ? pageAgent(a) : page404();
    }
    if (p === '/preferred-partners') return pagePartners();
    return page404();
  }

  function titles() {
    var map = {
      '/': 'AGENT HUB',
      '/compliance': 'COMPLIANCE',
      '/compliance/transaction-checklists': 'Transaction Checklists',
      '/compliance/c-a-r-legal-hotline': 'C.A.R. Legal Hotline',
      '/compliance/office-documents': 'Office Documents',
      '/compliance/office-policies': 'Office Policies',
      '/marketing-templates': 'MARKETING',
      '/marketing-templates/holidays': 'HOLIDAYS',
      '/technology': 'TECHNOLOGY',
      '/listings': 'OFFICE LISTINGS',
      '/training': 'TRAINING LIBRARY',
      '/calculators': 'CALCULATORS',
      '/calculators/flip-calculator': 'Flip Calculator',
      '/calculators/net-sheet': 'Net Sheet',
      '/calculators/mortgage-calculator': 'Mortgage Calculator',
      '/refer': 'REFER AN AGENT',
      '/agents': 'REAL ESTATE AGENTS',
      '/agents/enrique-esparza': 'Enrique Esparza',
      '/agents/lilia-amador': 'Lilia Amador',
      '/preferred-partners': 'PREFERRED PARTNERS'
    };
    return map[path()] || 'AGENT HUB';
  }

  function loginShell(inner) {
    return '<div class="login-page"><header class="top"><a class="brand" href="#/"><img src="assets/logo-white.png" alt="ENESMA Realty"><span class="hub-label">AGENT HUB</span></a></header>' +
      '<div class="login-wrap"><div class="login-card">' + inner + '</div></div></div>';
  }
  function renderLogin(msg) {
    view = 'login';
    document.title = 'Sign in · AGENT HUB';
    $app.innerHTML = loginShell(
      '<h1>Sign in</h1><p class="sub">Use the same email and password as Transaction Center. A code may be emailed when you sign in from a new device.</p>' +
      (msg ? '<div class="err">' + h(msg) + '</div>' : '') +
      '<form id="lf" autocomplete="on">' +
      '<div class="f"><label for="lu">Email</label><input id="lu" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" required></div>' +
      '<div class="f"><label for="lp">Password</label><input id="lp" type="password" autocomplete="current-password" required></div>' +
      '<button class="btn wide" id="lb">Sign in</button>' +
      '<p class="fine"><a href="#" id="lc">First time or forgot password?</a></p></form>'
    );
    qs('#lc').onclick = function (e) { e.preventDefault(); renderForgot(qs('#lu').value.trim()); };
    qs('#lf').onsubmit = function (e) {
      e.preventDefault();
      var b = qs('#lb'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Signing in…';
      var em = qs('#lu').value.trim().toLowerCase();
      Auth.api('login', { email: em, username: em, password: qs('#lp').value, deviceToken: Auth.getCookie('enesma_dt') || '' }).then(function (d) {
        if (d && d.needsOtp) return renderOtp(d);
        Auth.finishLogin(d);
        afterAuth();
      }).catch(function (err) { var keep = qs('#lu').value; renderLogin(err.message); qs('#lu').value = keep; });
    };
  }
  function renderOtp(ch, msg, okMsg) {
    view = 'otp'; otpCh = ch;
    var hint = (ch && ch.emailHint) || 'your account email';
    document.title = 'Enter code · AGENT HUB';
    $app.innerHTML = loginShell(
      '<h1>Enter your sign-in code</h1>' +
      '<p class="sub">We emailed a 6-digit code to <b>' + h(hint) + '</b>. It expires in about 10 minutes. Check spam if you don’t see it.</p>' +
      (msg ? '<div class="err">' + h(msg) + '</div>' : '') + (okMsg ? '<div class="ok">' + h(okMsg) + '</div>' : '') +
      '<form id="of">' +
      '<div class="f"><label for="oc">Code</label><input id="oc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div>' +
      '<label class="chk"><input id="ot" type="checkbox" checked> Trust this device for 30 days. We won’t ask for a code again on this browser until then.</label>' +
      '<button class="btn wide" id="ob">Verify and sign in</button>' +
      '<p class="fine"><a href="#" id="or">Send a new code</a> · <a href="#" id="obk">Back to sign in</a></p></form>'
    );
    qs('#obk').onclick = function (e) { e.preventDefault(); renderLogin(); };
    qs('#or').onclick = function (e) {
      e.preventDefault();
      Auth.api('resendLoginOtp', { challengeId: ch.challengeId }).then(function (d) {
        renderOtp({ challengeId: ch.challengeId, emailHint: (d && d.emailHint) || hint }, '', 'A new code is on its way.');
      }).catch(function (err) { renderOtp(ch, err.message); });
    };
    qs('#of').onsubmit = function (e) {
      e.preventDefault();
      var b = qs('#ob'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Verifying…';
      Auth.api('verifyLoginOtp', { challengeId: ch.challengeId, code: qs('#oc').value.trim(), rememberDevice: qs('#ot').checked, deviceLabel: (navigator.userAgent || '').slice(0, 120) })
        .then(function (d) { Auth.finishLogin(d); afterAuth(); })
        .catch(function (err) { renderOtp(ch, err.message); });
    };
    setTimeout(function () { var el = qs('#oc'); if (el) el.focus(); }, 30);
  }
  function renderForgot(email, step, msg, okMsg, need) {
    view = 'forgot';
    var two = step === 2; need = need || [];
    document.title = 'Reset password · AGENT HUB';
    $app.innerHTML = loginShell(
      '<h1>' + (two ? 'Enter your code' : 'Set up or reset your password') + '</h1>' +
      '<p class="sub">' + (two ? 'We emailed a 6-digit code to <b>' + h(email) + '</b>. It expires in 15 minutes. Check spam if you don’t see it.' : 'Enter the email address the office registered for you. We’ll email you a code.') + '</p>' +
      (msg ? '<div class="err">' + h(msg) + '</div>' : '') + (okMsg ? '<div class="ok">' + h(okMsg) + '</div>' : '') +
      '<form id="cf">' +
      (two
        ? '<input type="hidden" id="ce" value="' + h(email) + '">' +
          '<div class="f"><label for="cc">Code</label><input id="cc" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" required></div>' +
          '<div class="f"><label for="c1">New password</label><input id="c1" type="password" autocomplete="new-password" minlength="10" required></div>' +
          '<div class="f"><label for="c2">Repeat new password</label><input id="c2" type="password" autocomplete="new-password" required></div>' +
          '<p class="note">At least 10 characters with letters and numbers.</p>' +
          (need.indexOf('firstName') >= 0 ? '<div class="f"><label for="cfn">First name</label><input id="cfn" type="text" autocomplete="given-name" maxlength="50" required></div>' : '') +
          (need.indexOf('lastName') >= 0 ? '<div class="f"><label for="cln">Last name</label><input id="cln" type="text" autocomplete="family-name" maxlength="50" required></div>' : '') +
          (need.indexOf('phone') >= 0 ? '<div class="f"><label for="cph">Phone</label><input id="cph" type="tel" autocomplete="tel" placeholder="000-000-0000" required></div>' : '')
        : '<div class="f"><label for="ce">Email</label><input id="ce" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" inputmode="email" value="' + h(email || '') + '" required></div>') +
      '<button class="btn wide" id="cb">' + (two ? 'Save password and sign in' : 'Email me a code') + '</button>' +
      '<p class="fine">' + (two ? '<a href="#" id="cr">Send a new code</a> · ' : '') + '<a href="#" id="cbk">Back to sign in</a></p></form>'
    );
    qs('#cbk').onclick = function (e) { e.preventDefault(); renderLogin(); };
    if (qs('#cr')) qs('#cr').onclick = function (e) { e.preventDefault(); renderForgot(email); };
    function unsupported(err) { return /unknown action/i.test(err.message) ? 'Password setup by email isn’t switched on yet. Ask Enrique to reset your password.' : err.message; }
    qs('#cf').onsubmit = function (e) {
      e.preventDefault();
      var b = qs('#cb'), em = qs('#ce').value.trim().toLowerCase();
      if (!two) {
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return renderForgot(em, 1, 'Enter a valid email address.');
        b.disabled = true; b.innerHTML = '<span class="spin"></span>Sending…';
        return Auth.api('requestPasswordCode', { email: em }).then(function () {
          renderForgot(em, 2, '', 'If that email has an account, a code is on its way.');
        }).catch(function (err) { renderForgot(em, 1, unsupported(err)); });
      }
      var p1 = qs('#c1').value;
      if (p1 !== qs('#c2').value) return renderForgot(em, 2, 'The new passwords do not match.', '', need);
      if (p1.length < 10 || !/[A-Za-z]/.test(p1) || !/\d/.test(p1)) return renderForgot(em, 2, 'Use at least 10 characters with letters and numbers.', '', need);
      var body = { email: em, code: qs('#cc').value.trim(), newPassword: p1 };
      if (qs('#cfn')) body.firstName = qs('#cfn').value.trim();
      if (qs('#cln')) body.lastName = qs('#cln').value.trim();
      if (qs('#cph')) body.phone = qs('#cph').value.trim();
      b.disabled = true; b.innerHTML = '<span class="spin"></span>Saving…';
      Auth.api('resetPasswordWithCode', body).then(function (d) {
        Auth.finishLogin(d);
        afterAuth();
      }).catch(function (err) {
        if (err.code === 'PROFILE_REQUIRED') return renderForgot(em, 2, err.message, '', err.fields || ['phone']);
        renderForgot(em, 2, unsupported(err), '', need);
      });
    };
  }

  function bindChrome() {
    var top = qs('#top');
    if (qs('#menuBtn')) qs('#menuBtn').onclick = function () { if (top) top.classList.toggle('nav-open'); };
    qsa('.drop > button.link').forEach(function (btn) {
      btn.onclick = function (e) {
        if (window.matchMedia('(max-width: 880px)').matches) {
          e.preventDefault();
          btn.parentNode.classList.toggle('open');
        }
      };
    });
    if (qs('#signOut')) qs('#signOut').onclick = function () { Auth.signOut(); renderLogin(); };
    if (qs('#searchBtn')) qs('#searchBtn').onclick = function () { searchOpen = true; renderApp(); };
    if (qs('#searchScrim')) {
      qs('#searchScrim').onclick = function (e) { if (e.target.id === 'searchScrim') { searchOpen = false; renderApp(); } };
      var input = qs('#searchIn'), hits = qs('#searchHits');
      function run() {
        var q = (input.value || '').trim().toLowerCase();
        var found = searchIndex().filter(function (x) {
          return !q || (x.t + ' ' + (x.s || '')).toLowerCase().indexOf(q) >= 0;
        }).slice(0, 20);
        hits.innerHTML = found.map(function (x) {
          var ext = /^https?:|^mailto:/i.test(x.h);
          return '<a href="' + h(x.h) + '"' + (ext ? ' target="_blank" rel="noopener"' : '') + '>' + h(x.t) + '<small>' + h(x.s || '') + '</small></a>';
        }).join('') || '<p class="note">No matching pages.</p>';
      }
      input.oninput = run; run();
      input.focus();
      qsa('#searchHits a').forEach(function (a) {
        if (a.getAttribute('href').charAt(0) === '#') a.addEventListener('click', function () { searchOpen = false; });
      });
    }
  }

  function renderApp() {
    view = 'app';
    document.title = titles() + ' · ENESMA Realty';
    $app.innerHTML = headerHtml() + appsBar() + pageFor(path()) + footerHtml() + searchOverlay();
    bindChrome();
    window.scrollTo(0, 0);
  }
  function afterAuth() {
    if (!location.hash || location.hash === '#/login') location.hash = '#/';
    renderApp();
  }

  function onRoute() {
    if (!S.token) {
      if (view !== 'login' && view !== 'otp' && view !== 'forgot') renderLogin();
      return;
    }
    renderApp();
  }

  window.addEventListener('hashchange', function () { searchOpen = false; onRoute(); });

  function boot() {
    Auth.bootSession();
    if (!S.token) { renderLogin(); return; }
    Auth.api('me').then(function (d) {
      S.user = (d && d.user) || d;
      renderApp();
    }).catch(function (err) {
      renderLogin(err.code === 'AUTH' ? '' : err.message);
    });
  }
  boot();
})();
