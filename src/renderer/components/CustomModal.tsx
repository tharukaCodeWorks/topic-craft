import React from 'react';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      role="presentation"
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <p className="modal-desc">{message}</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn-submit ${isDanger ? 'btn-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        .btn-danger {
            background: #ef4444 !important;
            box-shadow: 0 8px 20px -4px rgba(239, 68, 68, 0.3) !important;
        }
        .btn-danger:hover {
            box-shadow: 0 12px 24px -2px rgba(239, 68, 68, 0.4) !important;
            filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
};

export default CustomModal;
