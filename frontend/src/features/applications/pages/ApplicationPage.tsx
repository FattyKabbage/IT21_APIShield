import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import { Modal } from '../../dashboard/components/Modal';
import { createApplication, getApplications, updateApplication } from '../application.api';
import type { ApplicationEnvironment, ApplicationStatus, ClientApplication } from '../application.types';
import '../application.css';

const APPLICATION_PAGE_SIZE = 10;

type EnvironmentFilter = 'ALL' | ApplicationEnvironment;
type StatusFilter = 'ALL' | ApplicationStatus;

export function ApplicationPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<ClientApplication[]>([]);

  const [search, setSearch] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [applicationToEdit, setApplicationToEdit] = useState<ClientApplication | null>(null);

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  async function loadApplications() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getApplications(accessToken);

      setApplications(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load client applications.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, [accessToken]);

  useEffect(() => {
    setPage(1);
  }, [search, environmentFilter, statusFilter]);

  const processedApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return applications
      .filter((application) => {
        const matchesSearch =
          !query ||
          application.name.toLowerCase().includes(query) ||
          application.description?.toLowerCase().includes(query);

        const matchesEnvironment =
          environmentFilter === 'ALL' ||
          application.environment === environmentFilter;

        const matchesStatus =
          statusFilter === 'ALL' ||
          application.status === statusFilter;

        return matchesSearch && matchesEnvironment && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );
  }, [applications, search, environmentFilter, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(processedApplications.length / APPLICATION_PAGE_SIZE),
  );

  const paginatedApplications = useMemo(() => {
    const start = (page - 1) * APPLICATION_PAGE_SIZE;

    return processedApplications.slice(
      start,
      start + APPLICATION_PAGE_SIZE,
    );
  }, [processedApplications, page]);

  const rangeStart =
    processedApplications.length === 0
      ? 0
      : (page - 1) * APPLICATION_PAGE_SIZE + 1;

  const rangeEnd = Math.min(
    page * APPLICATION_PAGE_SIZE,
    processedApplications.length,
  );

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  async function handleCreateApplication(payload: {
  name: string;
  description: string | null;
  environment: ApplicationEnvironment;
    }) {
    if (!accessToken) return;

    try {
        setProcessing(true);

        await createApplication(accessToken, {
        name: payload.name,
        environment: payload.environment,
        ...(payload.description
            ? { description: payload.description }
            : {}),
        });

        await loadApplications();

        setShowCreateModal(false);

        setFeedback({
        title: 'Application created',
        message: 'The client application was created successfully.',
        type: 'success',
        });
    } catch (error) {
        setFeedback({
        title: 'Unable to create application',
        message:
            error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        type: 'error',
        });
    } finally {
        setProcessing(false);
    }
    }

  async function handleUpdateApplication(payload: {
    name: string;
    description: string | null;
    environment: ApplicationEnvironment;
    status: ApplicationStatus;
  }) {
    if (!accessToken || !applicationToEdit) return;

    try {
      setProcessing(true);

      await updateApplication(
        accessToken,
        applicationToEdit.id,
        payload,
      );

      await loadApplications();

      setApplicationToEdit(null);

      setFeedback({
        title: 'Application updated',
        message: 'The client application was updated successfully.',
        type: 'success',
      });
    } catch (error) {
      setFeedback({
        title: 'Unable to update application',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
        type: 'error',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">
            APPLICATION MANAGEMENT
          </p>

          <h2>Client Applications</h2>

          <p>
            Register and manage applications that authenticate with APIShield.
          </p>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={() => setShowCreateModal(true)}
        >
          + Add application
        </button>
      </section>

      <div className="application-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search applications..."
        />

        <select
          value={environmentFilter}
          onChange={(event) =>
            setEnvironmentFilter(
              event.target.value as EnvironmentFilter,
            )
          }
          aria-label="Filter by environment"
        >
          <option value="ALL">All environments</option>
          <option value="DEVELOPMENT">Development</option>
          <option value="STAGING">Staging</option>
          <option value="PRODUCTION">Production</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as StatusFilter,
            )
          }
          aria-label="Filter by status"
        >
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading applications...</strong>
            <p>Please wait while APIShield retrieves your client applications.</p>
          </div>
        </section>
      )}

      {!loading && error && (
        <ErrorState
          message={error}
          onRetry={() => void loadApplications()}
        />
      )}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Applications</h3>

              <p>
                Applications are isolated to the authenticated organization.
              </p>
            </div>

            <span className="application-result-count">
              {processedApplications.length} application
              {processedApplications.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedApplications.length === 0 ? (
            <div className="empty-state">
              <strong>
                {applications.length === 0
                  ? 'No applications registered'
                  : 'No matching applications'}
              </strong>

              <p>
                {applications.length === 0
                  ? 'Create your first client application to begin using APIShield.'
                  : 'Try changing the search term or filters.'}
              </p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table application-table">
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Environment</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <div className="application-name-cell">
                            <strong>{application.name}</strong>

                            <span>
                              {application.description ||
                                'No description provided'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`application-environment ${application.environment.toLowerCase()}`}
                          >
                            {formatEnvironment(
                              application.environment,
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              application.status === 'ACTIVE'
                                ? 'status-text-success'
                                : 'status-text-danger'
                            }
                          >
                            {application.status === 'ACTIVE'
                              ? 'Active'
                              : 'Disabled'}
                          </span>
                        </td>

                        <td>
                          <div className="application-date">
                            <strong>
                              {formatDate(application.createdAt)}
                            </strong>

                            <span>
                              {formatTime(application.createdAt)}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                navigate(
                                  `/dashboard/applications/${application.id}`,
                                )
                              }
                            >
                              Manage
                            </button>

                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                setApplicationToEdit(application)
                              }
                            >
                              Edit
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>
                  Showing {rangeStart}–{rangeEnd} of{' '}
                  {processedApplications.length}
                </span>

                <div className="table-pagination-controls">
                  <button
                    type="button"
                    className="table-action"
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    disabled={page === 1}
                  >
                    ← Previous
                  </button>

                  <span>
                    Page {page} of {pageCount}
                  </span>

                  <button
                    type="button"
                    className="table-action"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(pageCount, current + 1),
                      )
                    }
                    disabled={page === pageCount}
                  >
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <div className="security-note">
        <strong>Security</strong>

        <span>
          Organization ownership is determined by the authenticated management account. The frontend never supplies an organization ID when creating an application.
        </span>
      </div>

      {showCreateModal && (
        <ApplicationFormModal
          title="Create application"
          submitLabel="Create application"
          processing={processing}
          onClose={() =>
            !processing && setShowCreateModal(false)
          }
          onSubmit={handleCreateApplication}
        />
      )}

      {applicationToEdit && (
        <ApplicationFormModal
          title="Edit application"
          submitLabel="Save changes"
          processing={processing}
          application={applicationToEdit}
          onClose={() =>
            !processing && setApplicationToEdit(null)
          }
          onSubmit={(payload) =>
            handleUpdateApplication({
              ...payload,
              status:
                payload.status ??
                applicationToEdit.status,
            })
          }
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

interface ApplicationFormModalProps {
  title: string;
  submitLabel: string;
  processing: boolean;
  application?: ClientApplication;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string | null;
    environment: ApplicationEnvironment;
    status?: ApplicationStatus;
  }) => Promise<void> | void;
}

