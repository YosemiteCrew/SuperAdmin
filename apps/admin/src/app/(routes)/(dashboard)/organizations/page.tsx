import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';

import {
  API_ENVIRONMENTS,
  API_ENVIRONMENT_META,
  DEFAULT_API_ENVIRONMENT,
  type ApiEnvironment,
  apiBaseUrl,
  isApiEnvironmentConfigured,
  parseApiEnvironment,
} from '@/app/config/apiEnvironment';
import { DEMO_ORGANIZATIONS } from '@/app/features/organizations/demo';
import {
  type OrgFilter,
  filterOrganizations,
  organizationCounts,
  parseOrgFilter,
} from '@/app/features/organizations/filter';
import { listOrganizations } from '@/app/features/organizations/services/organizationsService';
import type { SuperAdminOrganization } from '@/app/features/organizations/types';
import { VERIFICATION_META, verificationState } from '@/app/features/organizations/verification';

import { OrganizationRowActions } from './OrganizationRowActions';

export const metadata: Metadata = {
  title: 'Organizations',
};

type SearchParams = { status?: string; search?: string; demo?: string; env?: string };

const FILTER_TABS: ReadonlyArray<{ key: OrgFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'verified', label: 'Verified' },
  { key: 'suspended', label: 'Suspended' },
];

function buildHref(
  filter: OrgFilter,
  search: string,
  demo: boolean,
  environment: ApiEnvironment
): string {
  const qs = new URLSearchParams();
  if (filter !== 'all') qs.set('status', filter);
  if (search) qs.set('search', search);
  if (demo) qs.set('demo', '1');
  if (environment !== DEFAULT_API_ENVIRONMENT) qs.set('env', environment);
  const query = qs.toString();
  return query ? `/organizations?${query}` : '/organizations';
}

/**
 * Lets a reviewer read the same screen against either platform backend. The
 * selected environment is carried on every link and mutation on this page, so
 * a business opened from the dev list cannot be verified against production.
 */
function EnvironmentTabs({
  active,
  filter,
  search,
  demo,
}: Readonly<{ active: ApiEnvironment; filter: OrgFilter; search: string; demo: boolean }>) {
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
            href={buildHref(filter, search, demo, key)}
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

function FilterTabs({
  active,
  search,
  counts,
  demo,
  environment,
}: Readonly<{
  active: OrgFilter;
  search: string;
  counts: Record<OrgFilter, number>;
  demo: boolean;
  environment: ApiEnvironment;
}>) {
  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={buildHref(tab.key, search, demo, environment)}
            aria-current={isActive ? 'page' : undefined}
            className={
              isActive
                ? 'inline-flex items-center gap-2 rounded-full border border-btn bg-btn px-3.5 py-1.5 text-sm font-medium text-btn-ink'
                : 'inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-ink-2 transition-colors hover:bg-raised'
            }
          >
            {tab.label}
            <span className={isActive ? 'text-btn-ink/70' : 'text-ink-3'}>{counts[tab.key]}</span>
          </Link>
        );
      })}
    </div>
  );
}

