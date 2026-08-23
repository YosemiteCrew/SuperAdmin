import type { TikTokCreatorInfo, TikTokPostOptions, TikTokPrivacyLevel } from './types';

const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
const API_BASE = 'https://open.tiktokapis.com/v2';

/**
 * Only the scopes actually registered on the TikTok app. `user.info.stats` and
 * `video.list` (needed to read performance back) are additive — add them here
 * only once they are enabled in the developer portal, because TikTok rejects the
 * whole authorize call if it is asked for a scope the app does not hold.
 */
export const TIKTOK_SCOPES = ['user.info.basic', 'video.publish', 'video.upload'] as const;

/** TikTok answers with HTTP 200 and an error object, so failures need unwrapping. */
export class TikTokApiError extends Error {
  readonly code: string;
  readonly logId?: string;

  constructor(code: string, message: string, logId?: string) {
    super(message);
    this.name = 'TikTokApiError';
    this.code = code;
    this.logId = logId;
  }
}

export function buildAuthorizeUrl(params: {
  clientKey: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const query = new URLSearchParams({
    client_key: params.clientKey,
    scope: TIKTOK_SCOPES.join(','),
    response_type: 'code',
    redirect_uri: params.redirectUri,
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTH_URL}?${query.toString()}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(source: Record<string, unknown>, key: string, fallback = ''): string {
  const value = source[key];
  return typeof value === 'string' ? value : fallback;
}

function readNumber(source: Record<string, unknown>, key: string, fallback = 0): number {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Raises the embedded error object, which TikTok sends alongside HTTP 200. */
function throwIfApiError(payload: Record<string, unknown>): void {
  const error = asRecord(payload.error);
  const code = readString(error, 'code');
  if (code && code !== 'ok') {
    throw new TikTokApiError(code, readString(error, 'message', code), readString(error, 'log_id'));
  }
}

/**
 * Every TikTok call gets a deadline. Without one a stalled upload leaves the
 * request hanging forever - the composer sits on "Uploading..." with nothing in
 * the server log and no way to tell a slow upload from a dead one. Observed
 * exactly that during setup, which is what sent the diagnosis down the wrong
 * path. instagramPublisher already bounds its work this way; this brings TikTok
 * into line.
 */
const API_TIMEOUT_MS = 20_000;
/** Uploads carry the whole file, so they get a longer leash than the JSON calls. */
const UPLOAD_TIMEOUT_MS = 60_000;

/** Wraps fetch with an AbortSignal so a stalled peer surfaces as an error. */
async function fetchWithDeadline(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  what: string
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    // A timeout must not look like a transport blip - name it, so the operator
    // and the log both say which call ran out of time.
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new TikTokApiError('timeout', `TikTok ${what} timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

async function call(
  path: string,
  init: { token: string; body?: unknown; method?: 'GET' | 'POST' }
): Promise<Record<string, unknown>> {
  const response = await fetchWithDeadline(
    `${API_BASE}${path}`,
    {
      method: init.method ?? 'POST',
      headers: {
        Authorization: `Bearer ${init.token}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    },
    API_TIMEOUT_MS,
    path
  );
  const payload = asRecord(await response.json().catch(() => ({})));
  throwIfApiError(payload);
  if (!response.ok) {
    throw new TikTokApiError('http_error', `TikTok responded ${response.status}`);
  }
  return payload;
}

export interface TikTokTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
  openId: string;
  scope: string;
}

/** The OAuth token endpoint reports failure with a top-level `error` string. */
function parseTokenResponse(payload: Record<string, unknown>): TikTokTokenResponse {
  const error = readString(payload, 'error');
  if (error) {
    throw new TikTokApiError(error, readString(payload, 'error_description', error));
  }
  return {
    accessToken: readString(payload, 'access_token'),
    refreshToken: readString(payload, 'refresh_token'),
    expiresIn: readNumber(payload, 'expires_in'),
    refreshExpiresIn: readNumber(payload, 'refresh_expires_in'),
    openId: readString(payload, 'open_id'),
    scope: readString(payload, 'scope'),
  };
}

async function postForm(body: URLSearchParams): Promise<TikTokTokenResponse> {
  const response = await fetchWithDeadline(
    `${API_BASE}/oauth/token/`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    },
    API_TIMEOUT_MS,
    'token exchange'
  );
  return parseTokenResponse(asRecord(await response.json().catch(() => ({}))));
}

export function exchangeCode(params: {
  clientKey: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}): Promise<TikTokTokenResponse> {
  return postForm(
    new URLSearchParams({
      client_key: params.clientKey,
      client_secret: params.clientSecret,
      code: params.code,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier,
    })
  );
}

export function refreshAccessToken(params: {
  clientKey: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<TikTokTokenResponse> {
  return postForm(
    new URLSearchParams({
      client_key: params.clientKey,
      client_secret: params.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: params.refreshToken,
    })
  );
}

const KNOWN_PRIVACY: ReadonlySet<string> = new Set<TikTokPrivacyLevel>([
  'PUBLIC_TO_EVERYONE',
  'MUTUAL_FOLLOW_FRIENDS',
  'FOLLOWER_OF_CREATOR',
  'SELF_ONLY',
]);

export function isPrivacyLevel(value: unknown): value is TikTokPrivacyLevel {
  return typeof value === 'string' && KNOWN_PRIVACY.has(value);
}

/**
 * Display name for the connected account. Deliberately limited to the three
 * fields `user.info.basic` covers — asking for follower/like counts without
 * `user.info.stats` fails the entire call with `scope_not_authorized`.
 */
export async function fetchDisplayName(token: string): Promise<string> {
  const payload = await call('/user/info/?fields=open_id,display_name', {
    token,
    method: 'GET',
  });
  return readString(asRecord(asRecord(payload.data).user), 'display_name');
}

/** Mandatory pre-flight for a direct post: the account's current posting rules. */
export async function fetchCreatorInfo(token: string): Promise<TikTokCreatorInfo> {
  const payload = await call('/post/publish/creator_info/query/', { token, body: {} });
  const data = asRecord(payload.data);
  const options = Array.isArray(data.privacy_level_options) ? data.privacy_level_options : [];
  return {
    nickname: readString(data, 'creator_nickname'),
    privacyOptions: options.filter(isPrivacyLevel),
    maxVideoSeconds: readNumber(data, 'max_video_post_duration_sec'),
    commentDisabled: data.comment_disabled === true,
    duetDisabled: data.duet_disabled === true,
    stitchDisabled: data.stitch_disabled === true,
  };
}

export interface UploadTarget {
  publishId: string;
  uploadUrl: string;
}

function readUploadTarget(payload: Record<string, unknown>): UploadTarget {
  const data = asRecord(payload.data);
  return {
    publishId: readString(data, 'publish_id'),
    uploadUrl: readString(data, 'upload_url'),
  };
}

/**
 * Opens a direct-to-profile post and returns somewhere to push the bytes.
 * FILE_UPLOAD rather than PULL_FROM_URL because the latter only accepts URLs on
 * a domain verified against the TikTok app, and the clips come off Canva's CDN.
 */
export async function initDirectPost(
  token: string,
  params: { size: number; options: TikTokPostOptions }
): Promise<UploadTarget> {
  const payload = await call('/post/publish/video/init/', {
    token,
    body: {
      post_info: {
        title: params.options.title,
        privacy_level: params.options.privacy,
        disable_comment: params.options.disableComment,
        disable_duet: params.options.disableDuet,
        disable_stitch: params.options.disableStitch,
        video_cover_timestamp_ms: params.options.coverMs,
      },
      // Single chunk: the clips are a few MB, far below the chunking threshold.
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: params.size,
        chunk_size: params.size,
        total_chunk_count: 1,
      },
    },
  });
  return readUploadTarget(payload);
}

/**
 * Sends the video to the creator's TikTok inbox as a draft instead of the feed.
 * This is the path that keeps working while the app is unaudited: TikTok blocks
 * direct posting for unaudited clients, but still accepts inbox drafts.
 */
export async function initInboxDraft(
  token: string,
  params: { size: number }
): Promise<UploadTarget> {
  const payload = await call('/post/publish/inbox/video/init/', {
    token,
    body: {
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: params.size,
        chunk_size: params.size,
        total_chunk_count: 1,
      },
    },
  });
  return readUploadTarget(payload);
}

/** Pushes the whole file to the presigned URL TikTok handed back. */
export async function uploadVideoBytes(uploadUrl: string, bytes: Uint8Array): Promise<void> {
  const size = bytes.byteLength;
  const response = await fetchWithDeadline(
    uploadUrl,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(size),
        'Content-Range': `bytes 0-${size - 1}/${size}`,
      },
      // Uint8Array is a valid BodyInit; the cast satisfies the DOM lib's narrower
      // ArrayBufferView union under this TS target.
      body: bytes as unknown as BodyInit,
    },
    UPLOAD_TIMEOUT_MS,
    'upload'
  );
  if (!response.ok) {
    throw new TikTokApiError('upload_failed', `Upload failed with status ${response.status}`);
  }
}

export interface PublishStatus {
  status: string;
  failReason: string;
  postIds: string[];
}

export async function fetchPublishStatus(token: string, publishId: string): Promise<PublishStatus> {
  const payload = await call('/post/publish/status/fetch/', {
    token,
    body: { publish_id: publishId },
  });
  const data = asRecord(payload.data);
  const ids = data.publicaly_available_post_id;
  return {
    status: readString(data, 'status'),
    failReason: readString(data, 'fail_reason'),
    postIds: Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [],
  };
}
