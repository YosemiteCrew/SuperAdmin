'use client';

import { CSSProperties, useEffect } from 'react';

import { reportError } from './lib/reportError';

const bodyStyle: CSSProperties = {
  margin: 0,
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#f8f6f4',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  color: '#1d1c1b',
};

const buttonStyle: CSSProperties = {
  minHeight: '3rem',
  padding: '0.75rem 1.5rem',
  width: '100%',
  border: 'none',
  borderRadius: 16,
  background: '#1d1c1b',
  color: '#ffffff',
  fontSize: '1rem',
  fontWeight: 500,
  cursor: 'pointer',
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: 'global', digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body style={bodyStyle}>
        <div
          style={{
            maxWidth: 480,
            padding: '2rem',
            borderRadius: 24,
            background: '#ffffff',
            boxShadow:
              '0 1px 2px rgba(29, 28, 27, 0.04), 0 4px 12px rgba(29, 28, 27, 0.08), 0 16px 40px rgba(29, 28, 27, 0.12)',
            textAlign: 'center',
          }}
        >
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Something went wrong</h1>
          <p
            style={{
              margin: '0 0 1.5rem',
              color: '#5c5956',
              fontSize: '0.95rem',
              lineHeight: 1.5,
            }}
          >
            An unexpected error occurred. Try again, and if it keeps happening, contact an
            administrator.
          </p>
          <button type="button" onClick={reset} style={buttonStyle}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
