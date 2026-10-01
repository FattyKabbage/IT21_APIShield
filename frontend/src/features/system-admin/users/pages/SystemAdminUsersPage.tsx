import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../../auth/auth.context';
import { DashboardLayout } from '../../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../../dashboard/components/ErrorState';
import { getSystemAdminUsers } from '../../system-admin.api';
import type { SystemAdminAccountStatus, SystemAdminUser, SystemAdminUserRole } from '../../system-admin.types';
import { SystemAdminUserStatus } from '../components/SystemAdminUserStatus';
import '../../system-admin.css';

const PAGE_SIZE = 10;

type RoleFilter = 'ALL' | SystemAdminUserRole;
type StatusFilter = 'ALL' | SystemAdminAccountStatus;

export function SystemAdminUsersPage() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<SystemAdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUsers() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getSystemAdminUsers(accessToken);
      setUsers(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load system users.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [accessToken]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  const processedUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...users]
      .filter((user) => {
        const matchesSearch =
          !query ||
          user.email.toLowerCase().includes(query) ||
          user.organizationName?.toLowerCase().includes(query) ||
          formatRole(user.role).toLowerCase().includes(query);

        const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
        const matchesStatus = statusFilter === 'ALL' || user.status === statusFilter;

        return matchesSearch && matchesRole && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [users, search, roleFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(processedUsers.length / PAGE_SIZE));

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return processedUsers.slice(start, start + PAGE_SIZE);
  }, [processedUsers, page]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const rangeStart = processedUsers.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, processedUsers.length);

  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">SYSTEM ADMINISTRATION</p>
          <h2>System Users</h2>
          <p>Review safe account information for users registered across APIShield.</p>
        </div>

        <button type="button" className="button secondary" onClick={() => void loadUsers()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      <div className="system-admin-user-toolbar">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search email, role or organization..."
        />

        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as RoleFilter)} aria-label="Filter users by role">
          <option value="ALL">All roles</option>
          <option value="SYSTEM_ADMIN">System Admin</option>
          <option value="ORGANIZATION">Organization</option>
          <option value="DEVELOPER">Developer</option>
        </select>

        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} aria-label="Filter users by status">
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING_VERIFICATION">Pending verification</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading system users...</strong>
            <p>Please wait while APIShield retrieves account information.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadUsers()} />}

      {!loading && !error && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h3>Registered users</h3>
              <p>Only safe account metadata is available to the administration workspace.</p>
            </div>

            <span className="system-admin-result-count">
              {processedUsers.length} user{processedUsers.length === 1 ? '' : 's'}
            </span>
          </div>

          {paginatedUsers.length === 0 ? (
            <div className="empty-state">
              <strong>{users.length === 0 ? 'No system users found' : 'No matching users'}</strong>
              <p>{users.length === 0 ? 'Registered accounts will appear here.' : 'Try changing the search term or filters.'}</p>
            </div>
          ) : (
            <>
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Organization</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="system-admin-user-identity">
                            <strong>{user.email}</strong>
                            <span>{user.id}</span>
                          </div>
                        </td>

                        <td>
                          <span className="system-admin-role">{formatRole(user.role)}</span>
                        </td>

                        <td>
                          <SystemAdminUserStatus status={user.status} />
                        </td>

                        <td>
                          <div className="system-admin-user-organization">
                            <strong>{user.organizationName ?? '—'}</strong>
                            <span>{getMembershipLabel(user)}</span>
                          </div>
                        </td>

                        <td>
                          <div className="application-date">
                            <strong>{formatDate(user.createdAt)}</strong>
                            <span>{formatTime(user.createdAt)}</span>
                          </div>
                        </td>

                        <td>
                          <button type="button" className="table-action" onClick={() => navigate(`/admin/users/${user.id}`)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-pagination">
                <span>Showing {rangeStart}–{rangeEnd} of {processedUsers.length}</span>

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
        <strong>Account data protection</strong>
        <span>Password hashes, verification tokens, Client Secrets and provider credentials are never returned by these administration endpoints.</span>
      </div>
    </DashboardLayout>
  );
}

function formatRole(role: SystemAdminUserRole) {
  if (role === 'SYSTEM_ADMIN') return 'System Admin';
  if (role === 'ORGANIZATION') return 'Organization';
  return 'Developer';
}

function getMembershipLabel(user: SystemAdminUser) {
  if (user.role === 'SYSTEM_ADMIN') return 'Platform administrator';
  if (user.role === 'ORGANIZATION') return 'Organization owner';
  if (user.organizationId) return 'Organization developer';
  return 'Independent developer';
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