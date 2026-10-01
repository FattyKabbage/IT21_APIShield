import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { getApplications } from '../../applications/application.api';
import type { ClientApplication } from '../../applications/application.types';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { getOrganization, getOrganizationInvitations, getOrganizationMembers } from '../organization.api';
import type { Organization, OrganizationInvitation, OrganizationMember } from '../organization.types';
import '../organization-dashboard.css';

export function OrganizationDashboardPage() {
  const { accessToken, user } = useAuth();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [applications, setApplications] = useState<ClientApplication[]>([]);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const [organizationData, applicationData, memberData, invitationData] = await Promise.all([
        getOrganization(accessToken),
        getApplications(accessToken),
        getOrganizationMembers(accessToken),
        getOrganizationInvitations(accessToken),
      ]);

      setOrganization(organizationData);
      setApplications(applicationData);
      setMembers(memberData);
      setInvitations(invitationData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load organization dashboard.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [accessToken]);

  const summary = useMemo(() => {
    const developers = members.filter((member) => member.role === 'DEVELOPER').length;
    const pendingInvitations = invitations.filter((invitation) => invitation.status === 'PENDING').length;

    return {
      applications: applications.length,
      developers,
      members: members.length,
      pendingInvitations,
    };
  }, [applications, members, invitations]);

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [applications]);

  if (loading) {
    return (
      <DashboardLayout>
        <section className="panel">
          <div className="empty-state">
            <strong>Loading dashboard...</strong>
            <p>Please wait while APIShield retrieves your organization data.</p>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={() => void loadDashboard()} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="organization-dashboard-header">
        <div>
          <p className="section-eyebrow">ORGANIZATION OVERVIEW</p>
          <h2>{organization?.name || 'Organization Dashboard'}</h2>
          <p>Monitor your APIShield applications, members and organization activity.</p>
        </div>

        <div className="organization-dashboard-account">
          <span>Signed in as</span>
          <strong>{user?.email}</strong>
        </div>
      </section>

      <section className="organization-dashboard-summary">
        <article className="organization-dashboard-stat">
          <span>Total applications</span>
          <strong>{summary.applications}</strong>
          <p>Applications registered with APIShield.</p>
        </article>

        <article className="organization-dashboard-stat">
          <span>Developers</span>
          <strong>{summary.developers}</strong>
          <p>Developer accounts joined to this organization.</p>
        </article>

        <article className="organization-dashboard-stat">
          <span>Total members</span>
          <strong>{summary.members}</strong>
          <p>Accounts currently belonging to the organization.</p>
        </article>

        <article className="organization-dashboard-stat">
          <span>Pending invitations</span>
          <strong className={summary.pendingInvitations > 0 ? 'organization-dashboard-warning' : ''}>
            {summary.pendingInvitations}
          </strong>
          <p>Developer invitations awaiting acceptance.</p>
        </article>
      </section>

      <section className="organization-dashboard-grid">
        <article className="panel organization-dashboard-recent">
          <div className="panel-header">
            <div>
              <h3>Recent applications</h3>
              <p>Your most recently registered client applications.</p>
            </div>

            <Link className="organization-dashboard-link" to="/dashboard/applications">
              View all
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="empty-state">
              <strong>No applications yet</strong>
              <p>Create your first client application to begin using APIShield.</p>

              <Link className="button primary" to="/dashboard/applications">
                Manage applications
              </Link>
            </div>
          ) : (
            <div className="organization-dashboard-application-list">
              {recentApplications.map((application) => (
                <Link key={application.id} className="organization-dashboard-application" to={`/dashboard/applications/${application.id}`}>
                  <div>
                    <strong>{application.name}</strong>
                    <span>{application.description || 'No description provided.'}</span>
                  </div>

                  <div className="organization-dashboard-application-state">
                    <span className={`application-environment ${application.environment.toLowerCase()}`}>
                      {application.environment}
                    </span>

                    <span className={application.status === 'ACTIVE' ? 'organization-dashboard-status-success' : 'organization-dashboard-status-danger'}>
                      {application.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <aside className="organization-dashboard-side">
          <section className="panel organization-dashboard-quick-panel">
            <div className="panel-header">
              <div>
                <h3>Quick access</h3>
                <p>Common organization tasks.</p>
              </div>
            </div>

            <div className="organization-dashboard-actions">
              <Link to="/dashboard/applications">
                <strong>Client Applications</strong>
                <span>Create and manage applications.</span>
                <b>→</b>
              </Link>

              <Link to="/dashboard/organizations">
                <strong>Organization</strong>
                <span>Members and developer invitations.</span>
                <b>→</b>
              </Link>
            </div>
          </section>

          <section className="panel organization-dashboard-security">
            <p className="section-eyebrow">SECURITY</p>
            <h3>Organization protection</h3>
            <p>Application credentials, provider secrets and API access are controlled through APIShield's authenticated management workflows.</p>

            <div className="organization-dashboard-security-row">
              <span>Organization role</span>
              <strong>ORGANIZATION</strong>
            </div>

            <div className="organization-dashboard-security-row">
              <span>Pending invitations</span>
              <strong>{summary.pendingInvitations}</strong>
            </div>
          </section>
        </aside>
      </section>
    </DashboardLayout>
  );
}