/**
 * API service layer for CyberSentinel backend integration
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Auto-scan any text content for threats
 * POST /api/scan
 * Backend now auto-classifies input type.
 */
export async function scanThreatAuto(content) {
  return apiFetch('/scan', {
    method: 'POST',
    body: JSON.stringify({
      input: content,
    }),
  });
}

/**
 * Typed scan with explicit input type
 * POST /api/scan/typed
 */
export async function scanThreatTyped(inputType, content) {
  return apiFetch('/scan/typed', {
    method: 'POST',
    body: JSON.stringify({
      input_type: inputType,
      content,
    }),
  });
}

/**
 * Unified scan helper
 * mode=auto -> /scan
 * mode=typed -> /scan/typed
 */
export async function scanThreat({ mode = 'auto', inputType = 'email', content }) {
  if (mode === 'typed') {
    return scanThreatTyped(inputType, content);
  }
  return scanThreatAuto(content);
}

/**
 * Scan image for deepfake detection
 * POST /api/scan/image
 */
export async function scanImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE_URL}/scan/image`;
  
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Image scan failed' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Get all incidents
 * GET /api/incidents
 */
export async function getIncidents(limit = 50) {
  return apiFetch(`/incidents?limit=${limit}`);
}

/**
 * Get incident by ID
 * GET /api/incidents/{scan_id}
 */
export async function getIncidentById(scanId) {
  return apiFetch(`/incidents/${scanId}`);
}

/**
 * Health check
 * GET /api/health
 */
export async function healthCheck() {
  return apiFetch('/health');
}

/**
 * Transform backend ScanResponse to frontend format
 * Maps backend field names to what the UI components expect
 */
export function transformScanResponse(backendResponse) {
  const signals = backendResponse.signals || [];
  const featureWeights = backendResponse.feature_weights || [];
  const highlightedSegments = backendResponse.highlighted_segments || [];
  const recommendations = backendResponse.recommendations || [];
  const riskScore = Number(backendResponse.risk_score || 0);
  const confidence = Number(backendResponse.confidence || 0);

  return {
    scanId: backendResponse.scan_id,
    inputType: backendResponse.input_type,
    threatType: backendResponse.threat_type,
    verdict: backendResponse.verdict,
    score: Math.round(riskScore),
    confidence: Math.round(confidence),
    label: getVerdictLabel(backendResponse.verdict, riskScore),
    topReason: backendResponse.explanation,
    
    // Map signals to evidence steps
    evidenceSteps: signals.map((signal, index) => ({
      id: index + 1,
      title: `Signal ${index + 1}`,
      summary: signal,
      raw: signal,
      severity: getSeverityFromScore(riskScore),
    })),
    
    // Map feature_weights to features format
    features: featureWeights.map((fw) => ({
      label: fw.feature,
      value: Math.round(fw.weight * 100),
      color: getColorFromWeight(fw.weight),
    })),
    
    // Counterfactuals (generated from highlighted_segments)
    counterfactuals: highlightedSegments.map((segment, index) => ({
      id: `cf-${index}`,
      label: `Remove: "${segment.substring(0, 30)}${segment.length > 30 ? '...' : ''}"`,
      newScore: Math.max(0, Math.round(riskScore * 0.7)),
    })),
    
    // Recommendations as playbook
    playbook: recommendations,

    rawResponse: backendResponse,
    timestamp: backendResponse.timestamp,
  };
}

/**
 * Transform backend incident to frontend format
 */
export function transformIncident(backendIncident) {
  return {
    id: backendIncident.scan_id,
    type: backendIncident.input_type,
    source: backendIncident.content_preview || 'N/A',
    risk: Math.round(backendIncident.risk_score),
    status: getStatusFromVerdict(backendIncident.verdict),
    timestamp: formatTimestamp(backendIncident.timestamp),
    threatType: backendIncident.threat_type,
    verdict: backendIncident.verdict,
  };
}

/**
 * Helper: Get verdict label from verdict and score
 */
function getVerdictLabel(verdict, score) {
  if (verdict === 'SAFE' || score < 40) return 'Low Risk';
  if (verdict === 'SUSPICIOUS' || score < 70) return 'Medium Risk';
  return 'High Risk';
}

/**
 * Helper: Get severity based on risk score
 */
function getSeverityFromScore(score) {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Helper: Get color from weight (0-1 scale)
 */
function getColorFromWeight(weight) {
  if (weight >= 0.5) return 'danger';
  if (weight >= 0.25) return 'warning';
  return 'muted';
}

/**
 * Helper: Map verdict to status
 */
function getStatusFromVerdict(verdict) {
  const statusMap = {
    'HIGH': 'quarantined',
    'MEDIUM': 'flagged',
    'LOW': 'cleared',
    'SAFE': 'cleared',
    'SUSPICIOUS': 'flagged',
    'MALICIOUS': 'blocked',
  };
  return statusMap[verdict] || 'flagged';
}

/**
 * Helper: Format ISO timestamp to display format
 */
function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(',', '');
  } catch {
    return isoString;
  }
}
