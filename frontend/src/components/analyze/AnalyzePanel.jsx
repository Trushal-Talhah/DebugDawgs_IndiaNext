import { useState } from 'react';
import { Mail, Link, MessageSquare, ChevronDown, Sparkles } from 'lucide-react';
import { SAMPLE_INPUTS } from '../../data/sampleData';

const TYPE_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'prompt', label: 'Prompt', icon: MessageSquare },
];

function AnalyzePanel({ onAnalyze, isLoading = false }) {
  const [type, setType] = useState('email');
  const [input, setInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentType = TYPE_OPTIONS.find((t) => t.value === type);
  const CurrentIcon = currentType.icon;

  function handleLoadSample() {
    const sample = SAMPLE_INPUTS[type];
    if (sample) {
      setInput(sample.content);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim()) return;
    onAnalyze({ type, input: input.trim() });
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text">Analyze Input</h2>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-light text-accent text-xs font-medium rounded-full">
          <Sparkles className="w-3 h-3" />
          Demo Mode
        </span>
      </div>

      {/* Type selector */}
      <div className="relative mb-3">
        <label className="block text-xs font-medium text-muted mb-1.5" id="type-label">
          Analysis Type
        </label>
        <button
          type="button"
          onClick={() => setDropdownOpen((o) => !o)}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-panel border border-border rounded-lg hover:border-accent/40 transition-colors text-left"
          aria-labelledby="type-label"
          aria-expanded={dropdownOpen}
          aria-haspopup="listbox"
        >
          <CurrentIcon className="w-4 h-4 text-muted" />
          <span className="flex-1">{currentType.label}</span>
          <ChevronDown className={`w-4 h-4 text-muted transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>
        {dropdownOpen && (
          <div className="absolute z-10 top-full mt-1 w-full bg-bg border border-border rounded-lg shadow-lg py-1 animate-fade-in" role="listbox">
            {TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="option"
                aria-selected={type === value}
                onClick={() => { setType(value); setDropdownOpen(false); }}
                className={`flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-panel transition-colors ${
                  type === value ? 'text-accent font-medium' : 'text-text'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Input textarea */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <label htmlFor="analyze-input" className="text-xs font-medium text-muted">
            Input Content
          </label>
          <button
            type="button"
            onClick={handleLoadSample}
            className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
          >
            Load sample
          </button>
        </div>
        <textarea
          id="analyze-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Paste ${currentType.label.toLowerCase()} content here...`}
          rows={type === 'email' ? 8 : 3}
          className="w-full px-3 py-2.5 text-sm bg-panel border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono leading-relaxed"
          aria-label={`${currentType.label} input for analysis`}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!input.trim() || isLoading}
        className="w-full py-2.5 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Analyzing...
          </>
        ) : (
          'Analyze'
        )}
      </button>

      {/* How-to hint */}
      <p className="text-xs text-muted mt-3 text-center">
        Paste content or click &quot;Load sample&quot; for a pre-filled demo
      </p>
    </form>
  );
}

export default AnalyzePanel;
