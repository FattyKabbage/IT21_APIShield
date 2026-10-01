import { Modal } from './Modal';

interface FeedbackModalProps {
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}

export function FeedbackModal({
  type,
  title,
  message,
  onClose,
}: FeedbackModalProps) {
  return (
    <Modal
      title={title}
      onClose={onClose}
    >
      <div className="feedback-modal-body">
        <div className={`feedback-modal-icon ${type}`}>
          {type === 'success' ? '✓' : '!'}
        </div>

        <p>{message}</p>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="button primary"
          onClick={onClose}
        >
          Continue
        </button>
      </div>
    </Modal>
  );
}