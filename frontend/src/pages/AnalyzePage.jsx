import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSimpleMode } from '../hooks/useSimpleMode';
import AnalyzePanel from '../components/analyze/AnalyzePanel';
import RiskCard from '../components/analyze/RiskCard';
import EvidenceTimeline from '../components/analyze/EvidenceTimeline';
import FeatureImportanceBar from '../components/analyze/FeatureImportanceBar';
import CounterfactualControl from '../components/analyze/CounterfactualControl';
import ResponseActions from '../components/analyze/ResponseActions';
import GmailInbox from '../components/analyze/GmailInbox';
import HorizontalAnalysisModes from '../components/analyze/HorizontalAnalysisModes';
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
  const [activeSegment, setActiveSegment] = useState('');
  const [prefillValue, setPrefillValue] = useState('');
  const resultRef = useRef(null);

  /* Clear result when switching analysis modes */
  useEffect(() => {
    setResult(null);
    setError(null);
    setShowEvidence(false);
    setActiveSegment('');
  }, [urlType]);

  async function handleAnalyze({ mode, type, input }) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    setShowEvidence(false);
    setActiveSegment('');

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
    setActiveSegment('');

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
    // reset it slightly after so re-selecting same email works
    setTimeout(() => setPrefillValue(''), 200);
    // Scroll up to the analyze panel
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
        <section className="max-w-350 mx-auto space-y-6">
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

          {/* Gmail Inbox — full width above the grid (Only show if type is email) */}
          {urlType === 'email' && (
            <GmailInbox onAnalyzeEmail={handleEmailSelected} />
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left: Input */}
            {urlType !== 'email' && (
              <div className="xl:col-span-4 2xl:col-span-3 xl:sticky xl:top-4">
                <AnalyzePanel
                  onAnalyze={handleAnalyze}
                  onAnalyzeImage={handleAnalyzeImage}
                  isLoading={isLoading}
                  prefillValue={prefillValue}
                />
              </div>
            )}

            {/* Right: Results */}
            <div ref={resultRef} className={`${urlType === 'email' ? 'xl:col-span-12' : 'xl:col-span-8 2xl:col-span-9'} min-w-0 space-y-5`}>
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
                  <div className="animate-fade-in" aria-live="polite">
                    <RiskCard
                      score={result.score}
                      confidence={result.confidence}
                      topReason={result.topReason}
                      onViewEvidence={() => setShowEvidence(true)}
                      onTakeAction={() => setShowEvidence(true)}
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
                    <div className="bg-bg rounded-xl border border-border p-3.5">
                      <p className="text-[11px] text-muted uppercase tracking-wide">Verdict</p>
                      <p className="text-sm font-semibold text-text mt-1">{result.label}</p>
                    </div>
                    <div className="bg-bg rounded-xl border border-border p-3.5">
                      <p className="text-[11px] text-muted uppercase tracking-wide">Threat Type</p>
                      <p className="text-sm font-semibold text-text mt-1 wrap-break-word">{result.threatType || 'Unknown'}</p>
                    </div>
                    <div className="bg-bg rounded-xl border border-border p-3.5">
                      <p className="text-[11px] text-muted uppercase tracking-wide">Confidence</p>
                      <p className="text-sm font-semibold text-text mt-1">{result.confidence}%</p>
                    </div>
                    <div className="bg-bg rounded-xl border border-border p-3.5 col-span-2 md:col-span-1">
                      <p className="text-[11px] text-muted uppercase tracking-wide">Modules Triggered</p>
                      <p className="text-sm font-semibold text-text mt-1">{result.modulesTriggered || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 2xl:grid-cols-3 gap-4 animate-fade-in">
                    <div className="bg-bg rounded-xl border border-border p-5 2xl:col-span-2">
                      <h3 className="text-base font-semibold text-text mb-3">Threat Intelligence</h3>

                      {result.explanation && (
                        <p className="text-sm text-text leading-relaxed wrap-break-word whitespace-normal bg-panel border border-border rounded-lg p-3 mb-4 animate-fade-in">
                          {result.explanation}
                        </p>
                      )}

                      {!!result.threatsDetected?.length && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-muted mb-2">Detected Threats</p>
                          <div className="flex flex-wrap gap-2">
                            {result.threatsDetected.map((threat, index) => (
                              <span
                                key={`${threat}-${index}`}
                                className="px-2.5 py-1 rounded-full bg-accent-light text-accent text-xs font-medium animate-fade-in"
                                style={{ animationDelay: `${index * 80}ms` }}
                              >
                                {threat}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {!!result.moduleScores?.length && (
                        <div>
                          <p className="text-xs font-medium text-muted mb-2">
                            Module Risk Breakdown ({result.modulesTriggered} triggered)
                          </p>
                          <div className="space-y-2">
                            {result.moduleScores.map((module) => (
                              <div key={module.name} className="bg-panel border border-border rounded-lg p-2.5">
                                <div className="flex items-center justify-between mb-1.5 gap-2">
                                  <span className="text-xs text-text font-medium wrap-break-word">{module.name}</span>
                                  <span className="text-xs font-semibold text-muted shrink-0">{module.score}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-accent transition-all duration-700 ease-out"
                                    style={{ width: `${Math.max(0, Math.min(100, module.score))}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-bg rounded-xl border border-border p-5">
                      <h3 className="text-base font-semibold text-text mb-3">Recommended Actions</h3>
                      <ol className="space-y-2.5">
                        {result.playbook.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-text bg-panel border border-border rounded-lg p-2.5">
                            <span className="w-5 h-5 rounded-full bg-accent-light text-accent text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <span className="wrap-break-word leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 animate-fade-in">
                    {!!result.signals?.length && (
                      <div className="bg-bg rounded-xl border border-border p-5">
                        <h3 className="text-base font-semibold text-text mb-3">Key Signals</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {result.signals.map((signal, index) => (
                            <div
                              key={`${signal}-${index}`}
                              className="flex items-start gap-2.5 text-sm text-text bg-panel border border-border rounded-lg p-2.5 animate-fade-in"
                              style={{ animationDelay: `${index * 70}ms` }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-2" />
                              <span className="wrap-break-word leading-relaxed">{signal}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!!result.highlightedSegments?.length && (
                      <div className="bg-bg rounded-xl border border-border p-5">
                        <h3 className="text-base font-semibold text-text mb-3">Highlighted Segments</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.highlightedSegments.map((segment, index) => {
                            const isActive = activeSegment === segment;
                            return (
                              <button
                                key={`${segment}-${index}`}
                                type="button"
                                onClick={() => setActiveSegment(segment)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors animate-fade-in ${
                                  isActive
                                    ? 'bg-accent-light border-accent/40 text-accent font-medium'
                                    : 'bg-panel border-border text-text hover:border-accent/30'
                                }`}
                                style={{ animationDelay: `${index * 60}ms` }}
                              >
                                {segment}
                              </button>
                            );
                          })}
                        </div>
                        {activeSegment && (
                          <p className="text-xs text-muted mt-3 animate-fade-in wrap-break-word">
                            Focus term selected: "{activeSegment}"
                          </p>
                        )}
                      </div>
                    )}
                  </div>

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
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default AnalyzePage;
