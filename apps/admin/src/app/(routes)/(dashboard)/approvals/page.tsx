import type { Metadata } from 'next';
import Link from 'next/link';
import { IoCheckmarkDoneOutline } from 'react-icons/io5';

import {
  DEFAULT_API_ENVIRONMENT,
  type ApiEnvironment,
  apiBaseUrl,
  parseApiEnvironment,
} from '@/app/config/apiEnvironment';
import { requireSuperAdmin } from '@/app/config/backend';
import { approvalQueue, waitingLabel } from '@/app/features/organizations/approvals';
import { buildLoadErrorMessage, loadOrganizations } from '@/app/features/organizations/load';
import type { SuperAdminOrganization } from '@/app/features/organizations/types';
import { scalarSearchParam, type SearchParam } from '@/app/lib/searchParams';
import { getServerTimestamp } from '@/app/lib/serverTime';

import { EnvironmentTabs } from '../organizations/EnvironmentTabs';
import { OrganizationAvatar } from '../organizations/OrganizationAvatar';
import { OrganizationRowActions } from '../organizations/OrganizationRowActions';

export const metadata: Metadata = { title: 'Approvals' };

function pageQuery(demo: boolean, environment: ApiEnvironment): string {
  const qs = new URLSearchParams();
  if (demo) qs.set('demo', '1');
  if (environment !== DEFAULT_API_ENVIRONMENT) qs.set('env', environment);
  const query = qs.toString();
  return query ? `?${query}` : '';
}

function formatDate(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return 'an unknown date';
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function Fact({ label, value }: Readonly<{ label: string; value?: string }>) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]">
        {label}
      </dt>
      {value ? (
        <dd className="break-words text-[13px] text-[color:var(--ink)]">{value}</dd>
      ) : (
        <dd className="text-[13px] italic text-[color:var(--ink-muted)]">Not provided</dd>
      )}
    </div>
  );
}

function ApprovalCard({
  org,
  now,
  suffix,
  environment,
}: Readonly<{
  org: SuperAdminOrganization;
  now: number;
  suffix: string;
  environment: ApiEnvironment;
}>) {
  return (
    <li className="rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <OrganizationAvatar type={org.type} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <Link
              href={`/organizations/${org.id}${suffix}`}
              className="truncate text-[15px] font-bold text-[color:var(--ink)] hover:underline"
            >
              {org.name}
            </Link>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-[color:var(--ink-muted)]">
              <span className="capitalize">{org.type.toLowerCase()}</span>
              <span aria-hidden>·</span>
              <span>Registered {formatDate(org.createdAt)}</span>
              <span className="rounded-full border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2.5 py-0.5 text-[11px] font-semibold text-[color:var(--warn-text)]">
                {waitingLabel(org.createdAt, now)}
              </span>
            </p>
          </div>
        </div>
        <OrganizationRowActions
          organizationId={org.id}
          name={org.name}
          state="pending"
          environment={environment}
        />
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-[var(--hairline)] px-5 py-4 sm:grid-cols-4">
        <Fact label="Members" value={String(org.memberCount)} />
        <Fact label="Website" value={org.website} />
        <Fact label="Phone" value={org.phoneNo} />
        <Fact label="Tax ID" value={org.taxId} />
      </dl>
    </li>
  );
}

function EmptyState({ message, display }: Readonly<{ message: string; display: boolean }>) {
  return (
    <div className="flex flex-col items-center gap-[10px] rounded-[18px] border border-dashed border-[var(--divider)] bg-[var(--screen)] px-10 py-[38px] text-center">
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[var(--nav-active-bg)] text-[color:var(--nav-active)]">
        <IoCheckmarkDoneOutline size={23} aria-hidden />
      </span>
      {display ? (
        <span className="font-[family-name:var(--font-serif-display)] text-[18px] font-normal tracking-[-0.01em] text-[color:var(--ink)]">
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

export default async function ApprovalsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ demo?: SearchParam; env?: SearchParam }> }>) {
  await requireSuperAdmin('page');
  const { demo: demoRaw, env } = await searchParams;
  const demo = scalarSearchParam(demoRaw) === '1';
  const environment = parseApiEnvironment(scalarSearchParam(env));

  const { organizations, loadError, loadErrorDetail } = await loadOrganizations(demo, environment);
  const queue = approvalQueue(organizations);
  const suffix = pageQuery(demo, environment);
  const now = getServerTimestamp();

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-1">
        <h1 className="flex items-baseline gap-3 font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          Approvals
          {loadError ? null : (
            <span className="text-[16px] italic text-[color:var(--ink-faint)]">
              {queue.length} waiting
            </span>
          )}
        </h1>
        <p className="max-w-[720px] text-[13.5px] text-[color:var(--ink-muted)]">
          Businesses waiting for verification, longest wait first. Verify a business to make it
          visible to pet parents in the mobile app, or suspend it to keep it hidden. Open a business
          to see its full record and checks before you decide. People sign in without approval;
          manage individual accounts on{' '}
          <Link href="/users" className="font-semibold text-[color:var(--ink)] hover:underline">
            Users
          </Link>
          .
        </p>
      </header>

      <EnvironmentTabs
        active={environment}
        hrefFor={(key) => `/approvals${pageQuery(demo, key)}`}
      />

      {loadError ? (
        <EmptyState
          message={buildLoadErrorMessage(apiBaseUrl(environment), environment, loadErrorDetail)}
          display={false}
        />
      ) : null}

      {!loadError && queue.length === 0 ? (
        <EmptyState message="No businesses waiting for approval." display />
      ) : null}

      {queue.length > 0 ? (
        <ul className="flex flex-col gap-4">
          {queue.map((org) => (
            <ApprovalCard
              key={org.id}
              org={org}
              now={now}
              suffix={suffix}
              environment={environment}
            />
          ))}
        </ul>
      ) : null}

      <p className="text-[12.5px] text-[color:var(--ink-muted)]">
        Verified and suspended businesses are on{' '}
        <Link
          href={`/organizations${suffix}`}
          className="font-semibold text-[color:var(--ink)] hover:underline"
        >
          Organizations
        </Link>
        .
      </p>
    </div>
  );
}
