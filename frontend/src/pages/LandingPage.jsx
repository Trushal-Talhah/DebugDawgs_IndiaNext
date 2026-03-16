import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion';
import { Sparkles, ShieldCheck, Gauge, Workflow, ArrowRight, Zap } from 'lucide-react';
import { fadeUp, heroWord, heroWordContainer, staggerContainer } from '../animations/variants';
import { DASHBOARD_STATS } from '../data/sampleData';
import Particles from '../components/shared/Particles';

const HERO_WORDS = ['Detect.', 'Explain.', 'Respond.'];

const FEATURE_CARDS = [
  {
    title: 'Real-time Threat Scoring',
    description: 'Classifies risk with explainable confidence signals and contextual evidence.',
    icon: ShieldCheck,
  },
  {
    title: 'Analyst-Ready Workflow',
    description: 'Moves from detection to remediation in one continuous security workflow.',
    icon: Workflow,
  },
  {
    title: 'Low-Latency Decisions',
    description: 'Streams prioritized signals so teams can block attacks faster and safer.',
    icon: Gauge,
  },
  {
    title: 'Adaptive Intelligence',
    description: 'Learns from incidents and surfaces evolving adversarial behavior patterns.',
    icon: Sparkles,
  },
];

const STATS = [
  { label: 'Threats Scanned', value: 18240, suffix: '+' },
  { label: 'High-Risk Blocked', value: DASHBOARD_STATS.blockedToday, suffix: '' },
  { label: 'Avg. Triage Time', value: 43, suffix: 's' },
  { label: 'Analyst Confidence', value: 97, suffix: '%' },
];

const TESTIMONIALS = [
  '“Reduced phishing triage from minutes to seconds.”',
  '“The evidence timeline made approvals significantly faster.”',
  '“Simple mode helped non-security teams act confidently.”',
  '“We finally have explainability without dashboard clutter.”',
];

