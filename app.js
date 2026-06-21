
/* ============================================================
   DebtOS — app.js (Enhanced)
   ============================================================ */

'use strict';

// ── Storage key ──────────────────────────────────────────────
const SK = 'debtos_v7';

// ── Default data ─────────────────────────────────────────────
const INIT_DEBTS = [];

// ── State ─────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('DebtOS: could not read state', e);
  }
  return { debts: JSON.parse(JSON.stringify(INIT_DEBTS)), nextId: 10, totalPaid: 0 };
}

function save() {
  try {
    localStorage.setItem(SK, JSON.stringify(S));
    localStorage.setItem('debtos_last_saved', new Date().toISOString());
  } catch (e) {
    if (e.name === 'QuotaExceededError') toast('Storage full');
    else console.warn('DebtOS: could not persist state', e);
  }
}

function updateLastUpdated() {
  const el  = document.getElementById('lastUpdated');
  if (!el) return;
  const raw = localStorage.getItem('debtos_last_saved');
  if (!raw) { el.textContent = 'never updated'; return; }
  const d = new Date(raw);
  el.textContent = 'updated '
    + d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · '
    + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

let S = load();

// ── Helpers ───────────────────────────────────────────────────
const fmt    = (n, d = 0) => (n || 0).toLocaleString('th-TH', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtB   = (n, d = 0) => '฿' + fmt(n, d);
const totDebt  = () => S.debts.reduce((a, d) => a + d.debt, 0);
const intYear  = () => S.debts.reduce((a, d) => a + d.debt * (d.rate || 0), 0);
const dotCol   = r => !r ? 'var(--dim)' : r >= 0.3 ? 'var(--red)' : r >= 0.2 ? 'var(--yel)' : 'var(--grn)';

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
const escapeAttr = escapeHTML;

// Days until the next occurrence of a day-of-month (e.g. due "5")
function dueInDays(due) {
  const day = parseInt(due, 10);
  if (!day || day < 1 || day > 31) return null;
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target  = new Date(now.getFullYear(), now.getMonth(), day);
  if (target < today) target = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return Math.round((target - today) / 86400000);
}

function dueLabel(due) {
  const days = dueInDays(due);
  if (days === null) return null;
  if (days === 0) return { text: 'due today', urgent: true };
  if (days <= 3)  return { text: `due in ${days}d`, urgent: true };
  return { text: `due ${due}th · in ${days}d`, urgent: false };
}

// ── Navigation ────────────────────────────────────────────────
const TITLES = ['Overview', 'Debts'];
let cur = 0;

function goPage(i) {
  document.querySelectorAll('.page').forEach((p, j) => {
    p.classList.toggle('active', j === i);
    p.classList.toggle('left',   j < i);
  });
  document.querySelectorAll('.nb').forEach((b, j) => {
    b.classList.toggle('on', j === i);
    b.setAttribute('aria-current', j === i ? 'page' : 'false');
  });
  document.getElementById('topTitle').textContent = TITLES[i];
  cur = i;
  if (i === 1) renderList();
}

// ── Dashboard ─────────────────────────────────────────────────
let _raf;
let _t0 = Date.now();

function renderDash(flash) {
  const td  = totDebt();
  const iy  = intYear();
  const im  = iy / 12;
  const id2 = iy / 365;
  const ih  = iy / 8760;
  const is_ = iy / (365 * 24 * 3600);

  const withRate = S.debts.filter(d => d.rate > 0);
  const avg = withRate.length
    ? withRate.reduce((a, d) => a + d.rate, 0) / withRate.length : 0;

  const tel = document.getElementById('dTotal');
  if (tel) {
    tel.textContent = fmtB(td);
    if (flash) { tel.classList.remove('flash'); void tel.offsetWidth; tel.classList.add('flash'); }
  }

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('dCount',   S.debts.filter(d => d.debt > 0).length);
  set('dAvgRate', (avg * 100).toFixed(2) + '%');
  set('dPaid',    fmtB(S.totalPaid || 0));
  set('dYear',    fmtB(iy, 2));
  set('dMonth',   fmtB(im, 2));
  set('dDay',     fmtB(id2, 2));
  set('dHour',    fmtB(ih, 4));
  set('dPerSec',  '฿' + is_.toFixed(6));

  const elBreakdown = document.getElementById('dBreakdown');
  if (elBreakdown) {
    const active = [...S.debts].filter(d => d.debt > 0);
    if (!S.debts.length) {
      elBreakdown.innerHTML = `<div class="empty-state">
        <div class="empty-title">No debts tracked yet</div>
        <div class="empty-sub">Add your first account in the Debts tab to see the full picture.</div>
        <button class="empty-cta" onclick="goPage(1);openSheet(null)">Add a debt</button>
      </div>`;
    } else if (!active.length) {
      elBreakdown.innerHTML = `<div class="empty-state clear">
        <div class="empty-title">All clear</div>
        <div class="empty-sub">Every account is at zero. Paid so far: ${fmtB(S.totalPaid || 0)}.</div>
      </div>`;
    } else {
    elBreakdown.innerHTML = active
      .sort((a, b) => b.debt * (b.rate || 0) - a.debt * (a.rate || 0))
      .map(d => {
        const dm = d.debt * (d.rate || 0) / 12;
        return `<div class="row" role="listitem">
          <div>
            <div style="font-size:.86rem;font-weight:500">${escapeHTML(d.name)}</div>
            <div style="font-size:.63rem;color:var(--sub);margin-top:2px">
              ${d.rate ? (d.rate * 100).toFixed(2) + '%/yr' : 'no interest'}
            </div>
          </div>
          <div style="text-align:right">
            <div class="mono" style="font-size:.86rem">${fmtB(d.debt)}</div>
            ${d.rate ? `<div style="font-size:.62rem;color:var(--red);margin-top:2px">${fmtB(dm, 2)}/mo</div>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  }

  updateLastUpdated();
  cancelAnimationFrame(_raf);
  _t0 = Date.now();

  (function tick() {
    if (document.hidden || document.getElementById('overlay').classList.contains('on')) {
      _raf = requestAnimationFrame(tick); return;
    }
    const el = document.getElementById('dTicker');
    if (el) el.textContent = '฿' + (((Date.now() - _t0) / 1000) * is_).toFixed(4);
    _raf = requestAnimationFrame(tick);
  })();
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) _t0 = Date.now() - (Date.now() - _t0);
});

// ── Last-updated badge ────────────────────────────────────────
const STALE_DAYS = 7;
function lastUpdatedBadge(iso) {
  if (!iso) return `<div class="d-stale">never updated</div>`;
  const diff = Math.floor((Date.now() - new Date(iso)) / 86400000);
  const d    = new Date(iso);
  const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  return diff >= STALE_DAYS
    ? `<div class="d-stale stale-warn">⚠ ${diff} days ago</div>`
    : `<div class="d-stale">${label}</div>`;
}

// ── Debt List Sort ────────────────────────────────────────────
let _sort = 'balance';

function setSort(mode) {
  _sort = mode;
  ['balance','interest','paid'].forEach(m => {
    const el = document.getElementById('fc-' + m);
    if (el) el.classList.toggle('on', m === mode);
  });
  renderList();
}

// ── Debt List ─────────────────────────────────────────────────
function renderList() {
  const elList  = document.getElementById('debtList');
  const elTotal = document.getElementById('listTotal');

  if (elList) {
    if (!S.debts.length) {
      elList.innerHTML = `<div class="empty-state">
        <div class="empty-title">Nothing here yet</div>
        <div class="empty-sub">Track every loan and card in one place — tap + to add the first one.</div>
        <button class="empty-cta" onclick="openSheet(null)">Add a debt</button>
      </div>`;
    } else {
    elList.innerHTML = [...S.debts]
      .sort((a, b) => {
        if (_sort === 'interest') return (b.debt * b.rate) - (a.debt * a.rate);
        if (_sort === 'paid')    return (b.totalPaid || 0) - (a.totalPaid || 0);
        return b.debt - a.debt; // balance (default)
      })
      .map(d => {
        const paid    = d.debt <= 0;
        const accent  = paid ? 'var(--grn)' : dotCol(d.rate);
        const util    = d.full > 0 ? Math.min(100, (d.debt / d.full) * 100) : 0;
        const utilBar = d.full > 0 && !paid
          ? `<div class="d-progress-wrap"><div class="d-progress-bar" style="width:${util.toFixed(1)}%;background:${accent}"></div></div>` : '';
        const due     = !paid && d.due ? dueLabel(d.due) : null;
        const subBits = [
          d.rate ? (d.rate*100).toFixed(2)+'%/yr' : null,
          due ? `<span class="${due.urgent ? 'due-urgent' : ''}">${due.text}</span>` : null
        ].filter(Boolean).join(' · ');
        return `
        <div class="debt-item ${paid ? 'is-paid' : ''}" role="listitem" data-id="${d.id}" tabindex="0"
             style="--d-accent:${accent}"
             aria-label="${escapeHTML(d.name)}: ${paid ? 'paid off' : fmtB(d.debt)}">
          <div class="d-dot" style="background:${accent};box-shadow:0 0 6px ${accent}40" aria-hidden="true"></div>
          <div class="d-main">
            <div class="d-name">${escapeHTML(d.name)}</div>
            <div class="d-sub">${paid ? 'paid off ✓' : (subBits || '—')}</div>
            ${utilBar}
            ${lastUpdatedBadge(d.lastUpdated)}
          </div>
          <div class="d-right">
            <div class="d-amount mono" style="color:${paid ? 'var(--grn)' : 'var(--text)'}">${paid ? '฿0' : fmtB(d.debt)}</div>
            ${!paid && d.rate ? `<div class="d-int" style="color:${accent}">${fmtB(d.debt*d.rate/12,0)}/mo</div>` : ''}
            ${!paid && d.minPay ? `<div class="d-int" style="color:var(--dim)">min ${fmtB(d.minPay)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
    }
  }

  if (elTotal) elTotal.textContent = fmtB(totDebt());
}

// ── Bottom Sheet ──────────────────────────────────────────────
function openSheet(id) {
  const isNew = id === null;
  let d = isNew
    ? { id: S.nextId, name: '', rate: '', cutoff: '', due: '', full: '', debt: '', minPay: '', note: '' }
    : S.debts.find(x => x.id === id);
  if (!d) { toast('Debt not found', 'err'); return; }
  d = { ...d };

  const ratePct = d.rate ? +(d.rate * 100).toFixed(2) : '';
  const chips = !isNew && d.debt > 0 ? `
    <div class="chips">
      ${d.minPay ? `<button class="chip" data-amt="${d.minPay}">Min ${fmtB(d.minPay)}</button>` : ''}
      <button class="chip" data-amt="${Math.round(d.debt * 0.1)}">10% ${fmtB(Math.round(d.debt * 0.1))}</button>
      <button class="chip" data-amt="${d.debt}">Pay off ${fmtB(d.debt)}</button>
    </div>` : '';

  document.getElementById('sheet').innerHTML = `
    <div class="sh-handle" aria-hidden="true"></div>
    <div class="sh-title">${isNew ? 'New debt' : 'Edit — ' + escapeHTML(d.name)}</div>
    <div class="field">
      <label for="fn">Name</label>
      <input id="fn" value="${escapeAttr(d.name)}" placeholder="e.g. KBank credit card" autocomplete="off">
    </div>
    <div class="f2">
      <div class="field">
        <label for="fd">Balance (฿)</label>
        <input id="fd" type="number" inputmode="decimal" value="${d.debt||''}" placeholder="0" min="0">
      </div>
      <div class="field">
        <label for="fr">Interest (%/yr)</label>
        <input id="fr" type="number" inputmode="decimal" step="0.01" value="${ratePct}" placeholder="e.g. 25" min="0" max="100">
      </div>
    </div>
    <div class="f2">
      <div class="field">
        <label for="ff">Limit (฿)</label>
        <input id="ff" type="number" inputmode="decimal" value="${d.full||''}" placeholder="optional" min="0">
      </div>
      <div class="field">
        <label for="fdu">Due day of month</label>
        <input id="fdu" type="number" inputmode="numeric" value="${escapeAttr(d.due||'')}" placeholder="e.g. 5" min="1" max="31">
      </div>
    </div>
    <div class="field">
      <label for="fmin">Min. payment (฿/mo)</label>
      <input id="fmin" type="number" inputmode="decimal" value="${d.minPay||''}" placeholder="ขั้นต่ำต่อเดือน" min="0">
    </div>
    ${!isNew ? `
    <hr class="divider">
    <div style="font-size:.6rem;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Quick pay</div>
    ${chips}
    <div class="pay-row">
      <input class="pay-input" type="number" inputmode="decimal" id="fpay" placeholder="Amount (฿)" min="0" aria-label="Payment amount">
      <button class="pay-btn" id="payBtn" aria-label="Confirm payment">Pay ✓</button>
    </div>` : ''}
    <div class="sh-actions">
      ${!isNew ? `<button class="btn-d" id="delBtn" aria-label="Delete ${escapeAttr(d.name)}">Delete</button>` : ''}
      <button class="btn-g" id="cancelBtn">Cancel</button>
      <button class="btn-p" id="saveBtn">${isNew ? 'Add debt' : 'Save changes'}</button>
    </div>`;

  document.getElementById('overlay').classList.add('on');
  document.getElementById('saveBtn').addEventListener('click', () => saveDebt(d.id, isNew));
  document.getElementById('cancelBtn').addEventListener('click', closeSheet);

  if (!isNew) {
    document.getElementById('payBtn').addEventListener('click', () => quickPay(d.id));

    // Preset chips fill the pay input
    document.querySelectorAll('.chip').forEach(c => {
      c.addEventListener('click', () => {
        const inp = document.getElementById('fpay');
        inp.value = c.dataset.amt;
        inp.focus();
      });
    });

    // Two-tap delete (no browser confirm)
    const delBtn = document.getElementById('delBtn');
    let armed = false, armTimer;
    delBtn.addEventListener('click', () => {
      if (!armed) {
        armed = true;
        delBtn.textContent = 'Tap again to delete';
        delBtn.classList.add('armed');
        armTimer = setTimeout(() => {
          armed = false;
          delBtn.textContent = 'Delete';
          delBtn.classList.remove('armed');
        }, 3000);
        return;
      }
      clearTimeout(armTimer);
      delDebt(d.id);
    });
  }

  if (isNew) setTimeout(() => { const fn = document.getElementById('fn'); if (fn) fn.focus(); }, 50);
}

function closeSheet() {
  document.getElementById('overlay').classList.remove('on');
}

// ── CRUD ──────────────────────────────────────────────────────
function saveDebt(id, isNew) {
  const name = document.getElementById('fn').value.trim();
  if (!name) { toast('Name required', 'err'); return; }
  const ratePct = parseFloat(document.getElementById('fr').value) || 0;
  if (isNaN(ratePct) || ratePct < 0 || ratePct > 100) { toast('Interest must be 0–100%', 'err'); return; }
  const rate = ratePct / 100;
  const debt = parseFloat(document.getElementById('fd').value) || 0;
  if (debt < 0) { toast('Balance cannot be negative', 'err'); return; }

  const obj = {
    id, name, rate, debt,
    full:        parseFloat(document.getElementById('ff').value) || 0,
    due:         document.getElementById('fdu').value.trim(),
    minPay:      parseFloat(document.getElementById('fmin').value) || 0,
    cutoff:      '', note: '',
    lastUpdated: new Date().toISOString(),
  };

  if (isNew) { S.debts.push(obj); S.nextId++; }
  else        S.debts = S.debts.map(d => d.id === id ? { ...d, ...obj } : d);

  save(); closeSheet(); renderDash(true);
  if (cur === 1) renderList();
  toast(isNew ? 'Added' : 'Saved');
}

function delDebt(id) {
  const debt = S.debts.find(d => d.id === id);
  if (!debt) return;
  S.debts = S.debts.filter(d => d.id !== id);
  save(); closeSheet(); renderDash(true);
  if (cur === 1) renderList();
  toast('Deleted');
}

function quickPay(id) {
  const amt = parseFloat(document.getElementById('fpay').value);
  if (!amt || amt <= 0) { toast('Enter an amount first', 'err'); return; }
  S.debts = S.debts.map(d => d.id !== id ? d : { ...d, debt: Math.max(0, d.debt - amt), lastUpdated: new Date().toISOString() });
  S.totalPaid = (S.totalPaid || 0) + amt;
  save(); closeSheet(); renderDash(true);
  if (cur === 1) renderList();
  toast(`Paid ${fmtB(amt)} ✓`);
}

// ── Toast ─────────────────────────────────────────────────────
let _toastTimer;
function toast(msg, kind) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.toggle('err', kind === 'err');
  t.classList.add('on');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('on'), 2200);
}

// ── Reveal toggle ─────────────────────────────────────────────
let _revealed = localStorage.getItem('debtos_revealed') === '1';

function applyReveal() {
  const el  = document.getElementById('dTotal');
  const btn = document.getElementById('revealBtn');
  if (el)  el.classList.toggle('hidden-val', !_revealed);
  if (btn) btn.textContent = _revealed ? 'Hide' : 'Show';
  document.body.classList.toggle('amounts-hidden', !_revealed);
}

function toggleReveal() {
  _revealed = !_revealed;
  localStorage.setItem('debtos_revealed', _revealed ? '1' : '0');
  applyReveal();
}

// ── Lock screen ───────────────────────────────────────────────
let PASS_HASH = localStorage.getItem('debtos_pin_hash') || '59320b07d510325ab07f78daa20413e3c0d0b486d7e4ef6547abacd14dc82eea';
let PIN_LEN   = parseInt(localStorage.getItem('debtos_pin_len') || '4', 10);
const LSK     = 'debtos_unlocked';
let lkInput = '';

async function hashPin(pin) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Settings ──────────────────────────────────────────────────
function openSettings() {
  document.getElementById('sheet').innerHTML = `
    <div class="sh-handle" aria-hidden="true"></div>
    <div class="sh-title">Settings</div>

    <div class="set-section-label">Passcode</div>
    <div class="field">
      <label for="pinCur">Current passcode</label>
      <input id="pinCur" type="password" inputmode="numeric" autocomplete="off" placeholder="••••" maxlength="8">
    </div>
    <div class="f2">
      <div class="field">
        <label for="pinNew">New passcode</label>
        <input id="pinNew" type="password" inputmode="numeric" autocomplete="off" placeholder="4–8 digits" maxlength="8">
      </div>
      <div class="field">
        <label for="pinNew2">Repeat new</label>
        <input id="pinNew2" type="password" inputmode="numeric" autocomplete="off" placeholder="repeat" maxlength="8">
      </div>
    </div>
    <button class="btn-p w-full" id="pinSaveBtn">Change passcode</button>

    <hr class="divider">
    <div class="set-section-label">Backup</div>
    <div class="set-hint">Data lives only on this device. Export a backup file regularly — clearing browser data wipes everything.</div>
    <div class="sh-actions" style="margin-top:12px">
      <button class="btn-g flex-1" id="exportBtn">Export backup</button>
      <button class="btn-g flex-1" id="importBtn">Import backup</button>
    </div>

    <hr class="divider">
    <div class="set-meta mono">${S.debts.length} accounts · paid ${fmtB(S.totalPaid || 0)} total</div>
    <div class="sh-actions">
      <button class="btn-g flex-1" id="setCloseBtn">Close</button>
    </div>`;

  document.getElementById('overlay').classList.add('on');
  document.getElementById('setCloseBtn').addEventListener('click', closeSheet);

  document.getElementById('pinSaveBtn').addEventListener('click', async () => {
    const cur = document.getElementById('pinCur').value;
    const nw  = document.getElementById('pinNew').value;
    const nw2 = document.getElementById('pinNew2').value;
    if (await hashPin(cur) !== PASS_HASH) { toast('Current passcode is wrong', 'err'); return; }
    if (!/^\d{4,8}$/.test(nw)) { toast('New passcode must be 4–8 digits', 'err'); return; }
    if (nw !== nw2) { toast('Passcodes don\u2019t match', 'err'); return; }
    PASS_HASH = await hashPin(nw);
    PIN_LEN   = nw.length;
    localStorage.setItem('debtos_pin_hash', PASS_HASH);
    localStorage.setItem('debtos_pin_len', String(PIN_LEN));
    initLockDots();
    closeSheet();
    toast('Passcode changed ✓');
  });

  document.getElementById('exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'debtos-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Backup exported ✓');
  });

  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
}

function handleImport(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || !Array.isArray(data.debts)) throw new Error('bad shape');
      S = {
        debts:     data.debts,
        nextId:    Number(data.nextId) || (Math.max(0, ...data.debts.map(d => d.id || 0)) + 1),
        totalPaid: Number(data.totalPaid) || 0,
      };
      save(); closeSheet(); renderDash(true);
      if (cur === 1) renderList();
      toast(`Imported ${S.debts.length} accounts ✓`);
    } catch (e) {
      toast('Not a valid DebtOS backup file', 'err');
    }
  };
  reader.readAsText(file);
}

