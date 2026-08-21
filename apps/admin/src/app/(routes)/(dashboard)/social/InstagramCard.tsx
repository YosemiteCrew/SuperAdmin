import Link from 'next/link';

import type { InstagramConnectionSummary } from '@/app/features/social/types';

import { CARD, formatDate } from './cardStyles';
import { DisconnectButton } from './DisconnectButton';
import { InstagramComposer } from './InstagramComposer';

export function InstagramConnected({
  connection,
  limit,
}: Readonly<{
  connection: InstagramConnectionSummary;
  limit: { used: number; cap: number } | null;
}>) {
  const label = connection.username ? `@${connection.username}` : 'the Instagram account';
  return (
    <section className={CARD} aria-labelledby="instagram-heading">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="instagram-heading" className="text-lg font-medium text-ink">
            Instagram
          </h2>
          <p className="mt-1 text-sm text-ink-3">
            Connected as <span className="font-medium text-ink">{label}</span> by{' '}
            {connection.connectedByEmail} on {formatDate(connection.connectedAt)}.
          </p>
          <p className="mt-1 text-sm text-ink-3">
            The token renews itself in the background and lapses {formatDate(connection.expiresAt)}{' '}
            if it ever stops being used.
          </p>
          {limit ? (
            <p className="mt-1 text-sm text-ink-3">
              {limit.used} of {limit.cap} posts used in the last 24 hours.
            </p>
          ) : null}
        </div>
        <DisconnectButton accountLabel={label} platform="instagram" />
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <h3 className="text-sm font-medium text-ink">New Reel</h3>
        <InstagramComposer />
      </div>
    </section>
  );
}

export function InstagramDisconnected() {
  return (
    <section className={CARD} aria-labelledby="instagram-heading">
      <h2 id="instagram-heading" className="text-lg font-medium text-ink">
        Instagram
      </h2>
      <p className="mt-1 mb-4 text-sm text-ink-3">
        Not connected. Authorize the Yosemite Crew Instagram account to post Reels from here. The
        credentials are encrypted before they are stored and never leave the server.
      </p>
      <Link
        href="/api/social/instagram/connect"
        prefetch={false}
        className="yc-primary-button inline-flex items-center justify-center rounded-xl border-[1.5px] border-btn bg-btn px-5 py-2.5 text-sm font-medium text-btn-ink transition-opacity hover:opacity-90"
      >
        Connect Instagram
      </Link>
    </section>
  );
}

export function InstagramUnconfigured({ missing }: Readonly<{ missing: string[] }>) {
  return (
    <section className={CARD} aria-labelledby="instagram-heading">
      <h2 id="instagram-heading" className="text-lg font-medium text-ink">
        Instagram
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        Posting is not configured on this host. Set the following and restart the panel:
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        {missing.map((name) => (
          <li key={name} className="font-mono text-sm text-ink-2">
            {name}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-3">
        The app id and secret come from the Meta app&apos;s Instagram use case, under{' '}
        <span className="font-mono">API setup with Instagram login</span> - they are the Instagram
        app id, not the Meta app id.
      </p>
    </section>
  );
}
