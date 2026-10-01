import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { SensitiveInput } from '../../../components/SensitiveInput';
import { ApiError } from '../../../services/api';
import { resendVerification } from '../auth.api';
import { useAuth } from '../auth.context';
import '../auth.css';

const RESEND_VERIFICATION_COOLDOWN_SECONDS = 60;

export function LoginPage() {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const [loading, setLoading] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  function validate() {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);
      setErrors({});
      setVerificationRequired(false);
      setResendMessage('');

      await loginUser(email.trim().toLowerCase(), password);

      const state = location.state as { returnTo?: string } | null;

      navigate(state?.returnTo ?? '/dashboard', {
        replace: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign in.';

      if (error instanceof ApiError && error.status === 401 && message.toLowerCase().includes('verify')) {
        setVerificationRequired(true);

        setErrors({
          general: message,
        });

        return;
      }

      setErrors({
        general: message,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || resendLoading || resendCooldown > 0) return;

    try {
      setResendLoading(true);
      setResendMessage('');

      const response = await resendVerification(normalizedEmail);

      setResendMessage(response.message);
      setResendCooldown(RESEND_VERIFICATION_COOLDOWN_SECONDS);
    } catch (error) {
      setResendMessage(error instanceof Error ? error.message : 'Unable to request another verification email.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-content">
          <img src="/logo.png" alt="APIShield" className="auth-logo" />

          <h1>APIShield</h1>

          <p className="brand-description">
            Secure API management for modern applications.
          </p>

          <div className="brand-features">
            <div>
              <strong>Manage APIs</strong>
              <span>Organize and control your API environment.</span>
            </div>

            <div>
              <strong>Protect applications</strong>
              <span>Secure access between your applications and external APIs.</span>
            </div>

            <div>
              <strong>Monitor security</strong>
              <span>Track API activity and security controls in one place.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-heading">
            <p>API MANAGEMENT</p>
            <h2>Welcome back</h2>
            <span>Sign in to manage your APIShield environment.</span>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="auth-field">
              <label htmlFor="login-email">Email</label>

              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setVerificationRequired(false);
                  setResendMessage('');

                  setErrors((previous) => ({
                    ...previous,
                    email: undefined,
                    general: undefined,
                  }));
                }}
                placeholder="you@example.com"
                autoComplete="email"
              />

              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>

            <div className="auth-field">
              <label htmlFor="login-password">Password</label>

              <SensitiveInput
                id="login-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);

                  setErrors((previous) => ({
                    ...previous,
                    password: undefined,
                    general: undefined,
                  }));
                }}
                placeholder="Enter your password"
                autoComplete="current-password"
              />

              {errors.password && <span className="auth-error">{errors.password}</span>}
            </div>

            {errors.general && (
              <div className="auth-general-error" role="alert">
                {errors.general}
              </div>
            )}

            {verificationRequired && (
              <div className="auth-verification-panel">
                <strong>Email verification required</strong>

                <p>
                  Request another verification email if your previous link expired or is no longer available.
                </p>

                {resendMessage && <span className="auth-verification-message">{resendMessage}</span>}

                <button
                  type="button"
                  className="button secondary"
                  onClick={() => void handleResendVerification()}
                  disabled={resendLoading || resendCooldown > 0}
                >
                  {resendLoading
                    ? 'Sending...'
                    : resendCooldown > 0
                      ? `Resend available in ${resendCooldown}s`
                      : 'Resend verification email'}
                </button>
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="auth-register">
            <span>Don't have an account?</span>
            <Link to="/register">Create an account</Link>
          </div>

          <footer className="auth-footer">
            APIShield Secure API Management
          </footer>
        </div>
      </section>
    </main>
  );
}