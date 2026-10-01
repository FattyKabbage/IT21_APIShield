import {
  Modal,
} from '../../dashboard/components/Modal';
import type {
  OrganizationInvitation,
} from '../organization.types';

interface ResendInvitationModalProps {
  invitation: OrganizationInvitation;
  processing: boolean;
  cooldown: number;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ResendInvitationModal({
  invitation,
  processing,
  cooldown,
  onClose,
  onConfirm,
}: ResendInvitationModalProps) {
  return (
    <Modal
      title="Resend invitation?"
      onClose={onClose}
    >
      <div className="organization-confirmation">
        <p>
          APIShield will issue a new invitation
          link for{' '}
          <strong>
            {invitation.email}
          </strong>
          . The previous invitation link should
          no longer be used.
        </p>

        <div className="organization-invite-note">
          <strong>
            Security
          </strong>

          <p>
            Reissuing an invitation should only
            be done when the recipient needs a
            new link or the previous link is no
            longer available.
          </p>
        </div>
      </div>

      <div className="modal-actions">
        <button
          type="button"
          className="button secondary"
          onClick={onClose}
          disabled={processing}
        >
          Cancel
        </button>

        <button
          type="button"
          className="button primary"
          onClick={() =>
            void onConfirm()
          }
          disabled={
            processing || cooldown > 0
          }
        >
          {processing
            ? 'Sending...'
            : cooldown > 0
              ? `Available in ${cooldown}s`
              : 'Resend invitation'}
        </button>
      </div>
    </Modal>
  );
}