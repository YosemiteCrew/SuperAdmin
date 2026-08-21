/**
 * Posting limits and the mode enum, kept in a leaf module with no server-only
 * imports so both the request parser and the browser-side composer can use them
 * without dragging the publish path (and SuperTokens with it) along.
 */

/** Where a post lands: the profile itself, or the creator's TikTok inbox. */
export type PostMode = 'direct' | 'draft';

/** Comfortably above a 1080x1920 meme clip, far below TikTok's own ceiling. */
export const MAX_VIDEO_BYTES = 64 * 1024 * 1024;

/** TikTok's caption limit. */
export const MAX_TITLE_LENGTH = 2200;
