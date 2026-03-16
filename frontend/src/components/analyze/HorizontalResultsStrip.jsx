import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, ShieldCheck, ShieldQuestion,
  BarChart3, Brain, ListChecks, Radio, Crosshair,
  ChevronLeft, ChevronRight, ArrowRight, Network, Swords
} from 'lucide-react';
import { useSimpleMode } from '../../hooks/useSimpleMode';
import './HorizontalResultsStrip.css';

/* ── Arrow Connector SVG ── */
function ArrowConnector({ delay = 0 }) {
  return (
    <motion.div
      className="hrs-connector"
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: delay + 0.1, duration: 0.3 }}
    >
      <svg width="64" height="40" viewBox="0 0 64 40" fill="none">
        {/* Glow line behind */}
        <line x1="4" y1="20" x2="48" y2="20" className="hrs-arrow-glow" />
        {/* Animated dashed line */}
        <line x1="4" y1="20" x2="48" y2="20" className="hrs-arrow-line" />
        {/* Arrowhead */}
        <polygon points="46,14 58,20 46,26" className="hrs-arrow-head" />
      </svg>
      <div className="hrs-connector-dot" style={{ animationDelay: `${delay * 500}ms` }} />
    </motion.div>
  );
}

/* ── Score Ring ── */
function ScoreRing({ score, color }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="hrs-score-ring">
      <svg viewBox="0 0 80 80" style={{ color }}>
        <circle className="ring-bg" cx="40" cy="40" r="36" />
        <circle
          className="ring-fill"
          cx="40" cy="40" r="36"
          style={{
            strokeDashoffset: offset,
            transform: 'rotate(-90deg)',
            transformOrigin: '40px 40px',
          }}
        />
        <text x="40" y="36" textAnchor="middle" fill="currentColor" fontWeight="800" fontSize="20">{score}</text>
        <text x="40" y="50" textAnchor="middle" fill="#9ca3af" fontWeight="500" fontSize="9">/ 100</text>
      </svg>
    </div>
  );
}

/* ── Individual Card Wrapper ── */
function StripCard({ index, accent, title, icon: Icon, children }) {
  return (
    <motion.div
      className={`hrs-card hrs-card--${accent} hrs-card-animated`}
      style={{ animationDelay: `${index * 120}ms` }}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="hrs-card-title">
        {Icon && <Icon />}
        {title}
      </div>
      {children}
    </motion.div>
  );
}

