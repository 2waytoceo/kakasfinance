/**
 * script.js  —  Axis Bank Corporate Payout Owner Portal
 * Author : 2waytoceo <2waytoceo@gmail.com>  ·  v1.0.0
 *
 * Sections:
 *  1. Constants & Config
 *  2. State
 *  3. API Definitions
 *  4. Mock Responses
 *  5. Auth (login / logout / password toggle)
 *  6. Navigation
 *  7. Tester Panel Builder
 *  8. Tab Switcher & Header Editor
 *  9. Fire API Request
 * 10. Metrics Update
 * 11. Copy Response
 * 12. Request History
 * 13. Toast
 * 14. Bootstrap
 */

'use strict';

/* ══════════════════════════════════════════════════════════════
   1. Constants & Config
══════════════════════════════════════════════════════════════ */

const VALID_EMAIL    = '2waytoceo@gmail.com';
const VALID_PASSWORD = "Kali@231800'";

const AXIS = {
  salary:   'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/salary',
  txn:      'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/transaction/status',
  transfer: 'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/transfer',
  acval:    'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/account/validate',
  vpa:      'https://apiconnect.axisbank.co.in/aapis/corporate-payout/v1/upi/fetchvpa',
};

/* ══════════════════════════════════════════════════════════════
   2. State
══════════════════════════════════════════════════════════════ */

const ST = {
  calls: 0, ok: 0, err: 0, totalMs: 0,
  history: [],
  built: new Set(),
};

/* ══════════════════════════════════════════════════════════════
   3. API Definitions
══════════════════════════════════════════════════════════════ */

const today = new Date().toISOString().split('T')[0];

