import { Link } from 'react-router-dom';
import { Mail, Link as LinkIcon, MessageSquare, ArrowRight } from 'lucide-react';
import StatusPill from '../shared/StatusPill';

const TYPE_ICONS = {
  email: Mail,
  url: LinkIcon,
  prompt: MessageSquare,
};

function getRiskColor(risk) {
  if (risk >= 70) return 'text-danger font-semibold';
  if (risk >= 40) return 'text-warning font-semibold';
  return 'text-success';
}

function RecentIncidents({ incidents }) {
  return (
    <div className="bg-bg rounded-xl border border-border overflow-hidden" role="region" aria-label="Recent incidents">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h3 className="text-base font-semibold text-text">Recent Incidents</h3>
        <Link
          to="/incidents"
          className="flex items-center gap-1 text-xs text-accent font-medium hover:text-accent/80 no-underline transition-colors"
        >
          View all
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Incidents table">
          <thead>
            <tr className="border-b border-border bg-panel/50">
              <th className="text-left px-5 py-2.5 text-xs font-medium text-muted">ID</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted">Type</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted">Source</th>
              <th className="text-center px-3 py-2.5 text-xs font-medium text-muted">Risk</th>
              <th className="text-left px-3 py-2.5 text-xs font-medium text-muted">Status</th>
              <th className="text-right px-5 py-2.5 text-xs font-medium text-muted">Time</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc) => {
              const TypeIcon = TYPE_ICONS[inc.type] || Mail;
              return (
                <tr
                  key={inc.id}
                  className="border-b border-border last:border-0 hover:bg-panel/50 transition-colors"
                >
                  <td className="px-5 py-2.5 font-mono text-xs text-muted">{inc.id}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <TypeIcon className="w-3.5 h-3.5 text-muted" />
                      <span className="capitalize text-text">{inc.type}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px] truncate font-mono text-xs text-text">
                    {inc.source}
                  </td>
                  <td className={`px-3 py-2.5 text-center font-mono text-xs ${getRiskColor(inc.risk)}`}>
                    {inc.risk}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusPill status={inc.status} />
                  </td>
                  <td className="px-5 py-2.5 text-right text-xs text-muted whitespace-nowrap">
                    {inc.timestamp}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {incidents.length === 0 && (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-muted">No incidents yet — analyze something to get started.</p>
        </div>
      )}
    </div>
  );
}

export default RecentIncidents;
