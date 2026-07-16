import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { getInviteByToken } from '@/app/features/invites/store';
import { inviteStatus } from '@/app/features/invites/types';

import { AcceptButton } from './AcceptButton';

export const metadata: Metadata = {
  title: 'Accept invitation',
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function AcceptInvitePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ token?: string }>;
}>) {
  ensureSuperTokensInit();

  const { token } = await searchParams;

  if (!token?.trim()) {
    redirect('/dashboard');
  }

  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <p className="text-lg font-medium text-ink">Invite not found</p>
        <p className="mt-2 text-sm text-ink-3">This link is invalid or has already been used.</p>
      </div>
    );
  }

  const status = inviteStatus(invite);

  if (status !== 'pending') {
    const messages: Record<Exclude<typeof status, 'pending'>, string> = {
      expired: 'This invite link has expired. Ask a super-admin to generate a new one.',
      revoked: 'This invite link has been revoked.',
      used: 'This invite has already been accepted.',
    };
    return (
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <p className="text-lg font-medium text-ink capitalize">{status}</p>
        <p className="mt-2 text-sm text-ink-3">{messages[status]}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className="rounded-2xl border border-line bg-surface p-8 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <h1 className="text-xl font-medium text-ink">You&apos;re invited</h1>
        <p className="mt-2 text-sm text-ink-3">
          <strong className="font-medium text-ink">{invite.createdByEmail}</strong> has invited{' '}
          <strong className="font-medium text-ink">{invite.email}</strong> to become a Super Admin.
        </p>
        <p className="mt-1 text-xs text-ink-3">
          This link expires{' '}
          <time dateTime={new Date(invite.expiresAt).toISOString()}>
            {formatDate(invite.expiresAt)}
          </time>
          .
        </p>

        <AcceptButton token={token} />
      </div>
      <p className="mt-4 text-center text-xs text-ink-3">
        You are currently signed in. Accepting will grant super-admin privileges to your account.
      </p>
    </div>
  );
}