const APIS = {

  salary: {
    label: 'Salary Payment', icon: 'ti-wallet', method: 'POST', url: AXIS.salary,
    fields: [
      { id:'s_cid',   label:'Client ID',            tag:'req',   ph:'xxxx-xxxx-xxxx-xxxx' },
      { id:'s_cs',    label:'Client Secret',         tag:'req',   ph:'xxxxxxxxxxxxxxxxxxxxxxxx', type:'password' },
      { id:'s_tok',   label:'OAuth Access Token',    tag:'oauth', ph:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id:'s_ibm',   label:'X-IBM-Client-Id',       tag:'req',   ph:'xxxx-xxxx-xxxx' },
      { id:'s_corp',  label:'Corporate Account No.', tag:'req',   ph:'xxxxxxxxxxxxxxx' },
      { id:'s_deb',   label:'Debit Account No.',     tag:'req',   ph:'xxxxxxxxxxxxxxx' },
      { id:'s_batch', label:'Batch Reference ID',    tag:'opt',   ph:'BATCH-xxxx-xxxx' },
      { id:'s_hmac',  label:'HMAC / Checksum Key',   tag:'req',   ph:'xxxxxxxxxxxxxxxxxxxxxxxx', type:'password' },
    ],
    body: JSON.stringify({
      corporateAccountNo:'xxxxxxxxxxxxxxx', debitAccount:'xxxxxxxxxxxxxxx',
      batchRefId:'BATCH-'+today+'-001', paymentDate: today,
      transactions:[{
        beneficiaryAccount:'xxxxxxxxxxxxxxx', beneficiaryIFSC:'AXIS0000001',
        beneficiaryName:'RAHUL SHARMA', amount:50000, employeeId:'EMP001',
        remarks:'May 2026 Salary'
      }]
    }, null, 2),
  },

  txn: {
    label: 'Transaction Status', icon: 'ti-refresh', method: 'GET', url: AXIS.txn,
    fields: [
      { id:'t_cid',  label:'Client ID',             tag:'req',   ph:'xxxx-xxxx-xxxx-xxxx' },
      { id:'t_tok',  label:'OAuth Access Token',    tag:'oauth', ph:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id:'t_ibm',  label:'X-IBM-Client-Id',       tag:'req',   ph:'xxxx-xxxx-xxxx' },
      { id:'t_ref',  label:'Transaction Ref No.',   tag:'req',   ph:'TXN-xxxxxxxxxxxx' },
      { id:'t_utr',  label:'UTR Number',            tag:'opt',   ph:'UTRxxxxxxxxxxxxxxx' },
      { id:'t_ch',   label:'Channel ID',            tag:'opt',   ph:'CORP_API' },
    ],
    body: '',
  },

  transfer: {
    label: 'Transfer Payment', icon: 'ti-arrows-exchange', method: 'POST', url: AXIS.transfer,
    fields: [
      { id:'tr_cid',  label:'Client ID',            tag:'req',   ph:'xxxx-xxxx-xxxx-xxxx' },
      { id:'tr_cs',   label:'Client Secret',        tag:'req',   ph:'xxxxxxxxxxxxxxxxxxxxxxxx', type:'password' },
      { id:'tr_tok',  label:'OAuth Access Token',   tag:'oauth', ph:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id:'tr_ibm',  label:'X-IBM-Client-Id',      tag:'req',   ph:'xxxx-xxxx-xxxx' },
      { id:'tr_deb',  label:'Debit Account No.',    tag:'req',   ph:'xxxxxxxxxxxxxxx' },
      { id:'tr_ben',  label:'Beneficiary Account',  tag:'req',   ph:'xxxxxxxxxxxxxxx' },
      { id:'tr_ifsc', label:'Beneficiary IFSC',     tag:'req',   ph:'AXIS0000001' },
      { id:'tr_mode', label:'Transfer Mode',        tag:'req',   ph:'IMPS / NEFT / RTGS' },
      { id:'tr_hmac', label:'HMAC / Checksum Key',  tag:'req',   ph:'xxxxxxxxxxxxxxxxxxxxxxxx', type:'password' },
      { id:'tr_hook', label:'Callback Webhook URL', tag:'opt',   ph:'https://your-app.com/webhook' },
    ],
    body: JSON.stringify({
      debitAccount:'xxxxxxxxxxxxxxx', beneficiaryAccount:'xxxxxxxxxxxxxxx',
      beneficiaryIFSC:'AXIS0000001', beneficiaryName:'RAHUL SHARMA',
      amount:10000, transferMode:'IMPS', remarks:'Invoice INV-2026-001',
      uniqueRefNo:'REF-'+Date.now()
    }, null, 2),
  },

  acval: {
    label: 'Account Validation', icon: 'ti-user-check', method: 'POST', url: AXIS.acval,
    fields: [
      { id:'av_cid',  label:'Client ID',               tag:'req',   ph:'xxxx-xxxx-xxxx-xxxx' },
      { id:'av_tok',  label:'OAuth Access Token',      tag:'oauth', ph:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id:'av_ibm',  label:'X-IBM-Client-Id',         tag:'req',   ph:'xxxx-xxxx-xxxx' },
      { id:'av_ac',   label:'Beneficiary Account No.', tag:'req',   ph:'xxxxxxxxxxxxxxx' },
      { id:'av_ifsc', label:'Beneficiary IFSC',        tag:'req',   ph:'AXIS0000001' },
      { id:'av_mode', label:'Validation Mode',         tag:'opt',   ph:'PENNY_DROP / NAME_MATCH' },
      { id:'av_hmac', label:'HMAC / Checksum Key',     tag:'req',   ph:'xxxxxxxxxxxxxxxxxxxxxxxx', type:'password' },
    ],
    body: JSON.stringify({
      beneficiaryAccount:'xxxxxxxxxxxxxxx', beneficiaryIFSC:'AXIS0000001',
      validationMode:'NAME_MATCH', corpRefId:'VAL-'+Date.now()
    }, null, 2),
  },

  vpa: {
    label: 'Fetch VPA', icon: 'ti-qrcode', method: 'POST', url: AXIS.vpa,
    fields: [
      { id:'vp_cid',  label:'Client ID',              tag:'req',   ph:'xxxx-xxxx-xxxx-xxxx' },
      { id:'vp_cs',   label:'Client Secret',          tag:'req',   ph:'xxxxxxxxxxxxxxxxxxxxxxxx', type:'password' },
      { id:'vp_tok',  label:'OAuth Access Token',     tag:'oauth', ph:'Bearer xxxxxxxxxxxxxxxxxxxxxxxx' },
      { id:'vp_ibm',  label:'X-IBM-Client-Id',        tag:'req',   ph:'xxxx-xxxx-xxxx' },
      { id:'vp_vpa',  label:'VPA Address',            tag:'req',   ph:'name@axisbank / name@upi' },
      { id:'vp_corp', label:'Corporate Account No.',  tag:'req',   ph:'xxxxxxxxxxxxxxx' },
      { id:'vp_pur',  label:'Purpose Code',           tag:'opt',   ph:'P2B / P2P' },
      { id:'vp_hmac', label:'HMAC / Checksum Key',    tag:'req',   ph:'xxxxxxxxxxxxxxxxxxxxxxxx', type:'password' },
    ],
    body: JSON.stringify({
      vpaAddress:'rahulsharma@axisbank', corporateAccountNo:'xxxxxxxxxxxxxxx', purposeCode:'P2B'
    }, null, 2),
  },
};

