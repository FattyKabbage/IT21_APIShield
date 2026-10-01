import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../../auth/auth.context';
import { DashboardLayout } from '../../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../../dashboard/components/ErrorState';
import { getSystemAdminUser } from '../../system-admin.api';
import type { SystemAdminUserDetail, SystemAdminUserRole } from '../../system-admin.types';
import { SystemAdminUserStatus } from '../components/SystemAdminUserStatus';
import '../../system-admin.css';

export function SystemAdminUserDetailPage() {
  const { userId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [user, setUser] = useState<SystemAdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadUser() {
    if (!accessToken || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getSystemAdminUser(accessToken, userId);
      setUser(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load system user.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUser();
  }, [accessToken, userId]);

  return (
    <DashboardLayout>
      <div className="system-admin-back">
        <button type="button" className="table-action" onClick={() => navigate('/admin/users')}>
          ← Back to users
        </button>
      </div>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading user...</strong>
            <p>Please wait while APIShield retrieves the selected account.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadUser()} />}

      {!loading && !error && user && (
        <>
          <section className="dashboard-intro">
            <div>
              <p className="section-eyebrow">SYSTEM USER</p>
              <h2>{user.email}</h2>
              <p>Review safe account and organization membership information.</p>
            </div>

            <div className="system-admin-user-detail-state">
              <span className="system-admin-role">{formatRole(user.role)}</span>
              <SystemAdminUserStatus status={user.status} />
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Account information</h3>
                <p>Authentication secrets and credential hashes are excluded.</p>
              </div>
            </div>

            <div className="system-admin-detail-list">
              <div className="system-admin-detail-row">
                <span>User ID</span>
                <code>{user.id}</code>
              </div>

              <div className="system-admin-detail-row">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>

              <div className="system-admin-detail-row">
                <span>Role</span>
                <strong>{formatRole(user.role)}</strong>
              </div>

              <div className="system-admin-detail-row">
                <span>Status</span>
                <SystemAdminUserStatus status={user.status} />
              </div>

              <div className="system-admin-detail-row">
                <span>Developer type</span>
                <strong>{getDeveloperType(user)}</strong>
              </div>

              <div className="system-admin-detail-row">
                <span>Organization</span>

                <div className="system-admin-detail-value">
                  <strong>{user.organization?.name ?? 'None'}</strong>
                  {user.organization && <code>{user.organization.id}</code>}
                </div>
              </div>

              <div className="system-admin-detail-row">
                <span>Created</span>
                <strong>{formatDateTime(user.createdAt)}</strong>
              </div>

              <div className="system-admin-detail-row">
                <span>Last updated</span>
                <strong>{formatDateTime(user.updatedAt)}</strong>
              </div>
            </div>
          </section>

          <div className="security-note">
            <strong>Safe administrative view</strong>
            <span>This page intentionally excludes password hashes, authentication tokens, application secrets and encrypted provider credentials.</span>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

function formatRole(role: SystemAdminUserRole) {
  if (role === 'SYSTEM_ADMIN') return 'System Admin';
  if (role === 'ORGANIZATION') return 'Organization';
  return 'Developer';
}

function getDeveloperType(user: SystemAdminUserDetail) {
  if (user.role !== 'DEVELOPER') return 'Not applicable';
  if (user.organizationId) return 'Organization developer';
  return 'Independent developer';
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}