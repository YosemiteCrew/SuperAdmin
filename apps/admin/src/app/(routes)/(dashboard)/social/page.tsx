import type { Metadata } from 'next';
import Link from 'next/link';

import { requireSuperAdmin } from '@/app/config/backend';
import {
  getInstagramConfig,
  getTikTokConfig,
  missingInstagramEnv,
  missingTikTokEnv,
} from '@/app/features/social/config';
import { fetchPublishingLimit } from '@/app/features/social/instagram';
import {
  readConnection,
  readInstagramConnection,
  toInstagramSummary,
  toSummary,
} from '@/app/features/social/store';
import { fetchCreatorInfo } from '@/app/features/social/tiktok';

import { InstagramConnected, InstagramDisconnected, InstagramUnconfigured } from './InstagramCard';
import { TikTokConnected, TikTokDisconnected, TikTokUnconfigured } from './TikTokCard';

export const metadata: Metadata = {
  title: 'Social',
};

const CALLBACK_ERRORS: Record<string, string> = {
  unconfigured: 'That network is not configured on this host.',
  missing_code: 'The network did not return an authorization code. Try connecting again.',
  state_mismatch: 'That sign-in link had expired. Start the connection again.',
  exchange_failed: 'The network rejected the authorization. Check the app credentials and retry.',
  access_denied: 'The connection was cancelled.',
  token_without_lifetime:
    'TikTok returned a token that had already expired. Authorize again and approve the permissions on the TikTok page.',
};

/** Reads the TikTok side of the page, tolerating an unconfigured host. */
async function loadTikTok() {
  const config = getTikTokConfig();
  if (!config) return { kind: 'unconfigured' as const, missing: missingTikTokEnv() };
  const connection = await readConnection(config);
  if (!connection) return { kind: 'disconnected' as const };
  const creator = await fetchCreatorInfo(connection.accessToken).catch(() => null);
  return { kind: 'connected' as const, connection: toSummary(connection), creator };
}

async function loadInstagram() {
  const config = getInstagramConfig();
  if (!config) return { kind: 'unconfigured' as const, missing: missingInstagramEnv() };
  const connection = await readInstagramConnection(config);
  if (!connection) return { kind: 'disconnected' as const };
  const limit = await fetchPublishingLimit({
    accessToken: connection.accessToken,
    igUserId: connection.userId,
  }).catch(() => null);
  return { kind: 'connected' as const, connection: toInstagramSummary(connection), limit };
}

function renderTikTok(state: Awaited<ReturnType<typeof loadTikTok>>) {
  if (state.kind === 'unconfigured') return <TikTokUnconfigured missing={state.missing} />;
  if (state.kind === 'disconnected') return <TikTokDisconnected />;
  return <TikTokConnected connection={state.connection} creator={state.creator} />;
}

function renderInstagram(state: Awaited<ReturnType<typeof loadInstagram>>) {
  if (state.kind === 'unconfigured') return <InstagramUnconfigured missing={state.missing} />;
  if (state.kind === 'disconnected') return <InstagramDisconnected />;
  return <InstagramConnected connection={state.connection} limit={state.limit} />;
}

export default async function SocialPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  await requireSuperAdmin();
  const params = await searchParams;
  const rawError = params.error;
  const errorKey = Array.isArray(rawError) ? rawError[0] : rawError;
  const connected = Array.isArray(params.connected) ? params.connected[0] : params.connected;

  // Both networks load independently so one being down cannot blank the other.
  const [tiktok, instagram] = await Promise.all([loadTikTok(), loadInstagram()]);

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
          {CALLBACK_ERRORS[errorKey] ?? `The network returned an error: ${errorKey}`}
        </p>
      ) : null}

      {connected ? (
        <p
          role="status"
          className="rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink-2"
        >
          {connected === 'instagram' ? 'Instagram connected.' : 'TikTok connected.'}
        </p>
      ) : null}

      {renderTikTok(tiktok)}
      {renderInstagram(instagram)}
    </div>
  );
}
