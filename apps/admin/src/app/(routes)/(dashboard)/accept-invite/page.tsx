import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { getInviteByToken } from '@/app/features/invites/store';
import { inviteStatus } from '@/app/features/invites/types';

import { AcceptButton } from './AcceptButton';

export const metadata: Metadata = {
  title: 'Accept invitation',
};

const CARD =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const CARD_TITLE =
  'font-[family-name:var(--font-serif-display)] text-[20px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]';
const BODY_COPY = 'text-[13.5px] text-[color:var(--ink-muted)]';

/** Terminal states (not found / expired / revoked / used) share one centred card. */
function StatusCard({
  title,
  message,
  capitalizeTitle = false,
}: Readonly<{ title: string; message: string; capitalizeTitle?: boolean }>) {
  return (
    <div className={`mx-auto mt-12 max-w-md p-8 text-center ${CARD}`}>
      <p className={capitalizeTitle ? `${CARD_TITLE} capitalize` : CARD_TITLE}>{title}</p>
      <p className={`mt-2 ${BODY_COPY}`}>{message}</p>
    </div>
  );
}

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
      <StatusCard
        title="Invite not found"
        message="This link is invalid or has already been used."
      />
    );
  }

  const status = inviteStatus(invite);

  if (status !== 'pending') {
    const messages: Record<Exclude<typeof status, 'pending'>, string> = {
      expired: 'This invite link has expired. Ask a super-admin to generate a new one.',
      revoked: 'This invite link has been revoked.',
      used: 'This invite has already been accepted.',
    };
    return <StatusCard title={status} message={messages[status]} capitalizeTitle />;
  }

  return (
    <div className="mx-auto mt-12 max-w-md">
      <div className={`p-8 ${CARD}`}>
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          You&apos;re invited
        </h1>
        <p className={`mt-2 ${BODY_COPY}`}>
          <strong className="font-semibold text-[color:var(--ink)]">{invite.createdByEmail}</strong>{' '}
          has invited{' '}
          <strong className="font-semibold text-[color:var(--ink)]">{invite.email}</strong> to
          become a Super Admin.
        </p>
        <p className="mt-1 text-[12px] text-[color:var(--ink-faint)]">
          This link expires{' '}
          <time dateTime={new Date(invite.expiresAt).toISOString()}>
            {formatDate(invite.expiresAt)}
          </time>
          .
        </p>

        <AcceptButton token={token} />
      </div>
      <p className="mt-4 text-center text-[12px] text-[color:var(--ink-faint)]">
        You are currently signed in. Accepting will grant super-admin privileges to your account.
      </p>
    </div>
  );
}
