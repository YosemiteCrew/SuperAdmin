/** Networks the poster can hold a connection for. Instagram follows TikTok. */
export type SocialPlatform = 'tiktok';

/**
 * Audience settings TikTok accepts on a post. The account's *allowed* subset is
 * returned per-creator by `creator_info` and must be honoured — an unaudited app
 * is restricted to SELF_ONLY until TikTok approves it.
 */
export type TikTokPrivacyLevel =
  'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'FOLLOWER_OF_CREATOR' | 'SELF_ONLY';

/** A stored TikTok connection, including its secrets. Never send to a client. */
export interface TikTokConnection {
  openId: string;
  displayName: string;
  scope: string;
  accessToken: string;
  refreshToken: string;
  /** Epoch ms after which the access token stops working (~24h from issue). */
  expiresAt: number;
  /** Epoch ms after which the refresh token itself expires (~365d from issue). */
  refreshExpiresAt: number;
  connectedAt: number;
  connectedByEmail: string;
}

/** The connection minus its secrets — this is what the UI is allowed to see. */
export type TikTokConnectionSummary = Omit<TikTokConnection, 'accessToken' | 'refreshToken'>;

/** Per-account posting rules, queried immediately before every post. */
export interface TikTokCreatorInfo {
  nickname: string;
  privacyOptions: TikTokPrivacyLevel[];
  maxVideoSeconds: number;
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
}

/** Caption and interaction settings for a single post. */
export interface TikTokPostOptions {
  title: string;
  privacy: TikTokPrivacyLevel;
  disableComment: boolean;
  disableDuet: boolean;
  disableStitch: boolean;
  coverMs: number;
}

/** What the panel renders: either configured-and-connected, or why not. */
export type SocialConnectionState =
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'disconnected' }
  | { status: 'connected'; connection: TikTokConnectionSummary };
