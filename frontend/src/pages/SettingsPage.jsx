

import { motion } from 'framer-motion';
import { useSimpleMode } from '../hooks/useSimpleMode';
import { ToggleLeft, ToggleRight, Eye, EyeOff, Info } from 'lucide-react';

const staggerChildren = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const cardVariant = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function SettingsPage() {
  const { isSimple, toggle } = useSimpleMode();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text">Settings</h1>
        <p className="text-sm text-muted mt-0.5">Configure your analysis experience</p>
      </div>

      <motion.div
        variants={staggerChildren}
        initial="hidden"
        animate="visible"
        className="max-w-lg space-y-4"
      >
        {/* Simple Mode Toggle */}
        <motion.div variants={cardVariant} className="glass-card rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-indigo-500 flex items-center justify-center shrink-0 shadow-md">
              {isSimple ? (
                <Eye className="w-4 h-4 text-white" />
              ) : (
                <EyeOff className="w-4 h-4 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Simple Mode</h3>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggle}
                  className="text-accent hover:text-accent/80 transition-colors"
                  role="switch"
                  aria-checked={isSimple}
                  aria-label={`Simple mode is ${isSimple ? 'on' : 'off'}`}
                >
                  {isSimple ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-muted" />
                  )}
                </motion.button>
              </div>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                {isSimple
                  ? 'Currently showing simplified results — risk score, top reason, and basic actions only.'
                  : 'Advanced mode active — full evidence timeline, feature importance, counterfactual analysis, and raw artifacts visible.'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* What each mode shows */}
        <motion.div variants={cardVariant} className="glass-card rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-muted" />
            Mode Comparison
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-accent mb-2">Simple Mode</p>
              <ul className="space-y-1.5">
                {['Risk score & label', 'Top reason (1 line)', 'Block & Tell me why buttons', 'Playbook (3 steps)'].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-text">
                    <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-accent to-indigo-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium text-text mb-2">Advanced Mode</p>
              <ul className="space-y-1.5">
                {[
                  'Everything in Simple',
                  'Evidence timeline + raw data',
                  'Feature importance bars',
                  'Counterfactual "What if"',
                  'Confidence percentage',
                  'Full response actions',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-xs text-text">
                    <span className="w-1.5 h-1.5 rounded-full bg-text/40 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>

        {/* About */}
        <motion.div variants={cardVariant} className="glass-card rounded-xl p-5">
          <div className="flex items-start gap-3">
            <img src="/logo.png" alt="SentinelAI Logo" className="w-8 h-8 rounded-lg object-contain shrink-0 mt-0.5 shadow-md" />
            <div>
              <h3 className="text-sm font-semibold text-text">About SentinelAI</h3>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                AI-powered threat analysis platform for detecting phishing emails, suspicious URLs,
                and adversarial prompt injections. Built with explainable AI to help security teams
                make informed decisions.
              </p>
              <p className="text-xs text-muted mt-2 font-mono">v2.0.0 — DebugDawgs</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default SettingsPage;