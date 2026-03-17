/**
 * API service layer for CyberSentinel backend integration
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

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
  return apiFetch(`/api/incidents?limit=${limit}`);
}

/**
 * Get incident by ID
 * GET /api/incidents/{scan_id}
 */
export async function getIncidentById(scanId) {
  return apiFetch(`/api/incidents/${scanId}`);
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
  const perModuleScores = backendResponse.per_module_scores || {};
  const threatsDetected = backendResponse.threats_detected || [];
  const riskScore = Number(backendResponse.risk_score || 0);
  const confidence = Number(backendResponse.confidence || 0);
  const moduleScores = Object.entries(perModuleScores)
    .map(([name, score]) => ({
      name,
      score: Math.round(Number(score || 0)),
    }))
    .sort((a, b) => b.score - a.score);

  const mappedFeatures = featureWeights.length
    ? featureWeights.map((fw) => ({
        label: fw.feature,
        value: Math.round(fw.weight * 100),
        color: getColorFromWeight(fw.weight),
      }))
    : moduleScores.map((module) => ({
        label: module.name,
        value: module.score,
        color: getColorFromScore(module.score),
      }));

  const playbook = recommendations.length
    ? recommendations
    : [
        'Avoid engaging with suspicious links or attachments.',
        'Verify the sender and context through a trusted channel.',
        'Report this message to your security team for triage.',
      ];

  return {
    scanId: backendResponse.scan_id,
    inputType: backendResponse.input_type,
    threatType: backendResponse.threat_type,
    verdict: backendResponse.verdict,
    score: Math.round(riskScore),
    confidence: Math.round(confidence),
    label: getVerdictLabel(backendResponse.verdict, riskScore),
    topReason: backendResponse.explanation || signals[0] || 'No explanation provided by backend.',
    explanation: backendResponse.explanation || '',
    signals,
    highlightedSegments,
    threatsDetected: threatsDetected.length
      ? threatsDetected
      : (backendResponse.threat_type ? [backendResponse.threat_type] : []),
    moduleScores,
    modulesTriggered: Number(backendResponse.modules_triggered || moduleScores.length || 0),
    isCompoundThreat: Boolean(backendResponse.is_compound_threat),
    compoundThreatLabel: backendResponse.compound_threat_label || '',
    
    // Map signals to evidence steps
    evidenceSteps: signals.map((signal, index) => ({
      id: index + 1,
      title: `Signal ${index + 1}`,
      summary: signal,
      raw: signal,
      severity: getSeverityFromScore(riskScore),
    })),
    
    // Map feature_weights to features format (fallback to module scores)
    features: mappedFeatures,
    
    // Counterfactuals (generated from highlighted_segments)
    counterfactuals: highlightedSegments.map((segment, index) => ({
      id: `cf-${index}`,
      label: `Remove: "${segment.substring(0, 30)}${segment.length > 30 ? '...' : ''}"`,
      newScore: Math.max(0, Math.round(riskScore * 0.7)),
    })),
    
    // Recommendations as playbook
    playbook,

    // MITRE ATT&CK — pass through as-is from backend (no frontend transforms)
    mitreTactic: backendResponse.mitre_tactic ?? null,
    mitreStage: backendResponse.mitre_stage ?? null,
    mitreTotalStages: backendResponse.mitre_total_stages ?? 14,
    mitrePredictions: backendResponse.mitre_predictions ?? null,
    mitreSource: backendResponse.mitre_source ?? null,

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

function getColorFromScore(score) {
  if (score >= 70) return 'danger';
  if (score >= 40) return 'warning';
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
