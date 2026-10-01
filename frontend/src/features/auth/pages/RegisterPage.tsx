import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { SensitiveInput } from '../../../components/SensitiveInput';
import { register } from '../auth.api';
import type { RegistrationType } from '../auth.types';
import '../auth.css';

export function RegisterPage() {
  const navigate = useNavigate();

  const [accountType, setAccountType] = useState<RegistrationType>('DEVELOPER');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  function validate() {
    const newErrors: Record<string, string> = {};

    if (accountType === 'ORGANIZATION') {
      if (!organizationName.trim()) {
        newErrors.organizationName = 'Organization name is required.';
      } else if (organizationName.trim().length < 2) {
        newErrors.organizationName = 'Organization name must contain at least 2 characters.';
      } else if (organizationName.trim().length > 100) {
        newErrors.organizationName = 'Organization name cannot exceed 100 characters.';
      }
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 12) {
      newErrors.password = 'Password must contain at least 12 characters.';
    } else if (password.length > 128) {
      newErrors.password = 'Password cannot exceed 128 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
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

      await register({
        email: email.trim().toLowerCase(),
        password,
        type: accountType,
        ...(accountType === 'ORGANIZATION'
          ? {
              organizationName: organizationName.trim(),
            }
          : {}),
      });

      setRegistrationComplete(true);
    } catch (error) {
      setErrors({
        general: error instanceof Error ? error.message : 'Unable to create account.',
      });
    } finally {
      setLoading(false);
    }
  }

  function selectAccountType(type: RegistrationType) {
    setAccountType(type);

    if (type === 'DEVELOPER') {
      setOrganizationName('');
    }

    setErrors({});
  }

  return (
    <main className="auth-page">
      <section className="auth-brand-panel">
        <div className="brand-content">
          <img src="/logo.png" alt="APIShield" className="auth-logo" />

          <h1>APIShield</h1>

          <p className="brand-description">
            Build and manage secure API environments.
          </p>

          <div className="brand-features">
            <div>
              <strong>Developers</strong>
              <span>Connect securely to organizations and API environments.</span>
            </div>

            <div>
              <strong>Organizations</strong>
              <span>Manage applications, credentials, integrations and API activity.</span>
            </div>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card register-card">
          <div className="auth-heading">
            <p>GET STARTED</p>
            <h2>Create your account</h2>
            <span>Choose how you will use APIShield.</span>
          </div>

          <div className="account-type">
            <button
              type="button"
              className={accountType === 'DEVELOPER' ? 'account-option active' : 'account-option'}
              onClick={() => selectAccountType('DEVELOPER')}
            >
              <strong>Developer</strong>
              <span>For individual API development.</span>
            </button>

            <button
              type="button"
              className={accountType === 'ORGANIZATION' ? 'account-option active' : 'account-option'}
              onClick={() => selectAccountType('ORGANIZATION')}
            >
              <strong>Organization</strong>
              <span>For teams and API environments.</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {accountType === 'ORGANIZATION' && (
              <div className="auth-field">
                <label htmlFor="organization-name">Organization name</label>

                <input
                  id="organization-name"
                  type="text"
                  value={organizationName}
                  onChange={(event) => {
                    setOrganizationName(event.target.value);

                    setErrors((previous) => ({
                      ...previous,
                      organizationName: '',
                    }));
                  }}
                  placeholder="Your organization"
                  maxLength={100}
                />

                {errors.organizationName && <span className="auth-error">{errors.organizationName}</span>}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="register-email">Email</label>

              <input
                id="register-email"
                type="email"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);

                  setErrors((previous) => ({
                    ...previous,
                    email: '',
                    general: '',
                  }));
                }}
                placeholder="you@example.com"
                autoComplete="email"
              />

              {errors.email && <span className="auth-error">{errors.email}</span>}
            </div>

            <div className="auth-field">
              <label htmlFor="register-password">Password</label>

              <SensitiveInput
                id="register-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);

                  setErrors((previous) => ({
                    ...previous,
                    password: '',
                    general: '',
                  }));
                }}
                placeholder="At least 12 characters"
                autoComplete="new-password"
              />

              {errors.password && <span className="auth-error">{errors.password}</span>}
            </div>

            <div className="auth-field">
              <label htmlFor="confirm-password">Confirm password</label>

              <SensitiveInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);

                  setErrors((previous) => ({
                    ...previous,
                    confirmPassword: '',
                  }));
                }}
                placeholder="Repeat your password"
                autoComplete="new-password"
              />

              {errors.confirmPassword && <span className="auth-error">{errors.confirmPassword}</span>}
            </div>

            {errors.general && (
              <div className="auth-general-error" role="alert">
                {errors.general}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="auth-register">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </div>

          <footer className="auth-footer">
            APIShield Secure API Management
          </footer>
        </div>
      </section>

      {registrationComplete && (
        <div className="auth-modal-overlay">
          <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="registration-success-title">
            <div className="auth-modal-header">
              <h2 id="registration-success-title">Account created</h2>
            </div>

            <div className="auth-registration-success">
              <div className="auth-registration-success-icon">✓</div>

              <h3>Verify your email</h3>

              <p>
                APIShield sent a verification link to:
              </p>

              <p className="auth-registration-email">
                <strong>{email.trim().toLowerCase()}</strong>
              </p>

              <p className="auth-registration-expiry">
                The verification link expires in 15 minutes.
              </p>
            </div>

            <div className="auth-modal-actions">
              <button className="button primary" onClick={() => navigate('/login')}>
                Continue to sign in
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}