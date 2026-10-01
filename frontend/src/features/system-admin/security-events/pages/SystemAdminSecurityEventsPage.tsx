import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../auth/auth.context';
import { DashboardLayout } from '../../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../../dashboard/components/ErrorState';
import type { SecurityEvent, SecurityEventCategory, SecurityEventOutcome, SecurityEventSeverity } from '../../../activity/activity.types';
import { getSystemAdminSecurityEvents } from '../../system-admin.api';
import { SystemAdminEventSeverity } from '../components/SystemAdminEventSeverity';
import '../../system-admin.css';

const PAGE_SIZE = 10;

type CategoryFilter = 'ALL' | SecurityEventCategory;
type SeverityFilter = 'ALL' | SecurityEventSeverity;
type OutcomeFilter = 'ALL' | SecurityEventOutcome;
type ActionFilter = 'ALL' | SecurityEvent['action'];

export function SystemAdminSecurityEventsPage() {
  const { accessToken } = useAuth();

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('ALL');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadEvents() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getSystemAdminSecurityEvents(accessToken);
      setEvents(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load security events.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadEvents();
  }, [accessToken]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, severityFilter, outcomeFilter, actionFilter]);

  const availableActions = useMemo(() => {
    return [...new Set(events.map((event) => event.action))].sort();
  }, [events]);

  const processedEvents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...events]
      .filter((event) => {
        const matchesSearch =
          !query ||
          event.actorEmail?.toLowerCase().includes(query) ||
          event.targetLabel?.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query) ||
          formatAction(event.action).toLowerCase().includes(query) ||
          event.applicationId?.toLowerCase().includes(query) ||
          event.organizationId?.toLowerCase().includes(query);

        const matchesCategory = categoryFilter === 'ALL' || event.category === categoryFilter;
        const matchesSeverity = severityFilter === 'ALL' || event.severity === severityFilter;
        const matchesOutcome = outcomeFilter === 'ALL' || event.outcome === outcomeFilter;
        const matchesAction = actionFilter === 'ALL' || event.action === actionFilter;

        return matchesSearch && matchesCategory && matchesSeverity && matchesOutcome && matchesAction;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events, search, categoryFilter, severityFilter, outcomeFilter, actionFilter]);

  const summary = useMemo(() => {
    return {
      total: events.length,
      info: events.filter((event) => event.severity === 'INFO').length,
      warning: events.filter((event) => event.severity === 'WARNING').length,
      critical: events.filter((event) => event.severity === 'CRITICAL').length,
      denied: events.filter((event) => event.outcome === 'DENIED').length,
    };
  }, [events]);

  const pageCount = Math.max(1, Math.ceil(processedEvents.length / PAGE_SIZE));

  const paginatedEvents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedEvents.slice(start, start + PAGE_SIZE);
  }, [processedEvents, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = processedEvents.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, processedEvents.length);

  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">SYSTEM SECURITY</p>
          <h2>Security Events</h2>
          <p>Monitor security-sensitive and management activity recorded across APIShield.</p>
        </div>

        <button type="button" className="button secondary" onClick={() => void loadEvents()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {!loading && !error && (
        <section className="system-admin-event-summary">
          <article className="system-admin-event-summary-card">
            <span>Total events</span>
            <strong>{summary.total}</strong>
          </article>

          <article className="system-admin-event-summary-card">
            <span>Information</span>
            <strong className="system-admin-event-info">{summary.info}</strong>
          </article>

          <article className="system-admin-event-summary-card">
            <span>Warnings</span>
            <strong className="system-admin-event-warning">{summary.warning}</strong>
          </article>

          <article className="system-admin-event-summary-card">
            <span>Critical</span>
            <strong className="system-admin-event-critical">{summary.critical}</strong>
          </article>

          <article className="system-admin-event-summary-card">
            <span>Denied</span>
            <strong className="system-admin-event-warning">{summary.denied}</strong>
          </article>
        </section>
      )}

      <div className="system-admin-event-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search actor, action, target or description..."
        />

        <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}>
          <option value="ALL">All categories</option>
          <option value="AUTHENTICATION">Authentication</option>
          <option value="AUTHORIZATION">Authorization</option>
          <option value="APPLICATION">Application</option>
          <option value="CREDENTIAL">Credential</option>
          <option value="INTEGRATION">Integration</option>
          <option value="ORGANIZATION">Organization</option>
          <option value="ACCESS_CONTROL">Access control</option>
          <option value="SYSTEM">System</option>
        </select>

        <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}>
          <option value="ALL">All severities</option>
          <option value="INFO">Info</option>
          <option value="WARNING">Warning</option>
          <option value="CRITICAL">Critical</option>
        </select>

        <select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value as OutcomeFilter)}>
          <option value="ALL">All outcomes</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILURE">Failure</option>
          <option value="DENIED">Denied</option>
        </select>

        <select value={actionFilter} onChange={(event) => setActionFilter(event.target.value as ActionFilter)}>
          <option value="ALL">All actions</option>

          {availableActions.map((action) => (
            <option key={action} value={action}>
              {formatAction(action)}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading security events...</strong>
            <p>Please wait while APIShield retrieves platform security activity.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadEvents()} />}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Platform events</h3>
              <p>Security events are shown newest first and exclude passwords, Client Secrets and provider credentials.</p>
            </div>

            <span className="system-admin-result-count">
              {processedEvents.length} event{processedEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedEvents.length === 0 ? (
            <div className="empty-state">
              <strong>{events.length === 0 ? 'No security events recorded' : 'No matching security events'}</strong>
              <p>{events.length === 0 ? 'Recorded security activity will appear here.' : 'Try changing the search term or filters.'}</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table system-admin-security-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Actor</th>
                      <th>Target</th>
                      <th>Category</th>
                      <th>Severity</th>
                      <th>Outcome</th>
                      <th>Date / time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedEvents.map((event) => (
                      <tr key={event.id}>
                        <td>
                          <div className="system-admin-event-action">
                            <strong>{formatAction(event.action)}</strong>
                            <span>{event.description ?? 'Security event recorded.'}</span>
                          </div>
                        </td>

                        <td>
                          <div className="system-admin-event-actor">
                            <strong>{event.actorEmail ?? 'System'}</strong>
                            <span>{event.actorUserId ?? 'No user actor'}</span>
                          </div>
                        </td>

                        <td>
                          <div className="system-admin-event-target">
                            <strong>{event.targetLabel ?? '—'}</strong>
                            <span>{formatTargetType(event.targetType)}</span>
                          </div>
                        </td>

                        <td>
                          <span className="system-admin-event-category">{formatCategory(event.category)}</span>
                        </td>

                        <td>
                          <SystemAdminEventSeverity severity={event.severity} />
                        </td>

                        <td>
                          <span className={getOutcomeClass(event.outcome)}>{formatOutcome(event.outcome)}</span>
                        </td>

                        <td>
                          <div className="application-date">
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
                <span>Showing {rangeStart}–{rangeEnd} of {processedEvents.length}</span>

                <div className="table-pagination-controls">
                  <button type="button" className="table-action" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
                    ← Previous
                  </button>

                  <span>Page {page} of {pageCount}</span>

                  <button type="button" className="table-action" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>
                    Next →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <div className="security-note">
        <strong>Central security visibility</strong>
        <span>System administrators can review recorded platform security activity without receiving stored authentication secrets or sensitive provider credentials.</span>
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

function formatOutcome(outcome: SecurityEventOutcome) {
  if (outcome === 'FAILURE') return 'Failure';
  if (outcome === 'DENIED') return 'Denied';
  return 'Success';
}

function getOutcomeClass(outcome: SecurityEventOutcome) {
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