/* ───────────────────────────────────────────────── */
/* ── Main Component ── */
/* ───────────────────────────────────────────────── */
export default function HorizontalResultsStrip({
  result,
  onViewEvidence,
  onTakeAction,
  showEvidence,
  onViewMitre,
}) {
  const { isSimple } = useSimpleMode();
  const trackRef = useRef(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  /* Determine which cards to show */
  const cards = [];

  // 1 — Risk Score
  cards.push('risk');

  // 2 — Quick Stats
  cards.push('stats');

  // 3 — MITRE ATT&CK
  if (result.mitreTactic) cards.push('mitre');

  // 4 — Key Signals (Moved before Recommended Actions)
  if (result.signals?.length) cards.push('signals');

  // 4 — Recommended Actions
  if (result.playbook?.length) cards.push('actions');

  useEffect(() => {
    setCardCount(cards.length);
  }, [cards.length]);

  /* Scroll state */
  const updateScrollState = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 20);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 20);

    // Detect active card
    const cardWidth = 340 + 64; // card + connector
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIdx(Math.min(idx, cardCount - 1));
  }, [cardCount]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState]);

  function scrollTo(direction) {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = 340 + 64;
    el.scrollBy({ left: direction === 'right' ? cardWidth : -cardWidth, behavior: 'smooth' });
  }

  function scrollToCard(idx) {
    const el = trackRef.current;
    if (!el) return;
    const cardWidth = 340 + 64;
    el.scrollTo({ left: idx * cardWidth, behavior: 'smooth' });
  }

  /* Risk color helper */
  function getRiskColor(score) {
    if (score >= 70) return '#dc2626';
    if (score >= 40) return '#f59e0b';
    return '#059669';
  }

  function getRiskLabel(score) {
    if (score >= 70) return 'High Risk';
    if (score >= 40) return 'Medium Risk';
    return 'Low Risk';
  }

  const riskColor = getRiskColor(result.score);

  return (
    <div className="hrs-container">
      {/* Navigation arrows */}
      {canScrollLeft && (
        <button className="hrs-nav-btn hrs-nav-left" onClick={() => scrollTo('left')} aria-label="Scroll left">
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button className="hrs-nav-btn hrs-nav-right" onClick={() => scrollTo('right')} aria-label="Scroll right">
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Horizontal scrolling track */}
      <div className="hrs-track" ref={trackRef}>
        {cards.map((type, i) => {
          const isLast = i === cards.length - 1;
          return (
            <div key={type} style={{ display: 'flex', alignItems: 'stretch' }}>
              {renderCard(type, i)}
              {!isLast && <ArrowConnector delay={i * 0.12} />}
            </div>
          );
        })}
      </div>

      {/* Scroll dots */}
      <div className="hrs-dots">
        {cards.map((_, i) => (
          <button
            key={i}
            className={`hrs-dot ${activeIdx === i ? 'hrs-dot--active' : ''}`}
            onClick={() => scrollToCard(i)}
            aria-label={`Go to card ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );

  /* ── Render a card by type ── */
  function renderCard(type, index) {
    switch (type) {

      /* ──── 1. Risk Score ──── */
      case 'risk':
        return (
          <StripCard index={index} accent="risk" title="Risk Assessment" icon={ShieldAlert}>
            <ScoreRing score={result.score} color={riskColor} />
            <p style={{ color: riskColor }} className="text-center text-sm font-bold mb-2">
              {getRiskLabel(result.score)}
            </p>
            <p className="text-xs text-muted text-center leading-relaxed">
              {result.topReason}
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={onViewEvidence}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors"
              >
                View Evidence 
                <motion.div
                  animate={{ rotate: showEvidence ? 90 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight className="w-4 h-4" />
                </motion.div>
              </button>
              {result.score >= 70 && (
                <button
                  onClick={onTakeAction}
                  className="flex-1 py-2 bg-danger text-white text-xs font-medium rounded-lg hover:bg-danger/90 transition-colors"
                >
                  Block
                </button>
              )}
            </div>
          </StripCard>
        );

      /* ──── 2. Quick Stats ──── */
      case 'stats':
        return (
          <StripCard index={index} accent="stats" title="Quick Stats" icon={BarChart3}>
            <div className="hrs-stat-grid">
              <div className="hrs-stat-item">
                <div className="hrs-stat-label">Verdict</div>
                <div className="hrs-stat-value text-sm">{result.label}</div>
              </div>
              <div className="hrs-stat-item">
                <div className="hrs-stat-label">Threat Type</div>
                <div className="hrs-stat-value text-sm" style={{ wordBreak: 'break-word' }}>
                  {result.threatType || 'N/A'}
                </div>
              </div>
              <div className="hrs-stat-item">
                <div className="hrs-stat-label">Confidence</div>
                <div className="hrs-stat-value">{result.confidence}%</div>
              </div>
              <div className="hrs-stat-item">
                <div className="hrs-stat-label">Modules</div>
                <div className="hrs-stat-value">{result.modulesTriggered || 0}</div>
              </div>
            </div>
            {!!result.threatsDetected?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.threatsDetected.map((t, j) => (
                  <span key={`${t}-${j}`} className="hrs-threat-tag">{t}</span>
                ))}
              </div>
            )}
          </StripCard>
        );

      /* ──── 3. Threat Intelligence ──── */
      case 'intel':
        return (
          <StripCard index={index} accent="intel" title="Threat Intelligence" icon={Brain}>
            {result.explanation && (
              <p className="text-xs text-text leading-relaxed mb-3 bg-panel border border-border rounded-lg p-2.5" style={{ wordBreak: 'break-word' }}>
                {result.explanation}
              </p>
            )}
            {!!result.moduleScores?.length && (
              <div className="space-y-2.5">
                {result.moduleScores.slice(0, 5).map((m) => (
                  <div key={m.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] text-text font-medium" style={{ wordBreak: 'break-word' }}>{m.name}</span>
                      <span className="text-[11px] font-bold text-muted">{m.score}%</span>
                    </div>
                    <div className="hrs-module-bar-bg">
                      <div className="hrs-module-bar-fill" style={{ width: `${Math.min(100, m.score)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </StripCard>
        );

      /* ──── 3.5. MITRE ATT&CK ──── */
      case 'mitre':
        return (
          <StripCard index={index} accent="mitre" title="MITRE ATT&CK® Prediction" icon={Network}>
            <div className="mb-3 border-b border-border pb-2">
              <span className="text-[10px] uppercase font-bold text-muted tracking-wider">Current Tactic</span>
              <p className="text-sm font-semibold text-text mt-0.5" style={{ wordBreak: 'break-word' }}>
                {result.mitreTactic} <span className="text-xs font-normal text-muted">(Stage {result.mitreStage}/14)</span>
              </p>
            </div>
            <p className="text-[10px] uppercase font-bold text-muted tracking-wider mb-2">Predicted Next Steps</p>
            <div className="space-y-2">
              {result.mitrePredictions.map((pred, pIdx) => (
                <div key={pIdx} className="bg-panel rounded p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-medium text-text">{pred.next_tactic}</span>
                    <span className="text-[11px] font-bold text-accent">{(pred.probability * 100).toFixed(0)}%</span>
                  </div>
                  <div className="hrs-module-bar-bg h-1.5">
                    <div className="hrs-module-bar-fill" style={{ width: `${pred.probability * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {result.mitreSource && (
              <p className="text-[9px] text-muted mt-3 text-center opacity-70">
                Data: {result.mitreSource.data_source}
              </p>
            )}
            <button
               onClick={onViewMitre}
               className="mt-3 w-full py-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 text-xs font-medium rounded-lg hover:bg-orange-500 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
               <Swords size={14} />
               Full MITRE Report
            </button>
          </StripCard>
        );

      /* ──── 4. Recommended Actions ──── */
      case 'actions':
        return (
          <StripCard index={index} accent="actions" title="Recommended Actions" icon={ListChecks}>
            <div className="space-y-2">
              {result.playbook.map((item, i) => (
                <div key={i} className="hrs-playbook-item">
                  <span className="hrs-playbook-num">{i + 1}</span>
                  <span style={{ wordBreak: 'break-word' }}>{item}</span>
                </div>
              ))}
            </div>
          </StripCard>
        );

      /* ──── 5. Key Signals ──── */
      case 'signals':
        return (
          <StripCard index={index} accent="signals" title="Key Signals" icon={Radio}>
            <div>
              {result.signals.slice(0, 6).map((signal, j) => (
                <div key={`${signal}-${j}`} className="hrs-signal-item">
                  <span className="hrs-signal-dot" />
                  <span style={{ wordBreak: 'break-word' }}>{signal}</span>
                </div>
              ))}
            </div>
          </StripCard>
        );

      /* ──── 6. Highlighted Segments ──── */
      case 'segments':
        return (
          <StripCard index={index} accent="segments" title="Highlighted Segments" icon={Crosshair}>
            <div className="flex flex-wrap gap-1.5">
              {result.highlightedSegments.map((seg, j) => (
                <span
                  key={`${seg}-${j}`}
                  className="px-2 py-1 rounded-lg text-[11px] bg-pink-50 text-pink-600 border border-pink-200 font-medium"
                  style={{ wordBreak: 'break-word' }}
                >
                  {seg}
                </span>
              ))}
            </div>
          </StripCard>
        );

      /* ──── 7. Evidence ──── */
      case 'evidence':
        return (
          <StripCard index={index} accent="evidence" title="Evidence Pipeline" icon={ShieldCheck}>
            {result.evidenceSteps?.length ? (
              <div className="space-y-2">
                {result.evidenceSteps.slice(0, 5).map((step) => (
                  <div key={step.id} className="text-xs bg-panel border border-border rounded-lg p-2.5">
                    <p className="font-semibold text-text mb-0.5">{step.title}</p>
                    <p className="text-muted leading-relaxed" style={{ wordBreak: 'break-word' }}>{step.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted text-center py-4">No evidence steps available.</p>
            )}
          </StripCard>
        );

      default:
        return null;
    }
  }
}
