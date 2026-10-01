import {
  Modal,
} from '../../dashboard/components/Modal';
import type {
  OrganizationInvitation,
} from '../organization.types';

interface CancelInvitationModalProps {
  invitation: OrganizationInvitation;
  processing: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function CancelInvitationModal({
  invitation,
  processing,
  onClose,
  onConfirm,
}: CancelInvitationModalProps) {
  return (
    <Modal
      title="Cancel invitation?"
      onClose={onClose}
    >
      <div className="organization-confirmation">
        <p>
          The pending invitation for{' '}
          <strong>
            {invitation.email}
          </strong>{' '}
          will be cancelled and can no longer
          be accepted.
        </p>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          onClick={onClose}
          disabled={processing}
        >
          Keep invitation
        </button>

        <button
          type="button"
          className="button danger"
          onClick={() =>
            void onConfirm()
          }
          disabled={processing}
        >
          {processing
            ? 'Cancelling...'
            : 'Cancel invitation'}
        </button>
      </div>
    </Modal>
  );
}