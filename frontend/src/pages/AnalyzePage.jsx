import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSimpleMode } from '../hooks/useSimpleMode';
import AnalyzePanel from '../components/analyze/AnalyzePanel';
import GmailInbox from '../components/analyze/GmailInbox';
import HorizontalAnalysisModes from '../components/analyze/HorizontalAnalysisModes';
import HorizontalResultsStrip from '../components/analyze/HorizontalResultsStrip';
import EvidenceTimeline from '../components/analyze/EvidenceTimeline';
import FeatureImportanceBar from '../components/analyze/FeatureImportanceBar';
import CounterfactualControl from '../components/analyze/CounterfactualControl';
import ResponseActions from '../components/analyze/ResponseActions';
import MitrePanel from '../components/analyze/MitrePanel';
import { scanThreat, scanImage, transformScanResponse } from '../lib/api';

function AnalyzePage() {
  const { isSimple } = useSimpleMode();
  const [searchParams] = useSearchParams();
  const hasSelectedType = searchParams.has('type');
  const urlType = searchParams.get('type') || 'email';

  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const showAnalysisView = hasSelectedType || result || isLoading || error;
  const [showEvidence, setShowEvidence] = useState(false);
  const [showMitre, setShowMitre] = useState(false);
  const [prefillValue, setPrefillValue] = useState('');
  const resultRef = useRef(null);
  const scrollAnchorRef = useRef(null);

  /* Clear result when switching analysis modes */
  useEffect(() => {
    setResult(null);
    setError(null);
    setShowEvidence(false);
  }, [urlType]);

  async function handleAnalyze({ mode, type, input }) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setShowEvidence(false);
    
    // Auto-scroll to loading state
    setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      const response = await scanThreat({ mode, inputType: type, content: input });
      const transformedResult = transformScanResponse(response);
      setResult(transformedResult);
      // Removed post-load scroll so it doesn't hop after centering on the animation
    } catch (err) {
      setError(err.message || 'Failed to analyze. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAnalyzeImage(file) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setShowEvidence(false);

    // Auto-scroll to loading state
    setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      const response = await scanImage(file);
      const transformedResult = transformScanResponse(response);
      setResult(transformedResult);
    } catch (err) {
      setError(err.message || 'Failed to analyze image. Please try again.');
      console.error('Image analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAction(actionId) {
    console.log('Action taken:', actionId);
  }

  /* When user clicks "Analyze This Email" in GmailInbox */
  async function handleEmailSelected(emailContent) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setShowEvidence(false);

    // Auto-scroll to loading state
    setTimeout(() => {
      scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);

    try {
      const response = await scanThreat({ mode: 'auto', inputType: 'email', content: emailContent });
      const transformedResult = transformScanResponse(response);
      setResult(transformedResult);
    } catch (err) {
      setError(err.message || 'Failed to analyze email. Please try again.');
      console.error('Email analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Show horizontal selection when no result exists */}
      {!showAnalysisView && (
        <HorizontalAnalysisModes />
      )}

      {/* Show analysis results when they exist or during loading/error states */}
      {showAnalysisView && (
        <section className="space-y-6">
          {/* Page header */}
          <div className="bg-bg border border-border rounded-2xl px-5 py-4">
            <h1 className="text-2xl font-semibold text-text">Analyze</h1>
            <p className="text-sm text-muted mt-1">
              {urlType === 'email'
                ? 'Pick an email from your inbox or paste content to detect phishing, malware, and social engineering patterns.'
                : urlType === 'image'
                  ? 'Upload an image to identify AI-generated, manipulated, or deepfake visual content.'
                  : 'Paste any suspicious text, URL, log, or prompt to generate a structured threat assessment.'}
            </p>
          </div>

          {/* Gmail Inbox — full width above (Only show if type is email) */}
          {urlType === 'email' && (
            <GmailInbox onAnalyzeEmail={handleEmailSelected} />
          )}

          {/* Input panel — show for non-email types */}
          {urlType !== 'email' && (
            <div className="w-full max-w-4xl mx-auto">
              <AnalyzePanel
                onAnalyze={handleAnalyze}
                onAnalyzeImage={handleAnalyzeImage}
                isLoading={isLoading}
                prefillValue={prefillValue}
              />
            </div>
          )}

          {/* Invisible anchor to center the loading animation on screen */}
          <div ref={scrollAnchorRef} className="h-1 -mt-1" aria-hidden="true" />

          {/* Loading state: Building Animation */}
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-bg rounded-xl border border-border p-16 flex flex-col items-center justify-center gap-8 min-h-[400px]"
            >
              {/* Complex Scanner Animation */}
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Outer rotating ring */}
                <motion.div
                  className="absolute inset-0 border-4 border-accent/20 border-t-accent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
                
                {/* Inner counter-rotating shape */}
                <motion.div
                  className="absolute inset-4 border-4 border-dashed border-purple-500/40 rounded-full"
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                />
                
                {/* Scanning line going up and down */}
                <motion.div
                  className="absolute left-0 w-full h-1 bg-accent shadow-[0_0_12px_rgba(var(--accent-rgb),0.8)] z-10 rounded-full"
                  animate={{ y: [-48, 48, -48] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                
                {/* Pulsing center core */}
                <motion.div
                  className="w-10 h-10 bg-accent/20 rounded-lg shadow-[0_0_20px_rgba(var(--accent-rgb),0.5)] border border-accent/50"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 180] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-purple-500">
                  Building Threat Report
                </h3>
                <p className="text-sm text-muted animate-pulse">Running heuristic analysis, compiling evidence, and generating playbooks...</p>
              </div>
            </motion.div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div className="bg-danger-light rounded-xl border border-danger/20 p-5 animate-fade-in">
              <p className="text-sm text-danger font-medium">Analysis Failed</p>
              <p className="text-sm text-danger/80 mt-1">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-3 text-xs text-danger hover:text-danger/80 font-medium"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ═══ Horizontal Results Strip ═══ */}
          <AnimatePresence>
            {result && !isLoading && (
              <motion.div 
                ref={resultRef}
                initial={{ opacity: 0, height: 0, y: 20 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                {/* Visual Separator */}
                <div className="w-full flex items-center justify-center py-6 mb-2">
                  <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent w-full max-w-2xl" />
                  <div className="absolute w-2 h-2 rounded-full bg-accent/40 shadow-[0_0_10px_rgba(var(--accent-rgb),0.5)]" />
                </div>

                {/* Report Container */}
                <div className="bg-bg border border-border rounded-2xl p-6 shadow-sm">
                  {/* Report Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                    <div>
                      <h2 className="text-xl font-bold text-text flex items-center gap-2">
                        <span className="w-2 rounded bg-accent h-6"></span>
                        Analysis Report
                      </h2>
                      <p className="text-xs text-muted mt-1">Detailed breakdown of identified threats, signals, and recommended actions.</p>
                    </div>
                  </div>

                  <HorizontalResultsStrip
                    result={result}
                    onViewEvidence={() => setShowEvidence(true)}
                    onTakeAction={() => setShowEvidence(true)}
                    showEvidence={showEvidence}
                    onViewMitre={() => setShowMitre(true)}
                  />

                  {/* Detailed evidence below the strip (expanded on demand) */}
                  <AnimatePresence>
                    {(showEvidence || !isSimple) && (
                      <motion.div 
                        className="space-y-6 mt-8 border-t border-border/50 pt-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                      >
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted">Execution Tracing pipeline</h3>
                        <EvidenceTimeline steps={result.evidenceSteps} />
                        {!isSimple && (
                          <>
                            <FeatureImportanceBar features={result.features} />
                            <CounterfactualControl
                              counterfactuals={result.counterfactuals}
                              originalScore={result.score}
                            />
                          </>
                        )}
                        <ResponseActions onAction={handleAction} result={result} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <MitrePanel
                    result={result}
                    isOpen={showMitre}
                    onClose={() => setShowMitre(false)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}
    </div>
  );
}

export default AnalyzePage;