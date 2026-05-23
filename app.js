/* ============================================================
   DebtOS — app.js (Enhanced)
   ============================================================ */

'use strict';

// ── Storage key ──────────────────────────────────────────────
const SK = 'debtos_v7';

// ── Default data ─────────────────────────────────────────────
const INIT_DEBTS = [
  { id: 1,  name: 'Finnix',          rate: 0.33,  cutoff: '',   due: '20', full: 15768, debt: 13600, note: '', lastUpdated: null },
  { id: 2,  name: 'Rabbit Cash',     rate: 0.33,  cutoff: '30', due: '15', full: 25300, debt: 25500, note: '', lastUpdated: null },
  { id: 3,  name: 'Promise',         rate: 0.25,  cutoff: '',   due: '31', full: 10000, debt: 9700,  note: '', lastUpdated: null },
  { id: 4,  name: 'KTC Proud',       rate: 0.25,  cutoff: '20', due: '5',  full: 34500, debt: 35222, note: '', lastUpdated: null },
  { id: 5,  name: 'Umay',            rate: 0.198, cutoff: '',   due: '2',  full: 72000, debt: 72848, note: '', lastUpdated: null },
  { id: 6,  name: 'UOB Credit',      rate: 0.16,  cutoff: '20', due: '13', full: 96000, debt: 83068, note: '', lastUpdated: null },
  { id: 7,  name: 'Samsung Finance', rate: 0,     cutoff: '',   due: '1',  full: 16228, debt: 4056,  note: '', lastUpdated: null },
  { id: 8,  name: 'Shopee',          rate: 0,     cutoff: '',   due: '',   full: 0,     debt: 1030,  note: '', lastUpdated: null },
  { id: 9,  name: 'Thunder',         rate: 0.33,  cutoff: '',   due: '',   full: 40000, debt: 38500, note: '', lastUpdated: null },
];

// ── State ─────────────────────────────────────────────────────
/**
 * Load persisted state from localStorage, falling back to initial data.
 * @returns {{ debts: object[], nextId: number, totalPaid: number }}
 */
function load() {
  try {
    const raw = localStorage.getItem(SK);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('DebtOS: could not read state from localStorage', e);
  }
  return { debts: JSON.parse(JSON.stringify(INIT_DEBTS)), nextId: 10, totalPaid: 0 };
}

function save() {
  try {
    localStorage.setItem(SK, JSON.stringify(S));
    localStorage.setItem('debtos_last_saved', new Date().toISOString());
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      toast('Storage full - unable to save');
    } else {
      console.warn('DebtOS: could not persist state to localStorage', e);
    }
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

/**
 * Return a CSS colour variable string based on interest rate severity.
 * @param {number} r  Annual interest rate (decimal)
 */
const dotCol = r => !r ? 'var(--dim)' : r >= 0.3 ? 'var(--red)' : r >= 0.2 ? 'var(--yel)' : 'var(--grn)';

/**
 * Escape a string for safe insertion as HTML text content.
 * @param {string} str
 */
function escapeHTML(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Escape a string for safe use inside an HTML attribute value.
 * @param {string} str
 */
function escapeAttr(str) {
  return escapeHTML(str);
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

/**
 * Render all dashboard widgets.
 * @param {boolean} flash  Animate the total-debt number on update
 */
function renderDash(flash) {
  const td  = totDebt();
  const iy  = intYear();
  // Interest per period — derived from annual rate
  const im  = iy / 12;
  const id2 = iy / 365;
  const ih  = iy / 8760;
  const is_ = iy / (365 * 24 * 3600);

  // Weighted average rate (interest-bearing debts only)
  const withRate = S.debts.filter(d => d.rate > 0);
  const avg = withRate.length
    ? withRate.reduce((a, d) => a + d.rate, 0) / withRate.length
    : 0;

  // Total number display
  const tel = document.getElementById('dTotal');
  if (tel) {
    tel.textContent = fmtB(td);
    if (flash) {
      tel.classList.remove('flash');
      void tel.offsetWidth; // force reflow so animation restarts
      tel.classList.add('flash');
    }
  }

  // Pill stats
  const elCount   = document.getElementById('dCount');
  const elAvgRate = document.getElementById('dAvgRate');
  const elPaid    = document.getElementById('dPaid');
  if (elCount)   elCount.textContent   = S.debts.filter(d => d.debt > 0).length;
  if (elAvgRate) elAvgRate.textContent = (avg * 100).toFixed(2) + '%';
  if (elPaid)    elPaid.textContent    = fmtB(S.totalPaid || 0);

  // Interest cost boxes
  const elYear  = document.getElementById('dYear');
  const elMonth = document.getElementById('dMonth');
  const elDay   = document.getElementById('dDay');
  const elHour  = document.getElementById('dHour');
  const elPerSec= document.getElementById('dPerSec');
  if (elYear)   elYear.textContent   = fmtB(iy,  2);
  if (elMonth)  elMonth.textContent  = fmtB(im,  2);
  if (elDay)    elDay.textContent    = fmtB(id2, 2);
  if (elHour)   elHour.textContent   = fmtB(ih,  4);
  if (elPerSec) elPerSec.textContent = '฿' + is_.toFixed(6);

  // Breakdown list
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

  // Last updated timestamp
  updateLastUpdated();

  // Restart live ticker
  cancelAnimationFrame(_raf);
  _t0 = Date.now();

  (function tick() {
    // Pause ticker when tab is hidden or overlay is open to save CPU
    if (document.hidden || document.getElementById('overlay').classList.contains('on')) {
      _raf = requestAnimationFrame(tick);
      return;
    }
    const el = document.getElementById('dTicker');
    if (el) el.textContent = '฿' + (((Date.now() - _t0) / 1000) * is_).toFixed(4);
    _raf = requestAnimationFrame(tick);
  })();
}

// Pause/resume ticker on visibility change
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    // Nudge the RAF loop back if it was paused
    _t0 = Date.now() - (Date.now() - _t0); // keep elapsed time intact
  }
});


