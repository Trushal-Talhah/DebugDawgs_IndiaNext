import { useState } from 'react';
import { FlaskConical, Play, ChevronDown, Sparkles } from 'lucide-react';
import { SANDBOX_EXAMPLES, SAMPLE_ANALYSIS_RESULT } from '../../data/sampleData';
import RiskCard from '../analyze/RiskCard';

function SandboxPanel() {
  const [input, setInput] = useState('');
  const [selectedExample, setSelectedExample] = useState(null);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  function handleSelectExample(example) {
    setSelectedExample(example);
    setInput(example.content);
    setDropdownOpen(false);
    setResult(null);
  }

  function handleRun() {
    if (!input.trim()) return;
    setIsLoading(true);
    // Simulate analysis delay
    setTimeout(() => {
      setResult({
        score: Math.floor(Math.random() * 40) + 60,
        confidence: Math.floor(Math.random() * 20) + 75,
        topReason: selectedExample
          ? `Detected: ${selectedExample.description}`
          : 'Adversarial pattern detected in input',
      });
      setIsLoading(false);
    }, 1200);
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-4.5 h-4.5 text-accent" />
          <h2 className="text-base font-semibold text-text">Adversarial Sandbox</h2>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-xs font-medium rounded-full ml-auto">
            <Sparkles className="w-3 h-3" />
            Interactive
          </span>
        </div>

        <p className="text-sm text-muted mb-4">
          Test adversarial inputs against the detection model. Pick a preset or paste your own.
        </p>

        {/* Example presets */}
        <div className="relative mb-3">
          <label className="block text-xs font-medium text-muted mb-1.5">Preset Examples</label>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-panel border border-border rounded-lg hover:border-accent/40 transition-colors text-left"
            aria-expanded={dropdownOpen}
            aria-haspopup="listbox"
          >
            <span className="flex-1 text-text">
              {selectedExample ? selectedExample.label : 'Select an example...'}
            </span>
            <ChevronDown className={`w-4 h-4 text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute z-10 top-full mt-1 w-full bg-bg border border-border rounded-lg shadow-lg py-1 animate-fade-in" role="listbox">
              {SANDBOX_EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  role="option"
                  aria-selected={selectedExample?.id === ex.id}
                  onClick={() => handleSelectExample(ex)}
                  className="flex flex-col w-full px-3 py-2 text-left hover:bg-panel transition-colors"
                >
                  <span className="text-sm font-medium text-text">{ex.label}</span>
                  <span className="text-xs text-muted">{ex.description}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="mb-3">
          <label htmlFor="sandbox-input" className="block text-xs font-medium text-muted mb-1.5">
            Adversarial Input
          </label>
          <textarea
            id="sandbox-input"
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(null); }}
            placeholder="Paste adversarial input here..."
            rows={4}
            className="w-full px-3 py-2.5 text-sm bg-panel border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono leading-relaxed"
          />
        </div>

        <button
          onClick={handleRun}
          disabled={!input.trim() || isLoading}
          className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="animate-fade-in">
          <RiskCard
            score={result.score}
            confidence={result.confidence}
            topReason={result.topReason}
            onViewEvidence={() => {}}
            onTakeAction={() => {}}
          />
        </div>
      )}
    </div>
  );
}

export default SandboxPanel;
