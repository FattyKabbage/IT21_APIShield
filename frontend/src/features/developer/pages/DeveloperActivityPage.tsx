import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import type { SecurityEvent, SecurityEventCategory } from '../../activity/activity.types';
import '../../activity/activity.css';
import { getDeveloperApplication, getDeveloperApplicationActivity } from '../developer.api';
import '../developer.css';
import { DeveloperApplicationWorkspaceNav } from './DeveloperApplicationWorkspaceNav';

const PAGE_SIZE = 10;

type CategoryFilter = 'ALL' | SecurityEventCategory;

export function DeveloperActivityPage() {
  const { applicationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<SecurityEvent[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadActivity() {
    if (!accessToken || !applicationId) return;

    try {
      setLoading(true);
      setError(null);

      const [application, activityData] = await Promise.all([
        getDeveloperApplication(accessToken, applicationId),
        getDeveloperApplicationActivity(accessToken, applicationId),
      ]);

      if (application.accessType !== 'OWNED') {
        setActivity([]);
        setError('Activity Log is only available for your personal application.');
        return;
      }

      setActivity(activityData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load personal application activity.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActivity();
  }, [accessToken, applicationId]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter]);

  const processedActivity = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...activity]
      .filter((event) => {
        const matchesSearch =
          !query ||
          event.actorEmail?.toLowerCase().includes(query) ||
          event.targetLabel?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          formatAction(event.action).toLowerCase().includes(query) ||
          formatCategory(event.category).toLowerCase().includes(query);

        const matchesCategory = categoryFilter === 'ALL' || event.category === categoryFilter;

        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activity, search, categoryFilter]);

  const summary = useMemo(() => {
    return {
      total: activity.length,
      applications: activity.filter((event) => event.category === 'APPLICATION').length,
      credentials: activity.filter((event) => event.category === 'CREDENTIAL').length,
      integrations: activity.filter((event) => event.category === 'INTEGRATION').length,
      access: activity.filter((event) => event.category === 'ACCESS_CONTROL').length,
    };
  }, [activity]);

  const pageCount = Math.max(1, Math.ceil(processedActivity.length / PAGE_SIZE));

  const paginatedActivity = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedActivity.slice(start, start + PAGE_SIZE);
  }, [processedActivity, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = processedActivity.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, processedActivity.length);

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
          <p className="section-eyebrow">PERSONAL APPLICATION AUDIT</p>
          <h2>Activity Log</h2>
          <p>Review management and security-sensitive actions performed on your personal application.</p>
        </div>

        <button type="button" className="button secondary" onClick={() => void loadActivity()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {!loading && !error && (
        <section className="activity-summary-grid">
          <article className="activity-summary-card">
            <span>Total events</span>
            <strong>{summary.total}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Application</span>
            <strong>{summary.applications}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Credentials</span>
            <strong>{summary.credentials}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Integrations</span>
            <strong>{summary.integrations}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Access control</span>
            <strong>{summary.access}</strong>
          </article>
        </section>
      )}

      <div className="activity-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search actor, action or target..."
        />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
          aria-label="Filter activity category"
        >
          <option value="ALL">All categories</option>
          <option value="APPLICATION">Application</option>
          <option value="CREDENTIAL">Credentials</option>
          <option value="INTEGRATION">Integrations</option>
          <option value="ACCESS_CONTROL">Access control</option>
          <option value="AUTHENTICATION">Authentication</option>
          <option value="AUTHORIZATION">Authorization</option>
          <option value="ORGANIZATION">Organization</option>
          <option value="SYSTEM">System</option>
        </select>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading activity log...</strong>
            <p>Please wait while APIShield retrieves your personal application's management activity.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadActivity()} />}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Management events</h3>
              <p>Passwords, Client Secrets and provider credentials are never displayed in the audit log.</p>
            </div>

            <span className="activity-result-count">
              {processedActivity.length} event{processedActivity.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedActivity.length === 0 ? (
            <div className="empty-state">
              <strong>{activity.length === 0 ? 'No management activity recorded' : 'No matching activity'}</strong>

              <p>
                {activity.length === 0
                  ? 'Management actions performed on your personal application will appear here.'
                  : 'Try changing the search term or category filter.'}
              </p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table management-activity-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Actor</th>
                      <th>Target</th>
                      <th>Category</th>
                      <th>Changes</th>
                      <th>Outcome</th>
                      <th>Date / time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedActivity.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <div className="management-activity-action">
                            <strong>{formatAction(event.action)}</strong>
                            <span>{event.description ?? 'Management event recorded.'}</span>
                          </div>
                        </td>

                        <td>
                          <span className="management-activity-actor">{event.actorEmail ?? 'System'}</span>
                        </td>

                        <td>
                          <div className="management-activity-target">
                            <strong>{event.targetLabel ?? '—'}</strong>
                            <span>{formatTargetType(event.targetType)}</span>
                          </div>
                        </td>

                        <td>
                          <span className="activity-status-info">{formatCategory(event.category)}</span>
                        </td>

                        <td>
                          {event.changedFields.length > 0 ? (
                            <span className="management-activity-fields">
                              {event.changedFields.map(formatFieldName).join(', ')}
                            </span>
                          ) : (
                            <span className="activity-status-neutral">—</span>
                          )}
                        </td>

                        <td>
                          <span className={getOutcomeClass(event.outcome)}>{formatOutcome(event.outcome)}</span>
                        </td>

                        <td>
                          <div className="activity-date">
                            <strong>{formatDate(event.createdAt)}</strong>
                            <span>{formatTime(event.createdAt)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {processedActivity.length}
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
        <strong>Audit log security</strong>
        <span>This log records what management action occurred and who performed it without storing application secrets or provider credentials.</span>
      </div>
    </DashboardLayout>
  );
}

function formatAction(action: SecurityEvent['action']) {
  const labels: Record<SecurityEvent['action'], string> = {
    USER_LOGIN_SUCCEEDED: 'Login succeeded',
    USER_LOGIN_FAILED: 'Login failed',
    USER_LOGOUT: 'User signed out',
    APPLICATION_CREATED: 'Application created',
    APPLICATION_UPDATED: 'Application updated',
    APPLICATION_CREDENTIAL_CREATED: 'Credentials created',
    APPLICATION_CREDENTIAL_ROTATED: 'Credentials rotated',
    DEVELOPER_ASSIGNED: 'Developer assigned',
    DEVELOPER_ACCESS_REMOVED: 'Developer access removed',
    API_INTEGRATION_CREATED: 'Integration created',
    API_INTEGRATION_UPDATED: 'Integration updated',
    ORGANIZATION_INVITATION_CREATED: 'Invitation created',
    ORGANIZATION_INVITATION_RESENT: 'Invitation resent',
    ORGANIZATION_INVITATION_REVOKED: 'Invitation revoked',
    ORGANIZATION_INVITATION_ACCEPTED: 'Invitation accepted',
    ACCESS_DENIED: 'Access denied',
  };

  return labels[action];
}

function formatCategory(category: SecurityEventCategory) {
  if (category === 'ACCESS_CONTROL') return 'Access control';
  return category.charAt(0) + category.slice(1).toLowerCase();
}

function formatTargetType(targetType: SecurityEvent['targetType']) {
  return targetType
    .toLowerCase()
    .split('_')
    .map((value) => value.charAt(0).toUpperCase() + value.slice(1))
    .join(' ');
}

function formatFieldName(field: string) {
  const labels: Record<string, string> = {
    baseUrl: 'Base URL',
    authType: 'Authentication',
    credentialPlacement: 'Credential placement',
    credentialName: 'Credential name',
    providerCredential: 'Provider credential',
    clientId: 'Client ID',
    clientSecret: 'Client Secret',
  };

  return labels[field] ?? field.charAt(0).toUpperCase() + field.slice(1);
}

function formatOutcome(outcome: SecurityEvent['outcome']) {
  if (outcome === 'DENIED') return 'Denied';
  if (outcome === 'FAILURE') return 'Failure';
  return 'Success';
}

function getOutcomeClass(outcome: SecurityEvent['outcome']) {
  if (outcome === 'SUCCESS') return 'activity-outcome-success';
  if (outcome === 'DENIED') return 'activity-outcome-warning';
  return 'activity-outcome-danger';
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