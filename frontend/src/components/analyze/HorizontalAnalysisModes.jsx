import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Mail, ScanSearch, Image, ArrowRight, Zap } from 'lucide-react';

const ANALYSIS_MODES = [
  {
    id: 'email',
    title: 'Email Analysis',
    description: 'Analyze suspicious emails for phishing, malware, and social engineering attempts',
    icon: Mail,
    gradient: 'from-blue-600 to-blue-400',
    features: ['Phishing Detection', 'Malware Signatures', 'Social Engineering'],
  },
  {
    id: 'general',
    title: 'General Input',
    description: 'Automatically detect and analyze any type of input including URLs, prompts, logs, and AI-generated content',
    icon: ScanSearch,
    gradient: 'from-purple-600 to-purple-400',
    features: ['Auto Classification', 'Multi-type Support', 'Deep Analysis'],
  },
  {
    id: 'image',
    title: 'Deepfake Image',
    description: 'Detect AI-generated or manipulated images and deepfakes',
    icon: Image,
    gradient: 'from-emerald-600 to-emerald-400',
    features: ['AI Generation', 'Manipulation Detection', 'Face Analysis'],
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
    },
  },
  hover: {
    y: -8,
    transition: { duration: 0.3 },
  },
};

function HorizontalAnalysisModes() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-bg via-bg to-bg/95 py-16 px-4 sm:px-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-16"
      >
        {/* <div className="flex items-center justify-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20">
            <Zap className="w-6 h-6 text-blue-500" />
          </div>
          <span className="text-sm font-semibold text-accent">Quick Analysis</span>
        </div> */}
        <h1 className="text-4xl sm:text-5xl font-bold text-text mb-4">
          Choose Your Analysis Mode
        </h1>
        <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto">
          Select the type of content you want to analyze for threats. Our AI-powered detection engine will identify risks and provide detailed insights.
        </p>
      </motion.div>

      {/* Cards Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8"
      >
        {ANALYSIS_MODES.map((mode) => {
          const Icon = mode.icon;
          return (
            <motion.div
              key={mode.id}
              variants={cardVariants}
              whileHover="hover"
              className="group h-full"
            >
              <Link
                to={`/analyze?type=${mode.id}`}
                className="block h-full"
              >
                <div className="relative h-full rounded-2xl overflow-hidden bg-panel border border-border/50 p-8 transition-all duration-500 hover:border-accent/30 hover:shadow-xl hover:shadow-accent/10 group-hover:shadow-2xl">
                  {/* Gradient overlay on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${mode.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                  {/* Content */}
                  <div className="relative z-10 flex flex-col h-full">
                    {/* Icon */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${mode.gradient} p-3 mb-6 shadow-lg shadow-${mode.gradient.split(' ')[1]}/20`}>
                      <Icon className="w-full h-full text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-text mb-3 group-hover:text-accent transition-colors">
                      {mode.title}
                    </h3>

                    {/* Description */}
                    <p className="text-sm text-muted leading-relaxed mb-6 flex-grow">
                      {mode.description}
                    </p>

                    {/* Features */}
                    <div className="space-y-2 mb-6">
                      {mode.features.map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-xs text-muted/70">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${mode.gradient}`} />
                          {feature}
                        </div>
                      ))}
                    </div>

                    {/* CTA Button */}
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r ${mode.gradient} text-black text-sm font-semibold shadow-lg transition-all"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </motion.div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Bottom decoration */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 1 }}
        className="mt-20 text-center"
      >
        <p className="text-xs text-muted/50">
          Real-time threat detection powered by advanced AI models
        </p>
      </motion.div>
    </div>
  );
}

export default HorizontalAnalysisModes;