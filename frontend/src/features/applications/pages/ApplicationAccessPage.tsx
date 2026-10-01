import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import { Modal } from '../../dashboard/components/Modal';
import { ApplicationWorkspaceNav } from '../components/ApplicationWorkspaceNav';
import {
  assignApplicationDeveloper,
  getApplication,
  getApplicationAccessMembers,
  getApplicationDevelopers,
  removeApplicationDeveloper,
} from '../application.api';
import type {
  ApplicationAccessMember,
  AssignedApplicationDeveloper,
  ClientApplication,
} from '../application.types';
import '../application.css';

export function ApplicationAccessPage() {
  const { applicationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ClientApplication | null>(null);
  const [assignedDevelopers, setAssignedDevelopers] = useState<AssignedApplicationDeveloper[]>([]);
  const [members, setMembers] = useState<ApplicationAccessMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [developerToRemove, setDeveloperToRemove] = useState<AssignedApplicationDeveloper | null>(null);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  async function loadAccessData() {
    if (!accessToken || !applicationId) return;

    try {
      setLoading(true);
      setError(null);

      const [applicationData, developerData, memberData] = await Promise.all([
        getApplication(accessToken, applicationId),
        getApplicationDevelopers(accessToken, applicationId),
        getApplicationAccessMembers(accessToken),
      ]);

      setApplication(applicationData);
      setAssignedDevelopers(developerData);
      setMembers(memberData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load application access.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccessData();
  }, [accessToken, applicationId]);

  const availableDevelopers = useMemo(() => {
    const assignedIds = new Set(
      assignedDevelopers.map((developer) => developer.id),
    );

    return members
      .filter(
        (member) =>
          member.role === 'DEVELOPER' &&
          member.status === 'ACTIVE' &&
          !assignedIds.has(member.id),
      )
      .sort((a, b) => a.email.localeCompare(b.email));
  }, [members, assignedDevelopers]);

  async function handleAssignDeveloper(developerId: string) {
    if (!accessToken || !applicationId) return;

    try {
      setProcessing(true);

      await assignApplicationDeveloper(
        accessToken,
        applicationId,
        {
          developerId,
        },
      );

      await loadAccessData();

      setShowAssignModal(false);

      setFeedback({
        type: 'success',
        title: 'Developer assigned',
        message:
          'The developer can now access this application through their APIShield developer workspace.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to assign developer',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleRemoveDeveloper(
    currentPassword: string,
  ) {
    if (
      !accessToken ||
      !applicationId ||
      !developerToRemove
    ) {
      return;
    }

    try {
      setProcessing(true);

      await removeApplicationDeveloper(
        accessToken,
        applicationId,
        developerToRemove.id,
        {
          currentPassword,
        },
      );

      await loadAccessData();

      setDeveloperToRemove(null);

      setFeedback({
        type: 'success',
        title: 'Developer access removed',
        message:
          'The developer no longer has access to this application.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to remove access',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <section className="panel">
          <div className="empty-state">
            <strong>Loading application access...</strong>
            <p>
              Please wait while APIShield retrieves assigned developers.
            </p>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState
          message={error}
          onRetry={() => void loadAccessData()}
        />
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout>
        <ErrorState message="Client application was not found." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="application-detail-back">
        <button
          type="button"
          className="table-action"
          onClick={() =>
            navigate('/dashboard/applications')
          }
        >
          ← Back to applications
        </button>
      </div>

      <ApplicationWorkspaceNav
        applicationId={application.id}
      />

      <section className="dashboard-intro application-access-header">
        <div>
          <p className="section-eyebrow">
            APPLICATION ACCESS
          </p>

          <h2>{application.name}</h2>

          <p>
            Control which organization developers are allowed to access this client application.
          </p>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={() => setShowAssignModal(true)}
          disabled={availableDevelopers.length === 0}
        >
          + Assign developer
        </button>
      </section>

      <section className="panel application-access-panel">
        <div className="panel-header">
          <div>
            <h3>Assigned developers</h3>

            <p>
              Developers listed here have explicit access to this application.
            </p>
          </div>

          <span className="application-access-count">
            {assignedDevelopers.length} assigned
          </span>
        </div>

        {assignedDevelopers.length === 0 ? (
          <div className="empty-state">
            <strong>No developers assigned</strong>

            <p>
              Assign an active organization developer to allow access to this application.
            </p>

            {availableDevelopers.length > 0 && (
              <button
                type="button"
                className="button primary"
                onClick={() => setShowAssignModal(true)}
              >
                Assign developer
              </button>
            )}
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table application-access-table">
              <thead>
                <tr>
                  <th>Developer</th>
                  <th>Status</th>
                  <th>Assigned</th>
                  <th>Access</th>
                </tr>
              </thead>

              <tbody>
                {assignedDevelopers.map((developer) => (
                  <tr key={developer.id}>
                    <td>
                      <div className="application-access-developer">
                        <strong>{developer.email}</strong>
                        <span>{developer.id}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={
                          developer.status === 'ACTIVE'
                            ? 'status-text-success'
                            : 'status-text-danger'
                        }
                      >
                        {formatAccountStatus(
                          developer.status,
                        )}
                      </span>
                    </td>

                    <td>
                      <div className="application-date">
                        <strong>
                          {formatDate(
                            developer.assignedAt,
                          )}
                        </strong>

                        <span>
                          {formatTime(
                            developer.assignedAt,
                          )}
                        </span>
                      </div>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="table-action danger"
                        onClick={() =>
                          setDeveloperToRemove(developer)
                        }
                      >
                        Remove access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="security-note">
        <strong>Least privilege</strong>

        <span>
          Organization membership does not automatically grant application access. Developers must be explicitly assigned to each application.
        </span>
      </div>

      {showAssignModal && (
        <AssignDeveloperModal
          developers={availableDevelopers}
          processing={processing}
          onClose={() =>
            !processing && setShowAssignModal(false)
          }
          onAssign={handleAssignDeveloper}
        />
      )}

      {developerToRemove && (
        <RemoveDeveloperAccessModal
          developer={developerToRemove}
          applicationName={application.name}
          processing={processing}
          onClose={() =>
            !processing &&
            setDeveloperToRemove(null)
          }
          onConfirm={handleRemoveDeveloper}
        />
      )}

      {feedback && (
        <FeedbackModal
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </DashboardLayout>
  );
}

interface AssignDeveloperModalProps {
  developers: ApplicationAccessMember[];
  processing: boolean;
  onClose: () => void;
  onAssign: (
    developerId: string,
  ) => Promise<void> | void;
}

function AssignDeveloperModal({
  developers,
  processing,
  onClose,
  onAssign,
}: AssignDeveloperModalProps) {
  const [search, setSearch] = useState('');
  const [selectedDeveloperId, setSelectedDeveloperId] =
    useState('');

  const filteredDevelopers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return developers.filter(
      (developer) =>
        !query ||
        developer.email
          .toLowerCase()
          .includes(query),
    );
  }, [developers, search]);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!selectedDeveloperId) return;

    void onAssign(selectedDeveloperId);
  }

  return (
    <Modal
      title="Assign developer"
      onClose={onClose}
    >
      <form
        className="application-access-form"
        onSubmit={handleSubmit}
      >
        <div className="application-access-modal-body">
          <p className="application-access-modal-description">
            Select an active developer from this organization. Access applies only to this application.
          </p>

          <div className="form-field">
            <label htmlFor="developer-search">
              Search developer
            </label>

            <input
              id="developer-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by email..."
            />
          </div>

          <div className="application-access-member-list">
            {filteredDevelopers.length === 0 ? (
              <div className="application-access-member-empty">
                No eligible developers found.
              </div>
            ) : (
              filteredDevelopers.map((developer) => (
                <label
                  key={developer.id}
                  className={`application-access-member-option ${
                    selectedDeveloperId === developer.id
                      ? 'selected'
                      : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="developer"
                    value={developer.id}
                    checked={
                      selectedDeveloperId ===
                      developer.id
                    }
                    onChange={() =>
                      setSelectedDeveloperId(
                        developer.id,
                      )
                    }
                  />

                  <div>
                    <strong>
                      {developer.email}
                    </strong>

                    <span>
                      Active organization developer
                    </span>
                  </div>
                </label>
              ))
            )}
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
            disabled={
              processing || !selectedDeveloperId
            }
          >
            {processing
              ? 'Assigning...'
              : 'Assign access'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

interface RemoveDeveloperAccessModalProps {
  developer: AssignedApplicationDeveloper;
  applicationName: string;
  processing: boolean;
  onClose: () => void;
  onConfirm: (
    currentPassword: string,
  ) => Promise<void> | void;
}

function RemoveDeveloperAccessModal({
  developer,
  applicationName,
  processing,
  onClose,
  onConfirm,
}: RemoveDeveloperAccessModalProps) {
  const [currentPassword, setCurrentPassword] =
    useState('');

  const [showPassword, setShowPassword] =
    useState(false);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!currentPassword.trim()) return;

    void onConfirm(currentPassword);
  }

  return (
    <Modal
      title="Remove application access"
      onClose={onClose}
    >
      <form
        className="application-access-form"
        onSubmit={handleSubmit}
      >
        <div className="application-access-modal-body">
          <div className="application-access-warning">
            <strong>
              Remove {developer.email}?
            </strong>

            <p>
              This developer will no longer be able to access <strong>{applicationName}</strong> through their APIShield developer workspace.
            </p>
          </div>

         
          <div className="form-field">
            <label htmlFor="remove-access-password">
              Current account password
            </label>

            <div className="application-access-password-field">
              <input
                id="remove-access-password"
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(
                    event.target.value,
                  )
                }
                placeholder="Enter your current password"
                autoComplete="current-password"
                autoFocus
              />

              <button
                type="button"
                className="application-access-password-toggle"
                onClick={() =>
                  setShowPassword((current) => !current)
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <span className="application-form-help">
              Your password is required to confirm this security-sensitive change.
            </span>
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
            className="button danger"
            disabled={
              processing ||
              !currentPassword.trim()
            }
          >
            {processing
              ? 'Removing...'
              : 'Remove access'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function formatAccountStatus(
  status: AssignedApplicationDeveloper['status'],
) {
  if (status === 'ACTIVE') return 'Active';

  if (status === 'SUSPENDED') {
    return 'Suspended';
  }

  return 'Pending verification';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}