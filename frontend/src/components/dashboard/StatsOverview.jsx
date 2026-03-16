import { ShieldAlert, ShieldCheck, AlertTriangle, Ban, Clock } from 'lucide-react';

const STAT_CARDS = [
  { key: 'threatsToday', label: 'Threats Today', icon: ShieldAlert, color: 'text-danger', bg: 'bg-danger-light' },
  { key: 'highRisk', label: 'High Risk', icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger-light' },
  { key: 'mediumRisk', label: 'Medium Risk', icon: ShieldCheck, color: 'text-warning', bg: 'bg-warning-light' },
  { key: 'blockedToday', label: 'Blocked', icon: Ban, color: 'text-success', bg: 'bg-success-light' },
  { key: 'pendingReview', label: 'Pending Review', icon: Clock, color: 'text-accent', bg: 'bg-accent-light' },
];

function StatsOverview({ stats, isLoading = false }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" role="region" aria-label="Threat statistics">
      {STAT_CARDS.map(({ key, label, icon: Icon, color, bg }) => (
        <div
          key={key}
          className="bg-bg rounded-xl border border-border p-4 flex flex-col items-start gap-2"
        >
          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${color}`} />
          </div>
          <div>
            {isLoading ? (
              <div className="w-8 h-6 bg-panel rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-text leading-none">{stats[key] ?? 0}</p>
            )}
            <p className="text-xs text-muted mt-1">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsOverview;
