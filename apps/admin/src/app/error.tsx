'use client';

import { useEffect } from 'react';
import Link from 'next/link';

import { reportError } from './lib/reportError';

const isDev = process.env.NODE_ENV !== 'production';

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { source: 'route', digest: error.digest });
  }, [error]);

  return (
    <div className="yc-auth-shell">
      <div className="yc-auth-stage">
        <div className="yc-auth-card">
          <div className="yc-auth-card-inner">
            <h1 className="yc-auth-title">Something went wrong</h1>
            <p className="yc-auth-inline-text">
              An unexpected error stopped this page from loading.
            </p>
            {isDev && error.message ? (
              <pre
                style={{
                  margin: 0,
                  padding: '0.75rem 1rem',
                  borderRadius: '0.75rem',
                  background: '#fdebea',
                  color: '#9a1f15',
                  fontSize: '0.8rem',
                  fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left',
                  overflowWrap: 'anywhere',
                }}
              >
                {error.message}
                {error.digest ? `\n\nDigest: ${error.digest}` : ''}
              </pre>
            ) : null}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <button type="button" onClick={reset} className="yc-primary-button yc-auth-submit">
                <span>Try again</span>
              </button>
              <Link
                href="/dashboard"
                className="yc-auth-inline-text"
                style={{ textDecoration: 'underline', cursor: 'pointer' }}
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
