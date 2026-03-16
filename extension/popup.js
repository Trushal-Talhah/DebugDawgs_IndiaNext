document.addEventListener('DOMContentLoaded', () => {
  const scanBtn = document.getElementById('scanBtn');
  const loader = document.getElementById('loader');
  const resultCard = document.getElementById('resultCard');
  const errorMsg = document.getElementById('errorMsg');

  // UI Elements inside result card
  const verdictBadge = document.getElementById('verdictBadge');
  const riskScore = document.getElementById('riskScore');
  const explanationText = document.getElementById('explanationText');
  const confText = document.getElementById('confText');
  const confBar = document.getElementById('confBar');

  // API endpoint running locally
  const API_URL = 'http://localhost:8000/api/scan';

  scanBtn.addEventListener('click', async () => {
    // 1. Reset UI
    scanBtn.disabled = true;
    loader.classList.remove('hidden');
    resultCard.classList.add('hidden');
    errorMsg.classList.add('hidden');

    try {
      // 2. Query active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) throw new Error("Could not access active tab");

      // 3. Inject script to extract DOM text
      const injectionResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPageText
      });

      const pageText = injectionResults[0].result;

      if (!pageText || pageText.trim() === '') {
        throw new Error("Could not find any readable text on this page.");
      }

      // 4. Send to SentinelAI API
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input_type: 'url', // We use url/page type in context
          content: `URL: ${tab.url}\n\nPAGE CONTENT EXTRACT:\n${pageText}`
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      // 5. Update UI with results
      updateResults(data);

    } catch (err) {
      console.error(err);
      errorMsg.textContent = "Error: " + err.message + ". Make sure the SentinelAI backend is running on localhost:8000.";
      errorMsg.classList.remove('hidden');
    } finally {
      loader.classList.add('hidden');
      scanBtn.disabled = false;
    }
  });

  // Extract function injected into the target page
  function extractPageText() {
    // Basic extraction: get all text, slice to avoid massive payloads
    return document.body.innerText.substring(0, 5000); 
  }

  function updateResults(data) {
    const s = Math.round(data.risk_score);
    const c = Math.round(data.confidence);

    riskScore.textContent = s;
    confText.textContent = c + '%';
    
    // Animate conf bar
    setTimeout(() => { confBar.style.width = c + '%'; }, 50);

    // Apply colors based on verdict
    verdictBadge.className = 'badge';
    riskScore.className = 'score-val';
    confBar.style.backgroundColor = 'var(--accent)';

    if (data.verdict === 'SAFE' || s < 40) {
      verdictBadge.textContent = 'Safe';
      verdictBadge.classList.add('safe');
      riskScore.classList.add('safe');
      confBar.style.backgroundColor = 'var(--success)';
    } else if (data.verdict === 'SUSPICIOUS' || s < 70) {
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

    explanationText.textContent = data.explanation || "No explanation provided by AI.";
    
    resultCard.classList.remove('hidden');
  }
});
