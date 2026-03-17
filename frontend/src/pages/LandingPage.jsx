import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
} from 'framer-motion';
import { Sparkles, ShieldCheck, Gauge, Workflow, ArrowRight, Zap, Mail, ScanSearch, Image } from 'lucide-react';
import { fadeUp, heroWord, heroWordContainer, staggerContainer } from '../animations/variants';
import { getIncidents, transformIncident } from '../lib/api';

const CyberParticleBackground = lazy(() => import('../components/shared/CyberParticleBackground'));

/* ─── data ─── */
const HERO_WORDS = ['Detect.', 'Explain.', 'Respond.'];

const FEATURE_CARDS = [
  {
    title: 'Real-time Threat Scoring',
    description: 'Classifies risk with explainable confidence signals and contextual evidence.',
    icon: ShieldCheck,
    gradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    title: 'Analyst-Ready Workflow',
    description: 'Moves from detection to remediation in one continuous security workflow.',
    icon: Workflow,
    gradient: 'from-purple-500/10 to-pink-500/10',
  },
  {
    title: 'Low-Latency Decisions',
    description: 'Streams prioritized signals so teams can block attacks faster and safer.',
    icon: Gauge,
    gradient: 'from-emerald-500/10 to-teal-500/10',
  },
  {
    title: 'Adaptive Intelligence',
    description: 'Learns from incidents and surfaces evolving adversarial behavior patterns.',
    icon: Sparkles,
    gradient: 'from-amber-500/10 to-orange-500/10',
  },
];

// Stats will be calculated dynamically from live data

const TESTIMONIALS = [
  '"Reduced phishing triage from minutes to seconds."',
  '"The evidence timeline made approvals significantly faster."',
  '"Simple mode helped non-security teams act confidently."',
  '"We finally have explainability without dashboard clutter."',
];

/* ─── glassmorphism sticky navbar ─── */
function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      animate={
        scrolled
          ? {
              backgroundColor: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.4) inset',
              borderBottom: '1px solid rgba(209,213,219,0.5)',
            }
          : {
              backgroundColor: 'rgba(255,255,255,0)',
              backdropFilter: 'blur(0px)',
              WebkitBackdropFilter: 'blur(0px)',
              boxShadow: 'none',
              borderBottom: '1px solid rgba(0,0,0,0)',
            }
      }
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 no-underline group pointer-events-auto">
          <motion.img
            src="/logo.png"
            alt="SentinelAI Logo"
            className="w-8 h-8 rounded-lg shadow-md shadow-blue-500/20 object-contain"
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          />
          <span className="text-sm font-bold tracking-tight text-gray-900 group-hover:text-blue-600 transition-colors">
            SentinelAI
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { label: 'Dashboard', to: '/dashboard' },
            { label: 'Analyze', to: '/analyze' },
            { label: 'Incidents', to: '/incidents' },
          ].map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className="relative px-3 py-1.5 text-sm font-medium text-gray-500 no-underline rounded-lg transition-colors hover:text-gray-900 hover:bg-gray-100/60 group pointer-events-auto"
            >
              {label}
              <span className="absolute bottom-0.5 left-3 right-3 h-px bg-gradient-to-r from-blue-500 to-indigo-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold text-white no-underline shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-shadow pointer-events-auto"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
          >
            Go to Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </div>
    </motion.header>
  );
}

/* ─── animated counter ─── */
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
    if (!isInView) return undefined;
    const controls = animate(motionValue, value, { duration: 1.2, ease: 'easeOut' });
    return () => controls.stop();
  }, [isInView, motionValue, value]);

  return (
    <span ref={ref} className="text-3xl font-bold text-gray-900 leading-none">
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}