async function lkPress(d) {
  if (lkInput.length >= PIN_LEN) return;
  lkInput += d;
  lkRender();
  if (lkInput.length === PIN_LEN) {
    const hash = await hashPin(lkInput);
    if (hash === PASS_HASH) {
      sessionStorage.setItem(LSK, '1');
      document.getElementById('lockScreen').style.display = 'none';
      renderDash(false);
    } else {
      document.querySelectorAll('.lock-dot').forEach(el => el.classList.add('error'));
      setTimeout(() => {
        lkInput = '';
        document.querySelectorAll('.lock-dot').forEach(el => el.classList.remove('error', 'filled'));
      }, 700);
    }
  }
}

function lkDel() {
  lkInput = lkInput.slice(0, -1);
  lkRender();
}

function lkRender() {
  document.querySelectorAll('.lock-dot').forEach((el, i) => {
    el.classList.toggle('filled', i < lkInput.length);
  });
}

function initLockDots() {
  const container = document.getElementById('lockDots');
  if (!container) return;
  container.innerHTML = '';
  for (let i = 0; i < PIN_LEN; i++) {
    const dot = document.createElement('div');
    dot.className = 'lock-dot';
    container.appendChild(dot);
  }
}

// Init dots after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  initLockDots();
  applyReveal();

  // Close overlay on backdrop click
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSheet();
    });
  }

  // Escape key closes sheet
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay?.classList.contains('on')) closeSheet();
  });

  // Debt list — delegated listeners attached ONCE (was re-attached every render)
  const elList = document.getElementById('debtList');
  if (elList) {
    elList.addEventListener('click', e => {
      const item = e.target.closest('.debt-item');
      if (item) openSheet(Number(item.dataset.id));
    });
    elList.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const item = e.target.closest('.debt-item');
        if (item) openSheet(Number(item.dataset.id));
      }
    });
  }

  // Backup import
  const importFile = document.getElementById('importFile');
  if (importFile) {
    importFile.addEventListener('change', e => {
      const f = e.target.files[0];
      if (f) handleImport(f);
      e.target.value = '';
    });
  }

  // Date display
  document.getElementById('topDate').textContent =
    new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  // Skip lock if already authenticated
  if (sessionStorage.getItem(LSK) === '1') {
    document.getElementById('lockScreen').style.display = 'none';
    renderDash(false);
  }
});

// ── Cross-tab sync ────────────────────────────────────────────
window.addEventListener('storage', e => {
  if (e.key === SK) { S = load(); renderDash(true); if (cur === 1) renderList(); }
});

// ── Service Worker ────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed:', err));
}