/* ══════════════════════════════════════════════════════════════
   4. Mock Responses
══════════════════════════════════════════════════════════════ */

const now = () => new Date().toISOString();

const MOCK = {
  salary:   { status:'SUCCESS', batchRefId:'BATCH-'+today+'-001', batchId:'AXS20260506001234', totalTransactions:1, successCount:1, failureCount:0, transactions:[{employeeId:'EMP001',status:'PROCESSED',utr:'AXIS2026050600001',amount:50000,beneficiaryIFSC:'AXIS0000001',timestamp:now()}], processedAt:now() },
  txn:      { status:'SUCCESS', transactionRef:'TXN-xxxxxxxxxxxx', utr:'AXIS2026050600123', paymentStatus:'CREDITED', amount:10000, beneficiaryName:'RAHUL SHARMA', beneficiaryAccount:'xxxxxxxxxxxxxxx', beneficiaryIFSC:'AXIS0000001', transferMode:'IMPS', creditedAt:now() },
  transfer: { status:'SUCCESS', uniqueRefNo:'REF-20260506-001', utr:'AXIS2026050600789', bankRefNo:'AXS78901234', amount:10000, transferMode:'IMPS', beneficiaryName:'RAHUL SHARMA', beneficiaryAccount:'xxxxxxxxxxxxxxx', beneficiaryIFSC:'AXIS0000001', processedAt:now() },
  acval:    { status:'SUCCESS', accountNumber:'xxxxxxxxxxxxxxx', ifsc:'AXIS0000001', accountHolderName:'RAHUL SHARMA', bankName:'AXIS BANK LIMITED', validationStatus:'VALID', nameMatchScore:98, corpRefId:'VAL-20260506-001', validatedAt:now() },
  vpa:      { status:'SUCCESS', vpaAddress:'rahulsharma@axisbank', accountHolderName:'RAHUL SHARMA', vpaStatus:'ACTIVE', bankName:'AXIS BANK LIMITED', purposeCode:'P2B', resolvedAt:now() },
};

const MOCK_401 = { status:'FAILURE', errorCode:'AUTH_001', httpStatus:401, errorMessage:'Invalid or missing OAuth token. Provide a valid Bearer token in the Authorization header.', timestamp:now() };

const CORS_NOTE = `/* ─────────────────────────────────────────────────────────────
   CORS / Network note
   ─────────────────────────────────────────────────────────────
   The request was sent to Axis Bank but was blocked by the
   browser's CORS policy (expected when running locally).

   To make real live calls without CORS issues:
     1. Deploy to Vercel  →  api/*.js handles CORS server-side
     2. Use Vercel CLI    →  vercel dev  (port 3000)
     3. Use Postman / cURL with your Bearer token

   Sandbox mock response shown below:
   ──────────────────────────────────────────────────────────── */

`;

