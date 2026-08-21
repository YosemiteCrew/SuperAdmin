import 'server-only';

import UserMetadataNode from 'supertokens-node/recipe/usermetadata';
import type { JSONObject } from 'supertokens-node/types';

import { ensureSuperTokensInit } from '@/app/config/backend';
import { logger } from '@/app/lib/logger';

import type { InstagramConfig, TikTokConfig } from './config';
import { refreshLongLived } from './instagram';
import { seal, unseal } from './secrets';
import { refreshAccessToken } from './tiktok';
import type {
  InstagramConnection,
  InstagramConnectionSummary,
  TikTokConnection,
  TikTokConnectionSummary,
} from './types';

// Like the audit log, the connection lives in SuperTokens UserMetadata under a
// reserved non-user id — UserMetadata does not require the id to belong to a real
// user, which keeps the panel free of a second datastore. The value is a sealed
// blob, never readable JSON: see secrets.ts for why.
const SOCIAL_STORE_ID = 'superadmin:social-poster';
const TIKTOK_KEY = 'tiktok';
const INSTAGRAM_KEY = 'instagram';

/** Refresh this far ahead of expiry so a post never races the deadline. */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

function isConnection(value: unknown): value is TikTokConnection {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.openId === 'string' &&
    typeof c.accessToken === 'string' &&
    typeof c.refreshToken === 'string' &&
    typeof c.expiresAt === 'number' &&
    typeof c.refreshExpiresAt === 'number'
  );
}

