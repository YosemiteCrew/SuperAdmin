'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  signIn,
  signUp,
  sendPasswordResetEmail,
  submitNewPassword,
} from 'supertokens-auth-react/recipe/emailpassword';

import { Button } from '@/app/ui/components/Button';

const GENERIC_ERROR = 'Something went wrong. Please try again.';

function EyeIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 512 512"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0"
      aria-hidden="true"
    >
      <circle cx="256" cy="256" r="64" />
      <path d="M490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96c-42.52 0-84.33 12.15-124.27 36.11-40.73 24.43-77.63 60.12-109.68 106.07a31.92 31.92 0 0 0-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416c46.71 0 93.81-14.43 136.2-41.72 38.46-24.77 72.72-59.66 99.08-100.92a32.2 32.2 0 0 0-.1-34.76zM256 352a96 96 0 1 1 96-96 96.11 96.11 0 0 1-96 96z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 512 512"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0"
      aria-hidden="true"
    >
      <path d="M432 448a15.92 15.92 0 0 1-11.31-4.69l-352-352a16 16 0 0 1 22.62-22.62l352 352A16 16 0 0 1 432 448z" />
      <path d="M255.66 384c-41.49 0-81.5-12.28-118.92-36.5-34.07-22-64.74-53.51-88.7-91v-.08c19.94-28.57 41.78-52.73 65.24-72.21a2 2 0 0 0 .14-2.94L93.5 161.38a2 2 0 0 0-2.71-.12c-24.92 21-48.05 46.76-69.08 76.92a31.92 31.92 0 0 0-.64 35.54c26.41 41.33 60.4 76.14 98.28 100.65C162 402 207.9 416 255.66 416a239.13 239.13 0 0 0 75.8-12.58 2 2 0 0 0 .77-3.31l-21.58-21.58a4 4 0 0 0-3.83-1 204.8 204.8 0 0 1-51.16 6.47zM490.84 238.6c-26.46-40.92-60.79-75.68-99.27-100.53C349 110.55 302 96 255.66 96a236.06 236.06 0 0 0-72.25 11.39 2 2 0 0 0-.78 3.32l21.58 21.58a4 4 0 0 0 3.82 1A203.16 203.16 0 0 1 255.66 128c40.69 0 80.58 12.43 118.55 36.94 34.71 22.4 65.74 53.88 89.76 91a.13.13 0 0 1 0 .16 310.72 310.72 0 0 1-64.12 72.73 2 2 0 0 0-.15 2.95l19.9 19.89a2 2 0 0 0 2.7.13c25.21-21.1 48.4-47.13 69.32-77.74a32.2 32.2 0 0 0 .02-35.46z" />
      <path d="M256 160a95.88 95.88 0 0 0-21.37 2.4 2 2 0 0 0-1 3.38l112.59 112.56a2 2 0 0 0 3.38-1A96 96 0 0 0 256 160zM165.78 233.66a2 2 0 0 0-3.38 1 96 96 0 0 0 115 115 2 2 0 0 0 1-3.38z" />
    </svg>
  );
}

function FloatingField({
  id,
  type = 'text',
  label,
  value,
  onChange,
  autoComplete,
  required = true,
}: {
  id: string;
  type?: 'text' | 'email';
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="yc-auth-field-wrap">
      <input
        id={id}
        type={type}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="yc-auth-field"
        autoComplete={autoComplete}
      />
      <label htmlFor={id} className="yc-auth-field-label">
        {label}
      </label>
    </div>
  );
}

function EmailField({
  value,
  onChange,
  id,
  label = 'Email',
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
  label?: string;
}) {
  return (
    <FloatingField
      id={id}
      type="email"
      label={label}
      value={value}
      onChange={onChange}
      autoComplete="email"
    />
  );
}