function ApplicationFormModal({
  title,
  submitLabel,
  processing,
  application,
  onClose,
  onSubmit,
}: ApplicationFormModalProps) {
  const [name, setName] = useState(
    application?.name ?? '',
  );

  const [description, setDescription] = useState(
    application?.description ?? '',
  );

  const [environment, setEnvironment] =
    useState<ApplicationEnvironment>(
      application?.environment ?? 'DEVELOPMENT',
    );

  const [status, setStatus] =
    useState<ApplicationStatus>(
      application?.status ?? 'ACTIVE',
    );

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
      errors.name =
        'Application name cannot exceed 100 characters.';
    }

    if (description.trim().length > 500) {
      errors.description =
        'Description cannot exceed 500 characters.';
    }

    setFormErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validate()) return;

    void onSubmit({
      name: name.trim(),
      description:
        description.trim() || null,
      environment,
      ...(application ? { status } : {}),
    });
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
    >
      <form
        className="application-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="application-form-body">
          <div className="form-field">
            <label htmlFor="application-name">
              Application name
            </label>

            <input
              id="application-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);

                setFormErrors((current) => ({
                  ...current,
                  name: undefined,
                }));
              }}
              placeholder="Acme Web Application"
              maxLength={100}
            />

            {formErrors.name && (
              <span className="application-form-error">
                {formErrors.name}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="application-description">
              Description
            </label>

            <textarea
              id="application-description"
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
                <span className="application-form-error">
                  {formErrors.description}
                </span>
              ) : (
                <span />
              )}

              <span>
                {description.length}/500
              </span>
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="application-environment">
              Environment
            </label>

            <select
              id="application-environment"
              value={environment}
              onChange={(event) =>
                setEnvironment(
                  event.target
                    .value as ApplicationEnvironment,
                )
              }
            >
              <option value="DEVELOPMENT">
                Development
              </option>

              <option value="STAGING">
                Staging
              </option>

              <option value="PRODUCTION">
                Production
              </option>
            </select>
          </div>

          {application && (
            <div className="form-field">
              <label htmlFor="application-status">
                Status
              </label>

              <select
                id="application-status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target.value as ApplicationStatus,
                  )
                }
              >
                <option value="ACTIVE">
                  Active
                </option>

                <option value="DISABLED">
                  Disabled
                </option>
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

          <button
            type="submit"
            className="button primary"
            disabled={processing}
          >
            {processing
              ? 'Saving...'
              : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function formatEnvironment(
  environment: ApplicationEnvironment,
) {
  if (environment === 'DEVELOPMENT') {
    return 'Development';
  }

  if (environment === 'STAGING') {
    return 'Staging';
  }

  return 'Production';
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