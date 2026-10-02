import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { SensitiveInput } from '../../../components/SensitiveInput';
import { useAuth } from '../../auth/auth.context';
import { ApplicationWorkspaceNav } from '../../applications/components/ApplicationWorkspaceNav';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import { Modal } from '../../dashboard/components/Modal';
import {
  createApplicationIntegration,
  getApplicationIntegrations,
  updateApplicationIntegration,
} from '../integration.api';
import type {
  ApiCredentialPlacement,
  ApiIntegration,
  ApiIntegrationAuthType,
  ApiIntegrationStatus,
  CreateApiIntegrationPayload,
  UpdateApiIntegrationPayload,
} from '../integration.types';
import '../integration.css';

const INTEGRATION_PAGE_SIZE = 10;

type StatusFilter = 'ALL' | ApiIntegrationStatus;

interface IntegrationFormPayload {
  name: string;
  provider: string;
  baseUrl: string;
  authType: ApiIntegrationAuthType;
  credentialPlacement?: ApiCredentialPlacement | null;
  credentialName?: string | null;
  providerCredential?: string;
  status?: ApiIntegrationStatus;
}

export function ApplicationIntegrationPage() {
  const { applicationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [integrations, setIntegrations] = useState<ApiIntegration[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [integrationToEdit, setIntegrationToEdit] =
    useState<ApiIntegration | null>(null);

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

      const data = await getApplicationIntegrations(
        accessToken,
        applicationId,
      );

      setIntegrations(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load API integrations.',
      );
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

    return integrations
      .filter((integration) => {
        const matchesSearch =
          !query ||
          integration.name.toLowerCase().includes(query) ||
          integration.provider.toLowerCase().includes(query) ||
          integration.baseUrl.toLowerCase().includes(query) ||
          integration.authType.toLowerCase().includes(query);

        const matchesStatus =
          statusFilter === 'ALL' ||
          integration.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );
  }, [integrations, search, statusFilter]);

  const pageCount = Math.max(
    1,
    Math.ceil(
      processedIntegrations.length /
        INTEGRATION_PAGE_SIZE,
    ),
  );

  const paginatedIntegrations = useMemo(() => {
    const start =
      (page - 1) * INTEGRATION_PAGE_SIZE;

    return processedIntegrations.slice(
      start,
      start + INTEGRATION_PAGE_SIZE,
    );
  }, [processedIntegrations, page]);

  const rangeStart =
    processedIntegrations.length === 0
      ? 0
      : (page - 1) * INTEGRATION_PAGE_SIZE + 1;

  const rangeEnd = Math.min(
    page * INTEGRATION_PAGE_SIZE,
    processedIntegrations.length,
  );

  useEffect(() => {
    if (page > pageCount) {
      setPage(pageCount);
    }
  }, [page, pageCount]);

  async function handleCreateIntegration(payload: IntegrationFormPayload) {
  if (!accessToken || !applicationId) return;

  try {
    setProcessing(true);

    const createPayload: CreateApiIntegrationPayload = {
      name: payload.name,
      provider: payload.provider,
      baseUrl: payload.baseUrl,
      authType: payload.authType,
      ...(payload.authType === 'API_KEY' && payload.credentialPlacement
        ? { credentialPlacement: payload.credentialPlacement }
        : {}),
      ...(payload.authType === 'API_KEY' && payload.credentialName
        ? { credentialName: payload.credentialName }
        : {}),
      ...(payload.authType === 'API_KEY' && payload.providerCredential
        ? { credential: { value: payload.providerCredential } }
        : {}),
      ...(payload.authType === 'BEARER_TOKEN' && payload.providerCredential
        ? { credential: { token: payload.providerCredential } }
        : {}),
    };

    await createApplicationIntegration(accessToken, applicationId, createPayload);

    await loadIntegrations();

    setShowCreateModal(false);

    setFeedback({
      type: 'success',
      title: 'API integration created',
      message: 'The third-party API integration was configured successfully.',
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

  async function handleUpdateIntegration(
    payload: IntegrationFormPayload,
  ) {
    if (
      !accessToken ||
      !applicationId ||
      !integrationToEdit
    ) {
      return;
    }

    try {
      setProcessing(true);

      const updatePayload: UpdateApiIntegrationPayload = {
        name: payload.name,
        provider: payload.provider,
        baseUrl: payload.baseUrl,
        authType: payload.authType,
        status:
          payload.status ??
          integrationToEdit.status,
        credentialPlacement:
          payload.authType === 'API_KEY'
            ? payload.credentialPlacement ?? null
            : null,
        credentialName:
          payload.authType === 'API_KEY'
            ? payload.credentialName ?? null
            : null,
        ...(payload.providerCredential
          ? {
              providerCredential:
                payload.providerCredential,
            }
          : {}),
      };

      await updateApplicationIntegration(
        accessToken,
        applicationId,
        integrationToEdit.id,
        updatePayload,
      );

      await loadIntegrations();

      setIntegrationToEdit(null);

      setFeedback({
        type: 'success',
        title: 'API integration updated',
        message:
          'The API integration was updated successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to update integration',
        message:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="application-detail-back">
        <button
          type="button"
          className="table-action"
          onClick={() =>
            navigate(
              `/dashboard/applications/${applicationId}`,
            )
          }
        >
          ← Back to application
        </button>
      </div>

      {applicationId && (
        <ApplicationWorkspaceNav
          applicationId={applicationId}
        />
      )}

      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">
            EXTERNAL SERVICES
          </p>

          <h2>API Integrations</h2>

          <p>
            Configure the third-party APIs this
            application can access through
            APIShield.
          </p>
        </div>

        <button
          type="button"
          className="button primary"
          onClick={() =>
            setShowCreateModal(true)
          }
        >
          + Add integration
        </button>
      </section>

      <div className="integration-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          placeholder="Search integrations..."
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value as StatusFilter,
            )
          }
          aria-label="Filter integration status"
        >
          <option value="ALL">
            All statuses
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="DISABLED">
            Disabled
          </option>
        </select>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>
              Loading API integrations...
            </strong>

            <p>
              Please wait while APIShield retrieves
              this application's configured
              providers.
            </p>
          </div>
        </section>
      )}

      {!loading && error && (
        <ErrorState
          message={error}
          onRetry={() =>
            void loadIntegrations()
          }
        />
      )}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>
                Configured integrations
              </h3>

              <p>
                Provider credentials remain
                encrypted and are never displayed
                here.
              </p>
            </div>

            <span className="integration-result-count">
              {processedIntegrations.length}{' '}
              integration
              {processedIntegrations.length === 1
                ? ''
                : 's'}
            </span>
          </div>

          {paginatedIntegrations.length ===
          0 ? (
            <div className="empty-state">
              <strong>
                {integrations.length === 0
                  ? 'No API integrations configured'
                  : 'No matching integrations'}
              </strong>

              <p>
                {integrations.length === 0
                  ? 'Add a third-party API to begin routing provider requests through APIShield.'
                  : 'Try changing the search term or status filter.'}
              </p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table integration-table">
                  <thead>
                    <tr>
                      <th>
                        Integration
                      </th>

                      <th>
                        Provider
                      </th>

                      <th>
                        Authentication
                      </th>

                      <th>
                        Credential
                      </th>

                      <th>
                        Status
                      </th>

                      <th>
                        Created
                      </th>

                      <th>
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedIntegrations.map(
                      (integration) => (
                        <tr
                          key={
                            integration.id
                          }
                        >
                          <td>
                            <div className="integration-name-cell">
                              <strong>
                                {
                                  integration.name
                                }
                              </strong>

                              <span>
                                {
                                  integration.baseUrl
                                }
                              </span>
                            </div>
                          </td>

                          <td>
                            {
                              integration.provider
                            }
                          </td>

                          <td>
                            <span className="integration-auth-type">
                              {formatAuthType(
                                integration.authType,
                              )}
                            </span>

                            {integration.authType ===
                              'API_KEY' &&
                              integration.credentialPlacement && (
                                <span className="integration-auth-detail">
                                  {formatCredentialPlacement(
                                    integration.credentialPlacement,
                                  )}
                                </span>
                              )}
                          </td>

                          <td>
                            {integration.authType ===
                            'NONE' ? (
                              <span className="status-text-neutral">
                                Not required
                              </span>
                            ) : integration.hasCredential ? (
                              <span className="status-text-success">
                                Configured
                              </span>
                            ) : (
                              <span className="status-text-warning">
                                Missing
                              </span>
                            )}
                          </td>

                          <td>
                            <span
                              className={
                                integration.status ===
                                'ACTIVE'
                                  ? 'status-text-success'
                                  : 'status-text-danger'
                              }
                            >
                              {integration.status ===
                              'ACTIVE'
                                ? 'Active'
                                : 'Disabled'}
                            </span>
                          </td>

                          <td>
                            <div className="integration-date">
                              <strong>
                                {formatDate(
                                  integration.createdAt,
                                )}
                              </strong>

                              <span>
                                {formatTime(
                                  integration.createdAt,
                                )}
                              </span>
                            </div>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="table-action"
                              onClick={() =>
                                setIntegrationToEdit(
                                  integration,
                                )
                              }
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>
                  Showing {rangeStart}–
                  {rangeEnd} of{' '}
                  {
                    processedIntegrations.length
                  }
                </span>

                <div className="table-pagination-controls">
                  <button
                    type="button"
                    className="table-action"
                    onClick={() =>
                      setPage((current) =>
                        Math.max(
                          1,
                          current - 1,
                        ),
                      )
                    }
                    disabled={page === 1}
                  >
                    ← Previous
                  </button>

                  <span>
                    Page {page} of{' '}
                    {pageCount}
                  </span>

                  <button
                    type="button"
                    className="table-action"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(
                          pageCount,
                          current + 1,
                        ),
                      )
                    }
                    disabled={
                      page === pageCount
                    }
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
          Provider credentials are sent to
          APIShield only when configuring or
          replacing them. Stored provider
          credentials are encrypted by the
          backend and are never returned to this
          page.
        </span>
      </div>

      {showCreateModal && (
        <IntegrationFormModal
          title="Add API integration"
          submitLabel="Create integration"
          processing={processing}
          onClose={() =>
            !processing &&
            setShowCreateModal(false)
          }
          onSubmit={
            handleCreateIntegration
          }
        />
      )}

      {integrationToEdit && (
        <IntegrationFormModal
          title="Edit API integration"
          submitLabel="Save changes"
          processing={processing}
          integration={
            integrationToEdit
          }
          onClose={() =>
            !processing &&
            setIntegrationToEdit(null)
          }
          onSubmit={
            handleUpdateIntegration
          }
        />
      )}

      {feedback && (
        <FeedbackModal
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() =>
            setFeedback(null)
          }
        />
      )}
    </DashboardLayout>
  );
}

interface IntegrationFormModalProps {
  title: string;
  submitLabel: string;
  processing: boolean;
  integration?: ApiIntegration;
  onClose: () => void;
  onSubmit: (
    payload: IntegrationFormPayload,
  ) => Promise<void> | void;
}

function IntegrationFormModal({
  title,
  submitLabel,
  processing,
  integration,
  onClose,
  onSubmit,
}: IntegrationFormModalProps) {
  const [name, setName] = useState(
    integration?.name ?? '',
  );

  const [provider, setProvider] = useState(
    integration?.provider ?? '',
  );

  const [baseUrl, setBaseUrl] = useState(
    integration?.baseUrl ?? '',
  );

  const [authType, setAuthType] =
    useState<ApiIntegrationAuthType>(
      integration?.authType ?? 'NONE',
    );

  const [
    credentialPlacement,
    setCredentialPlacement,
  ] = useState<ApiCredentialPlacement>(
    integration?.credentialPlacement ??
      'HEADER',
  );

  const [
    credentialName,
    setCredentialName,
  ] = useState(
    integration?.credentialName ?? '',
  );

  const [
    providerCredential,
    setProviderCredential,
  ] = useState('');

  const [status, setStatus] =
    useState<ApiIntegrationStatus>(
      integration?.status ?? 'ACTIVE',
    );

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  function handleAuthTypeChange(
    nextAuthType: ApiIntegrationAuthType,
  ) {
    setAuthType(nextAuthType);

    if (nextAuthType !== 'API_KEY') {
      setCredentialName('');
      setCredentialPlacement('HEADER');
    }

    if (nextAuthType === 'NONE') {
      setProviderCredential('');
    }

    setErrors({});
  }

  function validate() {
    const newErrors: Record<
      string,
      string
    > = {};

    if (!name.trim()) {
      newErrors.name =
        'Integration name is required.';
    }

    if (!provider.trim()) {
      newErrors.provider =
        'Provider name is required.';
    }

    if (!baseUrl.trim()) {
      newErrors.baseUrl =
        'Base URL is required.';
    } else {
      try {
        const url = new URL(
          baseUrl.trim(),
        );

        if (
          url.protocol !== 'http:' &&
          url.protocol !== 'https:'
        ) {
          newErrors.baseUrl =
            'Base URL must use HTTP or HTTPS.';
        }
      } catch {
        newErrors.baseUrl =
          'Enter a valid provider URL.';
      }
    }

    if (
      authType === 'API_KEY' &&
      !credentialName.trim()
    ) {
      newErrors.credentialName =
        'Credential name is required for API key authentication.';
    }

    const authTypeChanged =
      integration !== undefined &&
      integration.authType !== authType;

    const requiresCredential =
      authType !== 'NONE' &&
      (!integration?.hasCredential ||
        authTypeChanged);

    if (
      requiresCredential &&
      !providerCredential.trim()
    ) {
      newErrors.providerCredential =
        'Provider credential is required.';
    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!validate()) return;

    const payload: IntegrationFormPayload =
      {
        name: name.trim(),
        provider: provider.trim(),
        baseUrl: baseUrl.trim(),
        authType,
        ...(authType === 'API_KEY'
          ? {
              credentialPlacement,
              credentialName:
                credentialName.trim(),
            }
          : {
              credentialPlacement: null,
              credentialName: null,
            }),
        ...(providerCredential.trim()
          ? {
              providerCredential:
                providerCredential.trim(),
            }
          : {}),
        ...(integration
          ? {
              status,
            }
          : {}),
      };

    void onSubmit(payload);
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
    >
      <form
        className="integration-form"
        onSubmit={handleSubmit}
        noValidate
      >
        <div className="integration-form-body">
          <div className="form-field">
            <label htmlFor="integration-name">
              Integration name
            </label>

            <input
              id="integration-name"
              type="text"
              value={name}
              onChange={(event) => {
                setName(
                  event.target.value,
                );

                setErrors(
                  (current) => ({
                    ...current,
                    name: '',
                  }),
                );
              }}
              placeholder="HTTPBin API"
            />

            {errors.name && (
              <span className="integration-form-error">
                {errors.name}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="integration-provider">
              Provider
            </label>

            <input
              id="integration-provider"
              type="text"
              value={provider}
              onChange={(event) => {
                setProvider(
                  event.target.value,
                );

                setErrors(
                  (current) => ({
                    ...current,
                    provider: '',
                  }),
                );
              }}
              placeholder="HTTPBin"
            />

            {errors.provider && (
              <span className="integration-form-error">
                {errors.provider}
              </span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="integration-base-url">
              Base URL
            </label>

            <input
              id="integration-base-url"
              type="url"
              value={baseUrl}
              onChange={(event) => {
                setBaseUrl(
                  event.target.value,
                );

                setErrors(
                  (current) => ({
                    ...current,
                    baseUrl: '',
                  }),
                );
              }}
              placeholder="https://httpbin.org"
            />

            {errors.baseUrl && (
              <span className="integration-form-error">
                {errors.baseUrl}
              </span>
            )}

            <span className="integration-form-help">
              APIShield's backend performs the
              authoritative outbound destination
              safety validation.
            </span>
          </div>

          <div className="form-field">
            <label htmlFor="integration-auth-type">
              Authentication
            </label>

            <select
              id="integration-auth-type"
              value={authType}
              onChange={(event) =>
                handleAuthTypeChange(
                  event.target
                    .value as ApiIntegrationAuthType,
                )
              }
            >
              <option value="NONE">
                No authentication
              </option>

              <option value="API_KEY">
                API key
              </option>

              <option value="BEARER_TOKEN">
                Bearer token
              </option>

              <option value="BASIC_AUTH">
                Basic authentication
              </option>
            </select>
          </div>

          {authType === 'API_KEY' && (
            <div className="integration-form-grid">
              <div className="form-field">
                <label htmlFor="integration-credential-placement">
                  API key placement
                </label>

                <select
                  id="integration-credential-placement"
                  value={
                    credentialPlacement
                  }
                  onChange={(event) =>
                    setCredentialPlacement(
                      event.target
                        .value as ApiCredentialPlacement,
                    )
                  }
                >
                  <option value="HEADER">
                    Request header
                  </option>

                  <option value="QUERY">
                    Query parameter
                  </option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="integration-credential-name">
                  {credentialPlacement ===
                  'HEADER'
                    ? 'Header name'
                    : 'Query parameter name'}
                </label>

                <input
                  id="integration-credential-name"
                  type="text"
                  value={credentialName}
                  onChange={(event) => {
                    setCredentialName(
                      event.target.value,
                    );

                    setErrors(
                      (current) => ({
                        ...current,
                        credentialName: '',
                      }),
                    );
                  }}
                  placeholder={
                    credentialPlacement ===
                    'HEADER'
                      ? 'X-API-Key'
                      : 'api_key'
                  }
                />

                {errors.credentialName && (
                  <span className="integration-form-error">
                    {
                      errors.credentialName
                    }
                  </span>
                )}
              </div>
            </div>
          )}

          {authType !== 'NONE' && (
            <div className="form-field">
              <label htmlFor="integration-provider-credential">
                {getCredentialLabel(
                  authType,
                )}
              </label>

              <SensitiveInput
                id="integration-provider-credential"
                value={
                  providerCredential
                }
                onChange={(event) => {
                  setProviderCredential(
                    event.target.value,
                  );

                  setErrors(
                    (current) => ({
                      ...current,
                      providerCredential:
                        '',
                    }),
                  );
                }}
                placeholder={
                  integration?.hasCredential &&
                  integration.authType ===
                    authType
                    ? 'Leave blank to keep the existing credential'
                    : getCredentialPlaceholder(
                        authType,
                      )
                }
                autoComplete="off"
              />

              {errors.providerCredential && (
                <span className="integration-form-error">
                  {
                    errors.providerCredential
                  }
                </span>
              )}

              {integration?.hasCredential &&
                integration.authType ===
                  authType && (
                  <span className="integration-credential-existing">
                    A provider credential is
                    already configured. Leave
                    this field blank unless you
                    want to replace it.
                  </span>
                )}
            </div>
          )}

          {integration && (
            <div className="form-field">
              <label htmlFor="integration-status">
                Status
              </label>

              <select
                id="integration-status"
                value={status}
                onChange={(event) =>
                  setStatus(
                    event.target
                      .value as ApiIntegrationStatus,
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
            </div>
          )}

          <div className="integration-security-note">
            <strong>
              Provider credential security
            </strong>

            <p>
              Secrets entered here are sent to
              the APIShield backend for encrypted
              storage. They are not displayed
              again after the integration is
              saved.
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
              ? 'Saving...'
              : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function formatAuthType(
  authType: ApiIntegrationAuthType,
) {
  if (authType === 'NONE') {
    return 'None';
  }

  if (authType === 'API_KEY') {
    return 'API key';
  }

  if (authType === 'BEARER_TOKEN') {
    return 'Bearer token';
  }

  return 'Basic auth';
}

function formatCredentialPlacement(
  placement: ApiCredentialPlacement,
) {
  return placement === 'HEADER'
    ? 'Header'
    : 'Query parameter';
}

function getCredentialLabel(
  authType: ApiIntegrationAuthType,
) {
  if (authType === 'API_KEY') {
    return 'API key';
  }

  if (authType === 'BEARER_TOKEN') {
    return 'Bearer token';
  }

  if (authType === 'BASIC_AUTH') {
    return 'Basic authentication credential';
  }

  return 'Provider credential';
}

function getCredentialPlaceholder(
  authType: ApiIntegrationAuthType,
) {
  if (authType === 'API_KEY') {
    return 'Enter the provider API key';
  }

  if (authType === 'BEARER_TOKEN') {
    return 'Enter the provider bearer token';
  }

  if (authType === 'BASIC_AUTH') {
    return 'Enter the provider Basic Auth credential';
  }

  return 'Enter provider credential';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  ).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(
    'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    },
  ).format(new Date(value));
}