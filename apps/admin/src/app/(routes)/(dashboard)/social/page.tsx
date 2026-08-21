import type { Metadata } from 'next';
import Link from 'next/link';

import { requireSuperAdmin } from '@/app/config/backend';
import { getSocialConfig, missingSocialEnv } from '@/app/features/social/config';
import { readConnection, toSummary } from '@/app/features/social/store';
import { fetchCreatorInfo } from '@/app/features/social/tiktok';
import type { TikTokCreatorInfo, TikTokConnectionSummary } from '@/app/features/social/types';

import { DisconnectButton } from './DisconnectButton';
import { PostComposer } from './PostComposer';

export const metadata: Metadata = {
  title: 'Social',
};

const CARD =
  'rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]';

const CALLBACK_ERRORS: Record<string, string> = {
  unconfigured: 'TikTok posting is not configured on this host.',
  missing_code: 'TikTok did not return an authorization code. Try connecting again.',
  state_mismatch: 'That sign-in link had expired. Start the connection again.',
  exchange_failed: 'TikTok rejected the authorization. Check the app credentials and retry.',
  access_denied: 'The connection was cancelled at TikTok.',
};

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

function ConnectedCard({
  connection,
  creator,
}: Readonly<{ connection: TikTokConnectionSummary; creator: TikTokCreatorInfo | null }>) {
  const label = connection.displayName ? `@${connection.displayName}` : 'the TikTok account';
  return (
    <section className={CARD} aria-labelledby="connection-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="connection-heading" className="text-lg font-medium text-ink">
            TikTok
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Connected as <span className="font-medium text-ink">{label}</span> by{' '}
            {connection.connectedByEmail} on {formatDate(connection.connectedAt)}.
          </p>
          <p className="mt-1 text-sm text-ink-3">
            Access token renews automatically; the connection itself expires{' '}
            {formatDate(connection.refreshExpiresAt)}.
          </p>
        </div>
        <DisconnectButton accountLabel={label} />
      </div>

      {creator ? null : (
        <p className="mt-4 rounded-xl border border-warning-600 bg-warning-100 px-4 py-3 text-sm text-warning-800">
          TikTok did not return this account&apos;s posting rules, so only inbox drafts are offered.
          This usually clears on its own — reload in a minute.
        </p>
      )}

      <div className="mt-6 border-t border-line pt-6">
        <h3 className="text-sm font-medium text-ink">New post</h3>
        <PostComposer
          privacyOptions={creator?.privacyOptions ?? []}
          commentDisabled={creator?.commentDisabled ?? false}
          duetDisabled={creator?.duetDisabled ?? false}
          stitchDisabled={creator?.stitchDisabled ?? false}
        />
      </div>
    </section>
  );
}

function DisconnectedCard() {
  return (
    <section className={CARD} aria-labelledby="connection-heading">
      <h2 id="connection-heading" className="text-lg font-medium text-ink">
        TikTok
      </h2>
      <p className="mt-1 mb-4 text-sm text-ink-3">
        Not connected. Authorize the Yosemite Crew TikTok account to post from here. The credentials
        are encrypted before they are stored and never leave the server.
      </p>
      {/* A plain link, not fetch: the flow ends in a redirect to tiktok.com. */}
      <Link
        href="/api/social/tiktok/connect"
        prefetch={false}
        className="yc-primary-button inline-flex items-center justify-center rounded-xl border-[1.5px] border-btn bg-btn px-5 py-2.5 text-sm font-medium text-btn-ink transition-opacity hover:opacity-90"
      >
        Connect TikTok
      </Link>
    </section>
  );
}

function UnconfiguredCard({ missing }: Readonly<{ missing: string[] }>) {
  return (
    <section className={CARD} aria-labelledby="connection-heading">
      <h2 id="connection-heading" className="text-lg font-medium text-ink">
        TikTok
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        Posting is not configured on this host. Set the following environment variables and restart
        the panel:
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {missing.map((name) => (
          <li key={name} className="font-mono text-sm text-ink-2">
            {name}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-3">
        Generate the token key with <span className="font-mono">openssl rand -hex 32</span>. It
        encrypts the stored credentials — changing it later forces a reconnect.
      </p>
    </section>
  );
}

export default async function SocialPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  await requireSuperAdmin();
  const params = await searchParams;
  const rawError = params.error;
  const errorKey = Array.isArray(rawError) ? rawError[0] : rawError;
  const connected = params.connected === '1';

  const config = getSocialConfig();
  const connection = config ? await readConnection(config) : null;
  const creator = connection
    ? await fetchCreatorInfo(connection.accessToken).catch(() => null)
    : null;

  function renderCard() {
    if (!config) return <UnconfiguredCard missing={missingSocialEnv()} />;
    if (!connection) return <DisconnectedCard />;
    return <ConnectedCard connection={toSummary(connection)} creator={creator} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header>
        <h1 className="text-2xl font-medium tracking-tight text-ink">Social</h1>
        <p className="mt-1 text-sm text-ink-3">
          Post to the Yosemite Crew social accounts. Every post is recorded in the{' '}
          <Link href="/audit" className="yc-auth-link-brand">
            audit log
          </Link>
          .
        </p>
      </header>

      {errorKey ? (
        <p
          role="alert"
          className="rounded-xl border border-danger-600 bg-danger-100 px-4 py-3 text-sm text-danger-700"
        >
          {CALLBACK_ERRORS[errorKey] ?? `TikTok returned an error: ${errorKey}`}
        </p>
      ) : null}

      {connected ? (
        <p
          role="status"
          className="rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink-2"
        >
          TikTok connected.
        </p>
      ) : null}

      {renderCard()}
    </div>
  );
}
