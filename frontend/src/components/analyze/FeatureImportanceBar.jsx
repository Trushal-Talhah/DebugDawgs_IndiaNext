import { BarChart3 } from 'lucide-react';

const COLOR_MAP = {
  danger: { bar: 'bg-danger', text: 'text-danger' },
  warning: { bar: 'bg-warning', text: 'text-warning' },
  muted: { bar: 'bg-muted/40', text: 'text-muted' },
  accent: { bar: 'bg-accent', text: 'text-accent' },
  success: { bar: 'bg-success', text: 'text-success' },
};

function FeatureImportanceBar({ features }) {
  const maxValue = Math.max(...features.map((f) => f.value));

  return (
    <div className="bg-bg rounded-xl border border-border p-5" role="region" aria-label="Feature importance">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-accent" />
        <h3 className="text-base font-semibold text-text">Feature Importance</h3>
      </div>

      <div className="space-y-3">
        {features.map((feature) => {
          const colors = COLOR_MAP[feature.color] || COLOR_MAP.muted;
          const widthPercent = maxValue > 0 ? (feature.value / maxValue) * 100 : 0;

          return (
            <div key={feature.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text">{feature.label}</span>
                <span className={`text-xs font-mono font-medium ${colors.text}`}>
                  {feature.value}%
                </span>
              </div>
              <div className="w-full h-2 bg-panel rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${colors.bar} transition-all duration-500 ease-out`}
                  style={{ width: `${widthPercent}%` }}
                  role="meter"
                  aria-valuenow={feature.value}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${feature.label}: ${feature.value}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FeatureImportanceBar;