async function readSealed(key: string): Promise<string | null> {
  ensureSuperTokensInit();
  const { metadata } = await UserMetadataNode.getUserMetadata(SOCIAL_STORE_ID);
  const raw = metadata[key];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

async function writeSealed(key: string, sealed: string | null): Promise<void> {
  ensureSuperTokensInit();
  // updateUserMetadata merges at the root, so writing this one key leaves any
  // other key in this store untouched - which is exactly what keeps the TikTok
  // and Instagram connections from clobbering each other. null clears it.
  await UserMetadataNode.updateUserMetadata(SOCIAL_STORE_ID, {
    [key]: sealed,
  } as unknown as JSONObject);
}

/** The stored connection, or null when absent, unsealable or malformed. */
export async function readConnection(config: TikTokConfig): Promise<TikTokConnection | null> {
  try {
    const sealed = await readSealed(TIKTOK_KEY);
    if (!sealed) return null;
    const plaintext = unseal(sealed, config.tokenKey);
    if (!plaintext) {
      // Almost always means SOCIAL_TOKEN_KEY was rotated or changed. There is no
      // recovery beyond reconnecting, so surface it rather than failing silently.
      logger.warn('Stored TikTok connection could not be decrypted; reconnect required');
      return null;
    }
    const parsed: unknown = JSON.parse(plaintext);
    return isConnection(parsed) ? parsed : null;
  } catch (error) {
    logger.error('Failed to read TikTok connection', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function writeConnection(
  config: TikTokConfig,
  connection: TikTokConnection
): Promise<void> {
  await writeSealed(TIKTOK_KEY, seal(JSON.stringify(connection), config.tokenKey));
}

export async function clearConnection(): Promise<void> {
  await writeSealed(TIKTOK_KEY, null);
}

/**
 * Strips the secrets so the connection can cross into a client component. Built
 * field-by-field rather than by omitting keys, so a field added to
 * TikTokConnection later has to be named here before it can ever be serialised
 * to the browser.
 */
export function toSummary(connection: TikTokConnection): TikTokConnectionSummary {
  return {
    openId: connection.openId,
    displayName: connection.displayName,
    scope: connection.scope,
    expiresAt: connection.expiresAt,
    refreshExpiresAt: connection.refreshExpiresAt,
    connectedAt: connection.connectedAt,
    connectedByEmail: connection.connectedByEmail,
  };
}

/**
 * A connection whose access token is valid right now, refreshing and persisting
 * it first if it is close to expiry. Returns null when there is no connection or
 * the refresh token itself has expired — both mean the admin must reconnect.
 */
export async function getUsableConnection(
  config: TikTokConfig,
  now = Date.now()
): Promise<TikTokConnection | null> {
  const connection = await readConnection(config);
  if (!connection) return null;
  if (connection.expiresAt - now > REFRESH_MARGIN_MS) return connection;
  if (connection.refreshExpiresAt <= now) {
    logger.warn('TikTok refresh token has expired; reconnect required');
    return null;
  }

  try {
    const tokens = await refreshAccessToken({
      clientKey: config.clientKey,
      clientSecret: config.clientSecret,
      refreshToken: connection.refreshToken,
    });
    const refreshed: TikTokConnection = {
      ...connection,
      accessToken: tokens.accessToken,
      // TikTok rotates the refresh token on every refresh; keeping the old one
      // would strand the connection at the next renewal.
      refreshToken: tokens.refreshToken || connection.refreshToken,
      expiresAt: now + tokens.expiresIn * 1000,
      refreshExpiresAt: now + tokens.refreshExpiresIn * 1000,
      scope: tokens.scope || connection.scope,
    };
    await writeConnection(config, refreshed);
    return refreshed;
  } catch (error) {
    logger.error('Failed to refresh the TikTok access token', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/** Refresh this far ahead of the 60-day expiry so a schedule never races it. */
const INSTAGRAM_REFRESH_MARGIN_MS = 7 * 24 * 60 * 60 * 1000;

function isInstagramConnection(value: unknown): value is InstagramConnection {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.userId === 'string' &&
    typeof c.username === 'string' &&
    typeof c.accessToken === 'string' &&
    typeof c.expiresAt === 'number'
  );
}

/** The stored Instagram connection, or null when absent, unsealable or malformed. */
export async function readInstagramConnection(
  config: InstagramConfig
): Promise<InstagramConnection | null> {
  try {
    const sealed = await readSealed(INSTAGRAM_KEY);
    if (!sealed) return null;
    const plaintext = unseal(sealed, config.tokenKey);
    if (!plaintext) {
      logger.warn('Stored Instagram connection could not be decrypted; reconnect required');
      return null;
    }
    const parsed: unknown = JSON.parse(plaintext);
    return isInstagramConnection(parsed) ? parsed : null;
  } catch (error) {
    logger.error('Failed to read Instagram connection', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function writeInstagramConnection(
  config: InstagramConfig,
  connection: InstagramConnection
): Promise<void> {
  await writeSealed(INSTAGRAM_KEY, seal(JSON.stringify(connection), config.tokenKey));
}

export async function clearInstagramConnection(): Promise<void> {
  await writeSealed(INSTAGRAM_KEY, null);
}

/** Built field-by-field so a new secret cannot reach the browser by accident. */
export function toInstagramSummary(connection: InstagramConnection): InstagramConnectionSummary {
  return {
    userId: connection.userId,
    username: connection.username,
    expiresAt: connection.expiresAt,
    connectedAt: connection.connectedAt,
    connectedByEmail: connection.connectedByEmail,
  };
}

/**
 * An Instagram token that is valid right now. Unlike TikTok there is no refresh
 * token: a long-lived token renews ITSELF while still valid, so once it lapses
 * there is nothing to renew from and the admin has to reconnect. That is why the
 * margin here is a week rather than five minutes.
 */
export async function getUsableInstagramConnection(
  config: InstagramConfig,
  now = Date.now()
): Promise<InstagramConnection | null> {
  const connection = await readInstagramConnection(config);
  if (!connection) return null;
  if (connection.expiresAt - now > INSTAGRAM_REFRESH_MARGIN_MS) return connection;
  if (connection.expiresAt <= now) {
    logger.warn('Instagram token has expired; reconnect required');
    return null;
  }

  try {
    const tokens = await refreshLongLived(connection.accessToken);
    const refreshed: InstagramConnection = {
      ...connection,
      accessToken: tokens.accessToken || connection.accessToken,
      expiresAt: now + tokens.expiresIn * 1000,
    };
    await writeInstagramConnection(config, refreshed);
    return refreshed;
  } catch (error) {
    logger.error('Failed to refresh the Instagram access token', {
      error: error instanceof Error ? error.message : String(error),
    });
    // The existing token is still valid for up to the margin, so the caller can
    // keep posting today even though renewal failed.
    return connection;
  }
}
