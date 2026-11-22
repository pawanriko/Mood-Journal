import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { Smiley } from '@phosphor-icons/react';
import { useAuth } from '../lib/auth';
import { ApiError } from '../lib/api';

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function LoginPage() {
  const { user, loading, login, signup } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (username.trim().length < 3) {
      setError('Pick a username of at least 3 characters.');
      return;
    }
    if (mode === 'signup' && !validEmail(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await signup(username.trim(), email.trim(), password);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : 'Something went wrong. Check your connection and try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-bg flex min-h-screen items-center justify-center px-4 py-8">
      <div className="anim-page w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Smiley size={40} weight="fill" aria-hidden="true" />
          <h1 className="heading-4 hero-text">Mood Journal</h1>
          <p className="body-3" style={{ color: 'var(--muted)' }}>
            One small entry a day, kept just for you.
          </p>
        </div>

        <div className="card p-6">
          <div className="mb-6 grid grid-cols-2 gap-2" role="tablist" aria-label="Sign in or create an account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              onClick={() => { setMode('login'); setError(null); }}
              className="btn"
              style={{
                background: mode === 'login' ? 'var(--accent)' : 'transparent',
                color: mode === 'login' ? 'var(--on-accent)' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              onClick={() => { setMode('signup'); setError(null); }}
              className="btn"
              style={{
                background: mode === 'signup' ? 'var(--accent)' : 'transparent',
                color: mode === 'signup' ? 'var(--on-accent)' : 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                id="username"
                className="input"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Your username"
                required
              />
            </div>
            {mode === 'signup' ? (
              <div>
                <label htmlFor="email" className="label">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
            ) : null}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
              />
            </div>

            {error ? (
              <p className="body-5 rounded-lg px-3 py-2" role="alert" style={{ background: 'var(--danger-soft)' }}>
                {error}
              </p>
            ) : null}

            <button type="submit" className="btn btn-primary w-full" disabled={busy || loading}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="caption-2 mt-4 text-center" style={{ color: 'var(--muted)' }}>
            {mode === 'login'
              ? 'New here? Switch to Create account above to get started.'
              : 'Already have an account? Switch to Sign in above.'}
          </p>
        </div>
      </div>
    </div>
  );
}
