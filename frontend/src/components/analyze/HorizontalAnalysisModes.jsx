import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ScanSearch, Image } from 'lucide-react';

const ANALYSIS_MODES = [
  {
    id: 'email',
    title: 'Email Analysis',
    description: 'Analyze suspicious emails for phishing, malware, and social engineering attempts',
    icon: Mail,
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    id: 'general',
    title: 'General Input',
    description: 'Automatically detect and analyze any type of input including URLs, prompts, logs, and AI-generated content',
    icon: ScanSearch,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
  },
  {
    id: 'image',
    title: 'Deepfake Image',
    description: 'Detect AI-generated or manipulated images and deepfakes',
    icon: Image,
    color: 'from-emerald-500 to-teal-500',
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  }
];

function HorizontalAnalysisModes() {
  const [selectedMode, setSelectedMode] = useState('email');
  const containerRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle horizontal scrolling logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    const handleMouseDown = (e) => {
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      setIsScrolling(true);
    };

    const handleMouseLeave = () => {
      isDown = false;
      setIsScrolling(false);
    };

    const handleMouseUp = () => {
      isDown = false;
      setIsScrolling(false);
    };

    const handleMouseMove = (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 2;
      container.scrollLeft = scrollLeft - walk;
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mousemove', handleMouseMove);

    // Cleanup
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-text mb-2">Choose Your Analysis Mode</h1>
        <p className="text-sm text-muted">
          Select the type of content you want to analyze for threats
        </p>
      </div>

      {/* Horizontal Scrolling Container */}
      <div 
        ref={containerRef}
        className="flex overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4"
        style={{ 
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {ANALYSIS_MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <div 
              key={mode.id}
              className="flex-none w-80 mx-4 snap-start"
              onClick={() => setSelectedMode(mode.id)}
            >
              <Link 
                to={`/analyze?type=${mode.id}`}
                className={`block rounded-2xl border border-border p-6 transition-all duration-300 hover:shadow-lg hover:border-accent/30 ${
                  selectedMode === mode.id ? 'ring-2 ring-accent' : ''
                }`}
              >
                <div className={`w-12 h-12 rounded-xl ${mode.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${mode.iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-text mb-2">{mode.title}</h3>
                <p className="text-sm text-muted leading-relaxed">{mode.description}</p>
                <div className="mt-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-panel border border-border rounded-full text-xs font-medium text-text">
                    Select →
                  </span>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {/* Mobile indicator */}
      <div className="flex justify-center space-x-2 mt-4 md:hidden">
        {ANALYSIS_MODES.map((mode, index) => (
          <div 
            key={mode.id}
            className={`w-2 h-2 rounded-full transition-colors ${
              selectedMode === mode.id ? 'bg-accent' : 'bg-border'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default HorizontalAnalysisModes;