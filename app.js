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
    elBreakdown.innerHTML = [...S.debts]
      .filter(d => d.debt > 0)
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

// ── Debt List ─────────────────────────────────────────────────
function renderList() {
  const elList  = document.getElementById('debtList');
  const elTotal = document.getElementById('listTotal');

  if (elList) {
    elList.innerHTML = [...S.debts]
      .sort((a, b) => b.debt - a.debt)
      .map(d => {
        const accent  = dotCol(d.rate);
        const util    = d.full > 0 ? Math.min(100, (d.debt / d.full) * 100) : 0;
        const utilBar = d.full > 0
          ? `<div class="d-progress-wrap"><div class="d-progress-bar" style="width:${util.toFixed(1)}%;background:${accent}"></div></div>` : '';
        return `
        <div class="debt-item" role="listitem" data-id="${d.id}" tabindex="0"
             style="--d-accent:${accent}"
             aria-label="${escapeHTML(d.name)}: ${fmtB(d.debt)}">
          <div class="d-dot" style="background:${accent};box-shadow:0 0 6px ${accent}40" aria-hidden="true"></div>
          <div class="d-main">
            <div class="d-name">${escapeHTML(d.name)}</div>
            <div class="d-sub">${
              [d.rate ? (d.rate*100).toFixed(2)+'%/yr' : null, d.due ? `due ${d.due}th` : null]
                .filter(Boolean).join(' · ') || '—'
            }</div>
            ${utilBar}
            ${lastUpdatedBadge(d.lastUpdated)}
          </div>
          <div class="d-right">
            <div class="d-amount mono" style="color:${d.debt>0?'var(--text)':'var(--dim)'}">${fmtB(d.debt)}</div>
            ${d.rate ? `<div class="d-int" style="color:${accent}">${fmtB(d.debt*d.rate/12,0)}/mo</div>` : ''}
          </div>
        </div>`;
      }).join('');

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

  if (elTotal) elTotal.textContent = fmtB(totDebt());
}

// ── Bottom Sheet ──────────────────────────────────────────────
function openSheet(id) {
  const isNew = id === null;
  let d = isNew
    ? { id: S.nextId, name: '', rate: '', cutoff: '', due: '', full: '', debt: '', note: '' }
    : S.debts.find(x => x.id === id);
  if (!d) { toast('Debt not found'); return; }
  d = { ...d };

  document.getElementById('sheet').innerHTML = `
    <div class="sh-handle" aria-hidden="true"></div>
    <div class="sh-title">${isNew ? 'New debt' : 'Edit — ' + escapeHTML(d.name)}</div>
    <div class="field">
      <label for="fn">Name</label>
      <input id="fn" value="${escapeAttr(d.name)}" placeholder="Lender name" autocomplete="off">
    </div>
    <div class="f2">
      <div class="field">
        <label for="fd">Balance (฿)</label>
        <input id="fd" type="number" value="${d.debt||''}" placeholder="0" min="0">
      </div>
      <div class="field">
        <label for="fr">Interest / yr</label>
        <input id="fr" type="number" step=".001" value="${d.rate||''}" placeholder="0.33" min="0" max="1">
      </div>
    </div>
    <div class="f2">
      <div class="field">
        <label for="ff">Limit (฿)</label>
        <input id="ff" type="number" value="${d.full||''}" placeholder="optional" min="0">
      </div>
      <div class="field">
        <label for="fdu">Due date (day)</label>
        <input id="fdu" value="${escapeAttr(d.due||'')}" placeholder="5" maxlength="2">
      </div>
    </div>
    <hr class="divider">
    <div style="font-size:.6rem;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">Quick pay</div>
    <div class="pay-row">
      <input class="pay-input" type="number" id="fpay" placeholder="Amount (฿)" min="0" aria-label="Payment amount">
      <button class="pay-btn" id="payBtn" aria-label="Confirm payment">Pay ✓</button>
    </div>
    <div class="sh-actions">
      ${!isNew ? `<button class="btn-d" id="delBtn" aria-label="Delete ${escapeAttr(d.name)}">Delete</button>` : ''}
      <button class="btn-g" id="cancelBtn">Cancel</button>
      <button class="btn-p" id="saveBtn">Save</button>
    </div>`;

  document.getElementById('overlay').classList.add('on');
  document.getElementById('saveBtn').addEventListener('click', () => saveDebt(d.id, isNew));
  document.getElementById('cancelBtn').addEventListener('click', closeSheet);
  document.getElementById('payBtn').addEventListener('click', () => quickPay(d.id));
  if (!isNew) document.getElementById('delBtn').addEventListener('click', () => delDebt(d.id));
  setTimeout(() => { const fn = document.getElementById('fn'); if (fn) fn.focus(); }, 50);
}

function closeSheet() {
  document.getElementById('overlay').classList.remove('on');
}

// ── CRUD ──────────────────────────────────────────────────────
function saveDebt(id, isNew) {
  const name = document.getElementById('fn').value.trim();
  if (!name) { toast('Name required'); return; }
  const rate = parseFloat(document.getElementById('fr').value) || 0;
  if (isNaN(rate) || rate < 0 || rate > 1) { toast('Interest rate must be 0–1'); return; }
  const debt = parseFloat(document.getElementById('fd').value) || 0;
  if (debt < 0) { toast('Balance cannot be negative'); return; }

  const obj = {
    id, name, rate, debt,
    full:        parseFloat(document.getElementById('ff').value) || 0,
    due:         document.getElementById('fdu').value.trim(),
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
  if (!confirm(`Delete "${debt.name}"?`)) return;
  S.debts = S.debts.filter(d => d.id !== id);
  save(); closeSheet(); renderDash(true);
  if (cur === 1) renderList();
  toast('Deleted');
}

function quickPay(id) {
  const amt = parseFloat(document.getElementById('fpay').value);
  if (!amt || amt <= 0) { toast('Enter amount'); return; }
  S.debts = S.debts.map(d => d.id !== id ? d : { ...d, debt: Math.max(0, d.debt - amt), lastUpdated: new Date().toISOString() });
  S.totalPaid = (S.totalPaid || 0) + amt;
  save(); closeSheet(); renderDash(true);
  if (cur === 1) renderList();
  toast(`Paid ${fmtB(amt)} ✓`);
}

// ── Toast ─────────────────────────────────────────────────────
let _toastTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('on'), 2000);
}

