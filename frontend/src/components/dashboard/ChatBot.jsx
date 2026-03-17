import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle, X, Send, Shield, Bot, User,
  Minimize2, Sparkles, FileText, AlertTriangle,
  TrendingUp, Search, BarChart2, Copy, Check,
  RefreshCw, Terminal, Maximize2
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, '');
const NIM_MODEL   = 'meta/llama-3.1-8b-instruct';

const SYSTEM_PROMPT = `You are SentinelAI Analyst — an elite cybersecurity SOC analyst AI embedded inside the SentinelAI threat detection platform. You are NOT a general chatbot. You are a professional analyst with full live access to incident data.

- When showing statistics that would benefit from a chart, output a special chart block like this:
[CHART:bar]
Label 1|42
Label 2|21
Label 3|8
Label 4|4
[/CHART]
- Use this for threat type breakdowns, risk distributions, MITRE stage frequencies
- Always put the chart AFTER the table, not instead of it
- NEVER output plain text label/number lists outside of chart blocks or tables

## Platform
SentinelAI detects: Phishing (T1566), Malicious URLs, Deepfakes, Prompt Injection, Anomalous Logins (T1110), AI-Generated Content.
Fusion Engine: Multi-vector compound threat detection.
MITRE ATT&CK Prediction Engine: First-order Markov Chain trained on 213 real APT campaigns. Wilson Score 95% CI. Sheyner et al., IEEE S&P 2002.

## MITRE ATT&CK Stages
1.Reconnaissance 2.Resource Development 3.Initial Access 4.Execution 5.Persistence 6.Privilege Escalation 7.Defense Evasion 8.Credential Access 9.Discovery 10.Lateral Movement 11.Collection 12.Command & Control 13.Exfiltration 14.Impact

## Risk Scoring: 0-39 Low | 40-69 Medium | 70-89 High | 90-100 Critical

## Response Rules
- Always use clean markdown: headers, tables, bullet lists, code blocks
- Reports: Executive Summary → Stats Table → Threat Breakdown → MITRE Analysis → IOCs → Actions
- Threat analysis: Verdict → Risk Score → MITRE Stage → Predicted Next Moves → Response Actions
- IOC reports: code blocks organized by type
- Cite MITRE technique IDs (T1566, T1110, etc.)
- Compute REAL statistics from incident data — never estimate
- End every analysis with a numbered priority action list
- Be concise and professional`;

const QUICK_ACTIONS = [
  { icon: FileText,      label: '7-day report',        prompt: 'Generate a comprehensive security incident report for the last 7 days using the live incident data. Include: (1) Executive Summary, (2) Incident statistics table by threat type with percentages, (3) Risk score distribution table, (4) MITRE ATT&CK stages observed, (5) Top IOCs, (6) Numbered recommendations by priority. Use real numbers from the data.' },
  { icon: AlertTriangle, label: 'Latest threat',        prompt: 'Analyse the most recent incident in the live data. Provide: verdict, risk score, MITRE ATT&CK stage mapped with technique ID, predicted next attack moves with probabilities, potential blast radius, and immediate response actions.' },
  { icon: TrendingUp,    label: 'Trend analysis',       prompt: 'Perform a threat trend analysis on all incident data. Which threat types are most frequent? Are any increasing? What are the peak attack time windows? Which input types are most targeted? Show computed percentages from the real data.' },
  { icon: Search,        label: 'Extract IOCs',         prompt: 'Extract all Indicators of Compromise from the incident data. Organize into sections with code blocks: IP Addresses, Domains, URLs, Email Addresses, Patterns. Include frequency counts.' },
  { icon: BarChart2,     label: 'MITRE heat map',       prompt: 'Analyse MITRE ATT&CK stages across all incidents. Create a frequency table showing which stages appear most. For the top 3 active stages show: count, top 2 predicted next moves with probabilities from the Markov Chain model, and specific defensive actions.' },
  { icon: Terminal,      label: 'Remediation playbook', prompt: 'Generate a prioritized remediation playbook from the incident data. Group by threat type sorted by highest risk score. For each: Containment steps, Eradication steps, Recovery steps, Prevention measures.' },
];

