import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Swords, ChevronRight, ExternalLink,
  CheckCircle2, AlertCircle, Clock, Database,
} from 'lucide-react';
import './MitrePanel.css';

/* ─────────────────────────────────────────────────────────
   Kill-chain stage names (official MITRE ATT&CK order).
   Stage numbers 1-14 come from the backend — we only use
   these labels as human-readable display names.
───────────────────────────────────────────────────────── */
const STAGE_NAMES = [
  'Reconnaissance',
  'Resource Dev.',
  'Initial Access',
  'Execution',
  'Persistence',
  'Priv. Escalation',
  'Defense Evasion',
  'Credential Access',
  'Discovery',
  'Lateral Movement',
  'Collection',
  'C2',
  'Exfiltration',
  'Impact',
];

/* ── Reliability badge ── */
function ReliabilityBadge({ reliability }) {
  return (
    <span className={`mitre-badge mitre-badge--${reliability}`}>
      {reliability === 'HIGH' && <CheckCircle2 size={9} />}
      {reliability === 'MEDIUM' && <AlertCircle size={9} />}
      {reliability === 'LOW' && <Clock size={9} />}
      {reliability}
    </span>
  );
}

/* ── Kill chain row ── */
function KillChain({ currentStage, predictedStages = [], totalStages = 14 }) {
  return (
    <div className="mitre-chain-scroll">
      {Array.from({ length: totalStages }).map((_, idx) => {
        const stageNum = idx + 1;
        const isDone = stageNum < currentStage;
        const isActive = stageNum === currentStage;
        const isPredicted = predictedStages.includes(stageNum);
        const dotClass = isActive
          ? 'mitre-step-dot--active'
          : isDone
          ? 'mitre-step-dot--done'
          : isPredicted
          ? 'mitre-step-dot--predicted'
          : 'mitre-step-dot--future';

        const connClass =
          isDone
            ? 'mitre-step-connector--done'
            : isPredicted
            ? 'mitre-step-connector--predicted'
            : '';

        return (
          <div key={stageNum} style={{ display: 'flex', alignItems: 'flex-start' }}>
            <div className="mitre-step">
              <div className={`mitre-step-dot ${dotClass}`}>{stageNum}</div>
              <span className="mitre-step-label">{STAGE_NAMES[idx]}</span>
            </div>
            {stageNum < totalStages && (
              <div className={`mitre-step-connector ${connClass}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Single prediction card ── */
function PredictionCard({ pred, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const evidence = pred.real_world_evidence;
  const aptGroups = evidence?.apt_groups ?? [];
  const shown = aptGroups.slice(0, 4);
  const extra = (evidence?.additional_actors ?? 0) + Math.max(0, aptGroups.length - 4);

  return (
    <motion.div
      className="mitre-prediction-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Top row: tactic name + probability (Clickable to expand) */}
      <button 
        className="w-full text-left"
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        style={{ display: 'block', background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}
      >
        <div className="mitre-pred-top" style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <motion.div
              animate={{ rotate: isExpanded ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: '#6b7280', pointerEvents: 'none' }}
            >
              <ChevronRight size={14} />
            </motion.div>
            <span className="mitre-pred-tactic">{pred.next_tactic}</span>
          </div>
          <span className="mitre-pred-prob">{pred.probability}%</span>
        </div>

        {/* Probability bar */}
        <div className="mitre-prob-bar-bg" style={{ marginBottom: '12px', pointerEvents: 'none' }}>
          <div
            className="mitre-prob-bar-fill"
            style={{ width: `${Math.min(100, pred.probability)}%` }}
          />
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {/* CI + reliability */}
            <div className="mitre-pred-meta">
              {pred.confidence_interval && (
                <span className="mitre-ci-text">
                  95% CI: {pred.confidence_interval.lower}% – {pred.confidence_interval.upper}%
                </span>
              )}
              <ReliabilityBadge reliability={pred.reliability} />
            </div>

            {/* Real-world evidence */}
            {evidence && (
              <div className="mitre-evidence-box">
                {evidence.statement && (
                  <p className="mitre-evidence-statement">{evidence.statement}</p>
                )}
                {aptGroups.length > 0 && (
                  <div className="mitre-apt-chips">
                    {shown.map((g) => (
                      <span key={g} className="mitre-apt-chip">{g}</span>
                    ))}
                    {extra > 0 && (
                      <span className="mitre-apt-more">+{extra} more</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════
   Main MitrePanel component
═════════════════════════════════════════════════ */
export default function MitrePanel({ result, isOpen, onClose }) {
  // Null-guard: don't render if no MITRE data
  const hasData =
    result &&
    result.mitreTactic != null;

  const showPanel = hasData && isOpen;

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <AnimatePresence>
      {showPanel && (
        <>
          {/* Backdrop */}
          <motion.div
            className="mitre-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={onClose}
          />

          {/* Sliding panel */}
          <motion.div
            className="mitre-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          >
            {/* ── Header ── */}
            <div className="mitre-header">
              <div className="mitre-header-icon">
                <Swords size={18} />
              </div>
              <div>
                <p className="mitre-header-title">MITRE ATT&amp;CK® Analysis</p>
                <p className="mitre-header-sub">
                  Attack kill chain · Stage {result.mitreStage} of {result.mitreTotalStages}
                </p>
              </div>
              <button 
                type="button" 
                className="mitre-close-btn" 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} 
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="mitre-body">

              {/* § 1 — Kill chain position */}
              <div style={{ marginBottom: 22 }}>
                <p className="mitre-section-label">
                  <ChevronRight size={13} style={{ marginRight: 4 }} /> Kill Chain Position
                </p>
                <KillChain
                  currentStage={result.mitreStage}
                  totalStages={result.mitreTotalStages}
                  predictedStages={
                    /* Next predicted stages based on sequence */
                    (result.mitrePredictions || [])
                      .map((_, i) => result.mitreStage + i + 1)
                      .filter((s) => s <= result.mitreTotalStages)
                  }
                />
                <div>
                  <div className="mitre-tactic-badge">
                    <span className="mitre-tactic-badge-dot" />
                    <span className="mitre-tactic-badge-text">
                      Current: {result.mitreTactic.replace('-', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* § 2 — Predicted next moves */}
              <div>
                <p className="mitre-section-label">
                  <ChevronRight size={13} style={{ marginRight: 4 }} /> Predicted Next Moves
                </p>
                {(result.mitrePredictions || []).map((pred, i) => (
                  <PredictionCard key={`${pred.next_tactic}-${i}`} pred={pred} defaultExpanded={i === 0} />
                ))}
              </div>
            </div>

            {/* ── Attribution footer ── */}
            {result.mitreSource && (
              <div className="mitre-attribution">
                <p className="mitre-attribution-title">
                  <Database size={10} style={{ display: 'inline', marginRight: 5 }} />
                  Source Attribution
                </p>
                <div className="mitre-attribution-grid">
                  <div className="mitre-attribution-item">
                    <strong>Method: </strong>{result.mitreSource.method}
                  </div>
                  <div className="mitre-attribution-item">
                    <strong>Campaigns: </strong>{result.mitreSource.campaigns_analysed ?? '—'}
                  </div>
                  <div className="mitre-attribution-item">
                    <strong>Dataset: </strong>{result.mitreSource.data_source}
                  </div>
                  <div className="mitre-attribution-item">
                    <strong>Validation: </strong>{result.mitreSource.validation}
                  </div>
                </div>
                {result.mitreSource.methodology_citation && (
                  <p className="mitre-attribution-item" style={{ marginBottom: 8 }}>
                    <strong>Citation: </strong>{result.mitreSource.methodology_citation}
                  </p>
                )}
                <div className="mitre-attribution-links">
                  {result.mitreSource.framework_url && (
                    <a
                      href={result.mitreSource.framework_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mitre-attribution-link"
                    >
                      <ExternalLink size={10} /> attack.mitre.org
                    </a>
                  )}
                  {result.mitreSource.data_url && (
                    <a
                      href={result.mitreSource.data_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mitre-attribution-link"
                    >
                      <ExternalLink size={10} /> github.com/mitre/cti
                    </a>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
