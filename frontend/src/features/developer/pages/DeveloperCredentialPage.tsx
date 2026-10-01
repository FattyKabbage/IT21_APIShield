import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { SensitiveInput } from '../../../components/SensitiveInput';
import { useAuth } from '../../auth/auth.context';
import { DashboardLayout } from '../../dashboard/components/DashboardLayout';
import { ErrorState } from '../../dashboard/components/ErrorState';
import { FeedbackModal } from '../../dashboard/components/FeedbackModal';
import { Modal } from '../../dashboard/components/Modal';
import type {
  ApplicationCredential,
  GeneratedApplicationCredential,
} from '../../application-credentials/application-credential.types';
import '../../application-credentials/application-credential.css';
import {
  createDeveloperApplicationCredential,
  getDeveloperApplication,
  getDeveloperApplicationCredential,
  rotateDeveloperApplicationCredential,
} from '../developer.api';
import { DeveloperApplicationWorkspaceNav } from './DeveloperApplicationWorkspaceNav';

export function DeveloperCredentialPage() {
  const { applicationId } = useParams();
  const { accessToken } = useAuth();
  const navigate = useNavigate();

  const [credential, setCredential] = useState<ApplicationCredential | null>(null);
  const [generatedCredential, setGeneratedCredential] = useState<GeneratedApplicationCredential | null>(null);
  const [showRotateModal, setShowRotateModal] = useState(false);
  const [rotationPassword, setRotationPassword] = useState('');
  const [copiedField, setCopiedField] = useState<'clientId' | 'clientSecret' | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    title: string;
    message: string;
  } | null>(null);

  async function loadCredential() {
    if (!accessToken || !applicationId) return;

    try {
      setLoading(true);
      setError(null);

      const [application, credentialData] = await Promise.all([
        getDeveloperApplication(accessToken, applicationId),
        getDeveloperApplicationCredential(accessToken, applicationId),
      ]);

      if (application.accessType !== 'OWNED') {
        setError('Credential management is only available for your personal application.');
        setCredential(null);
        return;
      }

      setCredential(credentialData.credential);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to load application credentials.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCredential();
  }, [accessToken, applicationId]);

  async function handleCreateCredential() {
    if (!accessToken || !applicationId) return;

    try {
      setProcessing(true);

      const generated = await createDeveloperApplicationCredential(accessToken, applicationId);

      setGeneratedCredential(generated);
      await loadCredential();
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Credential generation failed',
        message: error instanceof Error ? error.message : 'Unable to generate application credentials.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function handleRotateCredential(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken || !applicationId) return;

    if (!rotationPassword.trim()) {
      setFeedback({
        type: 'error',
        title: 'Current password required',
        message: 'Enter your current developer account password before rotating credentials.',
      });

      return;
    }

    try {
      setProcessing(true);

      const generated = await rotateDeveloperApplicationCredential(accessToken, applicationId, {
        currentPassword: rotationPassword,
      });

      setRotationPassword('');
      setShowRotateModal(false);
      setGeneratedCredential(generated);

      await loadCredential();
    } catch (error) {
      setFeedback({
        type: 'error',
        title: 'Credential rotation failed',
        message: error instanceof Error ? error.message : 'Unable to rotate application credentials.',
      });
    } finally {
      setProcessing(false);
    }
  }

  async function copyValue(value: string, field: 'clientId' | 'clientSecret') {
    try {
      await navigator.clipboard.writeText(value);

      setCopiedField(field);

      window.setTimeout(() => {
        setCopiedField((current) => current === field ? null : current);
      }, 1800);
    } catch {
      setFeedback({
        type: 'error',
        title: 'Copy failed',
        message: 'Unable to copy the value automatically. Select and copy it manually.',
      });
    }
  }

  function closeGeneratedCredential() {
    setGeneratedCredential(null);
    setCopiedField(null);
  }

  return (
    <DashboardLayout>
      <div className="developer-detail-back">
        <button
          type="button"
          className="table-action"
          onClick={() => navigate(`/developer/applications/${applicationId}`)}
        >
          ← Back to application
        </button>
      </div>

      {applicationId && <DeveloperApplicationWorkspaceNav applicationId={applicationId} />}

      <section className="dashboard-intro">
        <div>
          <p className="section-eyebrow">PERSONAL APPLICATION SECURITY</p>
          <h2>Application Credentials</h2>
          <p>Manage the Client ID and Client Secret used by your personal application to authenticate with APIShield.</p>
        </div>
      </section>

      {loading && (
        <section className="panel">
          <div className="empty-state">
            <strong>Loading application credentials...</strong>
            <p>Please wait while APIShield retrieves your application's authentication information.</p>
          </div>
        </section>
      )}

      {!loading && error && (
        <ErrorState message={error} onRetry={() => void loadCredential()} />
      )}

      {!loading && !error && !credential && (
        <section className="panel credential-empty-panel">
          <div className="credential-empty-content">
            <p className="section-eyebrow">APPLICATION AUTHENTICATION</p>
            <h3>No application credentials yet</h3>
            <p>Generate a Client ID and Client Secret so your personal application can authenticate with APIShield.</p>

            <button
              type="button"
              className="button primary"
              onClick={() => void handleCreateCredential()}
              disabled={processing}
            >
              {processing ? 'Generating...' : 'Generate credentials'}
            </button>
          </div>
        </section>
      )}

      {!loading && !error && credential && (
        <>
          <section className="panel">
            <div className="panel-header">
              <div>
                <h3>Application authentication</h3>
                <p>Credential information currently registered with APIShield.</p>
              </div>

              <span className={credential.status === 'ACTIVE' ? 'status-text-success' : 'status-text-danger'}>
                {credential.status}
              </span>
            </div>

            <div className="credential-details">
              <div className="credential-detail-row">
                <span>Client ID</span>
                <code>{credential.clientId}</code>
              </div>

              <div className="credential-detail-row">
                <span>Client Secret</span>
                <strong className="credential-hidden-secret">sk_••••••••••••••••••••••••</strong>
              </div>

              <div className="credential-detail-row">
                <span>Status</span>

                <strong className={credential.status === 'ACTIVE' ? 'status-text-success' : 'status-text-danger'}>
                  {credential.status}
                </strong>
              </div>

              <div className="credential-detail-row">
                <span>Created</span>
                <strong>{formatDateTime(credential.createdAt)}</strong>
              </div>

              <div className="credential-detail-row">
                <span>Last rotated</span>
                <strong>{formatDateTime(credential.updatedAt)}</strong>
              </div>
            </div>
          </section>

          <section className="credential-security-section">
            <div>
              <p className="section-eyebrow">SECURITY</p>
              <h3>Credential security</h3>
              <p>
                The Client Secret is stored only as an Argon2 hash and cannot be retrieved.
                If the secret is lost or exposed, rotate the application credentials.
              </p>
            </div>

            <button
              type="button"
              className="button secondary credential-rotate-button"
              onClick={() => setShowRotateModal(true)}
              disabled={processing}
            >
              Rotate credentials
            </button>
          </section>
        </>
      )}

      {showRotateModal && credential && (
        <Modal
          title="Rotate application credentials?"
          onClose={() => !processing && setShowRotateModal(false)}
        >
          <form onSubmit={handleRotateCredential}>
            <div className="credential-rotation-body">
              <div className="credential-rotation-warning">
                <strong>Existing credentials will stop working</strong>
                <p>
                  Rotation creates a new Client ID and Client Secret.
                  Applications using the current credentials must be updated with the new values.
                </p>
              </div>

              <div className="form-field">
                <label htmlFor="developer-credential-current-password">Current password</label>

                <SensitiveInput
                  id="developer-credential-current-password"
                  value={rotationPassword}
                  onChange={(event) => setRotationPassword(event.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  required
                />

                <span className="credential-form-help">
                  Your developer account password is required to confirm this security-sensitive action.
                </span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowRotateModal(false)}
                disabled={processing}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="button danger"
                disabled={processing || !rotationPassword.trim()}
              >
                {processing ? 'Rotating...' : 'Rotate credentials'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {generatedCredential && (
        <Modal title="Application credentials generated" onClose={closeGeneratedCredential}>
          <div className="credential-secret-modal-body">
            <div className="credential-secret-warning">
              <strong>Save the Client Secret now</strong>
              <p>
                APIShield stores only the Argon2 hash of the Client Secret.
                The original secret cannot be retrieved after this window is closed.
              </p>
            </div>

            <div className="credential-secret-fields">
              <div className="credential-secret-field">
                <label htmlFor="developer-generated-client-id">Client ID</label>

                <div className="credential-copy-row">
                  <input
                    id="developer-generated-client-id"
                    type="text"
                    value={generatedCredential.clientId}
                    readOnly
                  />

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => void copyValue(generatedCredential.clientId, 'clientId')}
                  >
                    {copiedField === 'clientId' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="credential-secret-field">
                <label htmlFor="developer-generated-client-secret">Client Secret</label>

                <div className="credential-copy-row">
                  <SensitiveInput
                    id="developer-generated-client-secret"
                    value={generatedCredential.clientSecret}
                    readOnly
                    autoComplete="off"
                  />

                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => void copyValue(generatedCredential.clientSecret, 'clientSecret')}
                  >
                    {copiedField === 'clientSecret' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            </div>

            <div className="credential-secret-note">
              <strong>Important</strong>
              <p>
                Store these credentials in the secure environment configuration of the application that will authenticate with APIShield.
                Do not place the Client Secret in frontend source code or commit it to Git.
              </p>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="button primary" onClick={closeGeneratedCredential}>
              I have saved the secret
            </button>
          </div>
        </Modal>
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

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';

  let normalizedValue = value.trim();

  if (!normalizedValue.includes('T') && normalizedValue.includes(' ')) {
    normalizedValue = normalizedValue.replace(' ', 'T');
  }

  if (/[+-]\d{2}$/.test(normalizedValue)) {
    normalizedValue = `${normalizedValue}:00`;
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}