
// SafeShare AI - Frontend Script
// Wires UI to FastAPI backend with real-time WebSocket scanning

const API = 'http://localhost:8000/api';
const WS_URL = 'ws://localhost:8000/api/scan/live';

let authToken = localStorage.getItem('ss_token') || null;
let currentScanResult = null;
let ws = null;
let activeTab = 'text';

// ── Auth helpers ──────────────────────────────────────────────────────────────
function authHeaders() {
  return authToken ? { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

function setToken(token, email) {
  authToken = token;
  localStorage.setItem('ss_token', token);
  localStorage.setItem('ss_email', email);
  document.getElementById('nav-login-btn').classList.add('hidden');
  const badge = document.getElementById('user-badge');
  const isGuest = email === 'guest@safeshare.ai';
  badge.textContent = isGuest ? 'GUEST' : email.split('@')[0].toUpperCase();
  badge.title = isGuest ? 'Click to login with an account' : `Logged in as ${email}`;
  badge.style.cursor = 'pointer';
  badge.classList.remove('hidden');
}

function clearToken() {
  authToken = null;
  localStorage.removeItem('ss_token');
  localStorage.removeItem('ss_email');
  document.getElementById('nav-login-btn').classList.remove('hidden');
  document.getElementById('user-badge').classList.add('hidden');
}

// ── Loader ────────────────────────────────────────────────────────────────────
window.addEventListener('load', async () => {
  const savedEmail = localStorage.getItem('ss_email');
  const isGuest = savedEmail === 'guest@safeshare.ai';

  // Always refresh guest token on load (they expire); real user tokens are kept
  if (!authToken || isGuest) {
    try {
      const res = await fetch(`${API}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        setToken(data.access_token, 'guest@safeshare.ai');
      }
    } catch(e) {
      // Backend offline — set a local placeholder so scan falls back to simulation
      if (!authToken) setToken('guest-offline', 'guest@safeshare.ai');
      console.warn('Guest login failed, using offline mode');
    }
  } else if (savedEmail && authToken) {
    // Restore real user session from localStorage
    document.getElementById('nav-login-btn').classList.add('hidden');
    const badge = document.getElementById('user-badge');
    badge.textContent = savedEmail.split('@')[0].toUpperCase();
    badge.classList.remove('hidden');
  }

  setTimeout(() => {
    document.getElementById('loader').classList.add('fade-out');
    setTimeout(() => document.getElementById('loader').style.display = 'none', 600);
  }, 1800);
  initParticles();
  startTyping();
  loadHistory();
});

// ── Typing animation ──────────────────────────────────────────────────────────
function startTyping() {
  const lines = [
    'AI-powered DLP platform detecting leaks before they happen.',
    'Scanning for API keys, PII, credentials, phishing URLs...',
    'Enterprise-grade security. Real-time AI inference.',
    'Powered by Python FastAPI + spaCy + Isolation Forest.',
  ];
  let li = 0, ci = 0, el = document.getElementById('typing-text');
  function type() {
    if (ci < lines[li].length) {
      el.textContent += lines[li][ci++];
      setTimeout(type, 40);
    } else {
      setTimeout(() => {
        let del = setInterval(() => {
          el.textContent = el.textContent.slice(0, -1);
          if (!el.textContent) { clearInterval(del); li = (li + 1) % lines.length; ci = 0; setTimeout(type, 400); }
        }, 20);
      }, 2000);
    }
  }
  type();
}

// ── Particle canvas ───────────────────────────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let W = canvas.width = window.innerWidth, H = canvas.height = window.innerHeight;
  window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
    r: Math.random() * 1.5 + 0.5,
    color: Math.random() > 0.5 ? '#00f5ff' : '#00ff88',
  }));
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.color; ctx.globalAlpha = 0.5; ctx.fill();
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Tab switching ─────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    btn.classList.add('active');
    activeTab = btn.dataset.tab;
    document.getElementById('tab-' + activeTab).classList.remove('hidden');
  });
});

// ── Image file input ──────────────────────────────────────────────────────────
document.getElementById('image-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const preview = document.getElementById('image-preview');
  const reader = new FileReader();
  reader.onload = ev => { preview.innerHTML = `<img src="${ev.target.result}" alt="preview">`; };
  reader.readAsDataURL(file);
  document.getElementById('file-info').textContent = file.name;
});

// ── Drag & drop ───────────────────────────────────────────────────────────────
const dropZone = document.getElementById('drop-zone');
['dragover', 'dragenter'].forEach(e => dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.add('drag-over'); }));
['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, ev => { ev.preventDefault(); dropZone.classList.remove('drag-over'); }));
dropZone.addEventListener('drop', ev => {
  const file = ev.dataTransfer.files[0];
  if (file && file.type.startsWith('text')) {
    const reader = new FileReader();
    reader.onload = e => { document.getElementById('text-input').value = e.target.result; };
    reader.readAsText(file);
  }
});

// ── Scan button ───────────────────────────────────────────────────────────────
document.getElementById('start-scan-btn').addEventListener('click', startScan);

async function startScan() {
  const scanType = activeTab;
  if (scanType === 'text') {
    const text = document.getElementById('text-input').value.trim();
    if (!text) return alert('Please enter text to scan.');
    await runAPIScan('text', text);
  } else if (scanType === 'image') {
    const file = document.getElementById('image-input').files[0];
    if (!file) return alert('Please select an image.');
    await runImageScan(file);
  } else if (scanType === 'url') {
    const url = document.getElementById('url-input').value.trim();
    if (!url) return alert('Please enter a URL.');
    await runAPIScan('url', url);
  }
}

// ── WebSocket live scan (no auth required) ────────────────────────────────────
function runWebSocketScan(text) {
  showScanning();
  resetPipelineStages();
  let progress = 0;

  try {
    ws = new WebSocket(WS_URL);
  } catch(e) {
    // Fallback: simulate scan with mock data if backend not running
    simulateScan(text);
    return;
  }

  ws.onopen = () => {
    addLog('[WS] Secure channel established.');
    ws.send(JSON.stringify({ text }));
  };

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    handleStreamEvent(msg);
    progress = Math.min(progress + 25, 100);
    document.getElementById('scan-progress').style.width = progress + '%';
  };

  ws.onerror = () => {
    addLog('[WS] Connection failed. Running local simulation...');
    simulateScan(text);
  };

  ws.onclose = () => addLog('[WS] Channel closed.');
}

function handleStreamEvent(msg) {
  const stageMap = { pii_detection: 'stage-pii', nlp_analysis: 'stage-nlp', anomaly_detection: 'stage-anomaly', risk_scoring: 'stage-risk' };
  if (msg.event === 'stage_start') {
    const el = document.getElementById(stageMap[msg.stage]);
    if (el) { el.classList.add('active'); addLog(`[AI] Running ${msg.stage.replace(/_/g,' ')}...`); }
  }
  if (msg.event === 'stage_complete') {
    const el = document.getElementById(stageMap[msg.stage]);
    if (el) { el.classList.remove('active'); el.classList.add('done'); }
    addLog(`[AI] ${msg.stage.replace(/_/g,' ')} complete.`);
  }
  if (msg.event === 'scan_complete') {
    currentScanResult = msg.data;
    addLog('[SYS] Analysis complete. Rendering results...');
    setTimeout(() => renderResults({ risk: msg.data }), 500);
  }
  if (msg.event === 'error') addLog(`[ERR] ${msg.message}`);
}

// ── API scan (authenticated) ──────────────────────────────────────────────────
async function runAPIScan(type, input) {
  showScanning();
  resetPipelineStages();
  animatePipelineStages();

  try {
    let res, body;
    if (type === 'text') {
      addLog('[API] Sending text to AI pipeline...');
      res = await fetch(`${API}/scan/text`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ text: input }),
      });
    } else if (type === 'url') {
      addLog('[API] Sending URL to threat analyzer...');
      res = await fetch(`${API}/scan/url`, {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ url: input }),
      });
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.json();
    currentScanResult = body;
    document.getElementById('scan-progress').style.width = '100%';
    addLog('[SYS] Analysis complete. Rendering results...');
    setTimeout(() => renderResults(body), 500);
    loadHistory();
  } catch (err) {
    addLog(`[ERR] ${err.message}. Running simulation...`);
    simulateScan(input);
  }
}

async function runImageScan(file) {
  showScanning();
  resetPipelineStages();
  animatePipelineStages();
  addLog('[OCR] Uploading image for OCR analysis...');
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch(`${API}/scan/image`, {
      method: 'POST',
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    currentScanResult = body;
    document.getElementById('scan-progress').style.width = '100%';
    addLog('[SYS] OCR + AI analysis complete.');
    setTimeout(() => renderResults(body), 500);
    loadHistory();
  } catch (err) {
    addLog(`[ERR] ${err.message}. Running simulation...`);
    simulateScan('image scan');
  }
}

// ── Simulation fallback (no backend) ─────────────────────────────────────────
function simulateScan(input) {
  const stages = ['stage-pii','stage-nlp','stage-anomaly','stage-risk'];
  const logs = [
    '[PII] Scanning for API keys, tokens, credentials...',
    '[PII] Checking Aadhaar, PAN, credit card patterns...',
    '[NLP] Running spaCy named entity recognition...',
    '[NLP] Presidio PII analysis in progress...',
    '[ANOMALY] Isolation Forest scoring...',
    '[RISK] Aggregating weighted ensemble scores...',
    '[SYS] Analysis complete.',
  ];
  let si = 0, li = 0, prog = 0;
  const stageInterval = setInterval(() => {
    if (si < stages.length) {
      document.getElementById(stages[si]).classList.add('active');
      setTimeout(() => {
        document.getElementById(stages[si]).classList.remove('active');
        document.getElementById(stages[si]).classList.add('done');
      }, 600);
      si++;
    } else clearInterval(stageInterval);
  }, 700);
  const logInterval = setInterval(() => {
    if (li < logs.length) { addLog(logs[li++]); prog = Math.min(prog + 14, 100); document.getElementById('scan-progress').style.width = prog + '%'; }
    else { clearInterval(logInterval); setTimeout(() => renderResults(getMockResult(input)), 500); }
  }, 400);
}

function getMockResult(input) {
  const hasCred = /password|api.?key|token|secret/i.test(input);
  const hasEmail = /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/i.test(input);
  const hasPAN = /[A-Z]{5}[0-9]{4}[A-Z]/i.test(input);
  const isURL = /^https?:\/\//i.test(input) || /\.[a-z]{2,}(\/|$)/i.test(input);
  const score = hasCred ? 0.82 : hasEmail ? 0.45 : hasPAN ? 0.65 : isURL ? 0.55 : 0.12;
  const level = score > 0.75 ? 'critical' : score > 0.55 ? 'high' : score > 0.35 ? 'medium' : score > 0.1 ? 'low' : 'safe';

  // Build mock URL analysis if input looks like a URL
  let urlAnalysis = null;
  let detailedThreats = [];
  if (isURL) {
    const hasIP = /^\d{1,3}(\.\d{1,3}){3}/.test(input.replace(/^https?:\/\//i, ''));
    const hasSuspiciousTLD = /\.(xyz|top|tk|ml|click|link)($|\/)/.test(input);
    const hasPhishKw = /(login|verify|secure|account|update|banking)/i.test(input);
    const domainMatch = input.match(/^https?:\/\/([^/]+)/i);
    const domain = domainMatch ? domainMatch[1] : input;
    const dotCount = (domain.match(/\./g) || []).length;
    urlAnalysis = {
      domain,
      is_phishing: hasPhishKw || hasSuspiciousTLD,
      is_malicious: hasIP,
      risk_score: score,
      entropy_score: 3.8 + (hasSuspiciousTLD ? 0.6 : 0),
      ssl_valid: input.startsWith('https'),
      is_typosquat: false,
      ml_score: score * 0.9,
      heuristic_score: score * 0.7,
      threat_indicators: [
        ...(hasIP ? ['ip_address_as_host'] : []),
        ...(hasSuspiciousTLD ? ['suspicious_tld'] : []),
        ...(hasPhishKw && dotCount > 2 ? ['suspicious_subdomain_keyword'] : []),
        ...(!input.startsWith('https') ? ['no_ssl'] : []),
      ],
    };
    if (hasIP) detailedThreats.push({ entity_type: 'IP_BASED_URL', text: domain, confidence: 0.75, explanation: 'URL uses IP address instead of domain' });
    if (hasSuspiciousTLD) detailedThreats.push({ entity_type: 'SUSPICIOUS_TLD', text: domain, confidence: 0.80, explanation: 'Suspicious TLD detected' });
    if (hasPhishKw && dotCount > 2) detailedThreats.push({ entity_type: 'SUSPICIOUS_SUBDOMAIN', text: domain, confidence: 0.90, explanation: 'Phishing keyword in deep subdomain' });
    if (!input.startsWith('https')) detailedThreats.push({ entity_type: 'NO_SSL', text: input, confidence: 0.70, explanation: 'URL does not use HTTPS' });
  }

  return {
    risk: {
      final_score: score, risk_level: level, confidence: 0.87,
      reasoning_chain: [
        'Risk assessment initiated with 3 active detection modules.',
        hasCred ? '[PII_DETECTOR] Score 0.90 × weight 0.30 = contribution 0.27. Credential patterns detected.' : '[PII_DETECTOR] Score 0.05 × weight 0.30 = contribution 0.015. No credentials found.',
        '[NLP_PIPELINE] Score 0.40 × weight 0.20 = contribution 0.08. Entity analysis complete.',
        '[ANOMALY_DETECTOR] Score 0.35 × weight 0.20 = contribution 0.07. Content within normal parameters.',
        `Aggregated risk score: ${score.toFixed(4)} → classified as '${level.toUpperCase()}'.`,
      ],
      pipeline_stages: [
        { stage: 'PII Detection', score: hasCred ? 0.9 : 0.05, status: 'completed', matches: hasCred ? 2 : 0 },
        { stage: 'NLP Analysis', score: 0.4, status: 'completed', entities: hasEmail ? 1 : 0 },
        { stage: 'Anomaly Detection', score: 0.35, status: 'completed', is_anomaly: hasCred },
        { stage: 'Risk Scoring', score: score, status: 'completed' },
      ],
      recommendations: hasCred
        ? ['Block transmission immediately and alert security team.', 'Redact all credential data before sharing externally.', 'Initiate incident response protocol.']
        : isURL && score > 0.4
          ? ['Do not click or share this URL without verification.', 'Check the domain against known phishing databases.']
          : ['Content appears safe. Standard sharing policies apply.'],
    },
    pii: {
      total_matches: hasCred ? 2 : hasEmail ? 1 : 0,
      highest_severity: hasCred ? 'critical' : hasEmail ? 'low' : 'safe',
      categories_found: hasCred ? ['credential'] : hasEmail ? ['pii'] : [],
      detections: hasCred ? [
        { label: 'Hardcoded Password/Secret', category: 'credential', severity: 'high', matched_text: 'pa****rd', confidence: 0.92, position: { start: 0, end: 10 } },
      ] : [],
    },
    nlp: {
      entities: hasEmail ? [{ label: 'EMAIL', text: 'us****@ex****.com', confidence: 0.88, source: 'presidio' }] : [],
      intent_labels: hasCred ? ['credential_sharing'] : [],
      threat_keywords: hasCred ? ['password', 'secret'] : [],
    },
    anomaly: { is_anomaly: hasCred, anomaly_score: hasCred ? 0.78 : 0.12, explanation: hasCred ? 'Anomaly detected: credential patterns detected. Score: 0.78' : 'Content appears within normal parameters.' },
    ...(urlAnalysis ? { url_analysis: urlAnalysis, detailed_threats: detailedThreats } : {}),
  };
}

// ── Render results ────────────────────────────────────────────────────────────
function renderResults(data) {
  document.getElementById('scanning').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('dashboard').scrollIntoView({ behavior: 'smooth' });

  const risk = data.risk || {};
  const pii  = data.pii  || {};
  const nlp  = data.nlp  || {};
  const anomaly = data.anomaly || {};
  const ocr  = data.ocr  || {};
  const urlA = data.url_analysis || {};

  // Risk meter
  const score = risk.final_score || 0;
  const level = risk.risk_level || 'safe';
  const pct = Math.round(score * 100);
  const bar = document.getElementById('risk-level-bar');
  bar.style.width = pct + '%';
  bar.className = 'risk-level ' + level;
  document.getElementById('risk-score').textContent = pct + '%';
  const badge = document.getElementById('risk-badge');
  badge.textContent = level.toUpperCase();
  badge.className = 'risk-badge ' + level;

  // Reasoning chain
  const rl = document.getElementById('reasoning-list');
  rl.innerHTML = '';
  (risk.reasoning_chain || []).forEach(r => { const li = document.createElement('li'); li.textContent = r; rl.appendChild(li); });

  // Pipeline viz
  const pv = document.getElementById('pipeline-viz');
  pv.innerHTML = '';
  (risk.pipeline_stages || []).forEach((s, i) => {
    const lvl = s.score > 0.75 ? 'critical' : s.score > 0.55 ? 'high' : s.score > 0.35 ? 'medium' : s.score > 0.1 ? 'low' : 'safe';
    pv.innerHTML += `<div class="pipe-stage ${lvl}"><div class="pipe-name">${s.stage}</div><div class="pipe-score">${Math.round(s.score*100)}%</div></div>`;
    if (i < (risk.pipeline_stages.length - 1)) pv.innerHTML += `<span class="pipe-arrow">→</span>`;
  });

  // Threat cards
  buildThreatCards(pii, nlp, anomaly, level);

  // NLP entities
  if (nlp.entities && nlp.entities.length > 0) {
    document.getElementById('entities-panel').classList.remove('hidden');
    const et = document.getElementById('entity-tokens');
    et.innerHTML = nlp.entities.map(e => `<span class="entity-token ${e.label || 'default'}" title="${e.source}">${e.label}: ${e.text} (${Math.round(e.confidence*100)}%)</span>`).join('');
  }

  // OCR panel
  if (ocr.extracted_text) {
    document.getElementById('ocr-panel').classList.remove('hidden');
    document.getElementById('ocr-text').textContent = ocr.extracted_text;
    document.getElementById('ocr-meta').innerHTML = `<span>Engine: <span>${ocr.engine_used}</span></span><span>Confidence: <span>${Math.round((ocr.confidence||0)*100)}%</span></span><span>Time: <span>${ocr.processing_time_ms?.toFixed(0)}ms</span></span>`;
  }

  // URL panel
  if (urlA.domain) {
    document.getElementById('url-panel').classList.remove('hidden');
    const detailedThreats = data.detailed_threats || [];
    document.getElementById('url-details').innerHTML = `
      <div class="url-detail-item"><div class="label">DOMAIN</div><div class="value">${urlA.domain}</div></div>
      <div class="url-detail-item"><div class="label">SSL</div><div class="value ${urlA.ssl_valid?'good':'bad'}">${urlA.ssl_valid?'VALID':'INVALID'}</div></div>
      <div class="url-detail-item"><div class="label">PHISHING</div><div class="value ${urlA.is_phishing?'bad':'good'}">${urlA.is_phishing?'DETECTED':'CLEAN'}</div></div>
      <div class="url-detail-item"><div class="label">ENTROPY</div><div class="value">${(urlA.entropy_score||0).toFixed(2)}</div></div>
      <div class="url-detail-item"><div class="label">ML SCORE</div><div class="value">${Math.round((urlA.ml_score||0)*100)}%</div></div>
      <div class="url-detail-item"><div class="label">TYPOSQUAT</div><div class="value ${urlA.is_typosquat?'bad':'good'}">${urlA.is_typosquat?'YES':'NO'}</div></div>
      ${urlA.threat_indicators?.length ? `<div class="url-indicators">${urlA.threat_indicators.map(i=>`<span class="url-indicator">${i}</span>`).join('')}</div>` : ''}
      ${detailedThreats.length ? `
        <div class="url-detailed-threats">
          <div class="label" style="margin-bottom:0.5rem">DETAILED THREAT ANALYSIS</div>
          ${detailedThreats.map(t => `
            <div class="url-threat-row">
              <span class="url-indicator">${t.entity_type}</span>
              <span class="url-threat-conf">${Math.round(t.confidence*100)}%</span>
              <span class="url-threat-exp">${t.explanation}</span>
            </div>`).join('')}
        </div>` : ''}
    `;
  }

  // Recommendations
  const recList = document.getElementById('rec-list');
  recList.innerHTML = (risk.recommendations || ['No recommendations.']).map(r => `<li>${r}</li>`).join('');
}

// ── Build threat cards ────────────────────────────────────────────────────────
function buildThreatCards(pii, nlp, anomaly, level) {
  const container = document.getElementById('threat-cards');
  container.innerHTML = '';
  const cards = [];

  // PII card
  if (pii.total_matches > 0) {
    const cats = (pii.categories_found || []).join(', ') || 'unknown';
    const sev = pii.highest_severity;
    const cls = sev === 'critical' || sev === 'high' ? 'danger' : 'warning';
    cards.push({ icon: 'fa-key', title: 'SENSITIVE DATA DETECTED', cls, body: `Found ${pii.total_matches} match(es): ${cats}. Highest severity: ${sev?.toUpperCase()}.`, btn: 'REDACT' });
  } else {
    cards.push({ icon: 'fa-shield-check', title: 'NO CREDENTIALS FOUND', cls: 'safe', body: 'No API keys, passwords, or PII detected.', btn: null });
  }

  // NLP card
  const kwCount = (nlp.threat_keywords || []).length;
  const intentCount = (nlp.intent_labels || []).length;
  if (kwCount > 0 || intentCount > 0) {
    cards.push({ icon: 'fa-brain', title: 'NLP THREAT SIGNALS', cls: 'warning', body: `${kwCount} threat keyword(s), ${intentCount} suspicious intent(s): ${(nlp.intent_labels||[]).join(', ') || 'none'}.`, btn: null });
  }

  // Anomaly card
  if (anomaly.is_anomaly) {
    cards.push({ icon: 'fa-triangle-exclamation', title: 'BEHAVIORAL ANOMALY', cls: 'danger', body: anomaly.explanation || 'Unusual content patterns detected.', btn: null });
  } else {
    cards.push({ icon: 'fa-bug-slash', title: 'ANOMALY CHECK', cls: 'safe', body: 'Content behavior within normal parameters.', btn: null });
  }

  // Overall risk card
  const riskCls = level === 'safe' ? 'safe' : level === 'low' ? 'info' : level === 'medium' ? 'warning' : 'danger';
  cards.push({ icon: 'fa-chart-pie', title: `RISK LEVEL: ${level.toUpperCase()}`, cls: riskCls, body: `Ensemble AI risk score computed from ${(pii.total_matches||0)} detections across all pipeline stages.`, btn: null });

  cards.forEach((c, i) => {
    const isSafe = c.cls === 'safe';
    container.innerHTML += `
      <div class="threat-card glass-panel ${isSafe?'safe-card':''}" style="--delay:${i*0.1}s">
        <div class="card-header ${c.cls}"><i class="fa-solid ${c.icon}"></i><h3>${c.title}</h3></div>
        <p>${c.body}</p>
        ${c.btn ? `<button class="cyber-btn sm-btn">${c.btn}</button>` : ''}
      </div>`;
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function showScanning() {
  document.getElementById('upload').classList.add('hidden');
  document.getElementById('scanning').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('scan-progress').style.width = '0%';
  document.getElementById('scan-logs').innerHTML = '<li>[SYS] Initializing heuristics...</li>';
  document.getElementById('scanning').scrollIntoView({ behavior: 'smooth' });
}

function addLog(msg) {
  const ul = document.getElementById('scan-logs');
  const li = document.createElement('li');
  li.textContent = msg;
  ul.appendChild(li);
  ul.scrollTop = ul.scrollHeight;
}

function resetPipelineStages() {
  ['stage-pii','stage-nlp','stage-anomaly','stage-risk'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.remove('active','done');
  });
}

function animatePipelineStages() {
  const stages = ['stage-pii','stage-nlp','stage-anomaly','stage-risk'];
  const logs = ['[PII] Scanning credentials and PII patterns...','[NLP] Running entity recognition...','[ANOMALY] Isolation Forest analysis...','[RISK] Computing ensemble score...'];
  stages.forEach((id, i) => {
    setTimeout(() => {
      document.getElementById(id).classList.add('active');
      addLog(logs[i]);
      document.getElementById('scan-progress').style.width = ((i+1)*25) + '%';
      setTimeout(() => { document.getElementById(id).classList.remove('active'); document.getElementById(id).classList.add('done'); }, 600);
    }, i * 700);
  });
}

// ── Action buttons ────────────────────────────────────────────────────────────
document.getElementById('new-scan-btn').addEventListener('click', () => {
  document.getElementById('dashboard').classList.add('hidden');
  document.getElementById('upload').classList.remove('hidden');
  document.getElementById('text-input').value = '';
  document.getElementById('url-input').value = '';
  document.getElementById('image-preview').innerHTML = '';
  document.getElementById('entities-panel').classList.add('hidden');
  document.getElementById('ocr-panel').classList.add('hidden');
  document.getElementById('url-panel').classList.add('hidden');
  document.getElementById('upload').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('share-btn').addEventListener('click', () => {
  const level = document.getElementById('risk-badge').textContent.toLowerCase();
  if (level === 'critical' || level === 'high') {
    alert('BLOCKED: High-risk content detected. Sharing is not permitted. Please redact sensitive data first.');
  } else {
    alert('Content cleared for sharing. Risk level: ' + level.toUpperCase());
  }
});

document.getElementById('export-btn').addEventListener('click', () => {
  if (!currentScanResult) return;
  const blob = new Blob([JSON.stringify(currentScanResult, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `safeshare_report_${Date.now()}.json`;
  a.click();
});

// ── Scan history ──────────────────────────────────────────────────────────────
async function loadHistory() {
  if (!authToken) return;
  try {
    const res = await fetch(`${API}/threats/history?limit=10`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    const section = document.getElementById('history-section');
    const list = document.getElementById('history-list');
    if (!data.scans || data.scans.length === 0) return;
    section.classList.remove('hidden');
    list.innerHTML = data.scans.map(s => `
      <div class="history-item" onclick="loadScanReport('${s.id}')">
        <span class="h-type">${s.scan_type?.toUpperCase()}</span>
        <span class="h-preview">${s.input_preview || '—'}</span>
        <span class="h-badge ${s.risk_level}">${s.risk_level?.toUpperCase()}</span>
        <span class="h-time">${s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
      </div>`).join('');
  } catch(e) {}
}

async function loadScanReport(scanId) {
  if (!authToken) return;
  try {
    const res = await fetch(`${API}/threats/${scanId}/report`, { headers: authHeaders() });
    if (!res.ok) return;
    const data = await res.json();
    renderResults({ risk: data.risk_breakdown, pii: { detections: data.pii_detections, total_matches: data.pii_detections?.length || 0 }, nlp: { entities: data.nlp_entities } });
  } catch(e) {}
}

// ── Auth modal ────────────────────────────────────────────────────────────────
document.getElementById('nav-login-btn').addEventListener('click', e => { e.preventDefault(); document.getElementById('auth-modal').classList.remove('hidden'); });
// Badge click — lets guest switch to a real account
document.getElementById('user-badge').addEventListener('click', () => {
  if (localStorage.getItem('ss_email') === 'guest@safeshare.ai') {
    document.getElementById('auth-modal').classList.remove('hidden');
  }
});
document.getElementById('modal-close').addEventListener('click', () => document.getElementById('auth-modal').classList.add('hidden'));
document.getElementById('auth-modal').addEventListener('click', e => { if (e.target === document.getElementById('auth-modal')) document.getElementById('auth-modal').classList.add('hidden'); });

// Guest login button
document.getElementById('guest-btn').addEventListener('click', async () => {
  const msg = document.getElementById('login-msg');
  try {
    const res = await fetch(`${API}/auth/guest`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('Guest login failed');
    const data = await res.json();
    setToken(data.access_token, 'guest@safeshare.ai');
    document.getElementById('auth-modal').classList.add('hidden');
    addChatMessage('Guest session started. All features unlocked — text, image, and URL scanning available.', 'bot');
  } catch(e) {
    // If backend is offline, set a local guest flag so UI still works
    setToken('guest-offline', 'guest@safeshare.ai');
    document.getElementById('auth-modal').classList.add('hidden');
  }
});

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const mode = tab.dataset.auth;
    document.getElementById('auth-login').classList.toggle('hidden', mode !== 'login');
    document.getElementById('auth-register').classList.toggle('hidden', mode !== 'register');
  });
});

document.getElementById('login-btn').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('login-msg');
  if (!email || !password) { msg.textContent = 'Please fill all fields.'; msg.className = 'auth-msg error'; return; }
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Login failed');
    setToken(data.access_token, email);
    msg.textContent = 'Login successful!'; msg.className = 'auth-msg success';
    setTimeout(() => document.getElementById('auth-modal').classList.add('hidden'), 800);
    loadHistory();
  } catch(e) { msg.textContent = e.message; msg.className = 'auth-msg error'; }
});

document.getElementById('register-btn').addEventListener('click', async () => {
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const org = document.getElementById('reg-org').value.trim();
  const msg = document.getElementById('register-msg');
  if (!name || !email || !password) { msg.textContent = 'Please fill required fields.'; msg.className = 'auth-msg error'; return; }
  try {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: name, email, password, org_name: org || null }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Registration failed');
    setToken(data.access_token, email);
    msg.textContent = 'Account created!'; msg.className = 'auth-msg success';
    setTimeout(() => document.getElementById('auth-modal').classList.add('hidden'), 800);
  } catch(e) { msg.textContent = e.message; msg.className = 'auth-msg error'; }
});

// ── Chatbot ───────────────────────────────────────────────────────────────────
document.getElementById('chatbot-toggle').addEventListener('click', () => {
  const body = document.getElementById('chatbot-body');
  const icon = document.getElementById('chatbot-icon');
  body.classList.toggle('open');
  icon.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
});

const AURA_RESPONSES = {
  'scan': 'To scan content, paste your text in the INPUT DATA STREAM section and click ANALYZE. I will run it through the full AI pipeline.',
  'api key': 'API keys are critical credentials. If detected, they will be flagged as CRITICAL severity. Always redact before sharing.',
  'phishing': 'Switch to the URL tab and paste the suspicious link. Our ML classifier checks entropy, typosquatting, SSL validity, and phishing keywords.',
  'aadhaar': 'Aadhaar numbers are detected via regex pattern matching and flagged as CRITICAL PII. They will be redacted in the report.',
  'password': 'Hardcoded passwords are detected by our credential scanner. Severity: HIGH. Recommendation: use environment variables instead.',
  'ocr': 'Upload a screenshot in the IMAGE tab. Our EasyOCR + Tesseract pipeline extracts text and runs the full AI scan on it.',
  'risk': 'Risk scores are computed by our ensemble engine combining PII detection (30%), NLP analysis (20%), anomaly detection (20%), and URL analysis (20%).',
  'login': 'Click LOGIN in the top navigation. You can log in with an account or click "CONTINUE AS GUEST" for instant full access — no registration needed.',
  'entropy': 'High domain entropy (>4.0) suggests randomly generated or obfuscated domains — a common phishing indicator. Scores above 4.2 are flagged.',
  'typosquat': 'Typosquatting detection uses Levenshtein distance to find domains that closely resemble known brands like google, paypal, or microsoft.',
  'ip': 'URLs using raw IP addresses instead of domain names are flagged as IP_BASED_URL — a strong phishing signal.',
  'subdomain': 'Deep subdomains containing phishing keywords (e.g. paypal.verify.account.security-update.com) are flagged as SUSPICIOUS_SUBDOMAIN.',
  'ssl': 'URLs without HTTPS are flagged as NO_SSL. Always verify SSL certificates before entering credentials on any site.',
  'url': 'Switch to the URL tab and paste any link. The analyzer checks entropy, typosquatting, suspicious TLDs, phishing keywords, IP usage, and SSL validity.',
  'default': 'I can help with: scanning text/images/URLs, understanding risk scores, API key detection, phishing analysis, and PII redaction. What do you need?',
};

document.getElementById('send-msg-btn').addEventListener('click', sendChat);
document.getElementById('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });

function sendChat() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  addChatMessage(text, 'user');
  input.value = '';
  setTimeout(() => {
    const lower = text.toLowerCase();
    const key = Object.keys(AURA_RESPONSES).find(k => k !== 'default' && lower.includes(k));
    addChatMessage(AURA_RESPONSES[key || 'default'], 'bot');
  }, 400);
}

function addChatMessage(text, role) {
  const msgs = document.getElementById('chat-messages');
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}
