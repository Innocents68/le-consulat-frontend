import Modal from './Modal';

export default function ConfirmDialog({ open, onClose, onConfirm, title = 'Confirmer', message, confirmLabel = 'Confirmer', danger = true, loading }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
          <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
            {loading ? 'Veuillez patienter...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-ink-light dark:text-cream-300/80">{message}</div>
    </Modal>
  );
}