// ── Last-updated badge per debt ───────────────────────────────
const STALE_DAYS = 7;

function lastUpdatedBadge(iso) {
  if (!iso) return `<div class="d-stale">never updated</div>`;
  const diff  = Math.floor((Date.now() - new Date(iso)) / 86400000);
  const d     = new Date(iso);
  const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              + ' · '
              + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  if (diff >= STALE_DAYS) {
    return `<div class="d-stale stale-warn">⚠ ${diff} days ago</div>`;
  }
  return `<div class="d-stale">${label}</div>`;
}

// ── Debt List ─────────────────────────────────────────────────
function renderList() {
  const elList  = document.getElementById('debtList');
  const elTotal = document.getElementById('listTotal');

  if (elList) {
    elList.innerHTML = [...S.debts]
      .sort((a, b) => b.debt - a.debt)
      .map(d => `
        <div class="debt-item" role="listitem" data-id="${d.id}" tabindex="0"
             aria-label="${escapeHTML(d.name)}: ${fmtB(d.debt)}">
          <div class="d-dot" style="background:${dotCol(d.rate)}" aria-hidden="true"></div>
          <div class="d-main">
            <div class="d-name">${escapeHTML(d.name)}</div>
            <div class="d-sub">${
              [d.rate ? (d.rate * 100).toFixed(2) + '%/yr' : null, d.due ? `due ${d.due}th` : null]
                .filter(Boolean).join(' · ') || '—'
            }</div>
            ${lastUpdatedBadge(d.lastUpdated)}
          </div>
          <div class="d-right">
            <div class="d-amount mono" style="color:${d.debt > 0 ? 'var(--text)' : 'var(--dim)'}">${fmtB(d.debt)}</div>
            ${d.rate ? `<div class="d-int">${fmtB(d.debt * d.rate / 12, 0)}/mo</div>` : ''}
          </div>
        </div>`).join('');

    // Event delegation for debt items (XSS-safe)
    elList.addEventListener('click', (e) => {
      const item = e.target.closest('.debt-item');
      if (item) {
        const id = Number(item.dataset.id);
        openSheet(id);
      }
    });

    elList.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const item = e.target.closest('.debt-item');
        if (item) {
          const id = Number(item.dataset.id);
          openSheet(id);
        }
      }
    });
  }

  if (elTotal) elTotal.textContent = fmtB(totDebt());
}


// ── Bottom Sheet ──────────────────────────────────────────────
function openSheet(id) {
  const isNew = id === null;
  let d;

  if (isNew) {
    d = { id: S.nextId, name: '', rate: '', cutoff: '', due: '', full: '', debt: '', note: '' };
  } else {
    d = S.debts.find(x => x.id === id);
    if (!d) {
      toast('Debt not found');
      return;
    }
    d = { ...d };
  }

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
        <input id="fd" type="number" value="${d.debt || ''}" placeholder="0" min="0">
      </div>
      <div class="field">
        <label for="fr">Interest / yr</label>
        <input id="fr" type="number" step=".001" value="${d.rate || ''}" placeholder="0.33" min="0" max="1">
      </div>
    </div>
    <div class="f2">
      <div class="field">
        <label for="ff">Limit (฿)</label>
        <input id="ff" type="number" value="${d.full || ''}" placeholder="optional" min="0">
      </div>
      <div class="field">
        <label for="fdu">Due date (day)</label>
        <input id="fdu" value="${escapeAttr(d.due || '')}" placeholder="5" maxlength="2">
      </div>
    </div>

    <hr class="divider">
    <div style="font-size:.6rem;color:var(--sub);letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px">
      Quick pay
    </div>
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

  // Event listeners
  document.getElementById('saveBtn').addEventListener('click', () => saveDebt(d.id, isNew));
  document.getElementById('cancelBtn').addEventListener('click', closeSheet);
  document.getElementById('payBtn').addEventListener('click', () => quickPay(d.id));
  if (!isNew) {
    document.getElementById('delBtn').addEventListener('click', () => delDebt(d.id));
  }

  // Focus first field for accessibility
  setTimeout(() => {
    const fn = document.getElementById('fn');
    if (fn) fn.focus();
  }, 50);
}