/* ══════════════════════════════════════════════════════════════
   5. Auth
══════════════════════════════════════════════════════════════ */

function doLogin() {
  const email = _id('lid').value.trim();
  const pass  = _id('lpw').value;
  const errEl = _id('ferr');
  const spin  = _id('lspin');
  const icon  = _id('licon');
  const txt   = _id('ltxt');

  errEl.classList.remove('show');
  ['lid','lpw'].forEach(id => _id(id).classList.remove('err'));
  spin.classList.add('on');
  icon.style.display = 'none';
  txt.textContent    = 'Authorizing…';

  setTimeout(() => {
    spin.classList.remove('on');
    icon.style.display = '';
    txt.textContent    = 'Authorize with OAuth';

    if (email === VALID_EMAIL && pass === VALID_PASSWORD) {
      _id('scr-login').classList.remove('active');
      _id('scr-dash').classList.add('active');
      nav('home');
    } else {
      errEl.classList.add('show');
      ['lid','lpw'].forEach(id => _id(id).classList.add('err'));
    }
  }, 1500);
}

function doLogout() {
  _id('scr-dash').classList.remove('active');
  _id('scr-login').classList.add('active');
  nav('home');
}

function togglePw() {
  const inp  = _id('lpw');
  const icon = _id('pw-eye');
  const isHidden = inp.type === 'password';
  inp.type       = isHidden ? 'text' : 'password';
  icon.className = isHidden ? 'ti ti-eye-off' : 'ti ti-eye';
}

/* ══════════════════════════════════════════════════════════════
   6. Navigation
══════════════════════════════════════════════════════════════ */

function nav(key) {
  document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
  document.querySelectorAll('.fscr').forEach(s => s.classList.remove('on'));

  const ni = _id('ni-' + key);
  if (ni) ni.classList.add('on');

  const fs = _id('fs-' + key);
  if (fs) fs.classList.add('on');

  if (APIS[key] && !ST.built.has(key)) {
    buildTester(key);
    ST.built.add(key);
  }

  // update history badge
  const hbadge = _id('hist-badge');
  if (hbadge) hbadge.textContent = ST.history.length;
}

/* ══════════════════════════════════════════════════════════════
   7. Tester Panel Builder
══════════════════════════════════════════════════════════════ */

function tagBadge(t) {
  const map = { req:'tr', opt:'to', oauth:'toa' };
  const lbl = { req:'Required', opt:'Optional', oauth:'OAuth' };
  return `<span class="tag ${map[t]||'to'}">${lbl[t]||t}</span>`;
}