function VerificationBadge({ org }: Readonly<{ org: SuperAdminOrganization }>) {
  const meta = VERIFICATION_META[verificationState(org)];
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

function formatDate(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function EmptyState({ message }: Readonly<{ message: string }>) {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center text-sm text-ink-3">
      {message}
    </div>
  );
}

function OrganizationsTable({
  rows,
  demo,
  environment,
}: Readonly<{
  rows: SuperAdminOrganization[];
  demo: boolean;
  environment: ApiEnvironment;
}>) {
  const rowQuery = new URLSearchParams();
  if (demo) rowQuery.set('demo', '1');
  if (environment !== DEFAULT_API_ENVIRONMENT) rowQuery.set('env', environment);
  const suffix = rowQuery.toString() ? `?${rowQuery.toString()}` : '';
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line bg-raised text-left text-xs font-medium uppercase tracking-wide text-ink-2">
            <th className="px-5 py-3">Name</th>
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Members</th>
            <th className="px-5 py-3">Created</th>
            <th className="px-5 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((org) => (
            <tr key={org.id} className="border-b border-line last:border-b-0 hover:bg-raised/60">
              <td className="px-5 py-3 font-medium">
                <Link
                  href={`/organizations/${org.id}${suffix}`}
                  className="text-ink hover:underline"
                >
                  {org.name}
                </Link>
              </td>
              <td className="px-5 py-3 capitalize text-ink-2">{org.type.toLowerCase()}</td>
              <td className="px-5 py-3">
                <VerificationBadge org={org} />
              </td>
              <td className="px-5 py-3 text-right text-ink-2">{org.memberCount}</td>
              <td className="px-5 py-3 text-ink-2">{formatDate(org.createdAt)}</td>
              <td className="px-5 py-3">
                <OrganizationRowActions
                  organizationId={org.id}
                  name={org.name}
                  state={verificationState(org)}
                  environment={environment}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function buildLoadErrorMessage(
  baseUrl: string,
  environment: ApiEnvironment,
  detail?: string
): string {
  const envVar = environment === 'production' ? 'NEXT_PUBLIC_API_URL' : 'NEXT_PUBLIC_DEV_API_URL';
  const resolvedBaseUrl = baseUrl || `(empty ${envVar})`;
  const message = `Couldn't reach the platform backend at ${resolvedBaseUrl}/v1/super-admin/businesses.`;
  return detail ? `${message} Error: ${detail}` : message;
}

async function loadOrganizations(
  demo: boolean,
  environment: ApiEnvironment
): Promise<{
  organizations: SuperAdminOrganization[];
  loadError: boolean;
  loadErrorDetail?: string;
}> {
  if (demo) return { organizations: DEMO_ORGANIZATIONS, loadError: false };
  try {
    const cookie = (await headers()).get('cookie') ?? '';
    return {
      organizations: await listOrganizations({
        headers: { cookie },
        baseUrl: apiBaseUrl(environment),
      }),
      loadError: false,
    };
  } catch (error) {
    return {
      organizations: [],
      loadError: true,
      loadErrorDetail: error instanceof Error ? error.message : String(error),
    };
  }
}

export default async function OrganizationsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<SearchParams> }>) {
  const { status, search, demo: demoRaw, env } = await searchParams;
  const activeFilter = parseOrgFilter(status);
  const searchTerm = (search ?? '').trim();
  const demo = demoRaw === '1';
  const environment = parseApiEnvironment(env);

  const { organizations, loadError, loadErrorDetail } = await loadOrganizations(demo, environment);

  const counts = organizationCounts(organizations);
  const filtered = filterOrganizations(organizations, { state: activeFilter, search: searchTerm });
  const allEmpty = loadError || organizations.length === 0;
  const showPendingBanner = !allEmpty && counts.pending > 0;
  const emptyMessage = loadError
    ? buildLoadErrorMessage(apiBaseUrl(environment), environment, loadErrorDetail)
    : 'No organizations yet.';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Organizations</h1>
        <p className="text-sm text-ink-3">
          Review and verify pet businesses before they become visible to pet parents.
        </p>
      </header>

      {/* Sits above the empty/error branch on purpose: when one backend fails to
          load, switching to the other is exactly what the reviewer needs next. */}
      <EnvironmentTabs active={environment} filter={activeFilter} search={searchTerm} demo={demo} />

      {showPendingBanner ? (
        <div className="flex items-center gap-2 rounded-xl border border-warning-600/30 bg-warning-100 px-4 py-3 text-sm text-warning-800">
          <span className="font-medium">
            {counts.pending} {counts.pending === 1 ? 'business is' : 'businesses are'} awaiting
            verification
          </span>
          <span className="text-warning-800/80">— verify to make them visible to pet parents.</span>
        </div>
      ) : null}

      {allEmpty ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <FilterTabs
              active={activeFilter}
              search={searchTerm}
              counts={counts}
              demo={demo}
              environment={environment}
            />
            <form action="/organizations" method="get" className="flex items-center gap-2">
              {activeFilter === 'all' ? null : (
                <input type="hidden" name="status" value={activeFilter} />
              )}
              {demo ? <input type="hidden" name="demo" value="1" /> : null}
              {environment === DEFAULT_API_ENVIRONMENT ? null : (
                <input type="hidden" name="env" value={environment} />
              )}
              <input
                type="search"
                name="search"
                defaultValue={searchTerm}
                placeholder="Search by name"
                aria-label="Search organizations by name"
                className="h-10 w-full rounded-xl border border-line bg-surface px-4 text-sm text-ink outline-none transition-colors focus:border-primary-500 sm:w-64"
              />
            </form>
          </div>

          {filtered.length > 0 ? (
            <OrganizationsTable rows={filtered} demo={demo} environment={environment} />
          ) : (
            <EmptyState message="No organizations match these filters." />
          )}
        </div>
      )}
    </div>
  );
}
