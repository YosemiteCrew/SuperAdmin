import Link from 'next/link';

import type { TikTokConnectionSummary, TikTokCreatorInfo } from '@/app/features/social/types';

import { CARD, formatDate } from './cardStyles';
import { DisconnectButton } from './DisconnectButton';
import { PostComposer } from './PostComposer';

export function TikTokConnected({
  connection,
  creator,
}: Readonly<{ connection: TikTokConnectionSummary; creator: TikTokCreatorInfo | null }>) {
  const label = connection.displayName ? `@${connection.displayName}` : 'the TikTok account';
  return (
    <section className={CARD} aria-labelledby="tiktok-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="tiktok-heading" className="text-lg font-medium text-ink">
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
        <DisconnectButton accountLabel={label} platform="tiktok" />
      </div>

      {creator ? null : (
        <p className="mt-4 rounded-xl border border-warning-600 bg-warning-100 px-4 py-3 text-sm text-warning-800">
          TikTok did not return this account&apos;s posting rules, so only inbox drafts are offered.
          This usually clears on its own - reload in a minute.
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

export function TikTokDisconnected() {
  return (
    <section className={CARD} aria-labelledby="tiktok-heading">
      <h2 id="tiktok-heading" className="text-lg font-medium text-ink">
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

export function TikTokUnconfigured({ missing }: Readonly<{ missing: string[] }>) {
  return (
    <section className={CARD} aria-labelledby="tiktok-heading">
      <h2 id="tiktok-heading" className="text-lg font-medium text-ink">
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
        encrypts the stored credentials - changing it later forces a reconnect.
      </p>
    </section>
  );
}
