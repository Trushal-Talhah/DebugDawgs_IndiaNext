import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Shield, Bot, User,
  ChevronDown, Minimize2, Sparkles,
} from 'lucide-react';

/* ── Static knowledge base for the SentinelAI bot ── */
const SUGGESTED = [
  'What is a phishing attack?',
  'How does deepfake detection work?',
  'What does a high risk score mean?',
  'How to stay safe online?',
];

const FAQ = [
  {
    q: ['phishing', 'phish'],
    a: '🎣 **Phishing** is a cyber-attack where attackers disguise themselves as trusted entities (banks, tech companies, etc.) to trick you into revealing passwords, credit card numbers, or installing malware. SentinelAI analyzes email headers, link patterns, and language cues to detect phishing with high accuracy.',
  },
  {
    q: ['deepfake', 'fake image', 'ai generated', 'deepfake detection'],
    a: '🖼️ **Deepfake detection** uses AI to identify artificially generated or manipulated images and videos. SentinelAI examines pixel-level artifacts, facial inconsistencies, noise patterns, and metadata anomalies to flag synthetic media.',
  },
  {
    q: ['risk score', 'high risk', 'score mean', 'risk'],
    a: '📊 The **Risk Score (0–100)** represents how likely a threat is malicious:\n- **0–39**: Low Risk — generally safe\n- **40–69**: Medium Risk — review carefully\n- **70–100**: High Risk — likely malicious, take action immediately.',
  },
  {
    q: ['safe online', 'safety tips', 'stay safe', 'protect'],
    a: '🛡️ **Staying Safe Online**:\n1. Never click links in suspicious emails\n2. Use multi-factor authentication (MFA)\n3. Keep software updated\n4. Use SentinelAI to scan suspicious content\n5. Verify senders through trusted channels\n6. Use strong, unique passwords',
  },
  {
    q: ['mitre', 'attack', 'att&ck', 'tactics'],
    a: '⚔️ **MITRE ATT&CK** is a globally accessible knowledge base of adversary tactics and techniques. SentinelAI uses a Markov Chain model trained on real APT campaigns to predict the next likely attack stage, helping defenders proactively respond.',
  },
  {
    q: ['prompt injection', 'prompt attack', 'llm attack'],
    a: '💉 **Prompt Injection** is an attack against AI systems where malicious instructions are embedded in input to hijack the AI\'s behavior. SentinelAI detects these patterns using keyword analysis and semantic heuristics.',
  },
  {
    q: ['analyze', 'scan', 'how to'],
    a: '🔍 To **analyze content**, go to the **Analyze** page and:\n1. Choose Auto Scan or Typed Scan\n2. Select input type (Email, URL, General, Image)\n3. Paste content or upload an image\n4. Click **Analyze** — results appear as a horizontal card pipeline!',
  },
  {
    q: ['url', 'link', 'malicious url', 'suspicious link'],
    a: '🔗 **Malicious URL Detection** checks for typosquatting, suspicious TLDs, redirect chains, hidden scripts, and known phishing domains. Paste any URL into SentinelAI to get an instant risk assessment.',
  },
  {
    q: ['hello', 'hi', 'hey', 'greet'],
    a: '👋 Hello! I\'m **SentinelAI Assistant**, your cyber-security guide. Ask me about phishing, deepfakes, risk scores, MITRE ATT&CK, or anything security-related!',
  },
];

function getBotReply(input) {
  const lower = input.toLowerCase();
  for (const entry of FAQ) {
    if (entry.q.some((kw) => lower.includes(kw))) {
      return entry.a;
    }
  }
  return `🤖 I'm not sure about that specific topic. Here's what I can help with:\n- Phishing & email threats\n- Deepfake detection\n- Risk score interpretation\n- MITRE ATT&CK tactics\n- Prompt injection attacks\n- Safe browsing tips\n\nTry rephrasing or pick a suggestion below!`;
}

/* ── Message bubble ── */
function MessageBubble({ msg }) {
  const isBot = msg.role === 'bot';
  return (
    <motion.div
      className={`flex gap-2 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isBot ? 'bg-accent text-white' : 'bg-border text-muted'
      }`}>
        {isBot ? <Bot className="w-4 h-4" /> : <User className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
        isBot
          ? 'bg-panel border border-border text-text rounded-tl-none'
          : 'bg-accent text-white rounded-tr-none'
      }`}>
        {msg.text}
        <div className={`text-[10px] mt-1 ${isBot ? 'text-muted' : 'text-white/70'}`}>
          {msg.time}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Typing indicator ── */
function TypingIndicator() {
  return (
    <motion.div
      className="flex gap-2 items-start"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4" />
      </div>
      <div className="bg-panel border border-border rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 items-center">
        {[0, 0.15, 0.3].map((delay, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-muted rounded-full"
            animate={{ y: [-2, 2, -2] }}
            transition={{ repeat: Infinity, duration: 0.6, delay }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/* ── Main ChatBot Component ── */
export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'bot',
      text: '👋 Hi! I\'m your **SentinelAI Assistant**. Ask me about cybersecurity threats, how the platform works, or get safety tips!',
      time: now(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg = { id: Date.now(), role: 'user', text: msg, time: now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate bot thinking
    setTimeout(() => {
      const reply = getBotReply(msg);
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'bot', text: reply, time: now() }]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* ── Sticky FAB button ── */}
      <motion.button
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-accent text-white shadow-xl flex items-center justify-center"
        style={{ boxShadow: '0 8px 32px rgba(37,99,235,0.35)' }}
        onClick={() => setIsOpen((v) => !v)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.93 }}
        aria-label="Open security assistant"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close"
              initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open"
              initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageCircle className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unread pulse (only when closed and has messages) */}
        {!isOpen && (
          <motion.span
            className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-danger rounded-full border-2 border-white"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}
      </motion.button>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-24 right-6 z-50 w-[360px] max-h-[520px] bg-bg border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.12), 0 0 0 1px rgba(37,99,235,0.08)' }}
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-panel">
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text flex items-center gap-1.5">
                  SentinelAI Assistant
                  <Sparkles className="w-3.5 h-3.5 text-accent" />
                </p>
                <p className="text-xs text-success flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-success rounded-full inline-block" />
                  Online · Security Expert
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-border flex items-center justify-center text-muted hover:text-text transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0" style={{ maxHeight: '320px' }}>
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              <AnimatePresence>
                {isTyping && <TypingIndicator key="typing" />}
              </AnimatePresence>
              <div ref={bottomRef} />
            </div>

            {/* Quick suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-full bg-panel border border-border text-muted hover:text-accent hover:border-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 border-t border-border pt-3">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about cyber threats..."
                  rows={1}
                  className="flex-1 resize-none bg-panel border border-border rounded-xl px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
                  style={{ maxHeight: '80px', overflowY: 'auto' }}
                />
                <motion.button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isTyping}
                  className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  whileTap={{ scale: 0.9 }}
                >
                  <Send className="w-4 h-4" />
                </motion.button>
              </div>
              <p className="text-[10px] text-muted text-center mt-2">
                Powered by SentinelAI · Press Enter to send
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
