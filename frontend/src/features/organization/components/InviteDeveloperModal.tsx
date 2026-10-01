import {
  useState,
} from 'react';
import type {
  FormEvent,
} from 'react';
import {
  Modal,
} from '../../dashboard/components/Modal';
import {
  INVITATION_LINK_EXPIRY_MINUTES,
} from '../organization.constants';

interface InviteDeveloperModalProps {
  processing: boolean;
  onClose: () => void;
  onSubmit: (
    email: string,
  ) => Promise<void> | void;
}

export function InviteDeveloperModal({
  processing,
  onClose,
  onSubmit,
}: InviteDeveloperModalProps) {
  const [email, setEmail] =
    useState('');

  const [error, setError] =
    useState('');

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        'Developer email is required.',
      );

      return;
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        normalizedEmail,
      )
    ) {
      setError(
        'Enter a valid email address.',
      );

      return;
    }

    void onSubmit(normalizedEmail);
  }

  return (
    <Modal
      title="Invite developer"
      onClose={onClose}
    >
      <form
        className="organization-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="organization-form-body">
          <div className="form-field">
            <label htmlFor="developer-email">
              Developer email
            </label>

            <input
              id="developer-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(
                  event.target.value,
                );

                setError('');
              }}
              placeholder="developer@example.com"
              autoComplete="email"
            />

            {error && (
              <span className="organization-form-error">
                {error}
              </span>
            )}

            <span className="form-help">
              The invitation must be accepted
              using a Developer account with
              this exact email address.
            </span>
          </div>

          <div className="organization-invite-note">
            <strong>
              Invitation security
            </strong>

            <p>
              APIShield sends a single-use
              invitation link. The link expires
              in{' '}
              {
                INVITATION_LINK_EXPIRY_MINUTES
              }{' '}
              minutes and can only be accepted
              by the matching Developer account.
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
            type="submit"
            className="button primary"
            disabled={processing}
          >
            {processing
              ? 'Sending...'
              : 'Send invitation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}