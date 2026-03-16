import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Mail, RefreshCw, ChevronDown, ChevronUp, Zap,
  AlertCircle, Clock, Inbox
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fetchInbox } from '../../lib/gmail';

/* ── helpers ── */
function formatDate(rawDate) {
  if (!rawDate) return '';
  try {
    const d = new Date(rawDate);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return rawDate; }
}

function senderName(from) {
  if (!from) return '?';
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : from.split('@')[0];
}

function avatarLetter(from) {
  const name = senderName(from);
  return name.charAt(0).toUpperCase();
}

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-600',
  'bg-emerald-100 text-emerald-600',
  'bg-purple-100 text-purple-600',
  'bg-amber-100 text-amber-600',
  'bg-rose-100 text-rose-600',
  'bg-cyan-100 text-cyan-600',
];
function avatarColor(from) {
  let sum = 0;
  for (const c of (from ?? '')) sum += c.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/* ── Mail row ── */
function MailRow({ mail, onSelect, onAnalyze, selected }) {
  const letter = avatarLetter(mail.from);
  const color = avatarColor(mail.from);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className={`border rounded-xl overflow-hidden transition-all ${
        selected ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50/50'
      }`}
    >
      {/* ── collapsed header ── */}
      <button
        onClick={() => onSelect(selected ? null : mail.id)}
        className="w-full text-left px-4 py-3 flex items-center gap-3"
      >
        <span className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${color}`}>
          {letter}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">
              {senderName(mail.from)}
            </span>
            <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(mail.date)}
            </span>
          </div>
          <p className="text-sm text-gray-700 font-medium truncate">{mail.subject}</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{mail.snippet}</p>
        </div>
        <span className="text-gray-400 shrink-0">
          {selected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>

      {/* ── expanded body ── */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <div><span className="font-semibold text-gray-700">From:</span> {mail.from}</div>
                <div><span className="font-semibold text-gray-700">Date:</span> {mail.date}</div>
              </div>
              <div className="mt-3 max-h-52 overflow-y-auto rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
                {mail.body || mail.snippet || '(no content)'}
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onAnalyze(mail)}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-sm shadow-blue-200"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
              >
                <Zap className="w-3.5 h-3.5" />
                Analyze This Email
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   GmailInbox — main exported component
   ══════════════════════════════════════════════ */
export default function GmailInbox({ onAnalyzeEmail }) {
  const { gmailAccessToken, currentUser } = useAuth();

  const [mails, setMails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const debounceRef = useRef(null);

  const isGoogle = currentUser?.providerData?.[0]?.providerId === 'google.com';

  /* ── load / search mails ── */
  const load = useCallback(async (q = '') => {
    if (!gmailAccessToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchInbox(gmailAccessToken, q, 20);
      setMails(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [gmailAccessToken]);

  /* ── initial load ── */
  useEffect(() => {
    if (gmailAccessToken) load('');
  }, [gmailAccessToken, load]);

  /* ── debounced search ── */
  function handleSearchChange(e) {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(val), 500);
  }

  /* ── not a Google user ── */
  if (!isGoogle || !gmailAccessToken) {
    return (
      <div className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm p-6 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Mail className="w-6 h-6 text-blue-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Email Inbox Not Connected</p>
          <p className="text-xs text-gray-500 mt-1 max-w-xs">
            Sign in with Google to fetch your recent emails and analyze them directly from here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* ── header ── */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-blue-500" />
          <span className="text-sm font-semibold text-gray-900">
            {currentUser?.email}'s Inbox
          </span>
        </div>
        <button
          onClick={() => load(query)}
          disabled={loading}
          title="Refresh"
          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* ── search bar ── */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Search emails (e.g. invoice, password reset…)"
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-gray-200 bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-400 transition-all"
          />
        </div>
      </div>

      {/* ── content ── */}
      <div className="p-4 max-h-[520px] overflow-y-auto space-y-2">
        {/* loading skeleton */}
        {loading && mails.length === 0 && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Couldn't load emails</p>
              <p className="text-xs mt-0.5 opacity-80">{error}</p>
              <p className="text-xs mt-1 opacity-60">
                Make sure Gmail API is enabled at <span className="underline">console.cloud.google.com/apis</span>
              </p>
            </div>
          </div>
        )}

        {/* mail list */}
        {!loading && !error && mails.length === 0 && (
          <div className="py-8 text-center text-sm text-gray-400">
            No emails found{query ? ` for "${query}"` : ''}.
          </div>
        )}

        <AnimatePresence>
          {mails.map((mail) => (
            <MailRow
              key={mail.id}
              mail={mail}
              selected={selectedId === mail.id}
              onSelect={setSelectedId}
              onAnalyze={(m) => {
                const content = `From: ${m.from}\nSubject: ${m.subject}\nDate: ${m.date}\n\n${m.body || m.snippet}`;
                onAnalyzeEmail(content);
              }}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
