import { ShieldAlert, ShieldCheck, ShieldQuestion, Info, ArrowRight } from 'lucide-react';
import { useSimpleMode } from '../../hooks/useSimpleMode';

function getRiskColor(score) {
  if (score >= 70) return { bg: 'bg-danger-light', text: 'text-danger', border: 'border-danger/20', ring: 'ring-danger/10' };
  if (score >= 40) return { bg: 'bg-warning-light', text: 'text-warning', border: 'border-warning/20', ring: 'ring-warning/10' };
  return { bg: 'bg-success-light', text: 'text-success', border: 'border-success/20', ring: 'ring-success/10' };
}

function getRiskLabel(score) {
  if (score >= 70) return 'High Risk';
  if (score >= 40) return 'Medium Risk';
  return 'Low Risk';
}

function getRiskIcon(score) {
  if (score >= 70) return ShieldAlert;
  if (score >= 40) return ShieldQuestion;
  return ShieldCheck;
}

function RiskCard({ score, confidence, topReason, onViewEvidence, onTakeAction }) {
  const { isSimple } = useSimpleMode();
  const colors = getRiskColor(score);
  const label = getRiskLabel(score);
  const Icon = getRiskIcon(score);
  const isHigh = score >= 70;

  return (
    <div
      className={`bg-bg rounded-xl border ${colors.border} p-5 ${isHigh ? 'animate-pulse-risk' : ''}`}
      role="region"
      aria-label={`Risk assessment: ${label}, score ${score}`}
    >
      <div className="flex items-start gap-4">
        {/* Score badge */}
        <div className={`w-16 h-16 rounded-2xl ${colors.bg} flex flex-col items-center justify-center shrink-0 ring-4 ${colors.ring}`}>
          <span className={`text-2xl font-bold ${colors.text} leading-none`}>{score}</span>
          <span className={`text-[10px] font-medium ${colors.text} mt-0.5`}>/ 100</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${colors.text}`} />
            <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
            {!isSimple && (
              <span className="text-xs text-muted ml-auto">
                Confidence: {confidence}%
              </span>
            )}
          </div>
          <p className="text-sm text-text leading-relaxed">{topReason}</p>

          {/* Tooltip */}
          <div className="flex items-start gap-1.5 mt-2 p-2 bg-panel rounded-lg">
            <Info className="w-3.5 h-3.5 text-muted shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              {isSimple
                ? 'This score shows how suspicious this content looks. Higher means more dangerous.'
                : 'Risk score is computed from weighted feature analysis. View evidence for per-feature breakdown.'}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
        {isSimple ? (
          <>
            <button
              onClick={onViewEvidence}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              Tell me why
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            {isHigh && (
              <button
                onClick={onTakeAction}
                className="flex-1 py-2 bg-danger text-white text-sm font-medium rounded-lg hover:bg-danger/90 transition-colors"
              >
                Block
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={onViewEvidence}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 transition-colors"
            >
              View Evidence
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onTakeAction}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-border text-sm font-medium rounded-lg hover:bg-panel text-text transition-colors"
            >
              Take Action
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default RiskCard;
