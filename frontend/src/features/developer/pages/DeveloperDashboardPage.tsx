import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import {
  getDeveloperApplications,
  getDeveloperProfile,
} from '../developer.api';
import type {
  DeveloperApplication,
  DeveloperProfile,
} from '../developer.types';
import '../developer.css';

export function DeveloperDashboardPage() {
  const { accessToken } = useAuth();

  const [profile, setProfile] =
    useState<DeveloperProfile | null>(null);

  const [applications, setApplications] =
    useState<DeveloperApplication[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  async function loadDashboard() {
    if (!accessToken) return;

    try {
      setLoading(true);
      setError(null);

      const [profileData, applicationData] =
        await Promise.all([
          getDeveloperProfile(accessToken),
          getDeveloperApplications(accessToken),
        ]);

      setProfile(profileData);
      setApplications(applicationData);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load developer workspace.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, [accessToken]);

  const recentApplications = useMemo(() => {
    return [...applications]
      .sort(
        (a, b) =>
          new Date(b.assignedAt).getTime() -
          new Date(a.assignedAt).getTime(),
      )
      .slice(0, 5);
  }, [applications]);

  if (loading) {
    return (
      <DashboardLayout>
        <section className="panel">
          <div className="empty-state">
            <strong>Loading developer workspace...</strong>

            <p>
              Please wait while APIShield retrieves your developer account.
            </p>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState
          message={error}
          onRetry={() => void loadDashboard()}
        />
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <ErrorState message="Developer account was not found." />
      </DashboardLayout>
    );
  }

  const organizationDeveloper =
    profile.membershipType === 'ORGANIZATION' &&
    profile.organization;

  return (
    <DashboardLayout>
      <section className="dashboard-intro developer-dashboard-header">
        <div>
          <p className="section-eyebrow">
            DEVELOPER WORKSPACE
          </p>

          <h2>Developer overview</h2>

          <p>
            View your APIShield account, organization membership and application access.
          </p>
        </div>

        <div className="developer-account-summary">
          <span>Signed in as</span>
          <strong>{profile.email}</strong>
        </div>
      </section>

      <section className="developer-summary-grid">
        <article className="developer-summary-card">
          <span>Account status</span>

          <strong
            className={
              profile.status === 'ACTIVE'
                ? 'status-text-success'
                : profile.status === 'SUSPENDED'
                  ? 'status-text-danger'
                  : 'status-text-warning'
            }
          >
            {formatAccountStatus(profile.status)}
          </strong>

          <p>
            Current status of your APIShield developer account.
          </p>
        </article>

        <article className="developer-summary-card">
          <span>Membership</span>

          <strong>
            {organizationDeveloper
              ? 'Organization'
              : 'Independent'}
          </strong>

          <p>
            {organizationDeveloper
              ? 'Your account belongs to an APIShield organization.'
              : 'Your developer account is not currently linked to an organization.'}
          </p>
        </article>

        <article className="developer-summary-card">
          <span>Applications</span>

          <strong>{applications.length}</strong>

          <p>
            {organizationDeveloper
              ? 'Applications explicitly assigned to your account.'
              : 'Applications currently available to your developer account.'}
          </p>
        </article>
      </section>

      <section className="developer-dashboard-grid">
        <article className="panel developer-recent-panel">
          <div className="panel-header">
            <div>
              <h3>
                {organizationDeveloper
                  ? 'Assigned applications'
                  : 'Applications'}
              </h3>

              <p>
                {organizationDeveloper
                  ? 'Applications your organization has explicitly allowed you to access.'
                  : 'Applications available through your independent developer account.'}
              </p>
            </div>

            <Link
              className="developer-link"
              to="/developer/applications"
            >
              View all
            </Link>
          </div>

          {recentApplications.length === 0 ? (
            <div className="empty-state">
              <strong>
                {organizationDeveloper
                  ? 'No applications assigned'
                  : 'No application available'}
              </strong>

              <p>
                {organizationDeveloper
                  ? 'Your organization has not assigned an application to your developer account yet.'
                  : 'Create your personal application from the Applications page to begin using APIShield.'}
              </p>
            </div>
          ) : (
            <div className="developer-application-list">
              {recentApplications.map((application) => (
                <Link
                  key={application.id}
                  className="developer-application-row"
                  to={`/developer/applications/${application.id}`}
                >
                  <div>
                    <strong>
                      {application.name}
                    </strong>

                    <span>
                      {application.description ||
                        'No description provided.'}
                    </span>
                  </div>

                  <div className="developer-application-state">
                    <span
                      className={`application-environment ${application.environment.toLowerCase()}`}
                    >
                      {formatEnvironment(
                        application.environment,
                      )}
                    </span>

                    <span
                      className={
                        application.status === 'ACTIVE'
                          ? 'status-text-success'
                          : 'status-text-danger'
                      }
                    >
                      {application.status === 'ACTIVE'
                        ? 'Active'
                        : 'Disabled'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </article>

        <aside className="developer-dashboard-side">
          <section className="panel developer-membership-panel">
            <div className="panel-header">
              <div>
                <h3>Membership</h3>
                <p>
                  Current developer account relationship.
                </p>
              </div>
            </div>

            <div className="developer-membership-content">
              <div className="developer-info-row">
                <span>Account</span>
                <strong>{profile.email}</strong>
              </div>

              <div className="developer-info-row">
                <span>Type</span>
                <strong>
                  {organizationDeveloper
                    ? 'Organization developer'
                    : 'Independent developer'}
                </strong>
              </div>

              {organizationDeveloper && (
                <div className="developer-info-row">
                  <span>Organization</span>
                  <strong>
                    {profile.organization?.name}
                  </strong>
                </div>
              )}
            </div>
          </section>

          <section className="panel developer-security-panel">
            <p className="section-eyebrow">
              ACCESS CONTROL
            </p>

            <h3>Least-privilege access</h3>

            <p>
              Organization membership does not automatically give access to every application. Only explicitly assigned applications appear in this workspace.
            </p>
          </section>
        </aside>
      </section>
    </DashboardLayout>
  );
}

function formatEnvironment(
  environment: DeveloperApplication['environment'],
) {
  if (environment === 'DEVELOPMENT') {
    return 'Development';
  }

  if (environment === 'STAGING') {
    return 'Staging';
  }

  return 'Production';
}

function formatAccountStatus(
  status: DeveloperProfile['status'],
) {
  if (status === 'ACTIVE') return 'Active';

  if (status === 'SUSPENDED') {
    return 'Suspended';
  }

  return 'Pending verification';
}