function PasswordField({
  value,
  onChange,
  label,
  autoComplete,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  autoComplete: string;
  id: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="yc-auth-field-wrap">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className="yc-auth-field yc-auth-password-field"
        autoComplete={autoComplete}
      />
      <label htmlFor={id} className="yc-auth-field-label">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="yc-auth-password-toggle"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await signIn({
        formFields: [
          { id: 'email', value: email },
          { id: 'password', value: password },
        ],
      });
      if (res.status === 'OK') {
        router.push('/dashboard');
      } else if (res.status === 'WRONG_CREDENTIALS_ERROR') {
        setError('Incorrect email or password.');
      } else {
        setError(GENERIC_ERROR);
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="yc-auth-card">
      <div className="yc-auth-card-inner">
        <h1 className="yc-auth-title">Sign in</h1>

        {error ? <p className="yc-auth-error">{error}</p> : null}

        <form onSubmit={handleSubmit} className="yc-auth-form">
          <div className="yc-auth-fields">
            <EmailField value={email} onChange={setEmail} id="auth-signin-email" />
            <PasswordField
              value={password}
              onChange={setPassword}
              label="Password"
              autoComplete="current-password"
              id="auth-signin-password"
            />
            <div className="yc-auth-links">
              <Link href="/auth/reset-password" className="yc-auth-link">
                Forgot password?
              </Link>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="yc-auth-submit">
            {loading ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <p className="yc-auth-inline-text">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="yc-auth-link-brand">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await sendPasswordResetEmail({
        formFields: [{ id: 'email', value: email }],
      });
      if (res.status === 'OK') {
        setSent(true);
      } else {
        setError('Could not send reset email. Please try again.');
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="yc-auth-card">
      <div className="yc-auth-card-inner">
        <h1 className="yc-auth-title">Reset password</h1>

        {sent ? (
          <p className="yc-auth-success">
            If an account exists for {email}, a reset link is on its way.
          </p>
        ) : (
          <>
            {error ? <p className="yc-auth-error">{error}</p> : null}
            <form onSubmit={handleSubmit} className="yc-auth-form">
              <div className="yc-auth-fields">
                <EmailField value={email} onChange={setEmail} id="auth-forgot-email" />
              </div>
              <Button type="submit" disabled={loading} className="yc-auth-submit">
                {loading ? 'Sending...' : 'Email me a reset link'}
              </Button>
            </form>
          </>
        )}

        <div className="yc-auth-links yc-auth-links-center">
          <Link href="/auth" className="yc-auth-link">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await submitNewPassword({
        formFields: [{ id: 'password', value: password }],
      });
      if (res.status === 'OK') {
        setDone(true);
      } else if (res.status === 'RESET_PASSWORD_INVALID_TOKEN_ERROR') {
        setError('This reset link has expired. Please request a new one.');
      } else {
        setError('Could not reset password. Please try again.');
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="yc-auth-card">
      <div className="yc-auth-card-inner">
        <h1 className="yc-auth-title">New password</h1>

        {done ? (
          <>
            <p className="yc-auth-success">Your password has been updated.</p>
            <Button type="button" onClick={() => router.push('/auth')} className="yc-auth-submit">
              Continue to sign in
            </Button>
          </>
        ) : (
          <>
            {error ? <p className="yc-auth-error">{error}</p> : null}
            <form onSubmit={handleSubmit} className="yc-auth-form">
              <div className="yc-auth-fields">
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  label="New password"
                  autoComplete="new-password"
                  id="auth-reset-new"
                />
                <PasswordField
                  value={confirm}
                  onChange={setConfirm}
                  label="Confirm new password"
                  autoComplete="new-password"
                  id="auth-reset-confirm"
                />
              </div>
              <Button type="submit" disabled={loading} className="yc-auth-submit">
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function SignUpForm() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp({
        formFields: [
          { id: 'email', value: email },
          { id: 'password', value: password },
        ],
      });
      if (res.status === 'OK') {
        try {
          await fetch('/api/profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
            }),
          });
        } catch {
          /* non-blocking — proceed to dashboard even if metadata save fails */
        }
        router.push('/dashboard');
      } else if (res.status === 'FIELD_ERROR') {
        setError(res.formFields[0]?.error ?? GENERIC_ERROR);
      } else if (res.status === 'SIGN_UP_NOT_ALLOWED') {
        setError('Sign up is not allowed for this email.');
      } else {
        setError(GENERIC_ERROR);
      }
    } catch {
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="yc-auth-card">
      <div className="yc-auth-card-inner">
        <h1 className="yc-auth-title">Sign up</h1>

        {error ? <p className="yc-auth-error">{error}</p> : null}

        <form onSubmit={handleSubmit} className="yc-auth-form">
          <div className="yc-auth-fields">
            <FloatingField
              id="auth-signup-first"
              label="First name"
              value={firstName}
              onChange={setFirstName}
              autoComplete="given-name"
            />
            <FloatingField
              id="auth-signup-last"
              label="Last name"
              value={lastName}
              onChange={setLastName}
              autoComplete="family-name"
            />
            <EmailField
              id="auth-signup-email"
              label="Enter email"
              value={email}
              onChange={setEmail}
            />
            <PasswordField
              id="auth-signup-password"
              label="Set up password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <PasswordField
              id="auth-signup-confirm"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" disabled={loading} className="yc-auth-submit">
            {loading ? 'Signing up...' : 'Sign up'}
          </Button>
        </form>

        <p className="yc-auth-inline-text">
          Already have an account?{' '}
          <Link href="/auth" className="yc-auth-link-brand">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Auth() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const normalizedPath = (pathname ?? '/auth').replace(/\/+$/, '') || '/auth';
  const token = searchParams.get('token') ?? '';

  let screen: 'signin' | 'signup' | 'forgot' | 'reset' | 'unknown';
  if (normalizedPath === '/auth') {
    screen = 'signin';
  } else if (normalizedPath === '/auth/signup') {
    screen = 'signup';
  } else if (normalizedPath === '/auth/reset-password') {
    screen = token ? 'reset' : 'forgot';
  } else {
    screen = 'unknown';
  }

  useEffect(() => {
    if (screen === 'unknown') {
      router.replace('/auth');
    }
  }, [screen, router]);

  if (screen === 'signin') return <SignInForm />;
  if (screen === 'signup') return <SignUpForm />;
  if (screen === 'forgot') return <ForgotPasswordForm />;
  if (screen === 'reset') return <ResetPasswordForm />;
  return null;
}
