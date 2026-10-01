import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../auth/auth.context';
import { DashboardLayout } from '../../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../../dashboard/components/ErrorState';
import { getSystemAdminOrganizations } from '../../system-admin.api';
import type { SystemAdminOrganization } from '../../system-admin.types';
import '../../system-admin.css';

const PAGE_SIZE = 10;

export function SystemAdminOrganizationsPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [organizations, setOrganizations] = useState<SystemAdminOrganization[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrganizations() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getSystemAdminOrganizations(accessToken);
      setOrganizations(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load organizations.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrganizations();
  }, [accessToken]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const processedOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...organizations]
      .filter((organization) => !query || organization.name.toLowerCase().includes(query) || organization.id.toLowerCase().includes(query))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [organizations, search]);

  const pageCount = Math.max(1, Math.ceil(processedOrganizations.length / PAGE_SIZE));

  const paginatedOrganizations = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedOrganizations.slice(start, start + PAGE_SIZE);
  }, [processedOrganizations, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = processedOrganizations.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, processedOrganizations.length);

  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">SYSTEM ADMINISTRATION</p>
          <h2>Organizations</h2>
          <p>Review registered organizations, membership totals and client application usage.</p>
        </div>

        <button type="button" className="button secondary" onClick={() => void loadOrganizations()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <div className="system-admin-organization-toolbar">
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search organizations..." />
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading organizations...</strong>
            <p>Please wait while APIShield retrieves organization information.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadOrganizations()} />}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Registered organizations</h3>
              <p>Member and application totals are calculated from current platform data.</p>
            </div>

            <span className="system-admin-result-count">
              {processedOrganizations.length} organization{processedOrganizations.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedOrganizations.length === 0 ? (
            <div className="empty-state">
              <strong>{organizations.length === 0 ? 'No organizations found' : 'No matching organizations'}</strong>
              <p>{organizations.length === 0 ? 'Registered organizations will appear here.' : 'Try changing your search term.'}</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Members</th>
                      <th>Applications</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedOrganizations.map((organization) => (
                      <tr key={organization.id}>
                        <td>
                          <div className="system-admin-organization-name">
                            <strong>{organization.name}</strong>
                            <span>{organization.id}</span>
                          </div>
                        </td>

                        <td>
                          <strong className="system-admin-count-value">{organization.memberCount}</strong>
                        </td>

                        <td>
                          <strong className="system-admin-count-value">{organization.applicationCount}</strong>
                        </td>

                        <td>
                          <div className="application-date">
                            <strong>{formatDate(organization.createdAt)}</strong>
                            <span>{formatTime(organization.createdAt)}</span>
                          </div>
                        </td>

                        <td>
                          <button type="button" className="table-action" onClick={() => navigate(`/admin/organizations/${organization.id}`)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>Showing {rangeStart}–{rangeEnd} of {processedOrganizations.length}</span>

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
        <strong>Organization visibility</strong>
        <span>System administrators can inspect safe organization, membership and application metadata without exposing application or provider secrets.</span>
      </div>
    </DashboardLayout>
  );
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