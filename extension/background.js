/**
 * Defendo — Background Service Worker (Manifest V3)
 * Handles all API communication. Content scripts never call the API directly.
 * Stateless: no sensitive data is persisted beyond the session.
 */

const API = 'http://localhost:8000/api';
const CACHE_TTL_MS = 30_000; // 30s result cache to avoid duplicate scans

// In-memory dedup cache: hash → { result, ts }
const _cache = new Map();

// ── Message router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  switch (msg.type) {
    case 'SCAN_TEXT':
      handleScan(msg.text, 'text').then(sendResponse).catch(e => sendResponse({ error: e.message }));
      return true;

    case 'SCAN_URL':
      handleScan(msg.url, 'url').then(sendResponse).catch(e => sendResponse({ error: e.message }));
      return true;

    case 'GET_STATE':
      chrome.storage.session.get(['lastResult', 'enabled', 'lastScanTime'], sendResponse);
      return true;

    case 'SET_ENABLED':
      chrome.storage.session.set({ enabled: msg.enabled });
      sendResponse({ ok: true });
      break;

    case 'CLEAR_STATE':
      chrome.storage.session.remove(['lastResult', 'lastScanTime']);
      sendResponse({ ok: true });
      break;
  }
});

// ── Scan handler with dedup cache ─────────────────────────────────────────────
async function handleScan(input, type) {
  const hash = await digest(input);
  const cached = _cache.get(hash);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.result;

  const result = type === 'url' ? await scanUrl(input) : await scanText(input);

  _cache.set(hash, { result, ts: Date.now() });
  // Prune old cache entries
  if (_cache.size > 50) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0][0];
    _cache.delete(oldest);
  }

  await chrome.storage.session.set({
    lastResult: result,
    lastScanTime: Date.now(),
  });

  return result;
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function scanText(text) {
  const res = await fetch(`${API}/scan/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return normalise(await res.json());
}

async function scanUrl(url) {
  const res = await fetch(`${API}/scan/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return normaliseUrl(await res.json());
}

// ── Response normalisation ────────────────────────────────────────────────────
function normalise(data) {
  const risk = data.risk || {};
  const pii  = data.pii  || {};
  const nlp  = data.nlp  || {};
  const score = Math.round((risk.final_score || 0) * 100);
  const level = risk.risk_level || 'safe';

  const entities = [
    ...(pii.detections || []).map(d => ({
      type: d.label, text: d.matched_text,
      severity: d.severity, category: d.category,
    })),
    ...(nlp.entities || []).map(e => ({
      type: e.label, text: e.text,
      severity: 'low', category: 'nlp',
    })),
  ];

  return {
    score, level,
    status: toStatus(level),
    action: toAction(level),
    entities,
    keywords: nlp.threat_keywords || [],
    intents: nlp.intent_labels || [],
    reasoning: (risk.reasoning_chain || []).slice(0, 5),
    scan_id: data.scan_id || null,
  };
}

function normaliseUrl(data) {
  const risk = data.risk || {};
  const urlA = data.url_analysis || {};
  const score = Math.round((risk.final_score || 0) * 100);
  const level = risk.risk_level || 'safe';
  return {
    score, level,
    status: toStatus(level),
    action: toAction(level),
    entities: (data.detailed_threats || []).map(t => ({
      type: t.entity_type, text: t.text,
      severity: 'high', category: 'url',
    })),
    keywords: urlA.threat_indicators || [],
    intents: [],
    reasoning: (risk.reasoning_chain || []).slice(0, 5),
    scan_id: data.scan_id || null,
  };
}

function toStatus(level) {
  if (level === 'safe' || level === 'low') return 'SAFE';
  if (level === 'medium') return 'WARNING';
  return 'DANGEROUS';
}

function toAction(level) {
  if (level === 'safe') return 'allow';
  if (level === 'low' || level === 'medium') return 'warn';
  return 'block';
}

// ── Utility: SHA-256 hash for cache key ───────────────────────────────────────
async function digest(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