// ── CHART RENDERING ───────────────────────────────────────────────────────────

function makeBarChart(rows, colors) {
  if (!rows.length) return '';
  const max = Math.max(...rows.map(r => r.value));
  if (max === 0) return '';
  return `<div style="background:#f7f8fa;border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:6px 0 8px;">` +
    rows.map((r, i) => {
      const pct = Math.round((r.value / max) * 100);
      return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <div style="width:130px;font-size:10px;color:#6b7280;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.label}">${r.label}</div>
        <div style="flex:1;background:#f1f5f9;border-radius:4px;height:18px;overflow:hidden;">
          <div style="width:${pct}%;background:${colors[i % colors.length]};height:100%;border-radius:4px;display:flex;align-items:center;justify-content:flex-end;padding-right:5px;min-width:20px;">
            <span style="font-size:9px;color:#fff;font-weight:600;">${r.display}</span>
          </div>
        </div>
      </div>`;
    }).join('') +
    `</div>`;
}

const CHART_COLORS = ['#2563eb','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe'];

// Step 1: Convert [CHART:bar]...[/CHART] blocks to rendered HTML
function renderCharts(text) {
  // First strip any plain text label+number dumps that appear right before [CHART:bar]
  // These look like lines alternating "Label\n17\nLabel\n12\n..."
  // Strip plain text label+number dumps before chart blocks
  let cleaned = text.replace(
    /((?:^[^\n|[]+\n\d+\.?\d*\n)+)\s*(?=\[CHART:bar\])/gm,
    ''
  );
// Also strip any leftover sequences of blank lines (3+ newlines → single newline)
cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.replace(
    /\[CHART:bar\]([\s\S]+?)\[\/CHART\]/g,
    (_, data) => {
      const rows = data.trim().split('\n')
        .map(r => r.trim()).filter(Boolean)
        .map(r => {
          const lastPipe = r.lastIndexOf('|');
          if (lastPipe === -1) return null;
          const label = r.substring(0, lastPipe).trim();
          const raw   = r.substring(lastPipe + 1).trim();
          const value = parseFloat(raw.replace(/[%,]/g, '')) || 0;
          return { label, value, display: raw };
        })
        .filter(Boolean);
      return makeBarChart(rows, CHART_COLORS);
    }
  );
}

// Step 2: After md() converts tables to HTML, auto-append chart under each numeric table
function autoChart(html) {
  // Split on table boundaries so we can process each table independently
  const parts = html.split(/(?=<table class="mtable">)|(?<=<\/table>)/g);

  return parts.map((part, idx) => {
    if (!part.startsWith('<table class="mtable">')) return part;

    // Check if next part already starts with a chart div (from renderCharts)
    const next = parts[idx + 1] || '';
    if (next.trimStart().startsWith('<div style="background:#f7f8fa')) return part;

    const rows = [...part.matchAll(/<tr>([\s\S]+?)<\/tr>/g)];
    if (rows.length < 2) return part;

    const dataRows = rows.slice(1).map(r => {
      const cells = [...r[1].matchAll(/<td class="mtd">([\s\S]+?)<\/td>/g)].map(c => c[1]);
      return cells;
    }).filter(r => {
      if (r.length < 2) return false;
      const val = parseFloat(r[1].replace(/[%,]/g, ''));
      return !isNaN(val) && val > 0;
    });

    if (dataRows.length < 2) return part;

    const chartRows = dataRows.map(r => ({
      label:   r[0],
      value:   parseFloat(r[1].replace(/[%,]/g, '')),
      display: r[1],
    }));

    return part + makeBarChart(chartRows, CHART_COLORS);
  }).join('')
  .replace(/(<div class="msp"><\/div>\s*){2,}/g, '<div class="msp"></div>');
}

// ── MARKDOWN → HTML ───────────────────────────────────────────────────────────

function md(text) {
  if (!text) return '';
  return text
    .replace(/```[\w]*\n?([\s\S]+?)```/g, '<pre class="mpre"><code>$1</code></pre>')
    .replace(/^#### (.+)$/gm, '<h4 class="mh4">$1</h4>')
    .replace(/^### (.+)$/gm,  '<h3 class="mh3">$1</h3>')
    .replace(/^## (.+)$/gm,   '<h2 class="mh2">$1</h2>')
    .replace(/^# (.+)$/gm,    '<h1 class="mh1">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`([^`\n]+)`/g,   '<code class="mc">$1</code>')
    .replace(/^\|(.+)\|$/gm, (_, row) => {
      const cells = row.split('|').map(c => c.trim());
      if (cells.every(c => /^[-:\s]+$/.test(c))) return '';
      return '<tr>' + cells.map(c => `<td class="mtd">${c}</td>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*?<\/tr>\s*)+/gs, m => `<table class="mtable">${m}</table>`)
    .replace(/^---+$/gm, '<hr class="mhr"/>')
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="moli">$1</li>')
    .replace(/^[-*]\s+(.+)$/gm,  '<li class="mli">$1</li>')
    .replace(/(<li class="moli">.*?<\/li>\s*)+/gs, m => `<ol class="mol">${m}</ol>`)
    .replace(/(<li class="mli">.*?<\/li>\s*)+/gs,  m => `<ul class="mul">${m}</ul>`)
    .replace(/\n{2,}/g, '<div class="msp"></div>')
    .replace(/\n/g,     '<br/>');
}

// ── COPY BUTTON ───────────────────────────────────────────────────────────────

function CopyBtn({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button className="cbtn" onClick={() => {
      navigator.clipboard.writeText(text);
      setOk(true); setTimeout(() => setOk(false), 2000);
    }}>
      {ok ? <Check size={10}/> : <Copy size={10}/>}
    </button>
  );
}

// ── STAT PILL ─────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }) {
  return (
    <div className="spill" style={{ borderColor: color + '40', background: color + '0f' }}>
      <span className="spv" style={{ color }}>{value}</span>
      <span className="spl">{label}</span>
    </div>
  );
}

// ── BUBBLE ────────────────────────────────────────────────────────────────────

function Bubble({ msg }) {
  const bot = msg.role === 'bot';
  return (
    <motion.div className={`bwrap ${bot ? 'bbot' : 'buser'}`}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
      <div className={`bav ${bot ? 'bavbot' : 'bavuser'}`}>
        {bot ? <Bot size={13}/> : <User size={12}/>}
      </div>
      <div className={`bb ${bot ? 'bbbot' : 'bbuser'}`}>
        {bot
          ? <div className="mbody" dangerouslySetInnerHTML={{
              __html: autoChart(md(renderCharts(msg.text)))
            }}/>
          : <p className="utext">{msg.text}</p>
        }
        <div className="bfoot">
          <span className="btime">{msg.time}</span>
          {bot && <CopyBtn text={msg.text}/>}
        </div>
      </div>
    </motion.div>
  );
}

// ── TYPING ────────────────────────────────────────────────────────────────────

function Typing({ stage }) {
  return (
    <motion.div className="bwrap bbot"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="bav bavbot"><Bot size={13}/></div>
      <div className="bb bbbot tdwrap">
        <div className="tdots">
          {[0, 0.15, 0.3].map((d, i) => (
            <motion.span key={i} className="tdot"
              animate={{ y: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 0.55, delay: d }}/>
          ))}
        </div>
        {stage && <span className="tstage">{stage}</span>}
      </div>
    </motion.div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

export default function ChatBot() {
  const [open,      setOpen]      = useState(false);
  const [expanded,  setExpanded]  = useState(false);
  const [input,     setInput]     = useState('');
  const [msgs,      setMsgs]      = useState([{
    id: 0, role: 'bot', time: now(),
    text: `## SentinelAI Analyst\n\nI'm your **dedicated security analyst companion** with live access to all incident data. I can:\n\n- **Generate full incident reports** with real statistics and charts\n- **Analyse any threat** with MITRE ATT&CK mapping and predictions\n- **Extract IOCs** organized by type from all incidents\n- **Build remediation playbooks** from your actual threat landscape\n- **Answer any security question** with full platform context\n\nUse the quick actions below or ask anything.`,
  }]);
  const [typing,    setTyping]    = useState(false);
  const [typingMsg, setTypingMsg] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [stats,     setStats]     = useState(null);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);
  const abortRef  = useRef(null);

  function now() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  useEffect(() => {
    if (!open) return;
    fetch(`${BACKEND_URL}/api/incidents`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.incidents || []);
        setIncidents(list);
        if (!list.length) return;
        const high    = list.filter(i => (i.risk_score || 0) >= 70).length;
        const med     = list.filter(i => (i.risk_score || 0) >= 40 && (i.risk_score || 0) < 70).length;
        const threats = list.filter(i => i.verdict && i.verdict !== 'SAFE').length;
        const types   = {};
        list.forEach(i => {
          const k = (i.threat_type || 'Unknown').split(' ')[0];
          types[k] = (types[k] || 0) + 1;
        });
        const topType = Object.entries(types).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        setStats({ total: list.length, high, med, threats, topType });
      })
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  function buildPayload(userText) {
    let sys = SYSTEM_PROMPT;
    if (incidents.length > 0) {
      const isSimple = userText.split(' ').length < 15;
      if (isSimple) {
        const summary = { total: incidents.length, by_type: {}, by_verdict: {},
          avg_risk: Math.round(incidents.reduce((s, i) => s + (i.risk_score || 0), 0) / incidents.length),
          recent_5: incidents.slice(0, 5).map(i => ({
            threat_type: i.threat_type, verdict: i.verdict,
            risk_score: i.risk_score, timestamp: i.timestamp
          }))
        };
        incidents.forEach(i => {
          const t = i.threat_type || 'Unknown';
          summary.by_type[t] = (summary.by_type[t] || 0) + 1;
          summary.by_verdict[i.verdict] = (summary.by_verdict[i.verdict] || 0) + 1;
        });
        sys += `\n\n## INCIDENT SUMMARY (${incidents.length} total)\n\`\`\`json\n${JSON.stringify(summary, null, 2)}\n\`\`\``;
      } else {
        const recent = incidents.slice(0, 60);
        sys += `\n\n## LIVE INCIDENT DATA — ${recent.length} incidents\n\`\`\`json\n${JSON.stringify(recent, null, 2)}\n\`\`\`\nIMPORTANT: Compute real statistics from this data. Never estimate.`;
      }
    } else {
      sys += `\n\nNOTE: No incident data loaded. Answer from platform knowledge only.`;
    }

    const history = msgs
      .filter(m => m.id !== 0)
      .slice(-10)
      .map(m => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }));

    return {
      model: NIM_MODEL,
      messages: [
        { role: 'system', content: sys },
        ...history,
        { role: 'user', content: userText },
      ],
      temperature: 0.2,
      max_tokens: 2048,
      stream: false,
    };
  }

  const send = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || typing) return;

    setInput('');
    setMsgs(p => [...p, { id: Date.now(), role: 'user', text: msg, time: now() }]);
    setTyping(true);
    setTypingMsg('Connecting to NVIDIA NIM...');

    try {
      abortRef.current = new AbortController();
      setTypingMsg('Analysing with LLaMA 8B...');

      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        signal: abortRef.current.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(msg)),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText  = '';
      const botId   = Date.now() + 1;

      setMsgs(p => [...p, { id: botId, role: 'bot', text: '...', time: now() }]);
      setTyping(false);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          // Flush remaining buffer on done
          if (buffer.trim()) {
            fullText += buffer;
            setMsgs(p => p.map(m => m.id === botId ? { ...m, text: fullText } : m));
          }
          break;
        }
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        buffer  += chunk;

        // Only re-render every ~150 chars — smooth but not stuttery
        if (buffer.length >= 150) {
          buffer = '';
          setMsgs(p => p.map(m => m.id === botId ? { ...m, text: fullText } : m));
        }
      }

      if (!fullText.trim()) throw new Error('Empty response — check NVIDIA_API_KEY in backend/.env');

    } catch (err) {
      if (err.name === 'AbortError') return;
      setMsgs(p => [...p, {
        id: Date.now() + 1, role: 'bot', time: now(),
        text: `## Error\n\n**${err.message}**\n\nTroubleshooting:\n- Check \`NVIDIA_API_KEY\` is set in \`backend/.env\`\n- Check \`/api/chat\` endpoint is running\n- Check NVIDIA NIM quota at console.api.nvidia.com`,
      }]);
    } finally {
      setTyping(false);
      setTypingMsg('');
    }
  }, [input, typing, msgs, incidents]);

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function stop() {
    abortRef.current?.abort();
    setTyping(false); setTypingMsg('');
  }

  function clear() {
    setMsgs([{ id: Date.now(), role: 'bot', time: now(),
      text: `## Chat Cleared\n\n${incidents.length} incidents in context. Ready for analysis.` }]);
  }

  const panelW = expanded ? '680px' : '420px';
  const panelH = expanded ? '82vh'  : '600px';

  return (
    <>
      <style>{`
        .sfab {
          position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
          width:52px; height:52px; border-radius:50%;
          background:#2563eb; color:#fff; border:none; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          box-shadow:0 4px 18px rgba(37,99,235,0.32); transition:box-shadow 0.2s;
        }
        .sfab:hover { box-shadow:0 6px 24px rgba(37,99,235,0.44); }
        .sfab-pulse {
          position:absolute; top:-2px; right:-2px; width:11px; height:11px;
          background:#dc2626; border-radius:50%; border:2px solid #fff;
        }
        .spanel {
          position:fixed; bottom:5rem; right:1.5rem; z-index:9998;
          background:#fff; border:1px solid #e5e7eb; border-radius:16px;
          display:flex; flex-direction:column; overflow:hidden;
          box-shadow:0 8px 40px rgba(0,0,0,0.10), 0 0 0 1px rgba(37,99,235,0.05);
          font-family:"Inter",ui-sans-serif,system-ui,sans-serif;
          font-size:13px; color:#111827;
          transition:width 0.28s ease, max-height 0.28s ease;
        }
        .sh {
          display:flex; align-items:center; gap:9px; padding:11px 13px;
          border-bottom:1px solid #e5e7eb; background:#f7f8fa; flex-shrink:0;
        }
        .sh-logo {
          width:30px; height:30px; border-radius:7px; background:#2563eb; color:#fff;
          display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .sh-name { font-size:12.5px; font-weight:600; color:#111827; display:flex; align-items:center; gap:4px; }
        .sh-sub  { font-size:10px; color:#059669; display:flex; align-items:center; gap:3px; margin-top:1px; }
        .sh-dot  { width:5px; height:5px; background:#059669; border-radius:50%; }
        .sh-cnt  { font-size:10px; color:#9ca3af; margin-left:auto; white-space:nowrap; }
        .shb {
          width:24px; height:24px; border-radius:5px; border:none;
          background:transparent; color:#9ca3af; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          transition:background 0.13s, color 0.13s;
        }
        .shb:hover { background:#e5e7eb; color:#374151; }
        .sbar {
          display:flex; gap:5px; padding:7px 12px;
          border-bottom:1px solid #e5e7eb; background:#fafafa;
          flex-shrink:0; overflow-x:auto; scrollbar-width:none;
        }
        .spill {
          display:flex; flex-direction:column; align-items:center;
          padding:4px 9px; border-radius:7px; border:1px solid;
          white-space:nowrap; flex-shrink:0; min-width:48px;
        }
        .spv { font-size:13px; font-weight:700; line-height:1.1; }
        .spl { font-size:9px; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; margin-top:1px; }
        .smsgs {
          flex:1; overflow-y:auto; padding:12px 11px;
          display:flex; flex-direction:column; gap:10px; min-height:0;
          scrollbar-width:thin; scrollbar-color:#e5e7eb transparent;
        }
        .bwrap { display:flex; gap:7px; align-items:flex-start; }
        .bbot  { flex-direction:row; }
        .buser { flex-direction:row-reverse; }
        .bav {
          width:24px; height:24px; border-radius:50%; flex-shrink:0;
          display:flex; align-items:center; justify-content:center; margin-top:2px;
        }
        .bavbot  { background:#2563eb; color:#fff; }
        .bavuser { background:#e5e7eb; color:#6b7280; }
        .bb      { max-width:86%; border-radius:12px; padding:8px 11px; }
        .bbbot   { background:#f7f8fa; border:1px solid #e5e7eb; border-radius:12px 12px 12px 3px; }
        .bbuser  { background:#2563eb; color:#fff; border-radius:12px 12px 3px 12px; }
        .utext   { font-size:12.5px; line-height:1.55; white-space:pre-wrap; word-break:break-word; }
        .bfoot   { display:flex; align-items:center; justify-content:space-between; margin-top:4px; }
        .btime   { font-size:10px; color:rgba(0,0,0,0.28); }
        .bbuser .btime { color:rgba(255,255,255,0.5); }
        .cbtn    { background:transparent; border:none; cursor:pointer; color:rgba(0,0,0,0.22); padding:2px; border-radius:3px; display:flex; }
        .cbtn:hover { color:rgba(0,0,0,0.5); }
        .tdwrap  { display:flex; align-items:center; gap:8px; padding:8px 11px !important; }
        .tdots   { display:flex; gap:3px; align-items:center; }
        .tdot    { width:5px; height:5px; background:#2563eb; border-radius:50%; display:inline-block; }
        .tstage  { font-size:10px; color:#9ca3af; }
        .sqas    { padding:7px 11px 5px; border-top:1px solid #e5e7eb; flex-shrink:0; }
        .sqas-lbl { font-size:9px; color:#9ca3af; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:5px; }
        .sqas-grid { display:grid; grid-template-columns:1fr 1fr; gap:4px; }
        .qabtn {
          display:flex; align-items:center; gap:6px; padding:5px 8px; border-radius:6px;
          border:1px solid #e5e7eb; background:#fafafa; color:#374151;
          cursor:pointer; font-size:11px; font-family:inherit; text-align:left; transition:all 0.13s;
        }
        .qabtn:hover { background:#dbeafe; border-color:#bfdbfe; color:#1d4ed8; }
        .qaico { color:#2563eb; flex-shrink:0; }
        .sinput { padding:7px 10px 9px; border-top:1px solid #e5e7eb; background:#f7f8fa; flex-shrink:0; }
        .sirow  { display:flex; gap:6px; align-items:flex-end; }
        .sta {
          flex:1; resize:none; max-height:76px; overflow-y:auto;
          background:#fff; border:1px solid #e5e7eb; border-radius:8px;
          padding:7px 10px; font-size:12.5px; font-family:inherit;
          color:#111827; outline:none; line-height:1.5; transition:border-color 0.14s;
        }
        .sta::placeholder { color:#9ca3af; }
        .sta:focus { border-color:#2563eb; }
        .sbtn {
          width:32px; height:32px; border-radius:7px; background:#2563eb;
          border:none; color:#fff; cursor:pointer;
          display:flex; align-items:center; justify-content:center;
          flex-shrink:0; transition:background 0.13s;
        }
        .sbtn:hover:not(:disabled) { background:#1d4ed8; }
        .sbtn:disabled { opacity:0.35; cursor:not-allowed; }
        .sstop {
          width:32px; height:32px; border-radius:7px;
          background:#fee2e2; border:1px solid #fca5a5; color:#dc2626;
          cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0;
        }
        .shint { font-size:9px; color:#d1d5db; text-align:center; margin-top:4px; letter-spacing:0.02em; }
        .mbody { font-size:12.5px; line-height:1.65; color:#374151; }
        .mbody .mh1 { font-size:14.5px; font-weight:700; color:#111827; margin:8px 0 5px; border-bottom:1.5px solid #e5e7eb; padding-bottom:4px; }
        .mbody .mh2 { font-size:13px; font-weight:600; color:#1d4ed8; margin:7px 0 3px; }
        .mbody .mh3 { font-size:12px; font-weight:600; color:#2563eb; margin:5px 0 2px; }
        .mbody .mh4 { font-size:11.5px; font-weight:600; color:#4b5563; margin:4px 0 2px; }
        .mbody strong { color:#111827; font-weight:600; }
        .mbody em { color:#6b7280; font-style:italic; }
        .mbody .mc { background:#dbeafe; color:#1d4ed8; padding:1px 5px; border-radius:4px; font-size:11px; font-family:"Menlo","Monaco",monospace; }
        .mbody .mpre { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:7px; padding:9px 11px; margin:7px 0; overflow-x:auto; }
        .mbody .mpre code { color:#1e40af; font-size:11px; line-height:1.6; font-family:"Menlo","Monaco",monospace; white-space:pre; }
        .mbody .mtable { width:100%; border-collapse:collapse; margin:7px 0; font-size:11.5px; }
        .mbody .mtd { padding:4px 8px; border:1px solid #e5e7eb; color:#374151; }
        .mbody tr:first-child .mtd { color:#111827; font-weight:600; background:#f7f8fa; }
        .mbody .mul, .mbody .mol { padding-left:0; margin:3px 0; list-style:none; }
        .mbody .mli { padding:2px 0 2px 13px; position:relative; color:#4b5563; font-size:12px; }
        .mbody .mli::before { content:'›'; position:absolute; left:0; color:#2563eb; font-weight:700; }
        .mbody .mol { counter-reset:olic; }
        .mbody .moli { padding:2px 0 2px 18px; position:relative; color:#4b5563; font-size:12px; counter-increment:olic; }
        .mbody .moli::before { content:counter(olic)"."; position:absolute; left:0; color:#2563eb; font-weight:600; font-size:11px; }
        .mbody .mhr { border:none; border-top:1px solid #e5e7eb; margin:7px 0; }
        .mbody .msp { height:4px; }
      `}</style>

      <motion.button className="sfab" onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}>
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.12 }}><X size={20}/></motion.div>
            : <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.12 }}><MessageCircle size={20}/></motion.div>
          }
        </AnimatePresence>
        {!open && <motion.span className="sfab-pulse" animate={{ scale: [1, 1.35, 1] }} transition={{ repeat: Infinity, duration: 2 }}/>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div className="spanel"
            style={{ width: panelW, maxHeight: panelH }}
            initial={{ opacity: 0, y: 14, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 430, damping: 35 }}>

            <div className="sh">
              <div className="sh-logo"><Shield size={15}/></div>
              <div>
                <div className="sh-name">SentinelAI Analyst <Sparkles size={10} style={{ color: '#2563eb' }}/></div>
                <div className="sh-sub"><span className="sh-dot"/>Online · LLaMA 8B</div>
              </div>
              <span className="sh-cnt">{incidents.length} incidents</span>
              <button className="shb" onClick={() => setExpanded(v => !v)} title={expanded ? 'Compact' : 'Expand'}><Maximize2 size={11}/></button>
              <button className="shb" onClick={clear} title="Clear"><RefreshCw size={11}/></button>
              <button className="shb" onClick={() => setOpen(false)} title="Close"><Minimize2 size={11}/></button>
            </div>

            {stats && (
              <div className="sbar">
                <StatPill label="Total"   value={stats.total}   color="#2563eb"/>
                <StatPill label="Threats" value={stats.threats} color="#dc2626"/>
                <StatPill label="High"    value={stats.high}    color="#f59e0b"/>
                <StatPill label="Medium"  value={stats.med}     color="#6b7280"/>
                <StatPill label={stats.topType} value="Top"     color="#059669"/>
              </div>
            )}

            <div className="smsgs">
              {msgs.map(m => <Bubble key={m.id} msg={m}/>)}
              <AnimatePresence>
                {typing && <Typing key="t" stage={typingMsg}/>}
              </AnimatePresence>
              <div ref={bottomRef}/>
            </div>

            {!typing && (
              <div className="sqas">
                <div className="sqas-lbl">Quick Actions</div>
                <div className="sqas-grid">
                  {QUICK_ACTIONS.map((a, i) => (
                    <button key={i} className="qabtn" onClick={() => send(a.prompt)}>
                      <a.icon size={11} className="qaico"/>
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="sinput">
              <div className="sirow">
                <textarea ref={inputRef} className="sta"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="Generate report, analyse threat, extract IOCs..."
                  rows={1}/>
                {typing
                  ? <button className="sstop" onClick={stop}><X size={13}/></button>
                  : <button className="sbtn" onClick={() => send()} disabled={!input.trim()}><Send size={13}/></button>
                }
              </div>
              <div className="shint">ENTER to send · SHIFT+ENTER new line · {incidents.length} incidents in context</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}