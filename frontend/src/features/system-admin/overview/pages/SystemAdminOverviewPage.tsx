import { useEffect, useState } from 'react';
import { useAuth } from '../../../auth/auth.context';
import { DashboardLayout } from '../../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../../dashboard/components/ErrorState';
import { getSystemAdminOverview } from '../../system-admin.api';
import type { SystemAdminOverview } from '../../system-admin.types';
import { SystemAdminMetricCard } from '../components/SystemAdminMetricCard';
import '../../system-admin.css';

export function SystemAdminOverviewPage() {
  const { accessToken } = useAuth();

  const [overview, setOverview] = useState<SystemAdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOverview() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const data = await getSystemAdminOverview(accessToken);
      setOverview(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load system administration overview.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOverview();
  }, [accessToken]);

  return (
    <DashboardLayout>
      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">SYSTEM ADMINISTRATION</p>
          <h2>System Overview</h2>
          <p>Monitor platform accounts, organizations, client applications and recorded security events.</p>
        </div>

        <button type="button" className="button secondary" onClick={() => void loadOverview()} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </section>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading system overview...</strong>
            <p>Please wait while APIShield retrieves current platform information.</p>
          </div>
        </section>
      )}

      {!loading && error && <ErrorState message={error} onRetry={() => void loadOverview()} />}

      {!loading && !error && overview && (
        <>
          <section className="system-admin-primary-grid">
            <SystemAdminMetricCard label="Total users" value={overview.totalUsers} />
            <SystemAdminMetricCard label="Organizations" value={overview.totalOrganizations} />
            <SystemAdminMetricCard label="Client applications" value={overview.totalApplications} />
            <SystemAdminMetricCard label="Security events" value={overview.totalSecurityEvents} />
          </section>

          <section className="panel system-admin-account-panel">
            <div className="panel-header">
              <div>
                <h3>Account overview</h3>
                <p>Current account totals grouped by system status and role.</p>
              </div>
            </div>

            <div className="system-admin-secondary-grid">
              <SystemAdminMetricCard label="Active users" value={overview.activeUsers} tone="success" />
              <SystemAdminMetricCard label="Suspended users" value={overview.suspendedUsers} tone="danger" />
              <SystemAdminMetricCard label="Organization accounts" value={overview.organizationAccounts} tone="info" />
              <SystemAdminMetricCard label="Developer accounts" value={overview.developerAccounts} tone="info" />
            </div>
          </section>

          <div className="security-note">
            <strong>System visibility</strong>
            <span>This administration workspace uses safe platform metadata only. Password hashes, Client Secrets, provider credentials and verification tokens are never displayed.</span>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}