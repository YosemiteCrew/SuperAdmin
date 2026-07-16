import 'server-only';

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

const STORE_ID = 'superadmin:crm-discord';
const KEY = 'config';

export interface DiscordConfig {
  webhookUrl: string;
  channelName: string;
  notifyOnEvents: boolean;
}

/**
 * The unconfigured config, built fresh per call. Returning one shared object
 * would hand every caller the same instance for the lifetime of the process, so
 * a single caller mutating what it got back would change what every later
 * request reads.
 */
function defaultConfig(): DiscordConfig {
  return {
    webhookUrl: '',
    channelName: '',
    notifyOnEvents: false,
  };
}

function isDiscordConfig(v: unknown): v is DiscordConfig {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.webhookUrl === 'string' && typeof r.notifyOnEvents === 'boolean';
}

export async function getDiscordConfig(): Promise<DiscordConfig> {
  const { metadata } = await UserMetadataNode.getUserMetadata(STORE_ID);
  const raw = metadata[KEY];
  return isDiscordConfig(raw) ? raw : defaultConfig();
}

export async function saveDiscordConfig(config: DiscordConfig): Promise<void> {
  await UserMetadataNode.updateUserMetadata(STORE_ID, {
    [KEY]: config,
  } as unknown as JSONObject);
}