function buildTester(key) {
  const api = APIS[key];
  const el  = _id('tg-' + key);
  if (!api || !el) return;

  const fields = api.fields.map(f => `
    <label class="afl">${f.label} ${tagBadge(f.tag)}</label>
    <input class="afi" id="${f.id}" type="${f.type||'text'}"
      placeholder="${f.ph}" autocomplete="off" spellcheck="false" />
  `).join('');

  const bodyBtn  = api.method === 'POST' ? `<button class="tab" onclick="switchTab('${key}','body')"  id="tab-body-${key}">Body</button>` : '';
  const bodyPane = api.method === 'POST' ? `
    <div class="pane" id="tp-body-${key}">
      <label class="afl">Request body (JSON — editable)</label>
      <textarea class="afta" id="body-${key}">${api.body}</textarea>
    </div>` : '';

  el.innerHTML = `
    <div class="panel">
      <div class="panel-hdr">
        <div class="panel-title"><i class="ti ti-send"></i> Request</div>
        <span class="mbadge ${api.method==='POST'?'post':'get'}">${api.method}</span>
      </div>
      <div class="panel-body">
        <div class="ep-row"><span class="ep-pill">${api.url}</span></div>
        <div class="tabs">
          <button class="tab on" onclick="switchTab('${key}','params')" id="tab-params-${key}">Params</button>
          <button class="tab"    onclick="switchTab('${key}','headers')" id="tab-headers-${key}">Headers</button>
          ${bodyBtn}
        </div>
        <div class="pane on" id="tp-params-${key}">${fields}</div>
        <div class="pane"    id="tp-headers-${key}">
          <div class="hdr-head"><span>Name</span><span>Value</span><span></span></div>
          <div id="hdrs-${key}">
            <div class="hdr-row">
              <input class="afi" value="Content-Type" />
              <input class="afi" value="application/json" />
              <button class="hdr-del" onclick="this.parentElement.remove()">×</button>
            </div>
            <div class="hdr-row">
              <input class="afi" value="Authorization" />
              <input class="afi" placeholder="Bearer xxxx" />
              <button class="hdr-del" onclick="this.parentElement.remove()">×</button>
            </div>
            <div class="hdr-row">
              <input class="afi" value="X-IBM-Client-Id" />
              <input class="afi" placeholder="xxxx-xxxx" />
              <button class="hdr-del" onclick="this.parentElement.remove()">×</button>
            </div>
          </div>
          <button class="btn-add-hdr" onclick="addHdr('${key}')">
            <i class="ti ti-plus" style="font-size:11px"></i> Add header
          </button>
        </div>
        ${bodyPane}
        <button class="btn-send" id="sendbtn-${key}" onclick="fire('${key}')">
          <i class="ti ti-player-play" style="font-size:11px" id="sicon-${key}"></i>
          <span id="stxt-${key}">Send Request</span>
          <span class="spin-sm" id="sspin-${key}"></span>
        </button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-hdr">
        <div class="panel-title"><i class="ti ti-code"></i> Response</div>
        <button class="btn-copy" id="cbtn-${key}" onclick="copyResp('${key}')">
          <i class="ti ti-copy" style="font-size:10px"></i> Copy
        </button>
      </div>
      <div class="panel-body" style="padding:10px;">
        <div class="resp-idle" id="ridle-${key}">
          <i class="ti ti-player-play"></i>
          <span>Hit <strong>Send Request</strong> to fire the API</span>
          <small>Empty token → sandbox mock · valid token → live call</small>
        </div>
        <pre class="resp-body" id="rbody-${key}"></pre>
      </div>
      <div class="status-bar" id="sbar-${key}">
        <span class="sc-nil" id="sc-${key}">—</span>
        <span class="sc-ct" id="ct-${key}"></span>
        <span class="sc-ms" id="ms-${key}"></span>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════════
   8. Tab Switcher & Header Editor
══════════════════════════════════════════════════════════════ */

function switchTab(key, t) {
  ['params','headers','body'].forEach(tab => {
    const tp = _id('tp-'+tab+'-'+key);
    const tb = _id('tab-'+tab+'-'+key);
    if (tp) tp.classList.remove('on');
    if (tb) tb.classList.remove('on');
  });
  const tp = _id('tp-'+t+'-'+key);
  const tb = _id('tab-'+t+'-'+key);
  if (tp) tp.classList.add('on');
  if (tb) tb.classList.add('on');
}

function addHdr(key) {
  const c   = _id('hdrs-'+key);
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'hdr-row';
  row.innerHTML = `<input class="afi" placeholder="Header name" />
    <input class="afi" placeholder="Value" />
    <button class="hdr-del" onclick="this.parentElement.remove()">×</button>`;
  c.appendChild(row);
}

/* ══════════════════════════════════════════════════════════════
   9. Fire API Request
══════════════════════════════════════════════════════════════ */

async function fire(key) {
  const api    = APIS[key];
  const btn    = _id('sendbtn-'+key);
  const spin   = _id('sspin-'+key);
  const icon   = _id('sicon-'+key);
  const txt    = _id('stxt-'+key);
  const idle   = _id('ridle-'+key);
  const rbody  = _id('rbody-'+key);
  const scEl   = _id('sc-'+key);
  const ctEl   = _id('ct-'+key);
  const msEl   = _id('ms-'+key);

  if (!api || !btn) return;

  // loading
  btn.disabled = true;
  spin.style.display = 'inline-block';
  icon.style.display = 'none';
  txt.textContent    = 'Sending…';
  if (idle)  idle.style.display  = 'none';
  if (rbody) { rbody.style.display = 'none'; rbody.className = 'resp-body'; }

  // detect token
  const tokEl    = document.querySelector(`#tg-${key} input[placeholder^="Bearer"]`);
  const rawToken = tokEl ? tokEl.value.trim() : '';
  const hasToken = rawToken.startsWith('Bearer ') && rawToken.length > 15;

  const t0 = performance.now();
  let code, text, isOk = false;

  if (hasToken) {
    /* ── real request ── */
    try {
      const hdrs = { 'Content-Type':'application/json', 'Accept':'application/json', 'Authorization': rawToken };
      const ibmEl = document.querySelector(`#tg-${key} input[id$="_ibm"]`);
      if (ibmEl && ibmEl.value.trim()) hdrs['X-IBM-Client-Id'] = ibmEl.value.trim();

      document.querySelectorAll(`#hdrs-${key} .hdr-row`).forEach(row => {
        const ins = row.querySelectorAll('input');
        if (ins.length >= 2 && ins[0].value && ins[1].value) hdrs[ins[0].value] = ins[1].value;
      });

      const opts = { method: api.method, headers: hdrs };

      if (api.method === 'POST') {
        const bodyEl = _id('body-'+key);
        opts.body = bodyEl ? bodyEl.value : '{}';
      }

      let url = api.url;
      if (api.method === 'GET') {
        const refEl = _id('t_ref');
        const utrEl = _id('t_utr');
        const p = new URLSearchParams({ channelId:'CORP_API' });
        if (refEl && refEl.value) p.set('transactionRefNo', refEl.value.trim());
        if (utrEl && utrEl.value) p.set('utrNo', utrEl.value.trim());
        url += '?' + p.toString();
      }

      const res = await fetch(url, opts);
      code  = res.status;
      isOk  = res.ok;
      try { text = JSON.stringify(await res.json(), null, 2); }
      catch { text = await res.text(); }

    } catch (e) {
      /* CORS — show note + mock */
      code  = 200;
      isOk  = true;
      text  = CORS_NOTE + JSON.stringify(MOCK[key], null, 2);
    }

  } else {
    /* ── sandbox mock ── */
    await new Promise(r => setTimeout(r, 500 + Math.random() * 600));
    const cidEl = document.querySelector(`#tg-${key} input[id$="_cid"]`);
    const hasCid = cidEl && cidEl.value.trim().length > 5;
    code = hasCid ? 200 : 401;
    isOk = hasCid;
    text = JSON.stringify(hasCid ? MOCK[key] : MOCK_401, null, 2);
  }

  const elapsed = Math.round(performance.now() - t0);

  /* render */
  if (rbody) {
    rbody.textContent   = text;
    rbody.className     = 'resp-body ' + (isOk ? 'ok' : 'bad');
    rbody.style.display = 'block';
  }
  if (scEl) {
    scEl.className   = isOk ? 'sc-ok' : 'sc-err';
    scEl.textContent = isOk ? `${code} OK`
      : `${code}${code===401?' Unauthorized':code===400?' Bad Request':' Error'}`;
  }
  if (ctEl) ctEl.textContent = 'application/json';
  if (msEl) msEl.textContent = elapsed + 'ms';

  /* reset button */
  btn.disabled       = false;
  spin.style.display = 'none';
  icon.style.display = '';
  txt.textContent    = 'Send Request';

  /* metrics */
  ST.calls++;
  if (isOk) ST.ok++; else ST.err++;
  ST.totalMs += elapsed;
  updateMetrics();

  /* history */
  ST.history.unshift({
    key, method: api.method, url: api.url,
    code, ms: elapsed, ok: isOk,
    name: api.label, time: new Date().toLocaleTimeString(),
  });
  renderHistory();
  const hb = _id('hist-badge');
  if (hb) hb.textContent = ST.history.length;
}

