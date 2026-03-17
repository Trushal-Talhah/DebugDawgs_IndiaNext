import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, SkipForward, Bot, Sparkles } from 'lucide-react';

/* ── Tour overlay with spotlight ── */
export default function OnboardingTour({ steps = [], onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const rafRef = useRef(null);

  const currentStep = steps[stepIdx];
  const isLast = stepIdx === steps.length - 1;

  /* track target element position live */
  useEffect(() => {
    const measure = () => {
      if (!currentStep?.targetId) { setRect(null); return; }
      const el = document.getElementById(currentStep.targetId);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    // scroll into view smoothly
    const el = document.getElementById(currentStep?.targetId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const loop = () => { measure(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);

    const onResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', onResize);
    };
  }, [stepIdx, currentStep?.targetId]);

  const handleContinue = () => {
    if (isLast) { onClose(); return; }
    setStepIdx((i) => i + 1);
  };

  const PAD = 10;
  const spotTop    = rect ? rect.top    - PAD : 0;
  const spotLeft   = rect ? rect.left   - PAD : 0;
  const spotWidth  = rect ? rect.width  + PAD * 2 : 0;
  const spotHeight = rect ? rect.height + PAD * 2 : 0;

  /* bubble position: prefer below, fallback to above */
  const bubbleAbove = rect && (rect.top + rect.height + 260 > windowSize.h);
  const bubbleTop   = bubbleAbove
    ? spotTop - 16 - 220
    : spotTop + spotHeight + 16;
  const bubbleLeft  = rect
    ? Math.min(Math.max(spotLeft, 16), windowSize.w - 340)
    : 16;

  return (
    <AnimatePresence>
      {currentStep && (
        <motion.div
          key="tour-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none' }}
        >
          {/* SVG backdrop with cut-out spotlight */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'all', cursor: 'default' }}
            onClick={onClose}
          >
            <defs>
              <mask id="tour-mask">
                <rect width="100%" height="100%" fill="white" />
                {rect && (
                  <rect
                    x={spotLeft} y={spotTop}
                    width={spotWidth} height={spotHeight}
                    rx={12} fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              width="100%" height="100%"
              fill="rgba(10,20,50,0.65)"
              mask="url(#tour-mask)"
            />
          </svg>

          {/* Glowing spotlight ring */}
          {rect && (
            <motion.div
              key={currentStep.targetId}
              animate={{
                top: spotTop, left: spotLeft, width: spotWidth, height: spotHeight,
                boxShadow: [
                  '0 0 0 3px rgba(99,102,241,0.8), 0 0 30px rgba(99,102,241,0.4)',
                  '0 0 0 5px rgba(99,102,241,1), 0 0 50px rgba(99,102,241,0.6)',
                  '0 0 0 3px rgba(99,102,241,0.8), 0 0 30px rgba(99,102,241,0.4)',
                ],
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{
                top: { type: 'spring', stiffness: 200, damping: 22 },
                left: { type: 'spring', stiffness: 200, damping: 22 },
                width: { type: 'spring', stiffness: 200, damping: 22 },
                height: { type: 'spring', stiffness: 200, damping: 22 },
                boxShadow: { repeat: Infinity, duration: 1.8 },
                opacity: { duration: 0.25 },
              }}
              style={{
                position: 'fixed', borderRadius: 12, pointerEvents: 'none',
              }}
            />
          )}

          {/* Bot Chat Bubble */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`bubble-${stepIdx}`}
              initial={{ opacity: 0, y: bubbleAbove ? 14 : -14, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ type: 'spring', stiffness: 320, damping: 24 }}
              style={{
                position: 'fixed',
                top: bubbleTop,
                left: bubbleLeft,
                width: 320,
                pointerEvents: 'all',
                zIndex: 10000,
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1.5px solid rgba(99,102,241,0.35)',
                  borderRadius: 20,
                  boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(99,102,241,0.15)',
                  padding: '20px',
                  position: 'relative',
                }}
              >
                {/* Close */}
                <button
                  onClick={onClose}
                  style={{
                    position: 'absolute', top: 12, right: 12,
                    border: 'none', background: 'rgba(0,0,0,0.06)',
                    borderRadius: 8, padding: '4px 6px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <X size={13} color="#6b7280" />
                </button>

                {/* Bot avatar + header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    flexShrink: 0,
                  }}>
                    <Bot size={20} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1f2937', lineHeight: 1.2 }}>
                      Sentinel Assistant
                    </div>
                    <div style={{ fontSize: 10, color: '#6366f1', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', display: 'inline-block' }} />
                      Online · Step {stepIdx + 1} of {steps.length}
                    </div>
                  </div>
                </div>

                {/* Step title */}
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={13} color="#6366f1" />
                  {currentStep.title}
                </div>

                {/* Message */}
                <div style={{
                  fontSize: 13, color: '#4b5563', lineHeight: 1.6,
                  background: 'rgba(99,102,241,0.05)',
                  borderRadius: 10, padding: '10px 12px',
                  border: '1px solid rgba(99,102,241,0.1)',
                }}>
                  {currentStep.message}
                </div>

                {/* Progress dots */}
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', margin: '14px 0 12px' }}>
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      style={{
                        width: i === stepIdx ? 18 : 6, height: 6, borderRadius: 3,
                        background: i <= stepIdx ? '#6366f1' : '#e5e7eb',
                        transition: 'all 0.35s ease',
                      }}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={onClose}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb',
                      background: 'white', fontSize: 12, fontWeight: 600, color: '#6b7280',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.target.style.background = '#f9fafb'; e.target.style.color = '#374151'; }}
                    onMouseLeave={(e) => { e.target.style.background = 'white'; e.target.style.color = '#6b7280'; }}
                  >
                    <SkipForward size={12} />
                    Skip Tour
                  </button>
                  <button
                    onClick={handleContinue}
                    style={{
                      flex: 2, padding: '9px 14px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      fontSize: 12, fontWeight: 700, color: 'white',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    {isLast ? '🎉 Done!' : 'Continue'}
                    {!isLast && <ChevronRight size={13} />}
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
