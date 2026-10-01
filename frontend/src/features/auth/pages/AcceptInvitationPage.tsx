import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { acceptInvitation } from '../auth.api';
import { useAuth } from '../auth.context';
import '../auth.css';

type InvitationPageStatus = 'ready' | 'accepting' | 'success' | 'error';

export function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const { accessToken, isAuthenticated, user } = useAuth();

  const [status, setStatus] = useState<InvitationPageStatus>('ready');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('The invitation link does not contain a valid token.');
      return;
    }

    if (!isAuthenticated || !accessToken) {
      navigate('/login', {
        replace: true,
        state: {
          returnTo: `/accept-invitation?token=${encodeURIComponent(token)}`,
        },
      });
    }
  }, [token, isAuthenticated, accessToken, navigate]);

  async function handleAcceptInvitation() {
    if (!token || !accessToken) return;

    try {
      setStatus('accepting');
      setMessage('');

      const response = await acceptInvitation(token, accessToken);

      setMessage(response.message);
      setStatus('success');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to accept this invitation.');
      setStatus('error');
    }
  }

  if (!token || !isAuthenticated || !accessToken) {
    return null;
  }

  return (
    <main className="auth-status-page">
      <section className="auth-status-card invitation-card">
        {status === 'ready' && (
          <>
            <p className="auth-status-eyebrow">ORGANIZATION INVITATION</p>

            <h1>Join organization</h1>

            <p>
              You are signed in as <strong>{user?.email}</strong>.
            </p>

            <p>
              Accepting this invitation will connect your Developer account to the organization that issued this link.
            </p>

            {user?.role !== 'DEVELOPER' && (
              <div className="auth-general-error">
                Only Developer accounts can accept organization invitations.
              </div>
            )}

            <div className="auth-invitation-actions">
              <Link className="button secondary" to="/dashboard">
                Cancel
              </Link>

              <button className="button primary" onClick={() => void handleAcceptInvitation()} disabled={user?.role !== 'DEVELOPER'}>
                Accept invitation
              </button>
            </div>
          </>
        )}

        {status === 'accepting' && (
          <>
            <div className="auth-status-loader" />
            <h1>Joining organization</h1>
            <p>Please wait while APIShield validates the invitation.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="auth-status-icon success">✓</div>
            <h1>Invitation accepted</h1>
            <p>{message || 'You successfully joined the organization.'}</p>

            <button className="button primary auth-status-action" onClick={() => navigate('/dashboard')}>
              Continue
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-status-icon error">!</div>
            <h1>Invitation unavailable</h1>
            <p>{message || 'The invitation is invalid, expired, cancelled, already accepted, or does not belong to this account.'}</p>

            <Link className="button secondary auth-status-action" to="/dashboard">
              Return to dashboard
            </Link>
          </>
        )}
      </section>
    </main>
  );
}