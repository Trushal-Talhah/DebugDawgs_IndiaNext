document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scanBtn');
  const loader = document.getElementById('loader');
  const loaderMsg = document.getElementById('loaderMsg');
  const resultCard = document.getElementById('resultCard');
  const errorMsg = document.getElementById('errorMsg');
  const detectBadge = document.getElementById('detectBadge');
  const detectLabel = document.getElementById('detectLabel');
  const detectDesc = document.getElementById('detectDesc');
  const openAppBtn = document.getElementById('openAppBtn');

  const verdictBadge = document.getElementById('verdictBadge');
  const riskScore = document.getElementById('riskScore');
  const explanationText = document.getElementById('explanationText');
  const confText = document.getElementById('confText');
  const confBar = document.getElementById('confBar');
  const modeTag = document.getElementById('modeTag');

  const API_URL = 'https://submedian-noncoherent-hellen.ngrok-free.dev/api/scan';
  const APP_URL = 'https://debug-dawgs-india-next.vercel.app';

  let detectedType = null;
  let detectedContent = null;

  /* ─── Run content detection on popup open ─── */
  async function runDetection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) return;

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: detectPageContent
      });

      const { type, content, imageUrl, imageCount, emailSignals } = results[0].result;
      detectedType = type;
      detectedContent = content;

      renderDetectedBadge(type, imageCount, emailSignals, imageUrl);
    } catch (e) {
      console.warn('Detection failed:', e);
    }
  }

  function renderDetectedBadge(type, imageCount, emailSignals, imageUrl) {
    detectBadge.className = 'detect-badge ' + type;

    if (type === 'email') {
      detectBadge.textContent = '✉️';
      detectLabel.textContent = 'Email Content Detected';
      detectDesc.textContent = `Found ${emailSignals} email signals (From/To/Subject/Body). Will run Email Analysis.`;
    } else if (type === 'image') {
      detectBadge.textContent = '🖼️';
      detectLabel.textContent = `${imageCount} Image${imageCount > 1 ? 's' : ''} Detected`;
      detectDesc.textContent = 'Will run Deepfake Image analysis on the dominant image.';
    } else {
      detectBadge.textContent = '🔍';
      detectLabel.textContent = 'Text / Log Content Detected';
      detectDesc.textContent = 'Found AI text, log entries, or general content. Will run General Input analysis.';
    }
  }

  /* ─── Main scan ─── */
  scanBtn.addEventListener('click', async () => {
    scanBtn.disabled = true;
    loader.classList.remove('hidden');
    resultCard.classList.add('hidden');
    errorMsg.classList.add('hidden');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error('Could not access active tab');

      // Re-run detection if we don't have a result yet
      if (!detectedType) {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: detectPageContent
        });
        const r = results[0].result;
        detectedType = r.type;
        detectedContent = r.content;
        renderDetectedBadge(r.type, r.imageCount, r.emailSignals, r.imageUrl);
      }

      loaderMsg.textContent = detectedType === 'email'
        ? 'Analyzing email content…'
        : detectedType === 'image'
          ? 'Analyzing image for deepfakes…'
          : 'Analyzing text for threats…';

      let response;
      if (detectedType === 'email') {
        // Typed endpoint — email is a valid input_type
        response = await fetch(`${API_URL}/typed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ input_type: 'email', content: detectedContent }),
        });
      } else {
        // Auto-detect endpoint — handles general, image urls, logs, etc.
        // Sends { input: "..." } — backend classifies the type automatically
        response = await fetch(API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          },
          body: JSON.stringify({ input: detectedContent }),
        });
      }

      if (!response.ok) {
        let errorDetail = response.statusText;
        try {
          const errData = await response.json();
          if (errData.detail) {
            errorDetail = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch (e) { }
        throw new Error(`Server returned ${response.status}: ${errorDetail}`);
      }

      const data = await response.json();
      updateResults(data, detectedType);

    } catch (err) {
      console.error(err);
      errorMsg.textContent = '⚠️ ' + err.message + ' — Ensure ngrok is running and backend is reachable.';
      errorMsg.classList.remove('hidden');
    } finally {
      loader.classList.add('hidden');
      scanBtn.disabled = false;
    }
  });

  /* Open result in app */
  openAppBtn && openAppBtn.addEventListener('click', () => {
    const route = detectedType === 'email'
      ? '/analyze?type=email'
      : detectedType === 'image'
        ? '/analyze?type=image'
        : '/analyze?type=general';
    chrome.tabs.create({ url: APP_URL + route });
  });

  /* ─── DOM Injection: Smart content detection ─── */
  function detectPageContent() {
    const result = {
      type: 'general',
      content: '',
      imageCount: 0,
      imageUrl: '',
      emailSignals: 0,
    };

    /* ---------- EMAIL DETECTION ---------- */
    const bodyText = document.body.innerText || '';
    const bodyHtml = document.body.innerHTML || '';

    // Email-like signals: From/To/Subject/Reply-To headers, email addresses, .eml patterns
    const emailPatterns = [
      /\bFrom:\s*[\w.+-]+@[\w.-]+\.\w+/i,
      /\bTo:\s*[\w.+-]+@[\w.-]+\.\w+/i,
      /\bSubject:\s*.{3,}/i,
      /\bReply-To:\s*[\w.+-]+@[\w.-]+\.\w+/i,
      /\bDate:\s+\w+,\s+\d{1,2}\s+\w+\s+\d{4}/i,
      /\bMIME-Version:/i,
      /\bContent-Type:\s*text\/(plain|html)/i,
    ];
    const emailSignals = emailPatterns.filter(p => p.test(bodyText)).length;

    // Gmail / webmail DOM structure
    const gmailThread = document.querySelector('[data-message-id], [aria-label*="Email"], [role="main"] [data-thread-id]');
    const outlookPane = document.querySelector('[aria-label*="Message"], .ReadMsgContainer, #MessageContainer');
    const mailTo = document.querySelectorAll('a[href^="mailto:"]').length;

    const isEmailPage = emailSignals >= 2 || gmailThread || outlookPane || mailTo > 3;

    if (isEmailPage) {
      result.type = 'email';
      result.emailSignals = emailSignals;

      // Try to get structured email body
      const emailBody =
        document.querySelector('[data-message-id] .ii.gt') ||         // Gmail
        document.querySelector('.ReadMsgBody, #MessageBody') ||        // Outlook
        document.querySelector('[role="main"] .nH .a3s') ||            // Gmail alt
        document.querySelector('[aria-label*="message body"]');        // Generic

      result.content = emailBody
        ? `URL: ${window.location.href}\n\nEMAIL CONTENT:\n${emailBody.innerText.substring(0, 4000)}`
        : `URL: ${window.location.href}\n\nPAGE EMAIL CONTENT:\n${bodyText.substring(0, 4000)}`;

      return result;
    }

    /* ---------- IMAGE DETECTION ---------- */
    const images = Array.from(document.querySelectorAll('img'))
      .filter(img => {
        const { naturalWidth: w, naturalHeight: h } = img;
        // Ignore tiny icons/logos (< 100x100)
        return w >= 100 && h >= 100 && img.src && !img.src.startsWith('data:image/svg');
      })
      .sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight)); // biggest first

    if (images.length > 0) {
      result.type = 'image';
      result.imageCount = images.length;
      result.imageUrl = images[0].src;
      result.content = `IMAGE URL: ${images[0].src}\nPAGE URL: ${window.location.href}\n\nPage context:\n${bodyText.substring(0, 1000)}`;
      return result;
    }

    /* ---------- GENERAL: Logs, AI text, suspicious content ---------- */
    // Boost detection of log/AI/security content
    const generalKeywords = [
      /\b(error|exception|stack\s*trace|traceback|fatal|critical|warning)\b/i,
      /\b(login|authentication|session|token|bearer|jwt|api.?key)\b/i,
      /\b(select\s+\*|drop\s+table|insert\s+into|union\s+select)\b/i,     // SQL
      /\b(chmod|sudo|bash|eval|exec|system|popen|subprocess)\b/i,          // Command
      /\b(chatgpt|gpt-4|claude|gemini|llm|prompt|ai.generated)\b/i,        // AI
      /\b(phish|malware|ransomware|trojan|payload|exploit)\b/i,            // Threats
      /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/,                         // IP address
      /https?:\/\/[^\s"'<>]+/g,                                            // URLs
    ];

    result.type = 'general';
    result.content = `URL: ${window.location.href}\n\nPAGE CONTENT:\n${bodyText.substring(0, 5000)}`;
    return result;
  }

  function updateResults(data, type) {
    const s = Math.round(data.risk_score ?? data.score ?? 0);
    const c = Math.round(data.confidence ?? 95);

    riskScore.textContent = s;
    confText.textContent = c + '%';
    setTimeout(() => { confBar.style.width = c + '%'; }, 50);

    // Mode tag
    if (modeTag) {
      modeTag.textContent =
        type === 'email' ? '✉️ Email Analysis'
          : type === 'image' ? '🖼️ Deepfake Image'
            : '🔍 General Input';
      modeTag.className = 'mode-tag ' + type;
    }

    verdictBadge.className = 'badge';
    riskScore.className = 'score-val';

    if (s < 40) {
      verdictBadge.textContent = 'Safe';
      verdictBadge.classList.add('safe');
      riskScore.classList.add('safe');
      confBar.style.backgroundColor = 'var(--success)';
    } else if (s < 70) {
      verdictBadge.textContent = 'Suspicious';
      verdictBadge.classList.add('suspicious');
      riskScore.classList.add('suspicious');
      confBar.style.backgroundColor = 'var(--warning)';
    } else {
      verdictBadge.textContent = 'Malicious';
      verdictBadge.classList.add('malicious');
      riskScore.classList.add('malicious');
      confBar.style.backgroundColor = 'var(--danger)';
    }

    explanationText.textContent = data.explanation || data.summary || 'No explanation provided by AI.';
    resultCard.classList.remove('hidden');
  }

  // Run detection immediately when popup opens
  runDetection();
});
