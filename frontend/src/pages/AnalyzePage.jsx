import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSimpleMode } from '../hooks/useSimpleMode';
import AnalyzePanel from '../components/analyze/AnalyzePanel';
import GmailInbox from '../components/analyze/GmailInbox';
import HorizontalAnalysisModes from '../components/analyze/HorizontalAnalysisModes';
import HorizontalResultsStrip from '../components/analyze/HorizontalResultsStrip';
import EvidenceTimeline from '../components/analyze/EvidenceTimeline';
import FeatureImportanceBar from '../components/analyze/FeatureImportanceBar';
import CounterfactualControl from '../components/analyze/CounterfactualControl';
import ResponseActions from '../components/analyze/ResponseActions';
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
  const [prefillValue, setPrefillValue] = useState('');
  const resultRef = useRef(null);

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

    try {
      const response = await scanThreat({ mode, inputType: type, content: input });
      const transformedResult = transformScanResponse(response);
      setResult(transformedResult);
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
    console.log('Action taken:', actionId);
  }

  /* When user clicks "Analyze This Email" in GmailInbox */
  function handleEmailSelected(emailContent) {
    setPrefillValue(emailContent);
    setTimeout(() => setPrefillValue(''), 200);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
            <div className="max-w-md">
              <AnalyzePanel
                onAnalyze={handleAnalyze}
                onAnalyzeImage={handleAnalyzeImage}
                isLoading={isLoading}
                prefillValue={prefillValue}
              />
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="bg-bg rounded-xl border border-border p-10 flex flex-col items-center justify-center gap-3 animate-fade-in">
              <div className="w-8 h-8 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
              <p className="text-sm text-muted">Analyzing input...</p>
            </div>
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
          {result && !isLoading && (
            <div ref={resultRef}>
              <HorizontalResultsStrip
                result={result}
                onViewEvidence={() => setShowEvidence(true)}
                onTakeAction={() => setShowEvidence(true)}
                showEvidence={showEvidence}
              />

              {/* Detailed evidence below the strip (expanded on demand) */}
              {(showEvidence || !isSimple) && (
                <div className="space-y-4 mt-6 animate-fade-in">
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
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default AnalyzePage;
