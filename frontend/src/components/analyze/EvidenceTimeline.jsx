import { useState } from 'react';
import { ChevronDown, AlertTriangle, AlertCircle, Info } from 'lucide-react';

const SEVERITY_CONFIG = {
  high: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-light', dot: 'bg-danger' },
  medium: { icon: AlertCircle, color: 'text-warning', bg: 'bg-warning-light', dot: 'bg-warning' },
  low: { icon: Info, color: 'text-accent', bg: 'bg-accent-light', dot: 'bg-accent' },
};

function EvidenceTimeline({ steps }) {
  const [expandedId, setExpandedId] = useState(null);

  function toggleStep(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="bg-bg rounded-xl border border-border p-5" role="region" aria-label="Evidence timeline">
      <h3 className="text-base font-semibold text-text mb-4">Evidence Timeline</h3>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />

        <div className="space-y-1">
          {steps.map((step, index) => {
            const sev = SEVERITY_CONFIG[step.severity] || SEVERITY_CONFIG.low;
            const isExpanded = expandedId === step.id;
            const SevIcon = sev.icon;

            return (
              <div key={step.id} className="relative">
                <button
                  onClick={() => toggleStep(step.id)}
                  className="flex items-start gap-3 w-full text-left pl-0 pr-2 py-2.5 rounded-lg hover:bg-panel transition-colors group"
                  aria-expanded={isExpanded}
                  aria-controls={`evidence-${step.id}`}
                >
                  {/* Dot */}
                  <div className={`relative z-10 w-[22px] h-[22px] rounded-full ${sev.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <div className={`w-2 h-2 rounded-full ${sev.dot}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted">Step {index + 1}</span>
                      <SevIcon className={`w-3.5 h-3.5 ${sev.color}`} />
                    </div>
                    <p className="text-sm font-medium text-text mt-0.5">{step.title}</p>
                    <p className="text-sm text-muted mt-0.5 leading-relaxed">{step.summary}</p>
                  </div>

                  {/* Expand icon */}
                  <ChevronDown
                    className={`w-4 h-4 text-muted shrink-0 mt-1 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Expanded raw artifact */}
                {isExpanded && (
                  <div
                    id={`evidence-${step.id}`}
                    className="ml-[34px] mb-2 animate-fade-in"
                  >
                    <div className="bg-panel border border-border rounded-lg p-3 overflow-x-auto">
                      <pre className="text-xs font-mono text-text leading-relaxed whitespace-pre-wrap break-words">
                        {step.raw}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default EvidenceTimeline;
