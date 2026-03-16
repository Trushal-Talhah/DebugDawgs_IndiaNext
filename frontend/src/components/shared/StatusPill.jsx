const STATUS_STYLES = {
  quarantined: { bg: 'bg-warning-light', text: 'text-warning', label: 'Quarantined' },
  blocked: { bg: 'bg-danger-light', text: 'text-danger', label: 'Blocked' },
  flagged: { bg: 'bg-danger-light', text: 'text-danger', label: 'Flagged' },
  cleared: { bg: 'bg-success-light', text: 'text-success', label: 'Cleared' },
  pending: { bg: 'bg-accent-light', text: 'text-accent', label: 'Pending' },
};

function StatusPill({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.pending;

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}

export default StatusPill;
