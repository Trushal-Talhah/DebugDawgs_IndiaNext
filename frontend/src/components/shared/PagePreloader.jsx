import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LOADING_PHRASES = [
  'Initializing threat detection…',
  'Loading security modules…',
  'Calibrating AI models…',
  'Ready.',
];

export default function PagePreloader() {
  const [visible, setVisible] = useState(true);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Advance phrases every 550ms
    const phraseTimer = setInterval(() => {
      setPhraseIdx((i) => {
        if (i < LOADING_PHRASES.length - 1) return i + 1;
        clearInterval(phraseTimer);
        return i;
      });
    }, 550);

    // Smooth progress bar to 100 in ~1.7s
    const step = 100 / 28;
    const progressTimer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(progressTimer); return 100; }
        return Math.min(p + step, 100);
      });
    }, 60);

    // Hide after 2s total
    const hideTimer = setTimeout(() => setVisible(false), 2000);

    return () => {
      clearInterval(phraseTimer);
      clearInterval(progressTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="page-preloader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 55%, #f0fdf4 100%)',
            pointerEvents: 'all',
          }}
        >
          {/* Ambient blur orbs */}
          <div style={{ position: 'absolute', top: '20%', left: '15%', width: 320, height: 320, borderRadius: '50%', background: 'rgba(99,102,241,0.07)', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 280, height: 280, borderRadius: '50%', background: 'rgba(16,185,129,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />

          {/* Logo + scanner rings */}
          <div style={{ position: 'relative', marginBottom: 36 }}>
            {/* Outer rotating ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: -18,
                border: '2px solid transparent',
                borderTopColor: 'rgba(99,102,241,0.6)',
                borderRightColor: 'rgba(99,102,241,0.2)',
                borderRadius: '50%',
              }}
            />
            {/* Counter-rotating dashed ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute', inset: -10,
                border: '1.5px dashed rgba(139,92,246,0.35)',
                borderRadius: '50%',
              }}
            />
            {/* Logo */}
            <motion.div
              animate={{ boxShadow: ['0 0 0 0 rgba(99,102,241,0.2)', '0 0 0 14px rgba(99,102,241,0)', '0 0 0 0 rgba(99,102,241,0.2)'] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'white',
                border: '1px solid rgba(99,102,241,0.2)',
                boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <img src="/logo.png" alt="SentinelAI" style={{ width: 48, height: 48, objectFit: 'contain' }} />
            </motion.div>
          </div>

          {/* Brand name */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            style={{ fontSize: 22, fontWeight: 800, color: '#111827', letterSpacing: '-0.5px', marginBottom: 6 }}
          >
            SentinelAI
          </motion.div>

          {/* Animated phrase */}
          <AnimatePresence mode="wait">
            <motion.div
              key={phraseIdx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
              style={{
                fontSize: 12.5, fontWeight: 500, color: '#6b7280',
                letterSpacing: '0.02em', marginBottom: 28, height: 20,
              }}
            >
              {LOADING_PHRASES[phraseIdx]}
            </motion.div>
          </AnimatePresence>

          {/* Progress bar */}
          <div style={{
            width: 200, height: 3, borderRadius: 4,
            background: 'rgba(99,102,241,0.12)',
            overflow: 'hidden',
          }}>
            <div
              style={{
                height: '100%', borderRadius: 4,
                background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #3b82f6)',
                width: `${progress}%`,
                transition: 'width 0.06s linear',
              }}
            />
          </div>

          {/* Scan line sweep */}
          <motion.div
            animate={{ x: ['-100vw', '100vw'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.2 }}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: 120, height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.06), transparent)',
              pointerEvents: 'none',
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