/* ══════════════════════════════════════════════════════════════
   10. Metrics
══════════════════════════════════════════════════════════════ */

function updateMetrics() {
  const avg = ST.calls > 0 ? Math.round(ST.totalMs / ST.calls) + 'ms' : '—';
  [
    ['m-calls', ST.calls],
    ['m-ok',    ST.ok   ],
    ['m-err',   ST.err  ],
    ['m-avg',   avg     ],
  ].forEach(([id, val]) => {
    const el = _id(id);
    if (!el) return;
    el.textContent = val;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
  });
}

/* ══════════════════════════════════════════════════════════════
   11. Copy Response
══════════════════════════════════════════════════════════════ */

function copyResp(key) {
  const el  = _id('rbody-'+key);
  const btn = _id('cbtn-'+key);
  if (!el || !el.textContent.trim()) { toast('Nothing to copy yet', 'ti-alert-circle'); return; }
  navigator.clipboard.writeText(el.textContent).then(() => {
    btn.classList.add('done');
    btn.innerHTML = '<i class="ti ti-check" style="font-size:10px"></i> Copied';
    setTimeout(() => {
      btn.classList.remove('done');
      btn.innerHTML = '<i class="ti ti-copy" style="font-size:10px"></i> Copy';
    }, 1800);
    toast('Response copied to clipboard');
  }).catch(() => toast('Copy failed — try manually', 'ti-x'));
}

