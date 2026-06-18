import type { Metadata } from 'next';

import { listOrganizations } from '@/app/features/organizations/services/organizationsService';
import type { SuperAdminOrganization } from '@/app/features/organizations/types';
import { VERIFICATION_META, verificationState } from '@/app/features/organizations/verification';

import { OrganizationRowActions } from './OrganizationRowActions';

export const metadata: Metadata = {
  title: 'Organizations',
};

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

export default async function OrganizationsPage() {
  let organizations: SuperAdminOrganization[] = [];
  let loadError = false;
  try {
    organizations = await listOrganizations();
  } catch {
    loadError = true;
  }

  const pendingCount = organizations.filter((org) => verificationState(org) === 'pending').length;
  const showEmptyState = loadError || organizations.length === 0;
  const emptyStateMessage = loadError
    ? "Couldn't reach the platform backend. Organizations appear here once the /v1/super-admin/businesses API is connected (set NEXT_PUBLIC_API_URL)."
    : 'No organizations yet.';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-ink">Organizations</h1>
        <p className="text-sm text-ink-3">
          Review and verify pet businesses before they become visible to pet parents.
        </p>
      </header>

      {!showEmptyState && pendingCount > 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-warning-600/30 bg-warning-100 px-4 py-3 text-sm text-warning-800">
          <span className="font-medium">
            {pendingCount} {pendingCount === 1 ? 'business is' : 'businesses are'} awaiting
            verification
          </span>
          <span className="text-warning-800/80">— verify to make them visible to pet parents.</span>
        </div>
      ) : null}

      {showEmptyState ? (
        <EmptyState message={emptyStateMessage} />
      ) : (
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
              {organizations.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-line last:border-b-0 hover:bg-raised/60"
                >
                  <td className="px-5 py-3 font-medium text-ink">{org.name}</td>
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
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
