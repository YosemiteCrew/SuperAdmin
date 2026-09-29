import Link from 'next/link';

import {
  API_ENVIRONMENTS,
  API_ENVIRONMENT_META,
  type ApiEnvironment,
  isApiEnvironmentConfigured,
} from '@/app/config/apiEnvironment';

/**
 * Lets a reviewer read the same screen against either platform backend. The
 * selected environment is carried on every link and mutation on the page, so
 * a business opened from the dev list cannot be verified against production.
 */
export function EnvironmentTabs({
  active,
  hrefFor,
}: Readonly<{ active: ApiEnvironment; hrefFor: (environment: ApiEnvironment) => string }>) {
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Platform backend">
      <span className="text-xs font-medium uppercase tracking-wide text-ink-3">Backend</span>
      {API_ENVIRONMENTS.map((key) => {
        const isActive = key === active;
        const configured = isApiEnvironmentConfigured(key);
        const meta = API_ENVIRONMENT_META[key];
        if (!configured) {
          return (
            <span
              key={key}
              title={`Not configured on this host — set ${
                key === 'production' ? 'NEXT_PUBLIC_API_URL' : 'NEXT_PUBLIC_DEV_API_URL'
              }`}
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-3 opacity-60"
            >
              {meta.label}
            </span>
          );
        }
        return (
          <Link
            key={key}
            href={hrefFor(key)}
            aria-current={isActive ? 'page' : undefined}
            title={meta.hint}
            className={
              isActive
                ? 'inline-flex items-center gap-2 rounded-full border border-btn bg-btn px-3.5 py-1.5 text-sm font-medium text-btn-ink'
                : 'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-raised'
            }
          >
            {meta.label}
          </Link>
        );
      })}
    </nav>
  );
}