// ── Reveal toggle ─────────────────────────────────────────────
let _revealed = false;
function toggleReveal() {
  _revealed = !_revealed;
  const el  = document.getElementById('dTotal');
  const btn = document.getElementById('revealBtn');
  if (el)  el.classList.toggle('hidden-val', !_revealed);
  if (btn) btn.textContent = _revealed ? 'Hide' : 'Show';
}

// ── Lock screen ───────────────────────────────────────────────
const PASS_HASH = localStorage.getItem('debtos_pin_hash') || '59320b07d510325ab07f78daa20413e3c0d0b486d7e4ef6547abacd14dc82eea';
const PIN_LEN   = parseInt(localStorage.getItem('debtos_pin_len') || '4', 10);
const LSK       = 'debtos_unlocked';
let lkInput = '';

async function hashPin(pin) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function setPin(newPin) {
  if (!newPin || newPin.length < 4) { console.error('PIN must be at least 4 digits'); return; }
  const hash = await hashPin(newPin);
  localStorage.setItem('debtos_pin_hash', hash);
  localStorage.setItem('debtos_pin_len', String(newPin.length));
  console.log('PIN updated. Reload the app.');
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

// Init dots after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('lockDots');
  if (container) {
    container.innerHTML = '';
    for (let i = 0; i < PIN_LEN; i++) {
      const dot = document.createElement('div');
      dot.className = 'lock-dot';
      container.appendChild(dot);
    }
  }

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
