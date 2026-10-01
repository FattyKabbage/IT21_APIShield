import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import type { GatewayRequestLog, GatewayRequestOutcome } from '../../activity/activity.types';
import '../../activity/activity.css';
import { getDeveloperGatewayActivity } from '../developer.api';
import '../developer.css';
import { DeveloperApplicationWorkspaceNav } from './DeveloperApplicationWorkspaceNav';

const PAGE_SIZE = 10;

type OutcomeFilter = 'ALL' | GatewayRequestOutcome;

export function DeveloperGatewayActivityPage() {
  const { applicationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [activity, setActivity] = useState<GatewayRequestLog[]>([]);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadActivity() {
    if (!accessToken || !applicationId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getDeveloperGatewayActivity(accessToken, applicationId);
      setActivity(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load gateway activity.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadActivity();
  }, [accessToken, applicationId]);

  useEffect(() => {
    setPage(1);
  }, [search, outcomeFilter]);

  const sortedActivity = useMemo(() => {
    return [...activity].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activity]);

  const filteredActivity = useMemo(() => {
    const query = search.trim().toLowerCase();

    return sortedActivity.filter((log) => {
      const matchesSearch =
        !query ||
        log.integrationName?.toLowerCase().includes(query) ||
        log.provider?.toLowerCase().includes(query) ||
        log.method.toLowerCase().includes(query) ||
        log.path.toLowerCase().includes(query) ||
        String(log.providerStatus ?? '').includes(query) ||
        getOutcomeLabel(log.outcome).toLowerCase().includes(query);

      const matchesOutcome = outcomeFilter === 'ALL' || log.outcome === outcomeFilter;

      return matchesSearch && matchesOutcome;
    });
  }, [sortedActivity, search, outcomeFilter]);

  const summary = useMemo(() => {
    const successful = activity.filter((log) => log.outcome === 'SUCCESS').length;
    const providerErrors = activity.filter((log) => log.outcome === 'PROVIDER_ERROR').length;
    const gatewayErrors = activity.filter((log) => log.outcome === 'GATEWAY_ERROR').length;
    const averageDuration = activity.length === 0
      ? 0
      : Math.round(activity.reduce((total, log) => total + log.durationMs, 0) / activity.length);

    return {
      total: activity.length,
      successful,
      providerErrors,
      gatewayErrors,
      averageDuration,
    };
  }, [activity]);

  const pageCount = Math.max(1, Math.ceil(filteredActivity.length / PAGE_SIZE));

  const paginatedActivity = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredActivity.slice(start, start + PAGE_SIZE);
  }, [filteredActivity, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = filteredActivity.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, filteredActivity.length);

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
          <p className="section-eyebrow">GATEWAY MONITORING</p>
          <h2>Gateway Activity</h2>
          <p>Monitor provider requests routed through APIShield for this developer application.</p>
        </div>

        <button type="button" className="button secondary" disabled={loading} onClick={() => void loadActivity()}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {!loading && !error && (
        <section className="activity-summary-grid">
          <article className="activity-summary-card">
            <span>Total requests</span>
            <strong>{summary.total}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Successful</span>
            <strong className="activity-summary-success">{summary.successful}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Provider errors</span>
            <strong className="activity-summary-warning">{summary.providerErrors}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Gateway errors</span>
            <strong className="activity-summary-danger">{summary.gatewayErrors}</strong>
          </article>

          <article className="activity-summary-card">
            <span>Average duration</span>
            <strong>{summary.averageDuration} ms</strong>
          </article>
        </section>
      )}

      <div className="activity-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search provider, path, method or status..."
        />

        <select value={outcomeFilter} onChange={(event) => setOutcomeFilter(event.target.value as OutcomeFilter)}>
          <option value="ALL">All outcomes</option>
          <option value="SUCCESS">Success</option>
          <option value="PROVIDER_ERROR">Provider errors</option>
          <option value="GATEWAY_ERROR">Gateway errors</option>
        </select>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading gateway activity...</strong>
            <p>Please wait while APIShield retrieves this application's request history.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadActivity()} />}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Request history</h3>
              <p>Gateway traffic excludes provider credentials, authorization headers and request bodies.</p>
            </div>

            <span className="activity-result-count">
              {filteredActivity.length} record{filteredActivity.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedActivity.length === 0 ? (
            <div className="empty-state">
              <strong>{activity.length === 0 ? 'No gateway activity recorded' : 'No matching activity'}</strong>
              <p>
                {activity.length === 0
                  ? 'Requests made through the API Gateway will appear here.'
                  : 'Try changing the search term or outcome filter.'}
              </p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table activity-table">
                  <thead>
                    <tr>
                      <th>Integration</th>
                      <th>Request</th>
                      <th>Provider status</th>
                      <th>Outcome</th>
                      <th>Duration</th>
                      <th>Date / time</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedActivity.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <div className="activity-integration">
                            <strong>{log.integrationName ?? 'Unknown integration'}</strong>
                            <span>{log.provider ?? 'Unknown provider'}</span>
                          </div>
                        </td>

                        <td>
                          <div className="activity-request">
                            <strong>{log.method}</strong>
                            <code>{log.path}</code>
                          </div>
                        </td>

                        <td>
                          <span className={getProviderStatusClass(log.providerStatus)}>
                            {log.providerStatus ?? '—'}
                          </span>
                        </td>

                        <td>
                          <span className={getOutcomeClass(log.outcome)}>
                            {getOutcomeLabel(log.outcome)}
                          </span>
                        </td>

                        <td>
                          <span className="activity-duration">{log.durationMs} ms</span>
                        </td>

                        <td>
                          <div className="activity-date">
                            <strong>{formatDate(log.createdAt)}</strong>
                            <span>{formatTime(log.createdAt)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>
                  Showing {rangeStart}–{rangeEnd} of {filteredActivity.length}
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
    </DashboardLayout>
  );
}

function getOutcomeLabel(outcome: GatewayRequestOutcome) {
  if (outcome === 'SUCCESS') return 'Success';
  if (outcome === 'PROVIDER_ERROR') return 'Provider error';

  return 'Gateway error';
}

function getOutcomeClass(outcome: GatewayRequestOutcome) {
  if (outcome === 'SUCCESS') return 'activity-outcome-success';
  if (outcome === 'PROVIDER_ERROR') return 'activity-outcome-warning';

  return 'activity-outcome-danger';
}

function getProviderStatusClass(status: number | null) {
  if (status === null) return 'activity-status-neutral';
  if (status >= 200 && status < 300) return 'activity-status-success';
  if (status >= 300 && status < 400) return 'activity-status-info';
  if (status >= 400 && status < 500) return 'activity-status-warning';

  return 'activity-status-danger';
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