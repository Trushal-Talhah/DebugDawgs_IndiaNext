import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, Link, MessageSquare, ChevronDown, FileText, Bot, Image } from 'lucide-react';
import { SAMPLE_INPUTS } from '../../data/sampleData';

const TYPE_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'url', label: 'URL', icon: Link },
  { value: 'prompt', label: 'Prompt', icon: MessageSquare },
  { value: 'login_log', label: 'Login Log', icon: FileText },
  { value: 'ai_text', label: 'AI Text', icon: Bot },
  { value: 'image', label: 'Image (Deepfake)', icon: Image },
];

const SCAN_MODE_OPTIONS = [
  { value: 'auto', label: 'Auto Scan (/scan)' },
  { value: 'typed', label: 'Typed Scan (/scan/typed)' },
];

function AnalyzePanel({ onAnalyze, onAnalyzeImage, isLoading = false, prefillValue = '' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlType = searchParams.get('type') || 'email';
  
  const [type, setType] = useState(urlType);
  const [mode, setMode] = useState('auto');
  const [input, setInput] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* ── sync type with URL whenever it changes ── */
  useEffect(() => {
    if (urlType !== type) {
      setType(urlType);
    }
  }, [urlType]);

  function handleTypeChange(newType) {
    setType(newType);
    setDropdownOpen(false);
    setSearchParams({ type: newType });
  }

  /* ── when an email is chosen from GmailInbox, auto-fill and auto-analyze ── */
  useEffect(() => {
    if (prefillValue) {
      setType('email');
      setSearchParams({ type: 'email' });
      setInput(prefillValue);
      setDropdownOpen(false);
      // Auto-submit
      onAnalyze({ mode: 'auto', type: 'email', input: prefillValue });
    }
  }, [prefillValue, onAnalyze, setSearchParams]);

  const currentType = TYPE_OPTIONS.find((t) => t.value === type);
  const CurrentIcon = currentType.icon;
  const isImageMode = type === 'image';

  function handleLoadSample() {
    const sample = SAMPLE_INPUTS[type];
    if (sample) {
      setInput(sample.content);
    }
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (isImageMode) {
      if (!imageFile) return;
      onAnalyzeImage?.(imageFile);
    } else {
      if (!input.trim()) return;
      onAnalyze({ mode, type, input: input.trim() });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bg rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text">Analyze Input</h2>
      </div>

      {/* Scan mode selector */}
      {!isImageMode && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-muted mb-1.5" id="scan-mode-label">
            Scan Mode
          </label>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-labelledby="scan-mode-label">
            {SCAN_MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={mode === option.value}
                onClick={() => setMode(option.value)}
                className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                  mode === option.value
                    ? 'border-accent text-accent bg-accent-light font-medium'
                    : 'border-border text-muted hover:border-accent/40'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
                onClick={() => handleTypeChange(value)}
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

      {/* Input area - Text or Image */}
      <div className="mb-3">
        {isImageMode ? (
          <>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Upload Image
            </label>
            {imagePreview ? (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-48 object-contain bg-panel border border-border rounded-lg"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-1.5 bg-bg/80 rounded-lg border border-border hover:bg-panel text-muted hover:text-text transition-colors"
                  aria-label="Remove image"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-48 bg-panel border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/40 transition-colors">
                <Image className="w-8 h-8 text-muted mb-2" />
                <span className="text-sm text-muted">Click to upload or drag and drop</span>
                <span className="text-xs text-muted mt-1">JPEG, PNG, WebP, GIF (max 5MB)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="analyze-input" className="text-xs font-medium text-muted">
                Input Content
              </label>
              {SAMPLE_INPUTS[type] && (
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="text-xs text-accent hover:text-accent/80 font-medium transition-colors"
                >
                  Load sample
                </button>
              )}
            </div>
            <textarea
              id="analyze-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Paste ${currentType.label.toLowerCase()} content here...`}
              rows={type === 'email' || type === 'login_log' ? 8 : 3}
              className="w-full px-3 py-2.5 text-sm bg-panel border border-border rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent font-mono leading-relaxed"
              aria-label={`${currentType.label} input for analysis`}
            />
          </>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={(isImageMode ? !imageFile : !input.trim()) || isLoading}
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
        {isImageMode
          ? 'Upload an image to check for deepfake or AI-generated content'
          : 'Paste content or click "Load sample" for a pre-filled demo'}
      </p>
    </form>
  );
}

export default AnalyzePanel;
