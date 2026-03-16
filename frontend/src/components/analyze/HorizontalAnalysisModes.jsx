import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ScanSearch, Image } from 'lucide-react';
import './HorizontalAnalysisModes.css';

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
  const horizontalSectionRef = useRef(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Handle horizontal scrolling logic with vertical-to-horizontal transformation
  useEffect(() => {
    const horizontalSection = horizontalSectionRef.current;
    const container = containerRef.current;
    if (!horizontalSection || !container) return;

    // Calculate dimensions and set up the horizontal scroll effect
    const calculateScroll = () => {
      const itemsInView = window.innerWidth < 768 ? 1 : window.innerWidth < 1024 ? 2 : 3;
      const itemWidth = 320; // width of each card + margins
      const totalItems = ANALYSIS_MODES.length;
      const moveAmount = Math.max(0, totalItems - itemsInView);
      
      // Set minimum height to enable vertical scrolling
      if (moveAmount > 0) {
        const minHeight = (itemWidth * moveAmount * 1.5) + 500;
        horizontalSection.style.minHeight = `${minHeight}px`;
      }
    };

    calculateScroll();
    window.addEventListener('resize', calculateScroll);

    // Handle scroll event for horizontal movement
    const handleScroll = () => {
      if (ANALYSIS_MODES.length <= 3) return;
      
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollPercentage = scrollTop / (horizontalSection.scrollHeight - window.innerHeight);
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      const targetScrollLeft = scrollPercentage * maxScrollLeft;
      
      // Direct scroll without smooth behavior for better performance
      container.scrollLeft = targetScrollLeft;
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);

    // Cleanup
    return () => {
      window.removeEventListener('resize', calculateScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div ref={horizontalSectionRef} className="horizontal-section">
      {/* Sticky Header */}
      <div className="horizontal-sticky">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text mb-2">Choose Your Analysis Mode</h1>
            <p className="text-sm text-muted">
              Select the type of content you want to analyze for threats
            </p>
          </div>
        </div>
      </div>

      {/* Horizontal Scrolling Container */}
      <div className="horizontal-wrapper" ref={containerRef}>
        {ANALYSIS_MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <div key={mode.id} className="horizontal-item">
              <Link 
                to={`/analyze?type=${mode.id}`}
                className={`block rounded-2xl border border-border p-6 transition-all duration-300 hover:shadow-lg hover:border-accent/30 ${
                  selectedMode === mode.id ? 'ring-2 ring-accent' : ''
                }`}
                onClick={() => setSelectedMode(mode.id)}
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
      <div className="flex justify-center space-x-2 mt-4 md:hidden max-w-4xl mx-auto px-6">
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