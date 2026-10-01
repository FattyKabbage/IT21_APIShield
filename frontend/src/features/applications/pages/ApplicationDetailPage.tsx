import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { ApplicationWorkspaceNav } from '../components/ApplicationWorkspaceNav';
import { getApplication } from '../application.api';
import type { ClientApplication } from '../application.types';
import '../application.css';

export function ApplicationDetailPage() {
  const { applicationId } = useParams();

  const { accessToken } = useAuth();

  const navigate = useNavigate();

  const [application, setApplication] =
    useState<ClientApplication | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  async function loadApplication() {
    if (!accessToken || !applicationId) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await getApplication(
        accessToken,
        applicationId,
      );

      setApplication(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load application.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplication();
  }, [accessToken, applicationId]);

  if (loading) {
    return (
      <DashboardLayout>
        <section className="panel">
          <div className="empty-state">
            <strong>Loading application...</strong>

            <p>
              Please wait while APIShield retrieves the application.
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
          onRetry={() =>
            void loadApplication()
          }
        />
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout>
        <ErrorState message="Client application was not found." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="application-detail-back">
        <button
          type="button"
          className="table-action"
          onClick={() =>
            navigate('/dashboard/applications')
          }
        >
          ← Back to applications
        </button>
      </div>

      <ApplicationWorkspaceNav
        applicationId={application.id}
      />

      <section className="dashboard-intro application-detail-header">
        <div>
          <p className="section-eyebrow">
            CLIENT APPLICATION
          </p>

          <h2>{application.name}</h2>

          <p>
            {application.description ||
              'No description has been provided for this application.'}
          </p>
        </div>

        <div className="application-detail-state">
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
      </section>

      <section className="application-detail-grid">
        <div className="panel application-overview-panel">
          <div className="panel-header">
            <div>
              <h3>Application overview</h3>

              <p>
                Basic information registered with APIShield.
              </p>
            </div>
          </div>

          <div className="application-info-list">
            <div className="application-info-item">
              <span>Application ID</span>
              <code>{application.id}</code>
            </div>

            <div className="application-info-item">
              <span>Environment</span>

              <strong>
                {formatEnvironment(
                  application.environment,
                )}
              </strong>
            </div>

            <div className="application-info-item">
              <span>Status</span>

              <strong>
                {application.status === 'ACTIVE'
                  ? 'Active'
                  : 'Disabled'}
              </strong>
            </div>

            <div className="application-info-item">
              <span>Created</span>

              <strong>
                {formatDateTime(
                  application.createdAt,
                )}
              </strong>
            </div>

            <div className="application-info-item">
              <span>Last updated</span>

              <strong>
                {formatDateTime(
                  application.updatedAt,
                )}
              </strong>
            </div>
          </div>
        </div>

        <div className="panel application-security-panel">
          <div className="panel-header">
            <div>
              <h3>Security status</h3>

              <p>
                Current APIShield protection state.
              </p>
            </div>
          </div>

          <div className="application-security-content">
            <div className="application-security-row">
              <span>Application</span>

              <strong
                className={
                  application.status === 'ACTIVE'
                    ? 'status-text-success'
                    : 'status-text-danger'
                }
              >
                {application.status === 'ACTIVE'
                  ? 'Active'
                  : 'Disabled'}
              </strong>
            </div>

            <div className="application-security-row">
              <span>Environment</span>

              <strong>
                {formatEnvironment(
                  application.environment,
                )}
              </strong>
            </div>

            <p className="application-security-description">
              Credentials, integrations, gateway activity and security controls for this application are managed through APIShield.
            </p>
          </div>
        </div>
      </section>

      <section className="application-feature-section">
        <div className="application-feature-heading">
          <p className="section-eyebrow">
            APPLICATION MANAGEMENT
          </p>

          <h3>Manage this application</h3>

          <p>
            Configure authentication, external API services and gateway monitoring.
          </p>
        </div>

        <div className="application-feature-grid">
          <article className="application-feature-card">
            <div>
              <span className="application-feature-number">
                01
              </span>

              <h3>Credentials</h3>

              <p>
                Generate and manage the Client ID and Client Secret used to authenticate this application with APIShield.
              </p>
            </div>

            <Link
              className="application-detail-link"
              to={`/dashboard/applications/${application.id}/credentials`}
            >
              Manage credentials →
            </Link>
          </article>

          <article className="application-feature-card">
            <div>
              <span className="application-feature-number">
                02
              </span>

              <h3>API Integrations</h3>

              <p>
                Configure third-party services, provider authentication and encrypted API credentials.
              </p>
            </div>

            <Link
              className="application-detail-link"
              to={`/dashboard/applications/${application.id}/integrations`}
            >
              Manage integrations →
            </Link>
          </article>

          <article className="application-feature-card">
            <div>
              <span className="application-feature-number">
                03
              </span>

              <h3>Gateway Activity</h3>

              <p>
                Monitor provider requests, status codes, outcomes and response durations.
              </p>
            </div>

            <Link
              className="application-detail-link"
              to={`/dashboard/applications/${application.id}/activity`}
            >
              View activity →
            </Link>
          </article>

          <article className="application-feature-card">
            <div>
              <span className="application-feature-number">
                04
              </span>

              <h3>Developer Access</h3>

              <p>
                Assign organization developers to this application and revoke access when it is no longer required.
              </p>
            </div>

            <Link
              className="application-detail-link"
              to={`/dashboard/applications/${application.id}/access`}
            >
              Manage access →
            </Link>
          </article>
        </div>
      </section>
    </DashboardLayout>
  );
}

function formatEnvironment(
  environment: ClientApplication['environment'],
) {
  if (environment === 'DEVELOPMENT') {
    return 'Development';
  }

  if (environment === 'STAGING') {
    return 'Staging';
  }

  return 'Production';
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}