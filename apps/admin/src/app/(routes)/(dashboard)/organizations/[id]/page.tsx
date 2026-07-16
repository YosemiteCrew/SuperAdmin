import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { corroborateBusiness } from '@/app/features/organizations/corroboration';
import { getDemoOrganization } from '@/app/features/organizations/demo';
import { getOrganization } from '@/app/features/organizations/services/organizationsService';
import type {
  OrganizationAddress,
  SuperAdminOrganizationDetail,
} from '@/app/features/organizations/types';
import { VERIFICATION_META, verificationState } from '@/app/features/organizations/verification';

import { CorroborationFlag, CorroborationPanel } from '../CorroborationPanel';
import { OrganizationAvatar } from '../OrganizationAvatar';
import { OrganizationRowActions } from '../OrganizationRowActions';

const CARD =
  'overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const CARD_HEAD =
  'border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-[10px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const CARD_BODY = 'grid grid-cols-1 gap-x-5 gap-y-[11px] p-[18px] sm:grid-cols-2';
const BACK_LINK =
  'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  ensureSuperTokensInit();
  const { id } = await params;
  try {
    const org = await getOrganization(id);
    return { title: org.name };
  } catch {
    return { title: 'Organization' };
  }
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '—';
  return new Date(ms).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function composeAddress(address?: OrganizationAddress): string {
  if (!address) return '—';
  const parts = [
    address.addressLine,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter((p): p is string => Boolean(p?.trim()));
  return parts.length ? parts.join(', ') : '—';
}

function ratingLabel(org: SuperAdminOrganizationDetail): string {
  if (typeof org.averageRating !== 'number' || !org.ratingCount) return 'No ratings yet';
  return `${org.averageRating.toFixed(1)} ★ (${org.ratingCount})`;
}

function Field({ label, value }: Readonly<{ label: string; value?: string }>) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint2)]">
        {label}
      </dt>
      <dd className="text-[13px] font-medium text-[color:var(--ink)]">
        {value?.trim() ? value : '—'}
      </dd>
    </div>
  );
}

function UnavailableCard() {
  return (
    <div className="rounded-[18px] border border-dashed border-[var(--divider)] bg-[var(--screen)] p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]">
      Couldn&apos;t load this organization. It will be available once the{' '}
      <span className="font-mono">/v1/super-admin/businesses/:id</span> endpoint is connected.
    </div>
  );
}

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{ demo?: string; checks?: string }>;
}>) {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const { id } = await params;
  const { demo, checks } = await searchParams;

  let org: SuperAdminOrganizationDetail | null = null;
  if (demo === '1') {
    org = getDemoOrganization(id);
  } else {
    try {
      org = await getOrganization(id);
    } catch {
      /* backend not connected (or business missing) — render the unavailable state */
    }
  }

  if (!org) {
    return (
      <div className="flex flex-col gap-[22px]">
        <Link href="/organizations" className={BACK_LINK}>
          ← Back to organizations
        </Link>
        <UnavailableCard />
      </div>
    );
  }

  const state = verificationState(org);
  const meta = VERIFICATION_META[state];
  // Corroboration performs a live outbound fetch, so run it only on demand.
  const corroboration = checks === '1' ? await corroborateBusiness(org) : null;
  const checksHref = `/organizations/${encodeURIComponent(org.id)}?checks=1${
    demo === '1' ? '&demo=1' : ''
  }`;

  return (
    <div className="flex flex-col gap-[22px]">
      <div>
        <Link href="/organizations" className={BACK_LINK}>
          ← Back to organizations
        </Link>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3.5">
          <OrganizationAvatar type={org.type} size={46} />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-3">
              <h1
                className="text-[27px] tracking-[-0.015em] text-[color:var(--ink)]"
                style={{ fontFamily: 'var(--font-serif-display)', fontWeight: 400 }}
              >
                {org.name}
              </h1>
              <span
                className={`inline-flex rounded-full px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em] ${meta.badgeClass}`}
              >
                {meta.label}
              </span>
            </div>
            <p className="font-mono text-[11.5px] text-[color:var(--ink-faint)]">{org.id}</p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {corroboration ? (
            <CorroborationFlag level={corroboration.level} />
          ) : (
            <Link
              href={checksHref}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--screen)] px-[14px] text-xs font-semibold text-[color:var(--ink-muted)] transition-colors hover:bg-[var(--screen-2)]"
            >
              Run pre-verification checks
            </Link>
          )}
          <OrganizationRowActions organizationId={org.id} name={org.name} state={state} />
        </div>
      </header>

      {corroboration ? <CorroborationPanel result={corroboration} /> : null}

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Identity</h2>
        <dl className={CARD_BODY}>
          <Field label="Type" value={org.type} />
          <Field label="Sub-type" value={org.subType} />
          <Field label="Tax ID" value={org.taxId} />
          <Field label="DUNS number" value={org.DUNSNumber} />
        </dl>
      </section>

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Contact</h2>
        <dl className={CARD_BODY}>
          <Field label="Phone" value={org.phoneNo} />
          <Field label="Website" value={org.website} />
          <div className="sm:col-span-2">
            <Field label="Address" value={composeAddress(org.address)} />
          </div>
        </dl>
      </section>

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Compliance</h2>
        <dl className={CARD_BODY}>
          <Field label="Health & safety cert" value={org.healthAndSafetyCertNo} />
          <Field label="Animal welfare cert" value={org.animalWelfareComplianceCertNo} />
          <Field label="Fire & emergency cert" value={org.fireAndEmergencyCertNo} />
        </dl>
      </section>

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Activity</h2>
        <dl className={CARD_BODY}>
          <Field label="Members" value={String(org.memberCount)} />
          <Field label="Rating" value={ratingLabel(org)} />
          <Field label="Created" value={formatDate(org.createdAt)} />
          <Field label="Last updated" value={formatDate(org.updatedAt)} />
        </dl>
      </section>
    </div>
  );
}
