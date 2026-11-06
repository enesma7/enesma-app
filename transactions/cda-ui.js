/* CDA popup, E-Sign handoff, owner signed-PDF post, and escrow check. Talks to TC 1.7.1. */
(function () {
  'use strict';
  var M = window.TCCda;
  var BROKER = { name: 'Enrique Esparza', email: 'enrique@enesmabroker.com' };

  function app() { return window.TCApp; }
  function unknown(err) { return !!(err && /unknown action/i.test(err.message || '')); }
  function money2(n) { n = M.round2(M.num(n)); var sign = n < 0 ? '-' : ''; return sign + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  function esignUrl() {
    var cfg = window.TC_CONFIG || {};
    return String(cfg.ESIGN_API_URL || (window.ES_CONFIG && window.ES_CONFIG.API_URL) || '').trim();
  }
  function esignCall(action, params, token) {
    var url = esignUrl();
    if (!url) return Promise.reject(new Error('E-Sign is not configured on this Transaction Center.'));
    var body = Object.assign({ action: action }, params || {});
    if (token) body.token = token;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow', credentials: 'omit', cache: 'no-store' })
      .then(function (r) { return r.json(); }, function () { throw new Error('Could not reach ENESMA E-Sign.'); })
      .then(function (j) { if (!j || !j.ok) { var e = new Error((j && j.error) || 'E-Sign could not do that.'); e.code = j && j.code; throw e; } return j.data; });
  }
  function esignSession() {
    var A = app();
    if (esignSession.tok) return Promise.resolve(esignSession.tok);
    return esignCall('loginWithToken', { tcToken: A.S.token }).then(function (d) { esignSession.tok = d.token; esignSession.user = d.user; return d.token; });
  }

  function agentById(pack, id) {
    return ((pack && pack.agents) || []).filter(function (a) { return a.id === id; })[0] || null;
  }
  function suggestNote(pack, lines) {
    var header = (pack && pack.header) || {};
    var ag = agentById(pack, header.agentId);
    var sp = M.splitOf(ag);
    var cap = ag && ag.capAmount !== '' && ag.capAmount != null ? ag.capAmount : '';
    var fee = pack && pack.adminFee != null ? pack.adminFee : M.ADMIN_FEE;
    var who = sp.source === 'example' ? 'No split is saved for this agent, so the suggestion uses the ENESMA example: Enrique Esparza, ' + M.EXAMPLE_SPLIT + '% agent / ' + (100 - M.EXAMPLE_SPLIT) + '% brokerage.' : 'Suggestion uses this agent’s saved split, ' + sp.split + '% agent / ' + (100 - sp.split) + '% brokerage.';
    var capTxt = cap === '' ? ' No annual cap is on file.' : ' Annual cap on file: ' + money2(cap) + ' (shown for reference; the suggestion is still split % of total gross, with the admin fee on its own line).';
    return who + ' Admin fee is ' + money2(fee) + ' on every file and stays on the CDA. Primary agent is the split of total gross, minus that admin fee, so brokerage + agent + admin fee match the locked total.' + capTxt;
  }

  function lineRow(l, i, pack, locked) {
    var A = app(), h = A.h;
    var kind = l.kind;
    var label = M.LABELS[kind] || kind;
    var agents = (pack.agents || []).filter(function (a) { return a.id; });
    var nameCell;
    if (kind === 'brokerage' || kind === 'admin_fee') nameCell = '<input data-f="name" value="' + h(l.name || M.BROKER_NAME) + '" readonly tabindex="-1" aria-label="' + h(label) + ' payee">';
    else if (kind === 'primary') nameCell = '<input data-f="name" value="' + h(l.name || (pack.header && pack.header.agentName) || '') + '" readonly tabindex="-1" aria-label="Primary agent">';
    else if (M.AGENT_KINDS[kind]) {
      nameCell = '<select data-f="agentId" aria-label="' + h(label) + '"><option value="">Choose an ENESMA agent</option>' + agents.map(function (a) {
        return '<option value="' + h(a.id) + '"' + (a.id === l.agentId ? ' selected' : '') + '>' + h(a.name) + (a.splitPct === '' || a.splitPct == null ? '' : ' · ' + h(a.splitPct) + '%') + '</option>';
      }).join('') + '</select>';
    } else nameCell = '<input data-f="name" value="' + h(l.name || '') + '" maxlength="120" placeholder="Payee name" aria-label="' + h(label) + ' payee"' + (locked ? ' readonly' : '') + '>';
    var books = M.EBOOKS_KINDS.indexOf(kind) >= 0;
    return '<div class="cda-line" data-i="' + i + '" data-kind="' + h(kind) + '"><div class="cda-k"><b>' + h(label) + '</b>' + (books ? '<small>E-Books</small>' : '<small>CDA only</small>') + (kind !== 'brokerage' && kind !== 'primary' && kind !== 'admin_fee' && kind !== 'tc_fee' && !locked ? '<button type="button" class="link cda-rm">Remove</button>' : '') + '</div>' +
      nameCell +
      '<input data-f="amount" inputmode="decimal" value="' + h(l.amount === '' || l.amount == null ? '' : M.round2(l.amount)) + '" placeholder="0.00" aria-label="' + h(label) + ' amount"' + (locked ? ' readonly' : '') + '>' +
      '<input data-f="note" value="' + h(l.note || '') + '" maxlength="160" placeholder="Mail to / note" aria-label="' + h(label) + ' note"' + (locked ? ' readonly' : '') + '></div>';
  }

  function readLines(root) {
    var A = app();
    return A.qsa('.cda-line', root).map(function (row) {
      var kind = row.getAttribute('data-kind');
      var nameEl = row.querySelector('[data-f="name"]');
      var agentEl = row.querySelector('[data-f="agentId"]');
      var agentId = agentEl ? agentEl.value : (kind === 'primary' ? (root._agentId || '') : '');
      var name = nameEl ? nameEl.value.trim() : '';
      if (agentEl && agentEl.selectedOptions && agentEl.selectedOptions[0] && agentId) name = agentEl.selectedOptions[0].textContent.replace(/\s·\s[\d.]+%$/, '').trim();
      var amtRaw = row.querySelector('[data-f="amount"]').value.trim();
      return { kind: kind, amount: amtRaw === '' ? '' : M.round2(M.num(amtRaw)), name: name, agentId: agentId || '', vendorId: '', pct: '', note: row.querySelector('[data-f="note"]').value.trim() };
    });
  }

  function paintTotals(root, header) {
    var A = app(), host = A.qs('.cda-tot', root);
    if (!host) return;
    var lines = readLines(root);
    var sum = M.sumLines(lines), gross = M.grossOf(header), diff = M.round2(sum - gross);
    var cls = diff === 0 ? 'ok' : 'err';
    var msg = diff === 0 ? 'Lines match the locked total gross.' : (diff > 0 ? 'Over by ' + money2(diff) + '.' : 'Short by ' + money2(Math.abs(diff)) + '.') + ' Fix the amounts before sending, or confirm a mismatch.';
    host.className = 'cda-tot ' + cls;
    host.innerHTML = '<span>Lines ' + money2(sum) + '</span><span>Total gross ' + money2(gross) + '</span><span>' + msg + '</span>';
    var box = A.qs('.cda-mis', root);
    if (box) box.hidden = diff === 0;
    root._mismatch = diff !== 0;
  }

  function fillPdf(header, lines) {
    var A = app();
    var fields = M.pdfFields(header, lines);
    return fetch('../forms/cda.pdf', { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('Could not open the CDA form.');
      return r.arrayBuffer();
    }).then(function (buf) {
      return A.loadPdfLib().then(function (Lib) { return Lib.PDFDocument.load(buf); });
    }).then(function (doc) {
      var form = doc.getForm();
      Object.keys(fields).forEach(function (name) {
        try { form.getTextField(name).setText(fields[name] == null ? '' : String(fields[name])); } catch (e) { /* field missing on this PDF build */ }
      });
      try { form.updateFieldAppearances(); } catch (e2) { }
      try { form.flatten(); } catch (e3) { }
      return doc.save();
    });
  }

  function ownerUser() {
    var A = app(), s = A.S.user || {};
    if (s.owner) return Promise.resolve({ name: A.uName ? A.uName(s) : (s.name || BROKER.name), email: s.email || BROKER.email });
    if (!A.isAdmin()) return Promise.resolve(BROKER);
    return A.api('listUsers').then(function (users) {
      var o = (users || []).filter(function (u) { return u.owner && u.active !== false; })[0];
      if (!o) return BROKER;
      return { name: A.uName(o), email: o.email || o.username || BROKER.email };
    }, function () { return BROKER; });
  }
  function agentEmail(header) {
    var A = app(), s = A.S.user || {};
    if (s.id && header.agentId && s.id === header.agentId) return Promise.resolve(s.email || '');
    if (!A.isAdmin()) return Promise.resolve(s.email && !header.agentId ? s.email : '');
    return A.api('listUsers').then(function (users) {
      var u = (users || []).filter(function (x) { return x.id === header.agentId; })[0];
      return u ? (u.email || u.username || '') : '';
    }, function () { return ''; });
  }

  function sendEnvelope(header, lines, agent, broker) {
    var A = app();
    return fillPdf(header, lines).then(function (bytes) {
      var b64 = A.bytesToB64(bytes);
      return esignSession().then(function (tok) {
        return A.loadPdfLib().then(function (Lib) {
          return Lib.PDFDocument.load(bytes).then(function (doc) {
            var p = doc.getPages()[0].getSize();
            return { b64: b64, rects: M.signRects(p.width, p.height), pages: doc.getPageCount() };
          });
        }).then(function (pdf) {
          var r = pdf.rects;
          function fld(type, who, box, label) { return { type: type, recipient: who, page: box.page, x: box.x, y: box.y, w: box.w, h: box.h, required: true, label: label }; }
          var fields = [fld('signature', 'agent', r.agentSig, 'Agent signature'), fld('date', 'agent', r.agentDate, 'Date'), fld('signature', 'owner', r.brokerSig, 'Broker signature'), fld('date', 'owner', r.brokerDate, 'Date')];
          var title = 'CDA – ' + (header.address || 'Commission disbursement');
          return esignCall('createEnvelope', {
            name: title,
            subject: 'Please sign: ' + title,
            message: 'Commission Disbursement Authorization for ' + (header.address || 'this file') + '. The agent signs first. The broker signs second.',
            orderMode: 'sequential',
            pages: pdf.pages || 1,
            templateId: '',
            fields: fields,
            pdf: pdf.b64,
            recipients: [
              { key: 'agent', name: agent.name, email: agent.email, roleLabel: 'Agent', order: 1 },
              { key: 'owner', name: broker.name, email: broker.email, roleLabel: 'Broker', order: 2 }
            ]
          }, tok);
        });
      });
    });
  }

  function pullSigned(txnId, envelopeId) {
    var A = app();
    return esignSession().then(function (tok) {
      return esignCall('getEnvelope', { id: envelopeId }, tok).then(function (d) {
        var env = d.envelope || d;
        if (!env || env.status !== 'completed') return { waiting: true, status: env && env.status };
        return esignCall('getEnvelopePdf', { id: envelopeId, final: true }, tok).then(function (pdf) {
          var b64 = String(pdf.pdf || pdf.base64 || '');
          return A.api('cdaOnSigned', { txnId: txnId, envelopeId: envelopeId, base64: b64, name: (pdf.name || 'CDA-signed.pdf') }).then(function (out) { return { signed: true, out: out }; });
        });
      });
    });
  }

  function open(itemId) {
    var A = app(), t = A.S.txn && A.S.txn.txn;
    if (!t) return;
    var m = A.modal('<h2>Commission Disbursement Authorization</h2><div class="loading"><span class="spin"></span> Loading CDA…</div>', true);
    A.api('cdaGet', { txnId: t.id }).then(function (pack) {
      pack = pack || {};
      if (A.S.txn && A.S.txn.txn.id === t.id) A.S.txn.cdaPack = pack;
      draw(m, t, itemId, pack);
    }, function (err) {
      if (unknown(err)) {
        var header = M.headerFromTxn(t);
        var sug = M.fallbackSuggest(header, null, M.ADMIN_FEE);
        draw(m, t, itemId, { cda: null, executed: null, versions: [], header: header, suggested: sug.lines, adminFee: M.ADMIN_FEE, agents: [], escrowCheck: null, lineKinds: M.KINDS, eBooksKinds: M.EBOOKS_KINDS, offline: true, suggestMeta: sug });
        return;
      }
      A.qs('.box', m).innerHTML = '<button class="close" aria-label="Close">×</button><h2>CDA</h2><div class="err">' + A.h(err.message) + '</div>';
      A.qs('.close', m).onclick = m.close;
    });
  }

  function draw(m, txn, itemId, pack) {
    var A = app(), h = A.h, header = pack.header || {};
    var cda = pack.cda, status = (cda && cda.status) || '';
    var locked = status === 'sent' || status === 'executed';
    var ag = agentById(pack, header.agentId);
    var lines = (cda && cda.lines && cda.lines.length) ? cda.lines : ((pack.suggested && pack.suggested.length) ? pack.suggested : M.fallbackSuggest(header, ag, pack.adminFee).lines);
    lines = M.ensureSkeleton(lines, header, pack.adminFee);
    var primary = lines.filter(function (l) { return l.kind === 'primary'; })[0];
    if (primary) { if (!primary.agentId) primary.agentId = header.agentId || ''; if (!primary.name) primary.name = header.agentName || ''; }
    var bro = lines.filter(function (l) { return l.kind === 'brokerage'; })[0];
    if (bro && !bro.name) bro.name = M.BROKER_NAME;

    function headerBits() {
      var rows = [
        ['Property', header.address], ['Sales price', header.price ? money2(header.price) : '—'],
        ['Commission', header.commissionType === 'amount' ? money2(header.commission) : (header.commission != null && header.commission !== '' ? header.commission + '%' : '—')],
        ['Total gross', money2(header.totalGross)], ['Agent', header.agentName],
        ['Representation', M.sideLabel(header.side, header.type)],
        ['Escrow #', header.escrowNumber], ['Escrow company', header.escrowCompany],
        ['Escrow officer', header.escrowOfficer], ['Escrow email', header.escrowEmail]
      ];
      return '<dl class="cda-lock">' + rows.map(function (r) { return '<div><dt>' + h(r[0]) + '</dt><dd>' + h(r[1] || '—') + '</dd></div>'; }).join('') + '</dl>';
    }
    var ver = cda && cda.version ? ' · v' + cda.version : '';
    var stLabel = { draft: 'Draft', sent: 'Out for signature', executed: 'Signed' }[status] || (status ? status : 'New');
    var executedNote = pack.executed && status !== 'executed' ? '<div class="ok">Latest signed CDA is v' + h(pack.executed.version || '') + '. This draft does not replace it until it is signed again. Books keep the latest fully signed CDA.</div>' : '';
    var html = '<h2>Commission Disbursement Authorization</h2><p class="sub">' + h(stLabel + ver) + (pack.offline ? ' · backend 1.7.1 is not on this server yet. You can review the form; saving needs that update.' : '') + '</p>' + executedNote +
      '<h3 class="cda-h">From the file <small>Locked</small></h3>' + headerBits() +
      '<p class="sub cda-note">' + h(suggestNote(pack, lines)) + '</p><div id="cdaErr"></div>' +
      '<div class="cda-lines" id="cdaLines">' + lines.map(function (l, i) { return lineRow(l, i, pack, locked); }).join('') + '</div>' +
      (locked ? '' : '<div class="cda-add"><button type="button" class="ub" data-add="co_list">+ Co-listing agent</button><button type="button" class="ub" data-add="co_buyer">+ Co-buyer agent</button><button type="button" class="ub" data-add="referral_inhouse">+ In-house referral</button><button type="button" class="ub" data-add="referral_outside">+ Outside referral</button><button type="button" class="ub" data-add="tc_fee">+ TC fee</button><button type="button" class="ub" data-add="other">+ Other</button><button type="button" class="ub" data-add="credit">+ Credit</button></div>') +
      '<div class="cda-tot"></div>' +
      '<label class="chk cda-mis" hidden><input type="checkbox" id="cdaMis"> Send even though the lines do not match total gross</label>' +
      '<div class="cda-sign" id="cdaSign"></div>' +
      '<div class="actions" id="cdaActs"></div>';
    A.qs('.box', m).innerHTML = '<button class="close" aria-label="Close">×</button>' + html;
    A.qs('.close', m).onclick = m.close;
    var box = A.qs('.box', m);
    box._agentId = header.agentId || '';
    box._linesBox = A.qs('#cdaLines', m);

    function rerenderLines() {
      paintTotals(box, header);
    }
    box.addEventListener('input', function (e) { if (e.target && e.target.closest && e.target.closest('.cda-line')) rerenderLines(); });
    A.qsa('.cda-rm', box).forEach(function (b) { b.onclick = function () { b.closest('.cda-line').remove(); rerenderLines(); }; });
    A.qsa('[data-add]', box).forEach(function (b) {
      b.onclick = function () {
        var kind = b.getAttribute('data-add');
        if ((kind === 'tc_fee' || kind === 'referral_inhouse' || kind === 'referral_outside') && A.qs('.cda-line[data-kind="' + kind + '"]', box)) { A.toast('That row is already on the CDA.', 1); return; }
        var row = document.createElement('div');
        row.innerHTML = lineRow(M.blank(kind), A.qsa('.cda-line', box).length, pack, false);
        var node = row.firstChild;
        A.qs('#cdaLines', box).appendChild(node);
        var rm = node.querySelector('.cda-rm'); if (rm) rm.onclick = function () { node.remove(); rerenderLines(); };
        rerenderLines();
      };
    });
    paintTotals(box, header);

    var acts = A.qs('#cdaActs', m);
    function err(msg) { A.qs('#cdaErr', m).innerHTML = msg ? '<div class="err">' + h(msg) + '</div>' : ''; }
    function payloadLines() {
      var linesOut = M.ensureAdmin(readLines(box), pack.adminFee);
      var bad = linesOut.filter(function (l) { return l.kind === 'referral_inhouse' && M.num(l.amount) > 0 && !l.agentId; })[0]
        || linesOut.filter(function (l) { return (l.kind === 'co_list' || l.kind === 'co_buyer') && M.num(l.amount) > 0 && !l.agentId; })[0];
      if (bad) { err('Choose the ENESMA agent for ' + (M.LABELS[bad.kind] || bad.kind) + '.'); return null; }
      return linesOut;
    }
    if (!locked && !pack.offline) {
      acts.innerHTML = '<button type="button" class="ub" id="cdaSave">Save draft</button><button type="button" class="btn" id="cdaSend">Send for E-Sign</button>';
      A.qs('#cdaSave', m).onclick = function () {
        var linesOut = payloadLines(); if (!linesOut) return;
        var b = this; b.disabled = true;
        A.api('cdaSaveDraft', { txnId: txn.id, lines: linesOut }).then(function () { m.close(); A.toast('CDA draft saved.'); A.refresh(); }, function (e) {
          b.disabled = false;
          if (e.code === 'CONFLICT') err('This CDA was sent or signed. Use Revise CDA before saving changes.');
          else err(e.message);
        });
      };
      A.qs('#cdaSend', m).onclick = function () { startSend(payloadLines()); };
    } else if (pack.offline) {
      acts.innerHTML = '<p class="sub">Saving and E-Sign start once Transaction Center 1.7.1 is deployed.</p>';
    }
    if (status === 'sent' || status === 'executed') {
      var rev = document.createElement('button'); rev.type = 'button'; rev.className = 'ub'; rev.id = 'cdaRev'; rev.textContent = 'Revise CDA';
      acts.appendChild(rev);
      rev.onclick = function () { revise(pack); };
    }
    if (status === 'sent') renderSent(pack);
    if (status === 'executed') renderExecuted(pack);

    function startSend(linesOut) {
      if (!linesOut) return;
      if (box._mismatch && !(A.qs('#cdaMis', m) && A.qs('#cdaMis', m).checked)) { err('The lines do not add up to total gross. Adjust them, or check the box to send the mismatch.'); return; }
      err('');
      var host = A.qs('#cdaSign', m);
      host.innerHTML = '<div class="loading"><span class="spin"></span> Checking signers…</div>';
      Promise.all([agentEmail(header), ownerUser()]).then(function (pair) {
        host.innerHTML = '<div class="cda-who"><label>Agent signs first<input id="cdaAN" value="' + h(header.agentName || '') + '" readonly></label><label>Agent email<input id="cdaAE" type="email" value="' + h(pair[0] || '') + '" autocomplete="off"></label>' +
          '<label>Broker signs second<input id="cdaBN" value="' + h(pair[1].name || BROKER.name) + '"></label><label>Broker email<input id="cdaBE" type="email" value="' + h(pair[1].email || BROKER.email) + '" autocomplete="off"></label></div>' +
          '<button type="button" class="btn" id="cdaGo">Send agent, then broker</button>';
        A.qs('#cdaGo', m).onclick = function () {
          var ae = A.qs('#cdaAE', m).value.trim(), be = A.qs('#cdaBE', m).value.trim(), bn = A.qs('#cdaBN', m).value.trim();
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ae) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(be) || !bn) { err('Enter the agent email and the broker name and email.'); return; }
          var b = this; b.disabled = true; err('');
          var allow = !!(box._mismatch && A.qs('#cdaMis', m) && A.qs('#cdaMis', m).checked);
          var afterSave = A.api('cdaSaveDraft', { txnId: txn.id, lines: linesOut });
          afterSave.then(function () {
            if (A.DEMO) return { envelope: { id: 'demo-' + txn.id } };
            return sendEnvelope(header, linesOut, { name: header.agentName || 'Agent', email: ae }, { name: bn, email: be });
          }).then(function (env) {
            var id = (env.envelope && env.envelope.id) || env.id;
            if (!id) throw new Error('E-Sign did not return an envelope.');
            return A.api('cdaMarkSent', { txnId: txn.id, envelopeId: id, allowMismatch: allow || undefined });
          }).then(function () {
            m.close();
            A.toast(A.DEMO ? 'Demo: CDA marked sent. The owner records the signed PDF from this file.' : 'CDA sent. The agent signs first, then the broker.');
            A.refresh();
          }, function (e) {
            b.disabled = false;
            if (e.code === 'CONFLICT') err('This CDA was already sent or signed. Revise it before sending again.');
            else err(e.message);
          });
        };
      }, function (e) { host.innerHTML = ''; err(e.message); });
    }
    function revise() {
      var reason = window.prompt('Why is this CDA being revised? The previous signature request is voided. The latest fully signed CDA stays on the books until the new one is signed.');
      if (!reason || !String(reason).trim()) return;
      A.api('cdaRevise', { txnId: txn.id, reason: String(reason).trim() }).then(function () { A.toast('CDA reopened as a new draft.'); m.close(); A.refresh(); }, function (e) { err(e.message); });
    }
    function renderSent(p) {
      var env = (p.cda && p.cda.envelopeId) || '';
      var host = A.qs('#cdaSign', m);
      var owner = A.S.user && (A.S.user.owner || A.isAdmin());
      host.innerHTML = '<p class="sub">Out for signature' + (env ? ' · envelope ' + h(env) : '') + '. Agent first, broker second.</p>' +
        (owner ? '<button type="button" class="btn" id="cdaPull">' + (A.DEMO ? 'Demo: record signed PDF' : 'Check E-Sign and file the signed PDF') + '</button>' : '<p class="sub">When both have signed, the owner files the signed PDF on this checklist.</p>');
      var pull = A.qs('#cdaPull', m);
      if (!pull) return;
      pull.onclick = function () {
        pull.disabled = true; err('');
        var done = function (msg) { m.close(); A.toast(msg); A.refresh(); };
        if (A.DEMO) {
          A.api('cdaOnSigned', { txnId: txn.id, envelopeId: env || ('demo-' + txn.id), base64: 'JVBERi0xLjEK', name: 'CDA-signed.pdf' }).then(function () { done('Signed CDA filed. E-Books entries are waiting for owner approval.'); }, function (e) { pull.disabled = false; err(e.message); });
          return;
        }
        pullSigned(txn.id, env).then(function (r) {
          if (r.waiting) { pull.disabled = false; err('E-Sign is not finished yet' + (r.status ? ' (' + r.status + ').' : '.')); return; }
          done('Signed CDA filed on the checklist. E-Books entries are waiting for approval.');
        }, function (e) { pull.disabled = false; err(e.message); });
      };
      if (owner && !A.DEMO && env) {
        pullSigned(txn.id, env).then(function (r) { if (r.signed) { m.close(); A.toast('Signed CDA filed on the checklist.'); A.refresh(); } }, function () { });
      }
    }
    function renderExecuted(p) {
      var host = A.qs('#cdaSign', m);
      var q = p.cda && (p.cda.queued || p.queued);
      host.innerHTML = '<div class="ok">Fully signed. The PDF is on this checklist item. Brokerage and ENESMA agent amounts are pending in E-Books until the owner approves them.' + (q ? ' ' + h(q) + ' queued.' : '') + '</div>';
    }
  }

  function escrowHtml() {
    var A = app();
    if (!A || !A.S.txn || !A.S.user || !A.S.user.owner) return '';
    var t = A.S.txn.txn;
    if (!t || t.status !== 'Closed') return '';
    var p = A.S.txn.cdaPack;
    if (!p) return '';
    var executed = p.executed || (p.cda && p.cda.status === 'executed' ? p.cda : null);
    if (!executed) return '';
    var expected = M.grossOf(p.header);
    var chk = p.escrowCheck || {};
    var h = A.h;
    var prior = chk.date ? '<p class="' + (chk.match ? 'ok' : 'err') + '">Last confirmation ' + h(chk.date) + ' · check ' + h(chk.checkNumber || '') + ' · ' + money2(chk.amount) + (chk.match ? ' · match' : ' · mismatch ' + money2(chk.difference || 0)) + '.</p>' : '';
    return '<div class="card gb cda-esc" id="cdaEsc"><h3>Escrow check</h3><p class="sub">Confirm the commission check against the signed CDA total gross of <b>' + money2(expected) + '</b>. A match locks books for this file. A mismatch leaves them open.</p>' + prior +
      '<div id="cdaEscErr"></div><div class="cda-who"><label>Date<input type="date" id="escDate" value="' + h(chk.date || '') + '"></label><label>Check #<input id="escNum" value="' + h(chk.checkNumber || '') + '" maxlength="40"></label><label>Amount<input id="escAmt" inputmode="decimal" value="' + h(chk.amount != null && chk.amount !== '' ? chk.amount : '') + '" placeholder="0.00"></label></div>' +
      '<p id="escLive" class="sub"></p><button type="button" class="btn" id="escGo">Confirm escrow check</button></div>';
  }
  function wireEscrow(root) {
    var A = app(), box = A.qs('#cdaEsc', root);
    if (!box) return;
    var expected = M.grossOf(A.S.txn.cdaPack && A.S.txn.cdaPack.header);
    function live() {
      var amt = A.qs('#escAmt', box).value.trim();
      var host = A.qs('#escLive', box);
      if (!amt) { host.textContent = ''; return; }
      var diff = M.round2(M.num(amt) - expected);
      host.textContent = diff === 0 ? 'Match. This check equals the signed CDA total gross.' : 'Mismatch ' + money2(diff) + ' versus the signed CDA. Books stay open until it matches.';
    }
    A.qs('#escAmt', box).oninput = live; live();
    A.qs('#escGo', box).onclick = function () {
      var date = A.qs('#escDate', box).value, num = A.qs('#escNum', box).value.trim(), amt = A.qs('#escAmt', box).value.trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !num || !(M.num(amt) > 0)) { A.qs('#cdaEscErr', box).innerHTML = '<div class="err">Enter the date, check number, and amount.</div>'; return; }
      var b = this; b.disabled = true;
      A.api('ebConfirmEscrowCheck', { txnId: A.S.txn.txn.id, date: date, checkNumber: num, amount: amt }).then(function (d) {
        var c = (d && d.escrowCheck) || {};
        A.toast(c.match ? 'Escrow check matches. Books for this file are locked.' : 'Recorded. The check does not match the CDA, so books stay open.');
        A.refresh();
      }, function (e) { b.disabled = false; A.qs('#cdaEscErr', box).innerHTML = '<div class="err">' + A.h(e.message) + '</div>'; });
    };
  }

  function mountPending(host) {
    var A = app();
    if (!host) return;
    host.innerHTML = '<div class="loading"><span class="spin"></span> Checking CDA approvals…</div>';
    A.api('ebCdaPending').then(function (d) {
      var rows = (d && d.pending) || [];
      if (!rows.length) { host.innerHTML = '<p class="sub">No signed-CDA amounts are waiting for approval.</p>'; return; }
      var h = A.h;
      host.innerHTML = '<h2 class="ebh2">Signed CDA · waiting for approval</h2><p class="sub">These are the brokerage portion and ENESMA agent amounts from a fully signed CDA. TC fee, admin fee, outside referral, other, and credits are not here. Approve to post them. Reject to drop this batch. The latest signed CDA replaces an older one.</p>' +
        '<div class="ebtable"><table class="ebt" id="cdaPendTbl"><thead><tr><th></th><th>File</th><th>Op</th><th>Payee</th><th>Kind</th><th class="r">Amount</th></tr></thead><tbody>' +
        rows.map(function (r) {
          return '<tr data-id="' + h(r.id) + '"><td><input type="checkbox" class="cdaP" checked aria-label="Include"></td><td>' + h(r.title || r.txnId || '') + '</td><td>' + h(r.op || '') + '</td><td>' + h(r.payeeName || r.name || '—') + '</td><td>' + h(r.kind || r.importKey || '') + '</td><td class="r">' + money2(r.amount) + '</td></tr>';
        }).join('') + '</tbody></table></div><div class="ebbar"><button type="button" class="btn" id="cdaAp">Approve selected</button><button type="button" class="ub" id="cdaRj">Reject selected</button></div>';
      function ids() { return A.qsa('#cdaPendTbl tbody tr', host).filter(function (tr) { return A.qs('.cdaP', tr).checked; }).map(function (tr) { return tr.getAttribute('data-id'); }); }
      function decide(decision) {
        var list = ids(); if (!list.length) { A.toast('Select at least one row.', 1); return; }
        A.api('ebCdaDecide', { ids: list, decision: decision }).then(function (res) {
          return A.ebAfter((decision === 'approve' ? 'Approved ' + (res.approved || list.length) : 'Rejected ' + (res.rejected || list.length)) + '.');
        }, function (e) { A.toast(e.message, 1); });
      }
      A.qs('#cdaAp', host).onclick = function () { decide('approve'); };
      A.qs('#cdaRj', host).onclick = function () { decide('reject'); };
      var txnIds = {};
      rows.forEach(function (r) { if (r.txnId) txnIds[r.txnId] = 1; });
      A.qsa('.ebim tr[data-id]').forEach(function (tr) {
        if (!txnIds[tr.getAttribute('data-id')]) return;
        var c = A.qs('.imC', tr); if (c) { c.checked = false; c.disabled = true; }
        tr.classList.add('done');
      });
    }, function (err) {
      host.innerHTML = unknown(err) ? '' : '<div class="err">' + A.h(err.message) + '</div>';
    });
  }

  window.TCCdaUi = { open: open, escrowHtml: escrowHtml, wireEscrow: wireEscrow, mountPending: mountPending };
})();
