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
import { OrganizationRowActions } from '../OrganizationRowActions';

const CARD =
  'overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]';
const CARD_HEAD =
  'border-b border-line bg-raised px-5 py-3 text-xs font-medium uppercase tracking-wide text-ink-2';

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
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-3">{label}</dt>
      <dd className="mt-1 text-sm text-ink">{value?.trim() ? value : '—'}</dd>
    </div>
  );
}

function UnavailableCard() {
  return (
    <div className="rounded-2xl border border-dashed border-line-strong bg-surface p-10 text-center text-sm text-ink-3">
      Couldn&apos;t load this organization. It will be available once the{' '}
      <span className="font-mono">/v1/super-admin/businesses/:id</span> endpoint is connected.
    </div>
  );
}

export default async function OrganizationDetailPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ demo?: string }> }>) {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const { id } = await params;
  const { demo } = await searchParams;

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
      <div className="flex flex-col gap-6">
        <Link href="/organizations" className="text-sm text-ink-2 hover:text-ink">
          ← Back to organizations
        </Link>
        <UnavailableCard />
      </div>
    );
  }

  const state = verificationState(org);
  const meta = VERIFICATION_META[state];
  const corroboration = await corroborateBusiness(org);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/organizations" className="text-sm text-ink-2 hover:text-ink">
          ← Back to organizations
        </Link>
      </div>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium tracking-tight text-ink">{org.name}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.badgeClass}`}
            >
              {meta.label}
            </span>
          </div>
          <p className="font-mono text-xs text-ink-3">{org.id}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <CorroborationFlag level={corroboration.level} />
          <OrganizationRowActions organizationId={org.id} name={org.name} state={state} />
        </div>
      </header>

      <CorroborationPanel result={corroboration} />

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Identity</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <Field label="Type" value={org.type} />
          <Field label="Sub-type" value={org.subType} />
          <Field label="Tax ID" value={org.taxId} />
          <Field label="DUNS number" value={org.DUNSNumber} />
        </dl>
      </section>

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Contact</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <Field label="Phone" value={org.phoneNo} />
          <Field label="Website" value={org.website} />
          <div className="sm:col-span-2">
            <Field label="Address" value={composeAddress(org.address)} />
          </div>
        </dl>
      </section>

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Compliance</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <Field label="Health & safety cert" value={org.healthAndSafetyCertNo} />
          <Field label="Animal welfare cert" value={org.animalWelfareComplianceCertNo} />
          <Field label="Fire & emergency cert" value={org.fireAndEmergencyCertNo} />
        </dl>
      </section>

      <section className={CARD}>
        <h2 className={CARD_HEAD}>Activity</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2">
          <Field label="Members" value={String(org.memberCount)} />
          <Field label="Rating" value={ratingLabel(org)} />
          <Field label="Created" value={formatDate(org.createdAt)} />
          <Field label="Last updated" value={formatDate(org.updatedAt)} />
        </dl>
      </section>
    </div>
  );
}