function AnimatedCounter({ value, suffix = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const motionValue = useMotionValue(0);
  const rounded = useTransform(motionValue, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useMotionValueEvent(rounded, 'change', (latest) => {
    setDisplayValue(latest);
  });

  useEffect(() => {
    if (!isInView) {
      return undefined;
    }
    const controls = animate(motionValue, value, {
      duration: 1.2,
      ease: 'easeOut',
    });
    return () => controls.stop();
  }, [isInView, motionValue, value]);

  return (
    <span ref={ref} className="text-3xl font-bold text-text leading-none">
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

function LandingPage() {
  const meshX = useMotionValue(0);
  const meshY = useMotionValue(0);
  const bgPosition = useMotionTemplate`${meshX}% ${meshY}%`;

  useAnimationFrame((time) => {
    meshX.set(50 + Math.sin(time / 5200) * 12);
    meshY.set(46 + Math.cos(time / 4300) * 10);
  });

  const ctaRef = useRef(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: '-80px' });

  return (
    <div className="min-h-screen bg-bg text-text">
      <div className="fixed inset-0 pointer-events-none z-0">
        <Particles
          particleColors={['#340df8']}
          particleCount={300}
          particleSpread={10}
          speed={0.1}
          particleBaseSize={100}
          moveParticlesOnHover
          alphaParticles={false}
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      <section className="relative min-h-screen overflow-hidden border-b border-border">

        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-80 pointer-events-none"
          style={{
            backgroundPosition: bgPosition,
            backgroundImage:
              'radial-gradient(circle at 20% 20%, var(--color-accent-light), transparent 42%), radial-gradient(circle at 80% 15%, var(--color-glass), transparent 38%), radial-gradient(circle at 50% 85%, var(--color-panel), transparent 44%)',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 py-8 h-screen flex flex-col">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold tracking-wide">
              <span className="w-8 h-8 rounded-lg bg-accent-light text-accent flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </span>
              SentinelAI
            </div>
            <Link
              to="/dashboard"
              className="text-sm font-medium text-muted hover:text-text transition-colors no-underline"
            >
              Go to Dashboard
            </Link>
          </header>

          <div className="flex-1 flex items-center">
            <div className="max-w-3xl">
              <motion.p
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-bg/80 text-xs font-medium text-muted"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                Explainable Security Intelligence
              </motion.p>

              <motion.h1
                className="mt-5 text-5xl md:text-6xl font-semibold leading-tight tracking-tight"
                variants={heroWordContainer}
                initial="hidden"
                animate="visible"
              >
                {HERO_WORDS.map((word) => (
                  <motion.span key={word} variants={heroWord} className="inline-block mr-4">
                    {word}
                  </motion.span>
                ))}
              </motion.h1>

              <motion.p
                className="mt-5 text-lg text-muted max-w-2xl"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                A premium AI threat-analysis workspace that helps teams detect malicious input,
                surface evidence, and execute response playbooks without context switching.
              </motion.p>

              <motion.div
                className="mt-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} className="inline-block">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-white text-sm font-semibold no-underline hover:bg-accent/90 transition-colors"
                  >
                    Launch Platform
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {FEATURE_CARDS.map(({ title, description, icon: Icon }, index) => (
            <motion.article
              key={title}
              custom={index}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
              whileHover={{ y: -6, boxShadow: '0 16px 40px var(--color-glass)' }}
              className="bg-bg border border-border rounded-xl p-5"
            >
              <div className="w-10 h-10 rounded-lg bg-accent-light text-accent flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-text">{title}</h3>
              <p className="mt-2 text-sm text-muted leading-relaxed">{description}</p>
            </motion.article>
          ))}
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {STATS.map((item) => (
            <motion.div
              key={item.label}
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.45 }}
              className="bg-panel rounded-xl border border-border p-5"
            >
              <AnimatedCounter value={item.value} suffix={item.suffix} />
              <p className="mt-2 text-sm text-muted">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="relative bg-panel border border-border rounded-2xl p-6 md:p-8 overflow-hidden"
        >
          <h2 className="text-2xl font-semibold">How it works</h2>
          <p className="text-sm text-muted mt-2 max-w-2xl">
            Input analysis flows into explainable scoring, structured evidence, and guided action
            steps in one interface.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-bg p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { label: 'Threats Today', value: DASHBOARD_STATS.threatsToday },
                { label: 'High Risk', value: DASHBOARD_STATS.highRisk },
                { label: 'Medium Risk', value: DASHBOARD_STATS.mediumRisk },
                { label: 'Blocked', value: DASHBOARD_STATS.blockedToday },
                { label: 'Pending', value: DASHBOARD_STATS.pendingReview },
              ].map((item) => (
                <div key={item.label} className="bg-bg rounded-xl border border-border p-3">
                  <p className="text-xl font-bold text-text leading-none">{item.value}</p>
                  <p className="text-xs text-muted mt-1">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.15 }}
            className="absolute top-5 right-5 px-3 py-1.5 rounded-full bg-accent-light text-accent text-xs font-semibold border border-border"
          >
            Live Confidence
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.28 }}
            className="absolute bottom-5 left-6 px-3 py-1.5 rounded-full bg-bg text-text text-xs font-semibold border border-border"
          >
            Explainable Decisions
          </motion.div>
        </motion.div>
      </section>

      <section className="border-y border-border py-6 overflow-hidden">
        <motion.div
          className="flex gap-4 w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ repeat: Infinity, duration: 22, ease: 'linear' }}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS].map((quote, index) => (
            <div
              key={`${quote}-${index}`}
              className="px-4 py-2 rounded-lg bg-panel border border-border text-sm text-muted"
            >
              {quote}
            </div>
          ))}
        </motion.div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="rounded-2xl border border-border bg-panel p-8 md:p-10 text-center">
          <motion.h2
            initial={{ y: 24, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.45 }}
            className="text-3xl md:text-4xl font-semibold tracking-tight"
          >
            Move from signal to action — fast.
          </motion.h2>

          <motion.div
            ref={ctaRef}
            initial={{ y: 24, opacity: 0 }}
            animate={ctaInView ? { y: 0, opacity: 1 } : {}}
            transition={{ duration: 0.45, delay: 0.15 }}
            className="mt-6"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-accent text-white text-sm font-semibold no-underline hover:bg-accent/90 transition-colors"
            >
              Start Monitoring
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;