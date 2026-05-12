/**
 * DEFENDO — Popup Script
 * Reads cached scan result from session storage and renders it.
 */

const CIRCUMFERENCE = 2 * Math.PI * 28; // r=28

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  wireButtons();
});

// ── Load state from background ────────────────────────────────────────────────
function loadState() {
  chrome.storage.session.get(['lastResult', 'enabled', 'lastScanTime'], data => {
    // Toggle state
    const toggle = document.getElementById('global-toggle');
    toggle.checked = data.enabled !== false;

    // Last scan time
    if (data.lastScanTime) {
      const d = new Date(data.lastScanTime);
      document.getElementById('last-scan-time').textContent =
        'Last scan: ' + d.toLocaleTimeString();
    }

    if (data.lastResult) {
      renderResult(data.lastResult);
    }
  });
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderResult(result) {
  const score = result.score || 0;
  const level = result.level || 'safe';
  const status = result.status || 'SAFE';

  // Badge
  const badge = document.getElementById('status-badge');
  badge.textContent = status;
  badge.className = `status-badge ${statusClass(status)}`;

  // Score arc
  const arc = document.getElementById('score-arc');
  const offset = CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE;
  arc.style.strokeDashoffset = offset;
  arc.style.stroke = scoreColor(score);
  document.getElementById('score-text').textContent = score + '%';

  // Entities
  const entContainer = document.getElementById('popup-entities');
  if (result.entities && result.entities.length > 0) {
    entContainer.innerHTML = result.entities.slice(0, 6).map(e => `
      <div class="entity-row">
        <span class="entity-tag ${e.severity || 'low'}">${e.type}</span>
        <span class="entity-val">${e.text}</span>
      </div>
    `).join('');
  } else {
    entContainer.innerHTML = '<div class="empty-state">No sensitive data detected.</div>';
  }

  // Recommendation
  const rec = document.getElementById('popup-recommendation');
  const action = result.recommendation || 'allow';
  rec.className = `recommendation ${action}`;
  const icons = { allow: '✓', warn: '⚠', block: '✕' };
  const messages = {
    allow: 'Content appears safe to share.',
    warn: 'Sensitive data detected. Review before sharing.',
    block: 'High-risk content. Do not share without redacting.',
  };
  rec.innerHTML = `<span class="rec-icon">${icons[action]}</span> ${messages[action]}`;
}

// ── Buttons ───────────────────────────────────────────────────────────────────
function wireButtons() {
  document.getElementById('global-toggle').addEventListener('change', e => {
    const enabled = e.target.checked;
    chrome.storage.session.set({ enabled });
    // Notify all content scripts in active tab
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'TOGGLE_ENABLED', enabled }).catch(() => {});
      }
    });
  });

  document.getElementById('open-app-btn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000' });
  });

  document.getElementById('clear-btn').addEventListener('click', () => {
    chrome.storage.session.remove(['lastResult', 'lastScanTime']);
    document.getElementById('popup-entities').innerHTML =
      '<div class="empty-state">Cleared. Click a field to begin a new scan.</div>';
    document.getElementById('status-badge').textContent = 'SAFE';
    document.getElementById('status-badge').className = 'status-badge safe';
    document.getElementById('score-text').textContent = '—';
    document.getElementById('score-arc').style.strokeDashoffset = CIRCUMFERENCE;
    document.getElementById('popup-recommendation').className = 'recommendation allow';
    document.getElementById('popup-recommendation').innerHTML =
      '<span class="rec-icon">✓</span> Content appears safe to share.';
    document.getElementById('last-scan-time').textContent = 'No scans yet';
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function statusClass(status) {
  if (status === 'SAFE') return 'safe';
  if (status === 'WARNING') return 'warning';
  return 'dangerous';
}

function scoreColor(score) {
  if (score < 30) return '#00ff88';
  if (score < 55) return '#ffd60a';
  if (score < 75) return '#ff9500';
  return '#ff2d55';
}
