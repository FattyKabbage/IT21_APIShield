import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import {
  createDeveloperApplication,
  getDeveloperApplications,
  getDeveloperProfile,
  updateDeveloperApplication,
} from '../developer.api';
import type {
  DeveloperApplication,
  DeveloperApplicationEnvironment,
  DeveloperApplicationStatus,
  DeveloperProfile,
} from '../developer.types';
import { DeveloperApplicationFormModal, type DeveloperApplicationFormValues } from './DeveloperApplicationFormModal';


const PAGE_SIZE = 10;

type EnvironmentFilter = 'ALL' | DeveloperApplicationEnvironment;
type StatusFilter = 'ALL' | DeveloperApplicationStatus;

export function DeveloperApplicationsPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [applications, setApplications] = useState<DeveloperApplication[]>([]);
  const [search, setSearch] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState<EnvironmentFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [applicationToEdit, setApplicationToEdit] = useState<DeveloperApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  async function loadApplications() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const [profileData, applicationData] = await Promise.all([
        getDeveloperProfile(accessToken),
        getDeveloperApplications(accessToken),
      ]);

      setProfile(profileData);
      setApplications(applicationData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load developer applications.');
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

  const organizationDeveloper = profile?.membershipType === 'ORGANIZATION';
  const independentDeveloper = profile?.membershipType === 'INDEPENDENT';

  const canCreatePersonalApplication =
    independentDeveloper &&
    profile?.status === 'ACTIVE' &&
    applications.length === 0;

  const processedApplications = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...applications]
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
      .sort((a, b) => {
        const firstDate = a.accessType === 'OWNED' ? a.createdAt : a.assignedAt;
        const secondDate = b.accessType === 'OWNED' ? b.createdAt : b.assignedAt;

        return new Date(secondDate).getTime() - new Date(firstDate).getTime();
      });
  }, [applications, search, environmentFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(processedApplications.length / PAGE_SIZE));

  const paginatedApplications = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedApplications.slice(start, start + PAGE_SIZE);
  }, [processedApplications, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = processedApplications.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, processedApplications.length);

  async function handleCreateApplication(payload: DeveloperApplicationFormValues) {
    if (!accessToken) return;

    try {
      setProcessing(true);

      await createDeveloperApplication(accessToken, {
        name: payload.name,
        environment: payload.environment,
        ...(payload.description ? { description: payload.description } : {}),
      });

      await loadApplications();
      setShowCreateModal(false);

      setFeedback({
        type: 'success',
        title: 'Personal application created',
        message: 'Your personal client application was created successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to create application',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleUpdateApplication(payload: DeveloperApplicationFormValues) {
    if (!accessToken || !applicationToEdit) return;

    try {
      setProcessing(true);

      await updateDeveloperApplication(accessToken, applicationToEdit.id, {
        name: payload.name,
        description: payload.description,
        environment: payload.environment,
        status: payload.status ?? applicationToEdit.status,
      });

      await loadApplications();
      setApplicationToEdit(null);

      setFeedback({
        type: 'success',
        title: 'Personal application updated',
        message: 'Your personal client application was updated successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to update application',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">DEVELOPER APPLICATIONS</p>

          <h2>{organizationDeveloper ? 'Assigned Applications' : 'Personal Application'}</h2>

          <p>
            {organizationDeveloper
              ? 'View applications your organization has explicitly assigned to your developer account.'
              : 'Create and manage your single independent client application.'}
          </p>
        </div>

        {canCreatePersonalApplication && (
          <button
            type="button"
            className="button primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create application
          </button>
        )}
      </section>

      <div className="developer-application-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search applications..."
        />

        <select
          value={environmentFilter}
          onChange={(event) => setEnvironmentFilter(event.target.value as EnvironmentFilter)}
          aria-label="Filter by environment"
        >
          <option value="ALL">All environments</option>
          <option value="DEVELOPMENT">Development</option>
          <option value="STAGING">Staging</option>
          <option value="PRODUCTION">Production</option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
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
            <p>Please wait while APIShield retrieves your application access.</p>
          </div>
        </section>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void loadApplications()} />
      )}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>{organizationDeveloper ? 'Assigned applications' : 'Personal application'}</h3>

              <p>
                {organizationDeveloper
                  ? 'Access is determined by explicit organization assignment.'
                  : 'Independent developers may own one personal application.'}
              </p>
            </div>

            <span className="developer-result-count">
              {processedApplications.length} application
              {processedApplications.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedApplications.length === 0 ? (
            <div className="empty-state">
              <strong>
                {organizationDeveloper
                  ? 'No applications assigned'
                  : 'No personal application'}
              </strong>

              <p>
                {organizationDeveloper
                  ? 'Ask your organization owner to assign application access when required.'
                  : profile?.status === 'ACTIVE'
                    ? 'Create your personal client application to begin using APIShield.'
                    : 'Your developer account must be active before creating a personal application.'}
              </p>

              {canCreatePersonalApplication && (
                <button
                  type="button"
                  className="button primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Create application
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Application</th>
                      <th>Environment</th>
                      <th>Status</th>
                      <th>{organizationDeveloper ? 'Assigned' : 'Created'}</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedApplications.map((application) => (
                      <tr key={application.id}>
                        <td>
                          <div className="developer-application-name">
                            <strong>{application.name}</strong>
                            <span>{application.description || 'No description provided'}</span>
                          </div>
                        </td>

                        <td>
                          <span className={`application-environment ${application.environment.toLowerCase()}`}>
                            {formatEnvironment(application.environment)}
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
                            {application.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td>
                          <div className="application-date">
                            <strong>
                              {formatDate(
                                application.accessType === 'OWNED'
                                  ? application.createdAt
                                  : application.assignedAt,
                              )}
                            </strong>

                            <span>
                              {formatTime(
                                application.accessType === 'OWNED'
                                  ? application.createdAt
                                  : application.assignedAt,
                              )}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="table-actions">
                            <button
                              type="button"
                              className="table-action"
                              onClick={() => navigate(`/developer/applications/${application.id}`)}
                            >
                              View
                            </button>

                            {application.accessType === 'OWNED' && (
                              <button
                                type="button"
                                className="table-action"
                                onClick={() => setApplicationToEdit(application)}
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {processedApplications.length}
                </span>

                <div className="table-pagination-controls">
                  <button
                    type="button"
                    className="table-action"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                  >
                    ← Previous
                  </button>

                  <span>Page {page} of {pageCount}</span>

                  <button
                    type="button"
                    className="table-action"
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
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
        <strong>{organizationDeveloper ? 'Access control' : 'Personal application ownership'}</strong>

        <span>
          {organizationDeveloper
            ? 'Organization membership does not grant access to every application. Only explicitly assigned applications are shown here.'
            : 'Your independent developer account may own one personal application. Ownership is determined from your authenticated account and cannot be supplied by the frontend.'}
        </span>
      </div>

      {showCreateModal && (
        <DeveloperApplicationFormModal
          title="Create personal application"
          submitLabel="Create application"
          processing={processing}
          onClose={() => !processing && setShowCreateModal(false)}
          onSubmit={handleCreateApplication}
        />
      )}

      {applicationToEdit && (
        <DeveloperApplicationFormModal
          title="Edit personal application"
          submitLabel="Save changes"
          processing={processing}
          application={applicationToEdit}
          onClose={() => !processing && setApplicationToEdit(null)}
          onSubmit={handleUpdateApplication}
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

function formatEnvironment(environment: DeveloperApplicationEnvironment) {
  if (environment === 'DEVELOPMENT') return 'Development';
  if (environment === 'STAGING') return 'Staging';

  return 'Production';
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}