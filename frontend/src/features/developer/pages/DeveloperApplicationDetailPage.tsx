import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import {
  getDeveloperApplication,
  getDeveloperApplicationCredential,
  updateDeveloperApplication,
} from '../developer.api';
import type {
  DeveloperApplication,
  DeveloperApplicationCredentialResponse,
} from '../developer.types';

import { DeveloperApplicationWorkspaceNav } from './DeveloperApplicationWorkspaceNav';
import { DeveloperApplicationFormModal, type DeveloperApplicationFormValues } from './DeveloperApplicationFormModal';

export function DeveloperApplicationDetailPage() {
  const { applicationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<DeveloperApplication | null>(null);
  const [credential, setCredential] = useState<DeveloperApplicationCredentialResponse | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  async function loadApplication() {
    if (!accessToken || !applicationId) return;

    try {
      setLoading(true);
      setError(null);

      const [applicationData, credentialData] = await Promise.all([
        getDeveloperApplication(accessToken, applicationId),
        getDeveloperApplicationCredential(accessToken, applicationId),
      ]);

      setApplication(applicationData);
      setCredential(credentialData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load application.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplication();
  }, [accessToken, applicationId]);

  async function handleUpdateApplication(payload: DeveloperApplicationFormValues) {
    if (!accessToken || !application) return;

    try {
      setProcessing(true);

      await updateDeveloperApplication(accessToken, application.id, {
        name: payload.name,
        description: payload.description,
        environment: payload.environment,
        status: payload.status ?? application.status,
      });

      await loadApplication();
      setShowEditModal(false);

      setFeedback({
        type: 'success',
        title: 'Personal application updated',
        message: 'Your personal client application was updated successfully.',
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Unable to update application',
        message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <section className="panel">
          <div className="empty-state">
            <strong>Loading application...</strong>
            <p>Please wait while APIShield verifies your application access.</p>
          </div>
        </section>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <ErrorState message={error} onRetry={() => void loadApplication()} />
      </DashboardLayout>
    );
  }

  if (!application) {
    return (
      <DashboardLayout>
        <ErrorState message="Developer application was not found." />
      </DashboardLayout>
    );
  }

  const personalApplication = application.accessType === 'OWNED';

  return (
    <DashboardLayout>
      <div className="developer-detail-back">
        <button
          type="button"
          className="table-action"
          onClick={() => navigate('/developer/applications')}
        >
          ← Back to applications
        </button>
      </div>

      <DeveloperApplicationWorkspaceNav applicationId={application.id} />

      <section className="dashboard-intro developer-detail-header">
        <div>
          <p className="section-eyebrow">
            {personalApplication ? 'PERSONAL APPLICATION' : 'ASSIGNED APPLICATION'}
          </p>

          <h2>{application.name}</h2>

          <p>
            {application.description || 'No description has been provided for this application.'}
          </p>
        </div>

        <div className="developer-detail-state">
          <span className={`application-environment ${application.environment.toLowerCase()}`}>
            {formatEnvironment(application.environment)}
          </span>

          <span
            className={
              application.status === 'ACTIVE'
                ? 'status-text-success'
                : 'status-text-danger'
            }
          >
            {application.status === 'ACTIVE' ? 'Active' : 'Disabled'}
          </span>

          {personalApplication && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowEditModal(true)}
            >
              Edit application
            </button>
          )}
        </div>
      </section>

      <section className="developer-detail-grid">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Application information</h3>

              <p>
                {personalApplication
                  ? 'Information for your independently owned application.'
                  : 'Safe information available through your assigned access.'}
              </p>
            </div>
          </div>

          <div className="developer-info-list">
            <div className="developer-info-item">
              <span>Application ID</span>
              <code>{application.id}</code>
            </div>

            <div className="developer-info-item">
              <span>Access</span>
              <strong>{personalApplication ? 'Owner' : 'Assigned developer'}</strong>
            </div>

            <div className="developer-info-item">
              <span>Environment</span>
              <strong>{formatEnvironment(application.environment)}</strong>
            </div>

            <div className="developer-info-item">
              <span>Status</span>
              <strong>{application.status === 'ACTIVE' ? 'Active' : 'Disabled'}</strong>
            </div>

            <div className="developer-info-item">
              <span>{personalApplication ? 'Created' : 'Assigned'}</span>

              <strong>
                {formatDateTime(
                  personalApplication
                    ? application.createdAt
                    : application.assignedAt,
                )}
              </strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>API credentials</h3>

              <p>
                {personalApplication
                  ? 'Safe credential information for your personal application.'
                  : 'Safe credential information for this assigned application.'}
              </p>
            </div>
          </div>

          {!credential?.hasCredential || !credential.credential ? (
            <div className="developer-credential-empty">
              <strong>No credentials available</strong>

              <p>
                {personalApplication
                  ? 'Generate credentials from the Credentials tab to authenticate your personal application with APIShield.'
                  : 'The organization has not generated credentials for this application.'}
              </p>
            </div>
          ) : (
            <div className="developer-info-list">
              <div className="developer-info-item">
                <span>Client ID</span>
                <code>{credential.credential.clientId}</code>
              </div>

              <div className="developer-info-item">
                <span>Credential status</span>

                <strong
                  className={
                    credential.credential.status === 'ACTIVE'
                      ? 'status-text-success'
                      : 'status-text-danger'
                  }
                >
                  {credential.credential.status}
                </strong>
              </div>

              <div className="developer-info-item">
                <span>Created</span>
                <strong>{formatDateTime(credential.credential.createdAt)}</strong>
              </div>

              <div className="developer-info-item">
                <span>Last updated</span>
                <strong>{formatDateTime(credential.credential.updatedAt)}</strong>
              </div>
            </div>
          )}
        </article>
      </section>

      <div className="security-note">
        <strong>{personalApplication ? 'Application ownership' : 'Credential security'}</strong>

        <span>
          {personalApplication
            ? 'This application belongs only to your independent developer account. Organization developers cannot access or manage it.'
            : 'This workspace shows only safe credential information. Client Secrets, credential hashes and provider secrets are never exposed to assigned developers.'}
        </span>
      </div>

      {showEditModal && (
        <DeveloperApplicationFormModal
          title="Edit personal application"
          submitLabel="Save changes"
          processing={processing}
          application={application}
          onClose={() => !processing && setShowEditModal(false)}
          onSubmit={handleUpdateApplication}
        />
      )}

      {feedback && (
        <FeedbackModal
          type={feedback.type}
          title={feedback.title}
          message={feedback.message}
          onClose={() => setFeedback(null)}
        />
      )}
    </DashboardLayout>
  );
}

function formatEnvironment(environment: DeveloperApplication['environment']) {
  if (environment === 'DEVELOPMENT') return 'Development';
  if (environment === 'STAGING') return 'Staging';

  return 'Production';
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