/**
 * SentinelAI — Background Service Worker (Manifest V3)
 * Handles API calls from content.js and fires native browser notifications.
 */

const APP_URL = 'http://localhost:5173';
const API_URL = 'https://lindsey-unrepeatable-antonina.ngrok-free.dev/api/scan';

// Must be absolute URL in MV3 service worker context
const ICON_URL = chrome.runtime.getURL('logo.png');

// Track notifId → platform for click navigation
const pendingNotifs = new Map();

/* ── Notification click handlers (top-level, registered once) ── */
chrome.notifications.onClicked.addListener((id) => {
  if (!pendingNotifs.has(id)) return;
  const { platform } = pendingNotifs.get(id);
  const route = (platform === 'whatsapp' || platform === 'teams')
    ? '/analyze?type=general'
    : '/analyze?type=email';
  chrome.tabs.create({ url: APP_URL + route });
  chrome.notifications.clear(id);
  pendingNotifs.delete(id);
});

chrome.notifications.onButtonClicked.addListener((id, btnIdx) => {
  if (!pendingNotifs.has(id)) return;
  if (btnIdx === 0) {
    const { platform } = pendingNotifs.get(id);
    const route = (platform === 'whatsapp' || platform === 'teams')
      ? '/analyze?type=general'
      : '/analyze?type=email';
    chrome.tabs.create({ url: APP_URL + route });
  }
  chrome.notifications.clear(id);
  pendingNotifs.delete(id);
});

chrome.notifications.onClosed.addListener((id) => pendingNotifs.delete(id));

/* ── Core notification function ── */
function fireNotification({ riskScore, verdict, explanation, threatType, platform }) {
  const platformLabel = {
    gmail: 'Gmail', outlook: 'Outlook', whatsapp: 'WhatsApp',
    teams: 'Teams', yahoo: 'Yahoo Mail', generic: 'Web Page',
  }[platform] || 'Web Page';

  let title, urgency;
  if (riskScore < 45) {
    title   = `✅ Safe — No threats detected`;
    urgency = 'safe';
  } else if (riskScore < 75) {
    title   = `⚠️ Suspicious — ${threatType || 'Unknown threat'}`;
    urgency = 'medium';
  } else {
    title   = `🚨 MALICIOUS — ${threatType || 'Critical threat'}`;
    urgency = 'high';
  }

  const bodyText = explanation
    ? explanation.substring(0, 120) + (explanation.length > 120 ? '…' : '')
    : urgency === 'safe'
      ? 'No phishing, malware, or AI threats found.'
      : `Risk Score: ${riskScore}/100 — verify before acting.`;

  const notifId = `sentinel-${Date.now()}`;
  pendingNotifs.set(notifId, { platform, riskScore });
  setTimeout(() => pendingNotifs.delete(notifId), 60000);

  // IMPORTANT: iconUrl must be absolute chrome-extension:// URL in MV3
  chrome.notifications.create(notifId, {
    type: 'basic',
    iconUrl: ICON_URL,
    title,
    message: bodyText,
    contextMessage: `${platformLabel} • Risk ${riskScore}/100`,
    priority: urgency === 'high' ? 2 : 0,
    requireInteraction: urgency === 'high',
  }, (notifCreatedId) => {
    if (chrome.runtime.lastError) {
      console.error('[SentinelAI] Notification error:', chrome.runtime.lastError.message);
    } else {
      console.log(`[SentinelAI] Notification fired: ${title} (id=${notifCreatedId})`);
    }
  });
}

/* ── Local regex fallback scanner (used when API is unavailable) ── */
function localScan(content) {
  const text = (content || '').toLowerCase();

  const HIGH_RISK = [
    /password\s*[:=]\s*\S+/, /your\s+account\s+(has been|will be)\s+(suspend|terminat|clos)/i,
    /click\s+here\s+to\s+(verify|confirm|restore|unlock)/i,
    /urgent[:\-]?\s*(action|response|verify)/i,
    /select\s+\*\s+from|drop\s+table|union\s+select/i,         // SQL injection
    /ignore\s+previous\s+instructions|jailbreak|dan\s+mode/i,  // Prompt injection
    /(malware|ransomware|trojan|exploit|payload)\s+detected/i,
  ];

  const MED_RISK = [
    /verify\s+your\s+(account|email|identity)/i,
    /\b(login|sign.?in)\s+(attempt|failed|from\s+new\s+device)/i,
    /\b(bitcoin|crypto|wallet\s+address|send\s+\d+\s*(btc|eth|usdt))/i,
    /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/,    // raw IP address
    /http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/, // IP-based URL
    /(chatgpt|gpt-4|claude|llm|ai.generated)\s+(wrote|created|sent|help)/i,
  ];

  let score = 0;
  let signals = [];

  HIGH_RISK.forEach(r => {
    if (r.test(content)) { score += 30; signals.push(r.toString().substring(1, 30)); }
  });
  MED_RISK.forEach(r => {
    if (r.test(content)) { score += 15; signals.push(r.toString().substring(1, 30)); }
  });

  score = Math.min(score, 95);

  if (score >= 70) {
    return { riskScore: score, verdict: 'MALICIOUS', threatType: 'High-Risk Content', explanation: `Local detection: ${signals.slice(0,2).join(', ')}. AI analysis unavailable (rate limit).` };
  } else if (score >= 40) {
    return { riskScore: score, verdict: 'SUSPICIOUS', threatType: 'Suspicious Patterns', explanation: `Local detection: ${signals.slice(0,2).join(', ')}. AI analysis unavailable (rate limit).` };
  } else {
    return { riskScore: score, verdict: 'SAFE', threatType: 'No threats detected', explanation: 'No obvious threat patterns found (AI analysis unavailable — rate limit reached).' };
  }
}

/* ── Message listener ── */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_REQUEST') {
    const { content, platform = 'generic' } = message;

    console.log(`[SentinelAI BG] Scan request from ${platform}, content length: ${content?.length}`);

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: content }),
    })
      .then(r => {
        if (!r.ok) throw new Error(`API returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        console.log('[SentinelAI BG] Scan result:', data.verdict, 'score:', data.risk_score);
        sendResponse({ ok: true, data });

        fireNotification({
          riskScore:   Math.round(data.risk_score ?? 0),
          verdict:     data.verdict ?? 'SAFE',
          explanation: data.explanation ?? '',
          threatType:  data.threat_type ?? '',
          platform,
        });
      })
      .catch(err => {
        console.error('[SentinelAI BG] API error:', err.message);
        sendResponse({ ok: false, error: err.message });

        // ── Local fallback scan when API is unavailable (e.g. rate limit) ──
        const localResult = localScan(content);
        fireNotification({
          riskScore:   localResult.riskScore,
          verdict:     localResult.verdict,
          explanation: localResult.explanation,
          threatType:  localResult.threatType,
          platform,
        });
      });

    return true; // keep channel open for async response
  }
});

/* ── Installed ── */
chrome.runtime.onInstalled.addListener(() => {
  console.log('[SentinelAI] Service worker installed. Monitoring ready.');
});
