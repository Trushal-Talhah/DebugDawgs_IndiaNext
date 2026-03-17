import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Mail, ScanSearch, ChevronDown, Image, Film, Mic } from 'lucide-react';
import { SAMPLE_INPUTS } from '../../data/sampleData';

const TYPE_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'general', label: 'General Input', icon: ScanSearch },
  { value: 'image', label: 'Deepfake Image', icon: Image },
  { value: 'video', label: 'Deepfake Video', icon: Film },
  { value: 'audio', label: 'Voice Deepfake', icon: Mic },
];

function AnalyzePanel({ onAnalyze, onAnalyzeImage, onAnalyzeVideo, onAnalyzeAudio, isLoading = false, prefillValue = '' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlType = searchParams.get('type') || 'email';
  
  const [type, setType] = useState(urlType);
  const [mode, setMode] = useState('auto');
  const [input, setInput] = useState('');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  /* ── sync type with URL whenever it changes ── */
  useEffect(() => {
    if (urlType !== type) {
      setType(urlType);
      setMediaFile(null);
      setMediaPreview(null);
    }
  }, [urlType]);

  function handleTypeChange(newType) {
    setType(newType);
    setDropdownOpen(false);
    setMediaFile(null);
    setMediaPreview(null);
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
  const isMediaMode = ['image', 'video', 'audio'].includes(type);

  function handleLoadSample() {
    const sample = SAMPLE_INPUTS[type];
    if (sample) {
      setInput(sample.content);
    }
  }

  function handleMediaChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      if (type === 'image') {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        // For video and audio, show filename
        setMediaPreview(file.name);
      }
    }
  }

  function clearMedia() {
    setMediaFile(null);
    setMediaPreview(null);
  }

  /* ── handle pasting images from clipboard ── */
  useEffect(() => {
    function handleGlobalPaste(e) {
      if (type !== 'image') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            setMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
              setMediaPreview(reader.result);
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    }

    // Only attach global paste listener if in image mode
    if (type === 'image') {
      document.addEventListener('paste', handleGlobalPaste);
    }
    return () => {
      document.removeEventListener('paste', handleGlobalPaste);
    };
  }, [type]);

  function handleSubmit(e) {
    e.preventDefault();
    if (isMediaMode) {
      if (!mediaFile) return;
      if (type === 'image') {
        onAnalyzeImage?.(mediaFile);
      } else if (type === 'video') {
        onAnalyzeVideo?.(mediaFile);
      } else if (type === 'audio') {
        onAnalyzeAudio?.(mediaFile);
      }
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

      {/* Input area - Text or Media */}
      <div className="mb-3">
        {isMediaMode ? (
          <>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Upload {type === 'image' ? 'Image' : type === 'video' ? 'Video' : 'Audio'}
            </label>
            {mediaPreview ? (
              <div className="relative border-2 border-accent/20 rounded-lg p-1 bg-accent/5">
                {type === 'image' ? (
                  <>
                    <img
                      src={mediaPreview}
                      alt="Preview"
                      className="w-full h-48 object-contain bg-panel border border-border rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={clearMedia}
                      className="absolute top-3 right-3 p-1.5 bg-bg/80 rounded-lg border border-border hover:bg-panel text-muted hover:text-danger transition-all shadow-sm"
                      aria-label="Remove image"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-panel border border-border rounded-lg">
                    <div className="flex items-center gap-3">
                      {type === 'video' ? (
                        <Film className="w-8 h-8 text-accent" />
                      ) : (
                        <Mic className="w-8 h-8 text-accent" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-text">{mediaPreview}</p>
                        <p className="text-xs text-muted">{type === 'video' ? 'Video ready for analysis' : 'Audio ready for analysis'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={clearMedia}
                      className="p-1.5 bg-bg/80 rounded-lg border border-border hover:bg-panel text-muted hover:text-danger transition-all shadow-sm"
                      aria-label={`Remove ${type}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <label 
                className="flex flex-col items-center justify-center w-full h-48 bg-panel border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent/40 focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent transition-colors"
                tabIndex={0}
              >
                {type === 'image' ? (
                  <Image className="w-8 h-8 text-muted mb-2" />
                ) : type === 'video' ? (
                  <Film className="w-8 h-8 text-muted mb-2" />
                ) : (
                  <Mic className="w-8 h-8 text-muted mb-2" />
                )}
                <span className="text-sm font-medium text-text">
                  Click to upload or drop {type === 'image' ? 'an image' : type === 'video' ? 'a video' : 'an audio file'}
                </span>
                <span className="text-xs text-muted mt-1.5">
                  {type === 'image' && 'JPEG, PNG, WebP, GIF (max 5MB)'}
                  {type === 'video' && 'MP4, AVI, MOV, WEBM (max 50MB)'}
                  {type === 'audio' && 'WAV, MP3, OGG, FLAC (max 20MB)'}
                </span>
                <input
                  type="file"
                  accept={
                    type === 'image' ? 'image/jpeg,image/png,image/webp,image/gif' :
                    type === 'video' ? 'video/mp4,video/x-msvideo,video/quicktime,video/webm' :
                    'audio/wav,audio/mpeg,audio/ogg,audio/flac,audio/webm'
                  }
                  onChange={handleMediaChange}
                  className="opacity-0 w-0 h-0"
                  tabIndex={-1}
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
        disabled={(isMediaMode ? !mediaFile : !input.trim()) || isLoading}
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
        {type === 'image'
          ? 'Upload an image to check for deepfake or AI-generated content'
          : type === 'video'
          ? 'Upload a video to detect deepfake manipulation and AI-generated frames'
          : type === 'audio'
          ? 'Upload audio to detect voice cloning and AI-generated speech'
          : 'Paste content or click "Load sample" for a pre-filled demo'}
      </p>
    </form>
  );
}

export default AnalyzePanel;