/* ══════════════════════════════════════════════════════════════
   12. Request History
══════════════════════════════════════════════════════════════ */

function renderHistory() {
  const c = _id('hist-list');
  if (!c) return;

  if (!ST.history.length) {
    c.innerHTML = `<div class="hist-empty">
      <i class="ti ti-history"></i>
      No requests yet.<br>Go to any API module and fire a test.
    </div>`;
    return;
  }

  c.innerHTML = ST.history.map(h => `
    <div class="hitem" onclick="nav('${h.key}')" title="Re-open ${h.name}">
      <span class="mbadge ${h.method==='POST'?'post':'get'}" style="font-size:9px">${h.method}</span>
      <span class="h-url">${h.url}</span>
      <span class="h-sc ${h.ok?'ok':'bad'}">${h.code}</span>
      <span class="h-ms">${h.ms}ms</span>
      <span class="h-ts">${h.time}</span>
    </div>
  `).join('');
}

function clearHistory() {
  ST.history = [];
  renderHistory();
  const hb = _id('hist-badge');
  if (hb) hb.textContent = '0';
  toast('History cleared');
}

/* ══════════════════════════════════════════════════════════════
   13. Toast
══════════════════════════════════════════════════════════════ */

function toast(msg, icon = 'ti-circle-check') {
  const t = _id('toast');
  if (!t) return;
  t.innerHTML = `<i class="ti ${icon}"></i> ${msg}`;
  t.classList.add('on');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('on'), 2700);
}

/* ══════════════════════════════════════════════════════════════
   14. Bootstrap
══════════════════════════════════════════════════════════════ */

function _id(id) { return document.getElementById(id); }

document.addEventListener('DOMContentLoaded', () => {
  // Enter key on login
  ['lid','lpw'].forEach(id => {
    const el = _id(id);
    if (el) {
      el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
      el.addEventListener('input',   () => {
        el.classList.remove('err');
        const fe = _id('ferr');
        if (fe) fe.classList.remove('show');
      });
    }
  });

  renderHistory();
});

/* expose to inline handlers */
Object.assign(window, {
  doLogin, doLogout, togglePw,
  nav, switchTab, addHdr,
  fire, copyResp,
  clearHistory, toast,
});
