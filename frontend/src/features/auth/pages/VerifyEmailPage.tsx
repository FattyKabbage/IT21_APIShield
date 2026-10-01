import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { verifyEmail } from '../auth.api';
import '../auth.css';

type VerificationStatus = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const hasVerified = useRef(false);

  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (hasVerified.current) return;

    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setMessage('The verification link does not contain a valid token.');
      return;
    }

    hasVerified.current = true;

    verifyEmail(token)
      .then((response) => {
        setStatus('success');
        setMessage(response.message);
      })
      .catch((error) => {
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Unable to verify this email address.');
      });
  }, [searchParams]);

  return (
    <main className="auth-status-page">
      <section className="auth-status-card">
        {status === 'verifying' && (
          <>
            <div className="auth-status-loader" />
            <h1>Verifying your email</h1>
            <p>Please wait while APIShield activates your account.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="auth-status-icon success">✓</div>
            <h1>Email verified</h1>
            <p>{message || 'Your APIShield account is now active.'}</p>
            <Link className="button primary auth-status-action" to="/login">
              Continue to sign in
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="auth-status-icon error">!</div>
            <h1>Verification failed</h1>
            <p>{message || 'This verification link is invalid, expired, or has already been used.'}</p>
            <Link className="button secondary auth-status-action" to="/login">
              Return to sign in
            </Link>
          </>
        )}
      </section>
    </main>
  );
}