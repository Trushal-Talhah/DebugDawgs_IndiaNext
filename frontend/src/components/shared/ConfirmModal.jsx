import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, destructive = false }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open && confirmRef.current) {
      confirmRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onCancel();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      {/* Panel */}
      <div className="relative bg-bg rounded-xl shadow-lg border border-border max-w-sm w-full mx-4 p-6 animate-fade-in">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 p-1 text-muted hover:text-text rounded-md"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-4">
          {destructive && (
            <div className="w-9 h-9 rounded-full bg-danger-light flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5 text-danger" />
            </div>
          )}
          <div>
            <h3 id="modal-title" className="text-base font-semibold text-text">{title}</h3>
            <p className="text-sm text-muted mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-3.5 py-1.5 text-sm font-medium text-muted hover:text-text border border-border rounded-lg hover:bg-panel transition-colors"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`px-3.5 py-1.5 text-sm font-medium text-white rounded-lg transition-colors ${
              destructive
                ? 'bg-danger hover:bg-danger/90'
                : 'bg-accent hover:bg-accent/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
