/**
 * Defendo — Content Script (Manifest V3)
 * Grammarly-style real-time security assistant.
 * Injects floating FAB + panel on every website.
 */
'use strict';

const DEBOUNCE_MS = 500;
const MIN_CHARS   = 8;
const SKIP_TYPES  = new Set(['password','hidden','file','submit','button','reset','checkbox','radio','range','color','date','time','datetime-local','month','week','number']);

let enabled       = true;
let activeField   = null;
let debounceTimer = null;
let lastResult    = null;
let ignoredFields = new WeakSet();
let fab, panel;

// ── Bootstrap ─────────────────────────────────────────────────────────────────
(function init() {
  chrome.storage.session.get(['enabled'], r => { enabled = r.enabled !== false; });
  chrome.runtime.onMessage.addListener(msg => {
    if (msg.type === 'TOGGLE_ENABLED') { enabled = msg.enabled; updateFab(); }
  });
  injectStyles();
  injectFAB();
  injectPanel();
  attachListeners();
})();

// ── FAB ───────────────────────────────────────────────────────────────────────
function injectFAB() {
  fab = document.createElement('div');
  fab.id = '__defendo_fab__';
  fab.setAttribute('data-defendo', '1');
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="currentColor"/>
      <path d="M9 12l2 2 4-4" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span class="__defendo_dot__" id="__defendo_dot__"></span>`;
  fab.title = 'Defendo Security';
  fab.addEventListener('click', togglePanel);
  document.documentElement.appendChild(fab);
}

// ── Panel ─────────────────────────────────────────────────────────────────────
function injectPanel() {
  panel = document.createElement('div');
  panel.id = '__defendo_panel__';
  panel.setAttribute('data-defendo', '1');
  panel.innerHTML = `
    <div class="__dp_header__">
      <div class="__dp_logo__">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z" fill="#4F46E5"/>
        </svg>
        Defendo
      </div>
      <div style="display:flex;gap:4px;align-items:center">
        <label class="__dp_toggle__" title="Enable/disable">
          <input type="checkbox" id="__dp_enabled__" ${enabled ? 'checked' : ''}>
          <span></span>
        </label>
        <button class="__dp_close__" id="__dp_close__">✕</button>
      </div>
    </div>

    <div class="__dp_status__">
      <span class="__dp_badge__ safe" id="__dp_badge__">MONITORING</span>
      <span class="__dp_score__" id="__dp_score__">—</span>
    </div>

    <div id="__dp_idle__" class="__dp_idle__">Start typing in any field to scan.</div>
    <div id="__dp_scanning__" class="__dp_scanning__ __dp_hidden__">
      <div class="__dp_spinner__"></div> Analyzing…
    </div>

    <div id="__dp_result__" class="__dp_hidden__">
      <div id="__dp_entities__" class="__dp_entities__"></div>
      <div id="__dp_keywords__" class="__dp_keywords__"></div>
      <div class="__dp_actions__">
        <button class="__dp_btn__ __dp_btn_sanitize__" id="__dp_sanitize__">Sanitize</button>
        <button class="__dp_btn__ __dp_btn_explain__" id="__dp_explain__">Explain</button>
        <button class="__dp_btn__ __dp_btn_ignore__" id="__dp_ignore__">Ignore Field</button>
      </div>
    </div>

    <div id="__dp_explain_box__" class="__dp_explain_box__ __dp_hidden__"></div>

    <div class="__dp_footer__">
      <span class="__dp_hint__">Defendo v1.0</span>
      <a href="http://localhost:3000" target="_blank" class="__dp_link__">Open App ↗</a>
    </div>`;

  document.documentElement.appendChild(panel);

  document.getElementById('__dp_close__').addEventListener('click', () => panel.classList.remove('__dp_open__'));
  document.getElementById('__dp_enabled__').addEventListener('change', e => {
    enabled = e.target.checked;
    chrome.storage.session.set({ enabled });
    updateFab();
    if (!enabled) resetPanel();
  });
  document.getElementById('__dp_sanitize__').addEventListener('click', sanitize);
  document.getElementById('__dp_explain__').addEventListener('click', toggleExplain);
  document.getElementById('__dp_ignore__').addEventListener('click', ignoreField);
}

// ── Listeners ─────────────────────────────────────────────────────────────────
function attachListeners() {
  document.addEventListener('focusin',  onFocus, true);
  document.addEventListener('focusout', onBlur,  true);
  document.addEventListener('input',    onInput, true);
}

function onFocus(e) {
  if (!isTarget(e.target)) return;
  activeField = e.target;
  markField(e.target, 'active');
}
function onBlur(e) {
  if (activeField === e.target) { markField(e.target, 'none'); activeField = null; }
}
function onInput(e) {
  if (!enabled || !isTarget(e.target) || ignoredFields.has(e.target)) return;
  activeField = e.target;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => scan(e.target), DEBOUNCE_MS);
}

function isTarget(el) {
  if (!el?.tagName) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input') return !SKIP_TYPES.has(el.type?.toLowerCase());
  return tag === 'textarea' || el.isContentEditable;
}

// ── Scan ──────────────────────────────────────────────────────────────────────
function scan(el) {
  const text = el.isContentEditable ? (el.innerText || '') : (el.value || '');
  if (text.length < MIN_CHARS) return;
  showScanning();
  chrome.runtime.sendMessage({ type: 'SCAN_TEXT', text }, result => {
    if (chrome.runtime.lastError || !result || result.error) { hideScanning(); return; }
    lastResult = result;
    renderResult(result);
    highlight(el, result);
    updateFab(result.level);
    // Cache for popup
    chrome.storage.session.set({ lastResult: result, lastScanTime: Date.now() });
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderResult(r) {
  hideScanning();
  show('__dp_result__'); hide('__dp_idle__');

  const badge = document.getElementById('__dp_badge__');
  badge.textContent = r.status;
  badge.className = `__dp_badge__ ${r.level}`;
  document.getElementById('__dp_score__').textContent = r.score + '%';

  const entEl = document.getElementById('__dp_entities__');
  entEl.innerHTML = r.entities.length
    ? r.entities.slice(0, 5).map(e => `
        <div class="__dp_entity__ ${e.severity}">
          <span class="__dp_etype__">${e.type}</span>
          <span class="__dp_etext__">${e.text}</span>
        </div>`).join('')
    : '<div class="__dp_ok__">✓ No sensitive data found</div>';

  const kwEl = document.getElementById('__dp_keywords__');
  kwEl.innerHTML = r.keywords.slice(0, 4).map(k => `<span class="__dp_kw__">${k}</span>`).join('');

  document.getElementById('__dp_sanitize__').disabled = r.entities.length === 0;
}

// ── Highlight ─────────────────────────────────────────────────────────────────
function highlight(el, r) {
  if (!el.isContentEditable || !r.entities.length) return;
  let html = el.innerHTML;
  r.entities.forEach(ent => {
    if (!ent.text || ent.text.includes('*')) return;
    const esc = ent.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const cls = ['critical','high'].includes(ent.severity) ? '__dp_hl_red__' : '__dp_hl_yellow__';
    html = html.replace(new RegExp(esc, 'g'), `<mark class="${cls}" data-defendo="1">${ent.text}</mark>`);
  });
  if (html !== el.innerHTML) el.innerHTML = html;
}

function removeHighlights(el) {
  if (!el?.isContentEditable) return;
  el.querySelectorAll('[data-defendo="1"]').forEach(m => m.replaceWith(document.createTextNode(m.textContent)));
}

// ── Actions ───────────────────────────────────────────────────────────────────
function sanitize() {
  if (!activeField || !lastResult) return;
  let text = activeField.isContentEditable ? activeField.innerText : activeField.value;
  lastResult.entities.forEach(e => {
    if (!e.text || e.text.includes('*')) return;
    text = text.replace(new RegExp(e.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '[REDACTED]');
  });
  if (activeField.isContentEditable) activeField.innerText = text;
  else { activeField.value = text; activeField.dispatchEvent(new Event('input', { bubbles: true })); }
  removeHighlights(activeField);
  resetPanel();
}

function toggleExplain() {
  const box = document.getElementById('__dp_explain_box__');
  if (box.classList.contains('__dp_hidden__')) {
    box.innerHTML = (lastResult?.reasoning || []).slice(0, 4).map(r => `<p class="__dp_reason__">› ${r}</p>`).join('') || '<p class="__dp_reason__">No reasoning available.</p>';
    box.classList.remove('__dp_hidden__');
  } else {
    box.classList.add('__dp_hidden__');
  }
}

function ignoreField() {
  if (!activeField) return;
  ignoredFields.add(activeField);
  markField(activeField, 'ignored');
  removeHighlights(activeField);
  resetPanel();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function togglePanel() { panel.classList.toggle('__dp_open__'); }
function showScanning() { hide('__dp_idle__'); hide('__dp_result__'); show('__dp_scanning__'); hide('__dp_explain_box__'); }
function hideScanning() { hide('__dp_scanning__'); }
function show(id) { document.getElementById(id)?.classList.remove('__dp_hidden__'); }
function hide(id) { document.getElementById(id)?.classList.add('__dp_hidden__'); }

function resetPanel() {
  lastResult = null;
  hide('__dp_result__'); hide('__dp_explain_box__'); show('__dp_idle__');
  document.getElementById('__dp_score__').textContent = '—';
  const b = document.getElementById('__dp_badge__');
  b.textContent = 'MONITORING'; b.className = '__dp_badge__ safe';
  updateFab();
}

function updateFab(level) {
  if (!fab) return;
  fab.className = '';
  if (!enabled) { fab.classList.add('__df_disabled__'); return; }
  if (level) fab.classList.add(`__df_${level}__`);
  const dot = document.getElementById('__defendo_dot__');
  if (dot) dot.className = `__defendo_dot__ ${level || ''}`;
}

function markField(el, state) {
  el.removeAttribute('data-defendo-state');
  if (state !== 'none') el.setAttribute('data-defendo-state', state);
}

// ── Styles ────────────────────────────────────────────────────────────────────
function injectStyles() {
  const s = document.createElement('style');
  s.setAttribute('data-defendo', '1');
  s.textContent = `
  #__defendo_fab__ {
    all: initial;
    position: fixed !important; bottom: 24px !important; right: 24px !important;
    z-index: 2147483647 !important; width: 50px !important; height: 50px !important;
    border-radius: 50% !important; background: #4F46E5 !important;
    border: 2px solid #6366F1 !important; color: #fff !important;
    cursor: pointer !important; display: flex !important;
    align-items: center !important; justify-content: center !important;
    box-shadow: 0 0 20px rgba(79,70,229,0.5) !important;
    transition: transform 0.2s, box-shadow 0.2s !important;
    font-family: system-ui !important;
  }
  #__defendo_fab__:hover { transform: scale(1.1) !important; box-shadow: 0 0 32px rgba(79,70,229,0.8) !important; }
  #__defendo_fab__ svg { width: 26px; height: 26px; }
  #__defendo_fab__.__df_medium__ { background: #92400E !important; border-color: #F59E0B !important; box-shadow: 0 0 16px rgba(245,158,11,0.5) !important; }
  #__defendo_fab__.__df_high__, #__defendo_fab__.__df_critical__ { background: #7F1D1D !important; border-color: #EF4444 !important; animation: __df_pulse__ 1.2s infinite !important; }
  #__defendo_fab__.__df_disabled__ { background: #1E293B !important; border-color: #334155 !important; box-shadow: none !important; }
  @keyframes __df_pulse__ { 0%,100%{box-shadow:0 0 16px rgba(239,68,68,0.4)} 50%{box-shadow:0 0 28px rgba(239,68,68,0.9)} }

  .__defendo_dot__ {
    position: absolute; top: 2px; right: 2px; width: 11px; height: 11px;
    border-radius: 50%; border: 2px solid #0F172A; background: #10B981;
    transition: background 0.3s;
  }
  .__defendo_dot__.medium  { background: #F59E0B; }
  .__defendo_dot__.high, .__defendo_dot__.critical { background: #EF4444; }

  #__defendo_panel__ {
    all: initial;
    position: fixed !important; bottom: 86px !important; right: 24px !important;
    z-index: 2147483646 !important; width: 310px !important;
    background: #0F172A !important; border: 1px solid rgba(79,70,229,0.25) !important;
    border-radius: 14px !important; font-family: 'Segoe UI', system-ui, sans-serif !important;
    font-size: 13px !important; color: #E3E6E4 !important;
    box-shadow: 0 8px 40px rgba(0,0,0,0.7) !important;
    transform: scale(0.9) translateY(10px) !important; opacity: 0 !important;
    pointer-events: none !important; transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1) !important;
    transform-origin: bottom right !important;
  }
  #__defendo_panel__.__dp_open__ { transform: scale(1) translateY(0) !important; opacity: 1 !important; pointer-events: all !important; }

  .__dp_header__ { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(79,70,229,0.15); }
  .__dp_logo__ { display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; color: #14B8A6; letter-spacing: 0.05em; }
  .__dp_close__ { all: unset; color: #94A3B8; cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px; }
  .__dp_close__:hover { color: #EF4444; background: rgba(239,68,68,0.1); }

  .__dp_toggle__ { position: relative; display: inline-block; width: 32px; height: 18px; margin-right: 4px; }
  .__dp_toggle__ input { opacity: 0; width: 0; height: 0; }
  .__dp_toggle__ span { position: absolute; inset: 0; background: #334155; border-radius: 18px; cursor: pointer; transition: 0.2s; }
  .__dp_toggle__ span::beforElementById('ss-status-badge');
  badge.textContent = 'MONITORING';
  badge.className = 'ss-status-badge safe';
  updateFab();
}

function updateFab(level) {
  if (!fab) return;
  fab.className = '';
  if (!enabled) { fab.classList.add('ss-disabled'); return; }
  if (level) fab.classList.add(`ss-fab-${level}`);
}

function markField(el, state) {
  el.removeAttribute('data-ss-state');
  if (state !== 'none') el.setAttribute('data-ss-state', state);
}

// ── Field text helpers ────────────────────────────────────────────────────────
function getFieldText(el) {
  if (el.isContentEditable) return el.innerText || '';
  return el.value || '';
}

function setFieldText(el, text) {
  if (el.isContentEditable) {
    el.innerText = text;
  } else {
    el.value = text;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    /* ── FAB ── */
    #ss-fab {
      position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
      width: 48px; height: 48px; border-radius: 50%;
      background: #0a1628; border: 2px solid #00f5ff;
      color: #00f5ff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 0 16px rgba(0,245,255,0.4);
      transition: all 0.2s; user-select: none;
    }
    #ss-fab:hover { transform: scale(1.1); box-shadow: 0 0 24px rgba(0,245,255,0.7); }
    #ss-fab svg { width: 24px; height: 24px; }
    #ss-fab.ss-fab-medium { border-color: #ff9500; color: #ff9500; box-shadow: 0 0 16px rgba(255,149,0,0.5); }
    #ss-fab.ss-fab-high, #ss-fab.ss-fab-critical { border-color: #ff2d55; color: #ff2d55; box-shadow: 0 0 20px rgba(255,45,85,0.6); animation: ss-pulse 1.2s infinite; }
    #ss-fab.ss-disabled { border-color: #37474f; color: #37474f; box-shadow: none; }
    @keyframes ss-pulse { 0%,100%{box-shadow:0 0 16px rgba(255,45,85,0.5)} 50%{box-shadow:0 0 28px rgba(255,45,85,0.9)} }

    /* ── Panel ── */
    #ss-panel {
      position: fixed; bottom: 84px; right: 24px; z-index: 2147483646;
      width: 320px; background: #0a1628;
      border: 1px solid rgba(0,245,255,0.2); border-radius: 12px;
      font-family: 'Segoe UI', system-ui, sans-serif; font-size: 13px;
      color: #e0f7fa; box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      transform: scale(0.9) translateY(10px); opacity: 0; pointer-events: none;
      transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
    }
    #ss-panel.ss-open { transform: scale(1) translateY(0); opacity: 1; pointer-events: all; }

    /* Header */
    .ss-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid rgba(0,245,255,0.1); }
    .ss-logo { display: flex; align-items: center; gap: 6px; font-weight: 600; font-size: 13px; color: #00f5ff; letter-spacing: 0.05em; }
    .ss-icon-btn { background: none; border: none; color: #80cbc4; cursor: pointer; font-size: 14px; padding: 2px 6px; border-radius: 4px; }
    .ss-icon-btn:hover { color: #ff2d55; background: rgba(255,45,85,0.1); }

    /* Status row */
    .ss-status-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; }
    .ss-status-badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; border: 1px solid; }
    .ss-status-badge.safe, .ss-status-badge.low { border-color: #00ff88; color: #00ff88; background: rgba(0,255,136,0.08); }
    .ss-status-badge.medium { border-color: #ff9500; color: #ff9500; background: rgba(255,149,0,0.08); }
    .ss-status-badge.high, .ss-status-badge.critical { border-color: #ff2d55; color: #ff2d55; background: rgba(255,45,85,0.08); }
    .ss-score { font-size: 22px; font-weight: 700; color: #00f5ff; font-variant-numeric: tabular-nums; }

    /* Idle */
    .ss-idle { padding: 12px 14px; color: #80cbc4; font-size: 12px; line-height: 1.5; }

    /* Scanning */
    .ss-scanning { display: flex; align-items: center; gap: 8px; padding: 12px 14px; color: #80cbc4; font-size: 12px; }
    .ss-spinner { width: 14px; height: 14px; border: 2px solid rgba(0,245,255,0.2); border-top-color: #00f5ff; border-radius: 50%; animation: ss-spin 0.7s linear infinite; }
    @keyframes ss-spin { to { transform: rotate(360deg); } }

    /* Entities */
    .ss-entities { padding: 0 14px; max-height: 140px; overflow-y: auto; }
    .ss-entity { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid rgba(0,245,255,0.06); }
    .ss-entity:last-child { border-bottom: none; }
    .ss-entity-type { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; padding: 2px 6px; border-radius: 3px; white-space: nowrap; }
    .ss-entity.critical .ss-entity-type, .ss-entity.high .ss-entity-type { background: rgba(255,45,85,0.15); color: #ff2d55; border: 1px solid rgba(255,45,85,0.3); }
    .ss-entity.medium .ss-entity-type { background: rgba(255,149,0,0.15); color: #ff9500; border: 1px solid rgba(255,149,0,0.3); }
    .ss-entity.low .ss-entity-type, .ss-entity.nlp .ss-entity-type { background: rgba(0,245,255,0.1); color: #00f5ff; border: 1px solid rgba(0,245,255,0.2); }
    .ss-entity-text { font-size: 11px; color: #80cbc4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
    .ss-no-threats { padding: 8px 0; color: #00ff88; font-size: 12px; }

    /* Keywords */
    .ss-keywords { padding: 6px 14px; display: flex; flex-wrap: wrap; gap: 4px; }
    .ss-kw { font-size: 10px; padding: 2px 7px; border-radius: 10px; background: rgba(255,149,0,0.1); border: 1px solid rgba(255,149,0,0.3); color: #ff9500; }

    /* Action buttons */
    .ss-actions { display: flex; gap: 6px; padding: 10px 14px; flex-wrap: wrap; }
    .ss-btn { flex: 1; padding: 6px 8px; border-radius: 6px; border: 1px solid; font-size: 11px; font-weight: 600; cursor: pointer; transition: all 0.15s; letter-spacing: 0.04em; background: transparent; }
    .ss-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .ss-btn-sanitize { border-color: #00ff88; color: #00ff88; }
    .ss-btn-sanitize:hover:not(:disabled) { background: rgba(0,255,136,0.12); }
    .ss-btn-explain { border-color: #00f5ff; color: #00f5ff; }
    .ss-btn-explain:hover { background: rgba(0,245,255,0.1); }
    .ss-btn-ignore { border-color: #37474f; color: #80cbc4; }
    .ss-btn-ignore:hover { border-color: #80cbc4; }

    /* Explain box */
    .ss-explain-box { padding: 10px 14px; border-top: 1px solid rgba(0,245,255,0.1); max-height: 120px; overflow-y: auto; }
    .ss-reason { font-size: 11px; color: #80cbc4; line-height: 1.5; margin-bottom: 4px; }

    /* Footer */
    .ss-footer { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; border-top: 1px solid rgba(0,245,255,0.08); }
    .ss-toggle-label { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #80cbc4; cursor: pointer; }
    .ss-toggle-label input { accent-color: #00f5ff; }
    .ss-open-app { font-size: 11px; color: #00f5ff; text-decoration: none; }
    .ss-open-app:hover { text-decoration: underline; }

    /* Field highlights */
    [data-ss-state="active"] { outline: 2px solid rgba(0,245,255,0.3) !important; }
    [data-ss-state="ignored"] { outline: 2px solid rgba(55,71,79,0.5) !important; }
    .ss-hl-red { background: rgba(255,45,85,0.25) !important; border-bottom: 2px solid #ff2d55 !important; border-radius: 2px; }
    .ss-hl-yellow { background: rgba(255,149,0,0.2) !important; border-bottom: 2px solid #ff9500 !important; border-radius: 2px; }

    .hidden { display: none !important; }
  `;
  document.head.appendChild(style);
}