/* ─── glassmorphism card component (Light Theme) ─── */
function GlassCard({ children, className = '', hover = true }) {
  return (
    <motion.div
      whileHover={hover ? { y: -6, scale: 1.01, boxShadow: '0 20px 60px rgba(0,0,0,0.10)' } : {}}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`
        relative overflow-hidden rounded-2xl
        bg-white
        border border-gray-100
        shadow-[0_2px_20px_rgba(0,0,0,0.06)]
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   LandingPage (Light Theme)
   ═══════════════════════════════════════════════════ */
function LandingPage() {
  const ctaRef = useRef(null);
  const ctaInView = useInView(ctaRef, { once: true, margin: '-80px' });
  
  const [dashboardStats, setDashboardStats] = useState({
    threatsToday: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    blockedToday: 0,
    pendingReview: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const data = await getIncidents(50);
        const transformed = data.map(transformIncident);
        
        // Calculate stats from real data
        const today = new Date().toDateString();
        const todayIncidents = transformed.filter(
          (inc) => new Date(inc.timestamp).toDateString() === today
        );
        
        setDashboardStats({
          threatsToday: todayIncidents.length,
          highRisk: transformed.filter((inc) => inc.risk >= 70).length,
          mediumRisk: transformed.filter((inc) => inc.risk >= 40 && inc.risk < 70).length,
          lowRisk: transformed.filter((inc) => inc.risk < 40).length,
          blockedToday: todayIncidents.filter((inc) => inc.status === 'blocked' || inc.status === 'quarantined').length,
          pendingReview: transformed.filter((inc) => inc.status === 'flagged').length,
        });
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        // Keep default values of 0 if fetch fails
      } finally {
        setStatsLoading(false);
      }
    }
    
    fetchDashboardStats();
  }, []);

  return (
    <div className="min-h-screen text-gray-900 bg-gray-50/50">
      <LandingNav />

      {/* ════════════ HERO SECTION ════════════ */}
      <section className="relative min-h-screen overflow-hidden pt-16">
        {/* 3D Particle Background - It renders behind the glass cards */}
        <Suspense fallback={null}>
          <CyberParticleBackground />
        </Suspense>

        {/* subtle radial gradient overlay for light theme */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 40%, rgba(59,130,246,0.03) 0%, transparent 60%), radial-gradient(circle at 30% 70%, rgba(16,185,129,0.02) 0%, transparent 50%)',
          }}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-6 py-8 h-screen flex flex-col justify-center pointer-events-none">
          {/* hero content */}
          <div className="max-w-3xl">
              {/* <motion.p
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white/60 backdrop-blur-md text-xs font-semibold text-gray-600 shadow-sm"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                Explainable Security Intelligence
              </motion.p> */}

              <motion.h1
                className="mt-6 text-6xl md:text-8xl font-bold leading-[1.1] tracking-tight"
                variants={heroWordContainer}
                initial="hidden"
                animate="visible"
              >
                {HERO_WORDS.map((word) => (
                  <motion.span
                    key={word}
                    variants={heroWord}
                    className="inline-block mr-4"
                    style={{
                      background: 'linear-gradient(135deg, #111827 0%, #3b82f6 50%, #10b981 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.h1>

              <motion.p
                className="mt-6 text-xl text-gray-500 max-w-2xl leading-relaxed"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                A premium AI threat-analysis workspace that helps teams detect malicious input,
                surface evidence, and execute response playbooks without context switching.
              </motion.p>

              <motion.div
                className="mt-10 flex items-center gap-4"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-sm font-semibold no-underline text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 pointer-events-auto"
                    style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1, #a855f7)' }}
                  >
                    Launch Platform
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/analyze"
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-xl border border-gray-200 bg-white/60 backdrop-blur-md text-sm font-semibold text-gray-700 no-underline hover:bg-white transition-colors shadow-sm pointer-events-auto"
                  >
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    Try Analysis
                  </Link>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

      {/* ════════════ GLASSMORPHISM FEATURE CARDS ════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-20 -mt-20">
        {/* feature cards grid */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {FEATURE_CARDS.map(({ title, description, icon: Icon, gradient }, index) => (
            <motion.div
              key={title}
              custom={index}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-80px' }}
            >
              <GlassCard className="p-6 h-full">
                {/* gradient accent blob */}
                <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${gradient} blur-2xl opacity-80`} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shadow-sm">
                    <Icon className="w-6 h-6 text-blue-500" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-gray-900">{title}</h3>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{description}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>

        {/* stats counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {[
            { label: 'Threats Scanned', value: 18240, suffix: '+' },
            { label: 'High-Risk Blocked', value: statsLoading ? 0 : dashboardStats.blockedToday, suffix: '' },
            { label: 'Avg. Triage Time', value: 43, suffix: 's' },
            { label: 'Analyst Confidence', value: 97, suffix: '%' },
          ].map((item) => (
            <motion.div
              key={item.label}
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.45 }}
            >
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <AnimatedCounter value={item.value} suffix={item.suffix} />
                <p className="mt-2 text-sm text-gray-500 font-medium">{item.label}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-120px' }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-8 md:p-10">
            <h2 className="text-3xl font-semibold text-gray-900 tracking-tight">How it works</h2>
              <p className="text-base text-gray-500 mt-2 max-w-2xl">
                Input analysis flows into explainable scoring, structured evidence, and guided action
                steps in one seamless interface.
              </p>

              <div className="mt-8 rounded-xl border border-gray-100 bg-white/50 backdrop-blur-sm p-6 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {statsLoading ? (
                    // Show loading placeholders
                    Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="w-8 h-6 bg-gray-200 rounded animate-pulse" />
                        <div className="w-16 h-3 bg-gray-200 rounded mt-1 animate-pulse" />
                      </div>
                    ))
                  ) : (
                    [
                      { label: 'Threats Today', value: dashboardStats.threatsToday },
                      { label: 'High Risk', value: dashboardStats.highRisk },
                      { label: 'Medium Risk', value: dashboardStats.mediumRisk },
                      { label: 'Blocked', value: dashboardStats.blockedToday },
                      { label: 'Pending', value: dashboardStats.pendingReview },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-2xl font-bold text-gray-900 leading-none">{item.value}</p>
                        <p className="text-xs font-semibold text-gray-400 mt-1 uppercase tracking-wider">{item.label}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            <div className="absolute top-8 right-8 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 tracking-wide uppercase">
                Live Confidence
              </div>
          </div>
        </motion.div>
      </section>

      {/* ════════════ TESTIMONIALS MARQUEE ════════════ */}
      <section className="relative z-10 border-y border-gray-200 bg-white/30 backdrop-blur-md py-8 overflow-hidden shadow-sm">
        <motion.div
          className="flex gap-6 w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
        >
          {[...TESTIMONIALS, ...TESTIMONIALS].map((quote, index) => (
            <div
              key={`${quote}-${index}`}
              className="px-6 py-3 rounded-full bg-white border border-gray-200 shadow-sm text-sm font-medium text-gray-600"
            >
              {quote}
            </div>
          ))}
        </motion.div>
      </section>

      {/* ════════════ CTA ════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24">
        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm p-10 md:p-14">
          <div className="absolute inset-0 rounded-2xl" style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.06) 0%, transparent 60%)',
          }} />
          <div className="relative">
            <motion.h2
              initial={{ y: 24, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-100px' }}
              transition={{ duration: 0.45 }}
              className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 text-center"
            >
              Move from signal to action — fast.
            </motion.h2>
            <motion.p
              initial={{ y: 18, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.4, delay: 0.12 }}
              className="text-base text-gray-500 text-center mt-3 max-w-xl mx-auto"
            >
              Pick your threat analysis mode and let SentinelAI do the heavy lifting.
            </motion.p>

            {/* 3 Analysis Cards */}
            <motion.div
              ref={ctaRef}
              className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-5"
              initial="hidden"
              animate={ctaInView ? 'visible' : 'hidden'}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.12 } },
              }}
            >
              {[
                {
                  icon: Mail,
                  title: 'Email Analysis',
                  description: 'Detect phishing, malware links, and social engineering in suspicious emails.',
                  features: ['Phishing Detection', 'Malware Signatures', 'Social Engineering'],
                  gradient: 'from-blue-600 to-blue-400',
                  glow: 'rgba(59,130,246,0.15)',
                  to: '/analyze?type=email',
                },
                {
                  icon: ScanSearch,
                  title: 'General Input',
                  description: 'Analyze any suspicious URL, log, text, AI prompt, or unknown input type.',
                  features: ['Auto Classification', 'Multi-type Support', 'Deep Analysis'],
                  gradient: 'from-purple-600 to-purple-400',
                  glow: 'rgba(139,92,246,0.15)',
                  to: '/analyze?type=general',
                },
                {
                  icon: Image,
                  title: 'Deepfake Image',
                  description: 'Identify AI-generated, manipulated, or deepfake visual content instantly.',
                  features: ['AI Generation', 'Manipulation Detection', 'Face Analysis'],
                  gradient: 'from-emerald-600 to-emerald-400',
                  glow: 'rgba(16,185,129,0.15)',
                  to: '/analyze?type=image',
                },
              ].map(({ icon: Icon, title, description, features, gradient, glow, to }) => (
                <motion.div
                  key={title}
                  variants={{ hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } } }}
                  whileHover={{ y: -6, boxShadow: `0 20px 50px ${glow}` }}
                  transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                  className="group pointer-events-auto"
                >
                  <Link
                    to={to}
                    className="block h-full no-underline"
                  >
                    <div className="relative h-full rounded-2xl bg-white border border-gray-100 shadow-sm p-6 overflow-hidden transition-all duration-300 group-hover:border-gray-200">
                      {/* Gradient blob on hover */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500 rounded-2xl`} />

                      {/* Icon badge */}
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg mb-5`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {title}
                      </h3>

                      {/* Description */}
                      <p className="text-sm text-gray-500 leading-relaxed mb-4">
                        {description}
                      </p>

                      {/* Feature chips */}
                      <div className="space-y-1.5 mb-5">
                        {features.map((f) => (
                          <div key={f} className="flex items-center gap-2 text-xs text-gray-400">
                            <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
                            {f}
                          </div>
                        ))}
                      </div>

                      {/* Arrow CTA */}
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-400 group-hover:text-blue-600 transition-colors">
                        Get Started
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;