function closeSheet() {
  document.getElementById('overlay').classList.remove('on');
}


// ── CRUD ──────────────────────────────────────────────────────
function saveDebt(id, isNew) {
  const name = document.getElementById('fn').value.trim();
  if (!name) { toast('Name required'); return; }

  const rate = parseFloat(document.getElementById('fr').value) || 0;
  if (isNaN(rate) || rate < 0 || rate > 1) {
    toast('Interest rate must be 0–1');
    return;
  }

  const debt = parseFloat(document.getElementById('fd').value) || 0;
  if (debt < 0) {
    toast('Balance cannot be negative');
    return;
  }

  const obj = {
    id,
    name,
    rate,
    debt,
    full:        parseFloat(document.getElementById('ff').value)  || 0,
    due:         document.getElementById('fdu').value.trim(),
    cutoff:      '',
    note:        '',
    lastUpdated: new Date().toISOString(),
  };

  if (isNew) {
    S.debts.push(obj);
    S.nextId++;
  } else {
    S.debts = S.debts.map(d => d.id === id ? { ...d, ...obj } : d);
  }

  save();
  closeSheet();
  renderDash(true);
  if (cur === 1) renderList();
  toast(isNew ? 'Added' : 'Saved');
}

function delDebt(id) {
  const debt = S.debts.find(d => d.id === id);
  if (!debt) return;
  if (!confirm(`Delete "${debt.name}"?`)) return;

  S.debts = S.debts.filter(d => d.id !== id);
  save();
  closeSheet();
  renderDash(true);
  if (cur === 1) renderList();
  toast('Deleted');
}

/**
 * Record a payment against a debt, reducing its outstanding balance.
 * @param {number} id  Debt ID
 */
function quickPay(id) {
  const amt = parseFloat(document.getElementById('fpay').value);
  if (!amt || amt <= 0) { toast('Enter amount'); return; }

  S.debts = S.debts.map(d => d.id !== id ? d : { ...d, debt: Math.max(0, d.debt - amt), lastUpdated: new Date().toISOString() });
  S.totalPaid = (S.totalPaid || 0) + amt;

  save();
  closeSheet();
  renderDash(true);
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
// NOTE: This is a UI-only PIN — it does not provide server-side security.
// Anyone with access to the device storage can read the data.
// Do NOT rely on this for actual data protection.
const PASS = '5903';
const LSK  = 'debtos_unlocked'; // sessionStorage key
let lkInput = '';

function lkPress(d) {
  if (lkInput.length >= PASS.length) return;
  lkInput += d;
  lkRender();

  if (lkInput.length === PASS.length) {
    if (lkInput === PASS) {
      sessionStorage.setItem(LSK, '1');
      document.getElementById('lockScreen').style.display = 'none';
      renderDash(false);
    } else {
      // Wrong PIN — shake effect
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


// ── Event delegation setup ────────────────────────────────────
function initEventDelegation() {
  // Lock screen buttons
  document.querySelectorAll('.lock-key[data-key]').forEach(btn => {
    btn.addEventListener('click', () => lkPress(btn.dataset.key));
  });

  document.getElementById('lkDelBtn').addEventListener('click', lkDel);

  // Navigation
  document.getElementById('nb0').addEventListener('click', () => goPage(0));
  document.getElementById('nb1').addEventListener('click', () => goPage(1));

  // Debt management
  document.getElementById('addDebtBtn').addEventListener('click', () => openSheet(null));
  document.getElementById('revealBtn').addEventListener('click', toggleReveal);

  // Close overlay on backdrop click
  const overlay = document.getElementById('overlay');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSheet();
    });
  }

  // Close overlay on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('overlay').classList.contains('on')) {
      closeSheet();
    }
  });
}


// ── Cross-tab sync ────────────────────────────────────────────
window.addEventListener('storage', e => {
  if (e.key === SK) {
    S = load();
    renderDash(true);
    if (cur === 1) renderList();
  }
});

// ── Service Worker registration ────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(err => {
    console.warn('Service Worker registration failed:', err);
  });
}

// ── Init ──────────────────────────────────────────────────────
document.getElementById('topDate').textContent =
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Initialize event delegation once
initEventDelegation();

// Skip lock if already authenticated this session
if (sessionStorage.getItem(LSK) === '1') {
  document.getElementById('lockScreen').style.display = 'none';
  renderDash(false);
}
