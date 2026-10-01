import { useState } from 'react';
import type { FormEvent } from 'react';
import { SensitiveInput } from '../../../components/SensitiveInput';

interface LoginFormProps {
  loading?: boolean;
  onSubmit: (email: string, password: string) => Promise<void> | void;
}

export function LoginForm({ loading = false, onSubmit }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(email, password);
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="auth-field">
        <label htmlFor="email">Email</label>

        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="auth-field">
        <label htmlFor="password">Password</label>

        <SensitiveInput
          id="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Enter your password"
          autoComplete="current-password"
          required
        />
      </div>

      <button className="auth-submit" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}