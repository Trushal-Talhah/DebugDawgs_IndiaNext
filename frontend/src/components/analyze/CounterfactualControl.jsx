import { useState } from 'react';
import { ToggleLeft, ToggleRight, FlaskConical } from 'lucide-react';

function CounterfactualControl({ counterfactuals, originalScore }) {
  const [activeToggles, setActiveToggles] = useState({});

  function handleToggle(id) {
    setActiveToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Get the lowest newScore among all active toggles, or original
  const activeItems = counterfactuals.filter((c) => activeToggles[c.id]);
  const projectedScore =
    activeItems.length > 0
      ? Math.min(...activeItems.map((c) => c.newScore))
      : originalScore;

  const scoreDelta = originalScore - projectedScore;

  return (
    <div className="bg-bg rounded-xl border border-border p-5" role="region" aria-label="Counterfactual analysis">
      <div className="flex items-center gap-2 mb-4">
        <FlaskConical className="w-4 h-4 text-accent" />
        <h3 className="text-base font-semibold text-text">Try &quot;What if&quot;</h3>
      </div>

      <p className="text-xs text-muted mb-3">
        Toggle changes to see how the risk score would be affected.
      </p>

      <div className="space-y-2 mb-4">
        {counterfactuals.map((item) => {
          const active = !!activeToggles[item.id];
          return (
            <button
              key={item.id}
              onClick={() => handleToggle(item.id)}
              className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg border text-left transition-colors ${
                active
                  ? 'border-accent/30 bg-accent-light/50'
                  : 'border-border hover:bg-panel'
              }`}
              aria-pressed={active}
            >
              {active ? (
                <ToggleRight className="w-5 h-5 text-accent shrink-0" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-muted shrink-0" />
              )}
              <span className="text-sm text-text flex-1">{item.label}</span>
              <span className={`text-xs font-mono font-medium ${
                active ? 'text-success' : 'text-muted'
              }`}>
                → {item.newScore}
              </span>
            </button>
          );
        })}
      </div>

      {/* Projected score */}
      {activeItems.length > 0 && (
        <div className="flex items-center justify-between p-3 bg-success-light/50 rounded-lg border border-success/20 animate-fade-in">
          <span className="text-sm text-text font-medium">Projected Risk</span>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-success">{projectedScore}</span>
            <span className="text-xs text-success font-medium">↓ {scoreDelta} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CounterfactualControl;
