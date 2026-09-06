import Link from 'next/link';

import type { SuperAdminOrganizationMember } from '@/app/features/organizations/types';

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
 * The people in an organisation, each linked to the account page that can
 * answer why one of them cannot sign in.
 *
 * `members` is `null` when the listing could not be read. That is rendered
 * distinctly from an empty list on purpose: "we could not ask" and "this
 * clinic has nobody in it" would otherwise look identical, and the second one
 * reads as a diagnosis.
 */
export function OrgMembers({
  members,
  memberCount,
}: Readonly<{
  members: SuperAdminOrganizationMember[] | null;
  memberCount: number;
}>) {
  if (!members) {
    return (
      <p className="p-5 text-sm text-ink-3">
        Couldn&apos;t load the member list. It will be available once the{' '}
        <span className="font-mono">/v1/super-admin/businesses/:id/members</span> endpoint is
        connected.
      </p>
    );
  }

  if (members.length === 0) {
    return (
      <p className="p-5 text-sm text-ink-3">
        No active members.
        {memberCount > 0
          ? ' The count above disagrees, which means some memberships were not matched — worth reporting.'
          : ''}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between"
        >
          <Link
            href={`/users/${encodeURIComponent(member.userId)}`}
            className="font-mono text-sm text-ink hover:underline"
          >
            {member.userId}
          </Link>
          <span className="text-sm text-ink-2">{member.roleDisplay ?? member.roleCode}</span>
          <span className="text-xs text-ink-3">Member since {formatDate(member.since)}</span>
        </li>
      ))}
    </ul>
  );
}
