import { useState } from 'react';
import type { FormEvent } from 'react';
import { Modal } from '../../dashboard/components/Modal';
import type {
  DeveloperApplication,
  DeveloperApplicationEnvironment,
  DeveloperApplicationStatus,
} from '../developer.types';
import '../../applications/application.css';

export interface DeveloperApplicationFormValues {
  name: string;
  description: string | null;
  environment: DeveloperApplicationEnvironment;
  status?: DeveloperApplicationStatus;
}

interface DeveloperApplicationFormModalProps {
  title: string;
  submitLabel: string;
  processing: boolean;
  application?: DeveloperApplication;
  onClose: () => void;
  onSubmit: (payload: DeveloperApplicationFormValues) => Promise<void> | void;
}

export function DeveloperApplicationFormModal({
  title,
  submitLabel,
  processing,
  application,
  onClose,
  onSubmit,
}: DeveloperApplicationFormModalProps) {
  const [name, setName] = useState(application?.name ?? '');
  const [description, setDescription] = useState(application?.description ?? '');
  const [environment, setEnvironment] = useState<DeveloperApplicationEnvironment>(
    application?.environment ?? 'DEVELOPMENT',
  );
  const [status, setStatus] = useState<DeveloperApplicationStatus>(application?.status ?? 'ACTIVE');
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    description?: string;
  }>({});

  function validate() {
    const errors: typeof formErrors = {};
    const normalizedName = name.trim();

    if (!normalizedName) {
      errors.name = 'Application name is required.';
    } else if (normalizedName.length > 100) {
      errors.name = 'Application name cannot exceed 100 characters.';
    }

    if (description.trim().length > 500) {
      errors.description = 'Description cannot exceed 500 characters.';
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) return;

    void onSubmit({
      name: name.trim(),
      description: description.trim() || null,
      environment,
      ...(application ? { status } : {}),
    });
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="application-form" onSubmit={handleSubmit} noValidate>
        <div className="application-form-body">
          <div className="form-field">
            <label htmlFor="developer-application-name">Application name</label>

            <input
              id="developer-application-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setFormErrors((current) => ({
                  ...current,
                  name: undefined,
                }));
              }}
              placeholder="Personal Store API"
              maxLength={100}
            />

            {formErrors.name && (
              <span className="application-form-error">{formErrors.name}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="developer-application-description">Description</label>

            <textarea
              id="developer-application-description"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setFormErrors((current) => ({
                  ...current,
                  description: undefined,
                }));
              }}
              placeholder="Describe what this application is used for..."
              maxLength={500}
            />

            <div className="application-field-footer">
              {formErrors.description ? (
                <span className="application-form-error">{formErrors.description}</span>
              ) : (
                <span />
              )}

              <span>{description.length}/500</span>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="developer-application-environment">Environment</label>

            <select
              id="developer-application-environment"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value as DeveloperApplicationEnvironment)}
            >
              <option value="DEVELOPMENT">Development</option>
              <option value="STAGING">Staging</option>
              <option value="PRODUCTION">Production</option>
            </select>
          </div>

          {application && (
            <div className="form-field">
              <label htmlFor="developer-application-status">Status</label>

              <select
                id="developer-application-status"
                value={status}
                onChange={(event) => setStatus(event.target.value as DeveloperApplicationStatus)}
              >
                <option value="ACTIVE">Active</option>
                <option value="DISABLED">Disabled</option>
              </select>

              <span className="application-form-help">
                Disabled applications should not be used for active API access.
              </span>
            </div>
          )}
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

          <button type="submit" className="button primary" disabled={processing}>
            {processing ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}