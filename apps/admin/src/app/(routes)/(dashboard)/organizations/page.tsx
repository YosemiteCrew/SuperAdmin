import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { IoBusinessOutline, IoHourglassOutline } from 'react-icons/io5';

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

import { OrganizationAvatar } from './OrganizationAvatar';
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
                ? 'inline-flex h-9 items-center gap-[7px] rounded-full border border-[var(--btn)] bg-[var(--btn)] px-4 text-[13px] font-semibold text-[color:var(--btn-ink)]'
                : 'inline-flex h-9 items-center gap-[7px] rounded-full border border-[var(--divider)] px-4 text-[13px] font-semibold text-[color:var(--ink-muted)] transition-colors hover:border-[var(--hairline-hover)] hover:bg-[var(--screen-2)]'
            }
          >
            {tab.label}
            <span
              className={`tabular-nums ${isActive ? 'text-[color:var(--btn-ink)]/65' : 'text-[color:var(--ink-faint)]'}`}
            >
              {counts[tab.key]}
            </span>
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
      className={`inline-flex rounded-full px-[11px] py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${meta.badgeClass}`}
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

/**
 * `display` sets the headline in the serif face for short, editorial empty
 * copy. Long operational notes (a backend that can't be reached) read better as
 * body copy, so they opt out.
 */
function EmptyState({ message, display = true }: Readonly<{ message: string; display?: boolean }>) {
  return (
    <div className="flex flex-col items-center gap-[10px] rounded-[18px] border border-dashed border-[var(--divider)] bg-[var(--screen)] px-10 py-[38px] text-center">
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[var(--nav-active-bg)] text-[color:var(--nav-active)]">
        <IoBusinessOutline size={23} aria-hidden />
      </span>
      {display ? (
        <span
          className="text-[18px] tracking-[-0.01em] text-[color:var(--ink)]"
          style={{ fontFamily: 'var(--font-serif-display)', fontWeight: 400 }}
        >
          {message}
        </span>
      ) : (
        <span className="max-w-[520px] text-[13px] leading-[1.6] text-balance text-[color:var(--ink-muted)]">
          {message}
        </span>
      )}
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
    <section className="overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-[var(--hairline)] bg-[var(--screen-2)] text-left text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
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
            <tr
              key={org.id}
              className="border-b border-[var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--screen-2)]/60"
            >
              <td className="px-5 py-4">
                <span className="flex min-w-0 items-center gap-3">
                  <OrganizationAvatar type={org.type} />
                  <Link
                    href={`/organizations/${org.id}${suffix}`}
                    className="min-w-0 truncate font-bold text-[color:var(--ink)] hover:underline"
                  >
                    {org.name}
                  </Link>
                </span>
              </td>
              <td className="px-5 py-4 capitalize text-[color:var(--ink-muted)]">
                {org.type.toLowerCase()}
              </td>
              <td className="px-5 py-4">
                <VerificationBadge org={org} />
              </td>
              <td className="px-5 py-4 text-right tabular-nums text-[color:var(--ink-muted)]">
                {org.memberCount}
              </td>
              <td className="px-5 py-4 text-[color:var(--ink-muted)]">
                {formatDate(org.createdAt)}
              </td>
              <td className="px-5 py-4">
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

/** The awaiting-verification notice. Extracted from the page body for the same
 *  reason as RequestCard on the CRM page: the page keeps its cognitive
 *  complexity within the Sonar limit, and each piece reads on its own. */
function PendingBanner({ pending }: Readonly<{ pending: number }>) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-[18px] py-3 text-[13.5px] text-[color:var(--warn-text)]">
      <IoHourglassOutline size={17} className="flex-none" aria-hidden />
      <span>
        <span className="font-bold">
          {pending} {pending === 1 ? 'business is' : 'businesses are'} awaiting verification
        </span>
        <span className="opacity-80">— verify to make them visible to pet parents.</span>
      </span>
    </div>
  );
}

/** The name search. The hidden inputs carry the current filter, demo and
 *  environment through the GET so searching does not silently reset them. */
function SearchForm({
  activeFilter,
  demo,
  environment,
  searchTerm,
}: Readonly<{
  activeFilter: ReturnType<typeof parseOrgFilter>;
  demo: boolean;
  environment: ReturnType<typeof parseApiEnvironment>;
  searchTerm: string;
}>) {
  return (
    <form action="/organizations" method="get" className="flex items-center gap-2">
      {activeFilter === 'all' ? null : <input type="hidden" name="status" value={activeFilter} />}
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
        className="h-[38px] w-full rounded-xl border border-[var(--hairline)] bg-[var(--field-bg)] px-4 text-[13px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[var(--blue)] sm:w-[260px]"
      />
    </form>
  );
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
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-[3px]">
        <h1
          className="flex items-baseline gap-3 text-[26px] tracking-[-0.015em] text-[color:var(--ink)]"
          style={{ fontFamily: 'var(--font-serif-display)', fontWeight: 400 }}
        >
          Organizations
          {allEmpty ? null : (
            <span className="text-[16px] italic text-[color:var(--ink-faint)]">
              {organizations.length} {organizations.length === 1 ? 'business' : 'businesses'}
            </span>
          )}
        </h1>
        <p className="text-[13.5px] text-[color:var(--ink-muted)]">
          Review and verify pet businesses before they become visible to pet parents.
        </p>
      </header>

      {/* Sits above the empty/error branch on purpose: when one backend fails to
          load, switching to the other is exactly what the reviewer needs next. */}
      <EnvironmentTabs active={environment} filter={activeFilter} search={searchTerm} demo={demo} />

      {showPendingBanner ? <PendingBanner pending={counts.pending} /> : null}

      {allEmpty ? (
        <EmptyState message={emptyMessage} display={!loadError} />
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
            <SearchForm
              activeFilter={activeFilter}
              demo={demo}
              environment={environment}
              searchTerm={searchTerm}
            />
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
