import { useSimpleMode } from '../hooks/useSimpleMode';
import { ToggleLeft, ToggleRight, Eye, EyeOff, Shield, Info } from 'lucide-react';

function SettingsPage() {
  const { isSimple, toggle } = useSimpleMode();

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Configure your analysis experience</p>
      </div>

      <div className="max-w-lg space-y-4">
        {/* Simple Mode Toggle */}
        <div className="bg-bg rounded-xl border border-border p-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center shrink-0">
              {isSimple ? (
                <Eye className="w-4.5 h-4.5 text-accent" />
              ) : (
                <EyeOff className="w-4.5 h-4.5 text-accent" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Simple Mode</h3>
                <button
                  onClick={toggle}
                  className="text-accent hover:text-accent/80 transition-colors"
                  role="switch"
                  aria-checked={isSimple}
                  aria-label={`Simple mode is ${isSimple ? 'on' : 'off'}`}
                >
                  {isSimple ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted" />
                  )}
                </button>
              </div>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {isSimple
                  ? 'Currently showing simplified results — risk score, top reason, and basic actions only.'
                  : 'Advanced mode active — full evidence timeline, feature importance, counterfactual analysis, and raw artifacts visible.'}
              </p>
            </div>
          </div>
        </div>

        {/* What each mode shows */}
        <div className="bg-bg rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-muted" />
            Mode Comparison
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-accent mb-2">Simple Mode</p>
              <ul className="space-y-1.5">
                {['Risk score & label', 'Top reason (1 line)', 'Block & Tell me why buttons', 'Playbook (3 steps)'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-text">
                    <span className="w-1 h-1 rounded-full bg-accent shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-text mb-2">Advanced Mode</p>
              <ul className="space-y-1.5">
                {[
                  'Everything in Simple',
                  'Evidence timeline + raw data',
                  'Feature importance bars',
                  'Counterfactual "What if"',
                  'Confidence percentage',
                  'Full response actions',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-text">
                    <span className="w-1 h-1 rounded-full bg-text shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-bg rounded-xl border border-border p-5">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-text">About SentinelAI</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                AI-powered threat analysis platform for detecting phishing emails, suspicious URLs,
                and adversarial prompt injections. Built with explainable AI to help security teams
                make informed decisions.
              </p>
              <p className="text-xs text-muted mt-2 font-mono">v1.0.0 — DebugDawgs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
