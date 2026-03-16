import { useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/* ── colour tokens ── */
const C = {
  blue:   '#3b82f6',
  green:  '#10b981',
  amber:  '#f59e0b',
  red:    '#ef4444',
  purple: '#8b5cf6',
};

/* ── data ── */
const TREND_DATA = [
  { day: 'Mon', threats: 6,  blocked: 4, flagged: 2 },
  { day: 'Tue', threats: 9,  blocked: 7, flagged: 2 },
  { day: 'Wed', threats: 4,  blocked: 3, flagged: 1 },
  { day: 'Thu', threats: 12, blocked: 9, flagged: 3 },
  { day: 'Fri', threats: 7,  blocked: 5, flagged: 2 },
  { day: 'Sat', threats: 3,  blocked: 2, flagged: 1 },
  { day: 'Sun', threats: 8,  blocked: 6, flagged: 2 },
];

const TYPE_DATA = [
  { name: 'Email',    value: 42, color: C.blue },
  { name: 'URL',      value: 28, color: C.purple },
  { name: 'Prompt',   value: 18, color: C.amber },
  { name: 'Deepfake', value: 8,  color: C.red },
  { name: 'AI Text',  value: 4,  color: C.green },
];

const ACTION_DATA = [
  { name: 'Quarantined', count: 14 },
  { name: 'Blocked',     count: 11 },
  { name: 'Flagged',     count: 7 },
  { name: 'Cleared',     count: 18 },
];

/* ── Custom tooltip ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.90)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.7)',
      borderRadius: 12,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
    }}>
      <p style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block' }} />
          <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{entry.name}:</span>
          <span style={{ fontWeight: 700, color: '#111827' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Donut centre text ── */
function DonutCenter({ cx, cy, total }) {
  return (
    <text>
      <tspan x={cx} y={cy - 4} textAnchor="middle" fill="#111827" fontSize={22} fontWeight={700}>{total}</tspan>
      <tspan x={cx} y={cy + 16} textAnchor="middle" fill="#94a3b8" fontSize={11}>total</tspan>
    </text>
  );
}

/* ══════════════════════════════════════
   Glassmorphic wobble card
   ══════════════════════════════════════ */
function ChartCard({ title, subtitle, children, className = '' }) {
  const ref = useRef(null);
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const sp = { stiffness: 180, damping: 18, mass: 0.5 };
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [3, -3]), sp);
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-3, 3]), sp);
  const glareX = useTransform(rawX, [-0.5, 0.5], ['5%', '95%']);
  const glareY = useTransform(rawY, [-0.5, 0.5], ['5%', '95%']);

  function onMouseMove(e) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rawX.set((e.clientX - r.left) / r.width  - 0.5);
    rawY.set((e.clientY - r.top)  / r.height - 0.5);
  }
  function onMouseLeave() { rawX.set(0); rawY.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      whileHover={{ scale: 1.022, boxShadow: '0 32px 80px rgba(59,130,246,0.18), 0 8px 20px rgba(0,0,0,0.06)' }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ type: 'spring', stiffness: 240, damping: 22 }}
      className={`relative rounded-2xl p-5 overflow-hidden cursor-default select-none ${className}`}
      style={{
        background: 'rgba(255,255,255,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.75)',
        boxShadow: '0 6px 28px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.85)',
        rotateX,
        rotateY,
        transformStyle: 'preserve-3d',
        perspective: 900,
      }}
    >
      {/* Mouse-following prismatic glare */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: useTransform(
            [glareX, glareY],
            ([gx, gy]) =>
              `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0.0) 60%)`
          ),
        }}
      />
      {/* Top edge gloss line */}
      <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white to-transparent pointer-events-none opacity-90" />

      <div className="relative mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="relative">{children}</div>
    </motion.div>
  );
}


/* ══════════════════════════════════════
   DashboardCharts
   ══════════════════════════════════════ */
function DashboardCharts({ stats }) {
  const total = TYPE_DATA.reduce((s, d) => s + d.value, 0);

  const RISK_DATA = [
    { name: 'High Risk',   value: stats?.highRisk   || 2, color: C.red },
    { name: 'Medium Risk', value: stats?.mediumRisk || 3, color: C.amber },
    { name: 'Low Risk',    value: stats?.lowRisk    || 3, color: C.green },
  ];
  const riskTotal = RISK_DATA.reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5">

      {/* ── Row 1: 7-day area trend ── */}
      <ChartCard
        title="Threat Activity — Last 7 Days"
        subtitle="Detected threats, blocked actions, and flagged reviews per day"
      >
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={TREND_DATA} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <defs>
              {[['gThreats', C.blue], ['gBlocked', C.red], ['gFlagged', C.amber]].map(([id, clr]) => (
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={clr} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={clr} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6b7280', paddingTop: 8 }} />
            {[
              { key: 'threats', stroke: C.blue,  fill: 'url(#gThreats)' },
              { key: 'blocked', stroke: C.red,   fill: 'url(#gBlocked)' },
              { key: 'flagged', stroke: C.amber, fill: 'url(#gFlagged)' },
            ].map(({ key, stroke, fill }) => (
              <Area key={key} type="monotone" dataKey={key} stroke={stroke} strokeWidth={2}
                fill={fill} dot={{ r: 3, fill: stroke }} activeDot={{ r: 5 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ── Row 2: two donut charts ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <ChartCard title="Risk Level Distribution" subtitle="High / Medium / Low breakdown across all incidents">
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={RISK_DATA} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                  paddingAngle={3} dataKey="value" startAngle={90} endAngle={450}>
                  {RISK_DATA.map((e) => <Cell key={e.name} fill={e.color} stroke="none" />)}
                </Pie>
                <DonutCenter cx={90} cy={90} total={riskTotal} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {RISK_DATA.map((e) => (
                <div key={e.name} className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: e.color }} />
                  <div>
                    <p className="text-xs font-medium text-gray-700">{e.name}</p>
                    <p className="text-xs text-gray-400">
                      {e.value}&nbsp;
                      <span className="text-gray-300">({riskTotal ? Math.round((e.value / riskTotal) * 100) : 0}%)</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Threat Type Mix" subtitle="Distribution of analyzed content categories">
          <div className="flex items-center justify-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie data={TYPE_DATA} cx="50%" cy="50%" innerRadius={52} outerRadius={80}
                  paddingAngle={3} dataKey="value" startAngle={90} endAngle={450}>
                  {TYPE_DATA.map((e) => <Cell key={e.name} fill={e.color} stroke="none" />)}
                </Pie>
                <DonutCenter cx={90} cy={90} total={total} />
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {TYPE_DATA.map((e) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.color }} />
                  <span className="text-xs font-medium text-gray-600">{e.name}</span>
                  <span className="ml-auto text-xs text-gray-400 font-semibold">{e.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>

      {/* ── Row 3: response actions bar ── */}
      <ChartCard title="Response Actions Taken" subtitle="Count of each automated action across all processed incidents">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={ACTION_DATA} margin={{ top: 4, right: 8, bottom: 0, left: -20 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {ACTION_DATA.map((e, i) => {
                const clrs = [C.red, C.blue, C.amber, C.green];
                return <Cell key={e.name} fill={clrs[i % clrs.length]} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  );
}

export default DashboardCharts;
