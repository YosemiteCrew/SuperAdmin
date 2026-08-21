/** Networks the poster can hold a connection for. */
export type SocialPlatform = 'tiktok' | 'instagram';

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

/** Identity of the connected Instagram professional account. */
export interface InstagramProfile {
  userId: string;
  username: string;
}

/** A stored Instagram connection, including its secret. Never send to a client. */
export interface InstagramConnection {
  userId: string;
  username: string;
  accessToken: string;
  /**
   * Epoch ms after which the long-lived token stops working (~60 days). There is
   * no refresh token: the token refreshes ITSELF while still valid, so letting
   * this lapse means a full reconnect.
   */
  expiresAt: number;
  connectedAt: number;
  connectedByEmail: string;
}

/** The connection minus its secret - this is what the UI is allowed to see. */
export type InstagramConnectionSummary = Omit<InstagramConnection, 'accessToken'>;

/** Caption and placement for a single Reel. */
export interface InstagramPostOptions {
  caption: string;
  /** Reels also appear on the main profile grid when true. */
  shareToFeed: boolean;
}
