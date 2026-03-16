import { useState, useRef } from 'react';
import { useSimpleMode } from '../hooks/useSimpleMode';
import AnalyzePanel from '../components/analyze/AnalyzePanel';
import RiskCard from '../components/analyze/RiskCard';
import EvidenceTimeline from '../components/analyze/EvidenceTimeline';
import FeatureImportanceBar from '../components/analyze/FeatureImportanceBar';
import CounterfactualControl from '../components/analyze/CounterfactualControl';
import ResponseActions from '../components/analyze/ResponseActions';
import { scanThreat, scanImage, transformScanResponse } from '../lib/api';

function AnalyzePage() {
  const { isSimple } = useSimpleMode();
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const resultRef = useRef(null);

  async function handleAnalyze({ type, input }) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setShowEvidence(false);

    try {
      const response = await scanThreat(type, input);
      const transformedResult = transformScanResponse(response);
      setResult(transformedResult);
      // Scroll to result after render
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
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

    try {
      const response = await scanImage(file);
      const transformedResult = transformScanResponse(response);
      setResult(transformedResult);
      // Scroll to result after render
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err) {
      setError(err.message || 'Failed to analyze image. Please try again.');
      console.error('Image analysis error:', err);
    } finally {
      setIsLoading(false);
    }
  }

  function handleAction(actionId) {
    // In a real app, this would call an API
    console.log('Action taken:', actionId);
  }

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">Analyze</h1>
        <p className="text-sm text-muted mt-0.5">
          Paste an email, URL, prompt, or upload an image to analyze for threats
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input */}
        <div>
          <AnalyzePanel 
            onAnalyze={handleAnalyze} 
            onAnalyzeImage={handleAnalyzeImage}
            isLoading={isLoading} 
          />
        </div>

        {/* Right: Results */}
        <div ref={resultRef} className="space-y-4">
          {isLoading && (
            <div className="bg-bg rounded-xl border border-border p-10 flex flex-col items-center justify-center gap-3 animate-fade-in">
              <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-muted">Analyzing input...</p>
            </div>
          )}

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

          {result && !isLoading && (
            <>
              {/* Risk card — always visible */}
              <div className="animate-fade-in" aria-live="polite">
                <RiskCard
                  score={result.score}
                  confidence={result.confidence}
                  topReason={result.topReason}
                  onViewEvidence={() => setShowEvidence(true)}
                  onTakeAction={() => setShowEvidence(true)}
                />
              </div>

              {/* Playbook */}
              <div className="bg-bg rounded-xl border border-border p-5 animate-fade-in">
                <h3 className="text-base font-semibold text-text mb-3">Recommended Actions</h3>
                <ol className="space-y-2">
                  {result.playbook.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-text">
                      <span className="w-5 h-5 rounded-full bg-accent-light text-accent text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Evidence section — shown on click or always in advanced mode */}
              {(showEvidence || !isSimple) && (
                <div className="space-y-4 animate-fade-in">
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

                  <ResponseActions onAction={handleAction} />
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!result && !isLoading && !error && (
            <div className="bg-bg rounded-xl border border-border p-10 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-panel flex items-center justify-center mb-3">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-sm text-muted">
                Results will appear here after analysis
              </p>
              <p className="text-xs text-muted mt-1">
                Try clicking &quot;Load sample&quot; then &quot;Analyze&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnalyzePage;
