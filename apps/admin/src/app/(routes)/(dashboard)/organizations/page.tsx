import type { Metadata } from 'next';

import { listOrganizations } from '@/app/features/organizations/services/organizationsService';
import type {
  OrganizationStatus,
  SuperAdminOrganization,
} from '@/app/features/organizations/types';

export const metadata: Metadata = {
  title: 'Organizations',
};

const STATUS_STYLES: Record<OrganizationStatus, string> = {
  invited: 'bg-neutral-100 text-neutral-700',
  approved: 'bg-green-100 text-green-800',
  suspended: 'bg-amber-100 text-amber-800',
  deactivated: 'bg-red-100 text-red-700',
};

function StatusBadge({ status }: Readonly<{ status: OrganizationStatus }>) {
  const className = STATUS_STYLES[status] ?? 'bg-neutral-100 text-neutral-700';
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${className}`}
    >
      {status}
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
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-sm text-neutral-600">
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

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium tracking-tight text-neutral-900">Organizations</h1>
        <p className="text-sm text-neutral-600">
          Clinics and businesses across the platform, and their verification status.
        </p>
      </header>

      {loadError ? (
        <EmptyState message="Couldn't reach the platform backend. Organizations appear here once the /v1/super-admin/businesses API is connected (set NEXT_PUBLIC_API_URL)." />
      ) : organizations.length === 0 ? (
        <EmptyState message="No organizations yet." />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-100 text-left text-xs font-medium uppercase tracking-wide text-neutral-700">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Members</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr
                  key={org.id}
                  className="border-b border-neutral-200 last:border-b-0 hover:bg-neutral-100/60"
                >
                  <td className="px-5 py-3 font-medium text-neutral-900">{org.name}</td>
                  <td className="px-5 py-3 capitalize text-neutral-700">
                    {org.type.toLowerCase()}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={org.status} />
                  </td>
                  <td className="px-5 py-3 text-right text-neutral-700">{org.memberCount}</td>
                  <td className="px-5 py-3 text-neutral-700">{formatDate(org.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
