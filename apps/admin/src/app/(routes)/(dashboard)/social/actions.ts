'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { recordAuditEvent } from '@/app/features/audit/store';
import { getInstagramConfig, getTikTokConfig } from '@/app/features/social/config';
import {
  clearConnection,
  clearInstagramConnection,
  readConnection,
  readInstagramConnection,
} from '@/app/features/social/store';

export interface DisconnectResult {
  ok: boolean;
  message: string;
}

/** The per-network pieces of an otherwise identical disconnect. */
interface DisconnectSpec<TConfig> {
  network: string;
  loadConfig: () => TConfig | null;
  /** Read before clearing, so the audit entry can name what was disconnected. */
  read: (config: TConfig) => Promise<{ id: string; handle: string } | null>;
  clear: () => Promise<void>;
}

async function disconnect<TConfig>(spec: DisconnectSpec<TConfig>): Promise<DisconnectResult> {
  const { userId } = await requireSuperAdmin();
  const config = spec.loadConfig();
  if (!config) {
    return { ok: false, message: `${spec.network} posting is not configured on this host.` };
  }

  const existing = await spec.read(config);
  await spec.clear();
  const slug = spec.network.toLowerCase();
  await recordAuditEvent({
    action: 'social.disconnect',
    actorId: userId,
    targetType: 'social_account',
    targetId: existing ? `${slug}:${existing.id}` : slug,
    targetLabel: existing?.handle ? `${spec.network} @${existing.handle}` : spec.network,
  });

  revalidatePath('/social');
  return { ok: true, message: `${spec.network} has been disconnected.` };
}

/**
 * Forgets the stored TikTok credentials. TikTok has no token-revocation endpoint
 * on this app's scopes, so this drops our copy - the grant itself is withdrawn by
 * the account owner in TikTok's own settings. The same is true of Instagram.
 */
export async function disconnectTikTokAction(): Promise<DisconnectResult> {
  return disconnect({
    network: 'TikTok',
    loadConfig: getTikTokConfig,
    read: async (config) => {
      const connection = await readConnection(config);
      return connection && { id: connection.openId, handle: connection.displayName };
    },
    clear: clearConnection,
  });
}

export async function disconnectInstagramAction(): Promise<DisconnectResult> {
  return disconnect({
    network: 'Instagram',
    loadConfig: getInstagramConfig,
    read: async (config) => {
      const connection = await readInstagramConnection(config);
      return connection && { id: connection.userId, handle: connection.username };
    },
    clear: clearInstagramConnection,
  });
}
