import { useState } from 'react';
import { ShieldBan, Ban, Users, FileText } from 'lucide-react';
import ConfirmModal from '../shared/ConfirmModal';
import { generateReportPDF } from '../../lib/pdfGenerator';

const ACTIONS = [
  {
    id: 'quarantine',
    label: 'Quarantine',
    icon: ShieldBan,
    style: 'border-danger/30 text-danger hover:bg-danger-light',
    confirmTitle: 'Quarantine this item?',
    confirmMessage: 'Are you sure? This will move the item to quarantine. This can be undone from Incidents.',
    destructive: true,
  },
  {
    id: 'block',
    label: 'Block Domain',
    icon: Ban,
    style: 'border-danger/30 text-danger hover:bg-danger-light',
    confirmTitle: 'Block this domain?',
    confirmMessage: 'Are you sure? This will block the sender domain at the gateway. This can be undone from Incidents.',
    destructive: true,
  },
  {
    id: 'notify',
    label: 'Notify Team',
    icon: Users,
    style: 'border-border text-text hover:bg-panel',
    confirmTitle: 'Notify your team?',
    confirmMessage: 'This will send an alert to your security team with the analysis summary.',
    destructive: false,
  },
  {
    id: 'report',
    label: 'Generate Report',
    icon: FileText,
    style: 'border-border text-text hover:bg-panel',
    confirmTitle: 'Generate incident report?',
    confirmMessage: 'This will create a downloadable PDF report with the full analysis details.',
    destructive: false,
  },
];

function ResponseActions({ onAction, result }) {
  const [confirmAction, setConfirmAction] = useState(null);
  const [completedActions, setCompletedActions] = useState({});
  const [processing, setProcessing] = useState(null);

  function handleConfirm() {
    if (confirmAction) {
      const actionId = confirmAction.id;
      setConfirmAction(null);
      setProcessing(actionId);

      // Simulate network request
      setTimeout(() => {
        setProcessing(null);
        setCompletedActions((prev) => ({ ...prev, [actionId]: true }));
        onAction?.(actionId);

        // Generate actual PDF download
        if (actionId === 'report' && result) {
          generateReportPDF(result);
        }
      }, 1500);
    }
  }

  return (
    <div className="bg-bg rounded-xl border border-border p-5" role="region" aria-label="Response actions">
      <h3 className="text-base font-semibold text-text mb-4">Actions</h3>

      <div className="grid grid-cols-2 gap-2">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          const done = completedActions[action.id];
          const isProcessing = processing === action.id;

          return (
            <button
              key={action.id}
              onClick={() => setConfirmAction(action)}
              disabled={done || processing !== null}
              className={`flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium border rounded-lg transition-colors ${
                done
                  ? 'bg-success-light border-success/30 text-success cursor-default'
                  : isProcessing
                  ? 'bg-panel border-border text-muted cursor-wait'
                  : action.style
              }`}
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-muted/30 border-t-accent rounded-full animate-spin shrink-0" />
              ) : (
                <Icon className="w-4 h-4 shrink-0" />
              )}
              {isProcessing ? 'Processing...' : done ? `${action.label} ✓` : action.label}
            </button>
          );
        })}
      </div>

      {/* Confirm modal */}
      <ConfirmModal
        open={!!confirmAction}
        title={confirmAction?.confirmTitle || ''}
        message={confirmAction?.confirmMessage || ''}
        confirmLabel={confirmAction?.label || 'Confirm'}
        destructive={confirmAction?.destructive || false}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

export default ResponseActions;
