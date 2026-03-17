/**
 * SentinelAI — Content Script
 * Injected into Gmail, Outlook, WhatsApp Web, and generic pages.
 * Uses MutationObserver to detect new emails/messages in the DOM
 * and forwards them to the background service worker for threat analysis.
 */

// No direct fetch here — all API calls go through background worker
// to avoid mixed-content blocking on HTTPS pages 
const SCAN_COOLDOWN_MS = 8000;   // minimum gap between scans (per page)

let lastScanTime = 0;
let lastScannedHash = '';

/* ── Utility: simple hash to avoid re-scanning identical content ── */
function quickHash(str) {
  let h = 0;
  for (let i = 0; i < Math.min(str.length, 300); i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h.toString(36);
}

/* ── Prevent Data Stealing: Redact Sensitive Info ── */
function redactSensitiveData(text) {
  if (!text) return text;
  
  // 1. Redact OTPs / Verification Codes (4-8 digits near "OTP", "code", "verification")
  let redacted = text.replace(
    /(?:otp|code|verification|pin|password).{0,20}?\b(\d{4,8})\b/gi, 
    match => match.replace(/\d{4,8}/, '[REDACTED_OTP]')
  );
  
  // 2. Redact Passwords (e.g., password: mysecret123)
  redacted = redacted.replace(
    /(?:pass(?:word)?|pwd|token|secret)\s*[:=]\s*([^\s]{5,40})/gi,
    match => match.replace(/([^\s]{5,40})$/, '[REDACTED_SECRET]')
  );

  // 3. Redact Credit Cards (basic 13-19 digit detection, ignoring common dates)
  redacted = redacted.replace(
    /\b(?:\d[ -]*?){13,16}\b/g,
    '[REDACTED_CARD]'
  );

  return redacted;
}

/* ── Detect which platform we're on ── */
function detectPlatform() {
  const host = window.location.hostname;
  if (host.includes('mail.google.com'))   return 'gmail';
  if (host.includes('outlook.live.com') || host.includes('outlook.office.com')) return 'outlook';
  if (host.includes('web.whatsapp.com'))  return 'whatsapp';
  if (host.includes('mail.yahoo.com'))    return 'yahoo';
  if (host.includes('teams.microsoft.com')) return 'teams';
  return 'generic';
}

/* ── Extract new email/message content from DOM per platform ── */
function extractNewContent(platform, addedNode) {
  try {
    switch (platform) {
      case 'gmail': {
        // New email thread opened — the full message body
        const body = addedNode.querySelector
          ? (addedNode.querySelector('.ii.gt .a3s') ||
             addedNode.querySelector('[data-message-id] .a3s') ||
             addedNode.querySelector('.a3s.aiL'))
          : null;
        if (body && body.innerText.trim().length > 40) {
          // Try to extract sender + subject from nearby DOM
          const thread = document.querySelector('[data-thread-id]');
          const sender  = thread?.querySelector('.gD')?.getAttribute('email') || '';
          const subject = thread?.querySelector('.hP')?.innerText || '';
          return `From: ${sender}\nSubject: ${subject}\n\n${body.innerText.substring(0, 3000)}`;
        }
        // New unread row appeared in inbox list
        const row = addedNode.matches?.('.zA.zE') ? addedNode : addedNode.querySelector?.('.zA.zE');
        if (row) {
          const snip    = row.querySelector('.y2')?.innerText || '';
          const subject = row.querySelector('.bqe,.bog')?.innerText || '';
          const sender  = row.querySelector('.zF')?.getAttribute('email') || row.querySelector('.yX')?.innerText || '';
          if (snip.length > 10 || subject.length > 5) {
            return `From: ${sender}\nSubject: ${subject}\nPreview: ${snip}`;
          }
        }
        return null;
      }

      case 'outlook': {
        const pane = addedNode.querySelector
          ? (addedNode.querySelector('[aria-label*="Message body"]') ||
             addedNode.querySelector('.customScrollBar') ||
             addedNode.querySelector('.ReadMsgBody'))
          : null;
        if (pane && pane.innerText.length > 40) {
          return pane.innerText.substring(0, 3000);
        }
        // New notification row
        const toastText = addedNode.querySelector?.('[class*="toast"]')?.innerText;
        if (toastText && toastText.length > 10) return toastText;
        return null;
      }

      case 'whatsapp': {
        // New incoming message bubble
        const bubble = addedNode.matches?.('._akbu') ? addedNode : addedNode.querySelector?.('._akbu');
        if (bubble) {
          const text = bubble.querySelector('span[class*="selectable"]')?.innerText || bubble.innerText;
          if (text && text.length > 5) return `WhatsApp message: ${text.substring(0, 1000)}`;
        }
        return null;
      }

      case 'teams': {
        const msg = addedNode.querySelector
          ? addedNode.querySelector('[data-tid*="message"]')
          : null;
        if (msg && msg.innerText.length > 5) return `Teams message: ${msg.innerText.substring(0, 1000)}`;
        return null;
      }

      default: {
        // Generic: look for notification toasts or new content blocks
        const toast = addedNode.querySelector
          ? (addedNode.querySelector('[role="alert"]') ||
             addedNode.querySelector('[class*="notification"]') ||
             addedNode.querySelector('[class*="toast"]') ||
             addedNode.querySelector('[class*="message"]'))
          : null;
        if (toast && toast.innerText.length > 20) return toast.innerText.substring(0, 2000);
        return null;
      }
    }
  } catch { return null; }
}

/* ── Scan content — delegated to background worker to avoid mixed-content block ── */
function scanContent(rawContent, platform) {
  const content = redactSensitiveData(rawContent);
  const now = Date.now();
  const hash = quickHash(content);

  // Debounce: skip if same content or too soon
  if (hash === lastScannedHash || (now - lastScanTime) < SCAN_COOLDOWN_MS) return;
  lastScanTime    = now;
  lastScannedHash = hash;

  // Send scan request to background; background will send notification for ALL results (safe + threats)
  chrome.runtime.sendMessage({ type: 'SCAN_REQUEST', content, platform }, () => {
    // response handled in background.js
    if (chrome.runtime.lastError) {
      console.warn('[SentinelAI] Message error:', chrome.runtime.lastError.message);
    }
  });
}

/* ── Extract full page content for initial scan ── */
function extractPageContent(platform) {
  const bodyText = (document.body?.innerText || '').trim();
  if (bodyText.length < 30) return null;

  switch (platform) {
    case 'gmail': {
      const emailBody = document.querySelector('.ii.gt .a3s, .a3s.aiL, [data-message-id] .a3s');
      const sender  = document.querySelector('.gD')?.getAttribute('email') || '';
      const subject = document.querySelector('.hP')?.innerText || '';
      if (emailBody) return `From: ${sender}\nSubject: ${subject}\n\n${emailBody.innerText.substring(0, 3000)}`;
      return `URL: ${location.href}\n\n${bodyText.substring(0, 4000)}`;
    }
    case 'outlook': {
      const pane = document.querySelector('[aria-label*="Message body"], .ReadMsgBody');
      return pane ? pane.innerText.substring(0, 3000) : bodyText.substring(0, 4000);
    }
    default:
      return `URL: ${location.href}\n\n${bodyText.substring(0, 4000)}`;
  }
}

/* ── Main: Start MutationObserver + initial scan ── */
(function init() {
  const platform = detectPlatform();

  // ① MutationObserver — watches for new emails/messages added to DOM
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        const content = extractNewContent(platform, node);
        if (content && content.trim().length > 30) {
          scanContent(content, platform);
          return; // only one scan per mutation batch
        }
      }
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // ② Initial scan — runs 3s after page load to scan already-loaded content
  setTimeout(() => {
    const content = extractPageContent(platform);
    if (content) {
      console.log(`[SentinelAI] 🔧 Running initial scan on ${platform}…`);
      scanContent(content, platform);
    }
  }, 3000);

  console.log(`[SentinelAI] 👁️ Monitoring ${platform} for threats…`);
})();
