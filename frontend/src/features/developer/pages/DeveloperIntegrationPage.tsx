import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import type { ApiIntegration, ApiIntegrationStatus } from '../../integrations/integration.types';
import '../../integrations/integration.css';
import { createDeveloperIntegration, getDeveloperIntegrations, updateDeveloperIntegration } from '../developer.api';
import type { CreateDeveloperIntegrationPayload, UpdateDeveloperIntegrationPayload } from '../developer.api';
import '../developer.css';
import { DeveloperIntegrationFormModal, type DeveloperIntegrationFormValues } from './DeveloperIntegrationFormModal';
import { DeveloperApplicationWorkspaceNav } from './DeveloperApplicationWorkspaceNav';

const PAGE_SIZE = 10;

type StatusFilter = 'ALL' | ApiIntegrationStatus;

export function DeveloperIntegrationPage() {
  const { applicationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [integrationToEdit, setIntegrationToEdit] = useState<ApiIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  async function loadIntegrations() {
    if (!accessToken || !applicationId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getDeveloperIntegrations(accessToken, applicationId);
      setIntegrations(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load API integrations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadIntegrations();
  }, [accessToken, applicationId]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const processedIntegrations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...integrations]
      .filter((integration) => {
        const matchesSearch =
          !query ||
          integration.name.toLowerCase().includes(query) ||
          integration.provider.toLowerCase().includes(query) ||
          integration.baseUrl.toLowerCase().includes(query);

        const matchesStatus = statusFilter === 'ALL' || integration.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [integrations, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(processedIntegrations.length / PAGE_SIZE));

  const paginatedIntegrations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedIntegrations.slice(start, start + PAGE_SIZE);
  }, [processedIntegrations, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = processedIntegrations.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, processedIntegrations.length);

  async function handleCreate(values: DeveloperIntegrationFormValues) {
    if (!accessToken || !applicationId) return;

    try {
      setProcessing(true);

      const payload: CreateDeveloperIntegrationPayload = {
        name: values.name,
        provider: values.provider,
        baseUrl: values.baseUrl,
        authType: values.authType,
        ...(values.credentialPlacement ? { credentialPlacement: values.credentialPlacement } : {}),
        ...(values.credentialName ? { credentialName: values.credentialName } : {}),
        ...(values.credential ? { credential: values.credential } : {}),
      };

      await createDeveloperIntegration(accessToken, applicationId, payload);
      await loadIntegrations();

      setShowCreateModal(false);

      setFeedback({
        type: 'success',
        title: 'API integration created',
        message: 'The provider integration was configured successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to create integration',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleUpdate(values: DeveloperIntegrationFormValues) {
    if (!accessToken || !applicationId || !integrationToEdit) return;

    try {
      setProcessing(true);

      const payload: UpdateDeveloperIntegrationPayload = {
        name: values.name,
        provider: values.provider,
        baseUrl: values.baseUrl,
        authType: values.authType,
        status: values.status ?? integrationToEdit.status,
        ...(values.credentialPlacement ? { credentialPlacement: values.credentialPlacement } : {}),
        ...(values.credentialName ? { credentialName: values.credentialName } : {}),
        ...(values.credential ? { credential: values.credential } : {}),
      };

      await updateDeveloperIntegration(accessToken, applicationId, integrationToEdit.id, payload);
      await loadIntegrations();

      setIntegrationToEdit(null);

      setFeedback({
        type: 'success',
        title: 'API integration updated',
        message: 'The provider integration was updated successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to update integration',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="developer-detail-back">
        <button type="button" className="table-action" onClick={() => navigate(`/developer/applications/${applicationId}`)}>
          ← Back to application
        </button>
      </div>

      {applicationId && <DeveloperApplicationWorkspaceNav applicationId={applicationId} />}

      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">DEVELOPER INTEGRATIONS</p>
          <h2>API Integrations</h2>
          <p>Configure third-party APIs available to this developer application.</p>
        </div>

        <button type="button" className="button primary" onClick={() => setShowCreateModal(true)}>
          + Add integration
        </button>
      </section>

      <div className="integration-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search integrations..."
        />

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading API integrations...</strong>
            <p>Please wait while APIShield retrieves the configured providers.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadIntegrations()} />}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Configured integrations</h3>
              <p>Provider credentials remain encrypted and are never displayed here.</p>
            </div>

            <span className="integration-result-count">
              {processedIntegrations.length} integration{processedIntegrations.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedIntegrations.length === 0 ? (
            <div className="empty-state">
              <strong>No API integrations configured</strong>
              <p>Add a third-party API to begin routing provider requests through APIShield.</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table integration-table">
                  <thead>
                    <tr>
                      <th>Integration</th>
                      <th>Provider</th>
                      <th>Authentication</th>
                      <th>Credential</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedIntegrations.map((integration) => (
                      <tr key={integration.id}>
                        <td>
                          <div className="integration-name-cell">
                            <strong>{integration.name}</strong>
                            <span>{integration.baseUrl}</span>
                          </div>
                        </td>

                        <td>{integration.provider}</td>

                        <td>
                          <span className="integration-auth-type">{formatAuthType(integration.authType)}</span>
                        </td>

                        <td>
                          <span
                            className={
                              integration.authType === 'NONE'
                                ? 'status-text-neutral'
                                : integration.hasCredential
                                  ? 'status-text-success'
                                  : 'status-text-warning'
                            }
                          >
                            {integration.authType === 'NONE'
                              ? 'Not required'
                              : integration.hasCredential
                                ? 'Configured'
                                : 'Missing'}
                          </span>
                        </td>

                        <td>
                          <span className={integration.status === 'ACTIVE' ? 'status-text-success' : 'status-text-danger'}>
                            {integration.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                          </span>
                        </td>

                        <td>
                          <div className="integration-date">
                            <strong>{formatDate(integration.createdAt)}</strong>
                            <span>{formatTime(integration.createdAt)}</span>
                          </div>
                        </td>

                        <td>
                          <button type="button" className="table-action" onClick={() => setIntegrationToEdit(integration)}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {processedIntegrations.length}
                </span>

                <div className="table-pagination-controls">
                  <button
                    type="button"
                    className="table-action"
                    disabled={page === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    ← Previous
                  </button>

                  <span>Page {page} of {pageCount}</span>

                  <button
                    type="button"
                    className="table-action"
                    disabled={page === pageCount}
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
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
        <strong>Provider credential security</strong>
        <span>Provider API keys, bearer tokens and Basic Auth credentials are encrypted by APIShield and are never displayed after storage.</span>
      </div>

      {showCreateModal && (
        <DeveloperIntegrationFormModal
          title="Add API integration"
          submitLabel="Create integration"
          processing={processing}
          onClose={() => !processing && setShowCreateModal(false)}
          onSubmit={handleCreate}
        />
      )}

      {integrationToEdit && (
        <DeveloperIntegrationFormModal
          title="Edit API integration"
          submitLabel="Save changes"
          processing={processing}
          integration={integrationToEdit}
          onClose={() => !processing && setIntegrationToEdit(null)}
          onSubmit={handleUpdate}
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

function formatAuthType(authType: ApiIntegration['authType']) {
  if (authType === 'NONE') return 'None';
  if (authType === 'API_KEY') return 'API key';
  if (authType === 'BEARER_TOKEN') return 'Bearer token';

  return 'Basic auth';
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