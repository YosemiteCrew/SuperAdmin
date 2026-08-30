import type { InstagramProfile } from './types';

const AUTH_URL = 'https://www.instagram.com/oauth/authorize';
const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
const GRAPH = 'https://graph.instagram.com';
const GRAPH_VERSION = 'v23.0';
const FORM_CONTENT_TYPE = 'application/x-www-form-urlencoded';
const ACCOUNT_ID = 'account id';

/**
 * Least privilege: basic identifies the account, content_publish posts. The
 * comment and message scopes the dashboard offers are deliberately NOT here -
 * the panel only publishes, and asking for inbox access it never uses would be
 * a much larger grant to hold against the company account.
 */
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];

/** Instagram reports failures as an `error` object, sometimes with HTTP 200. */
export class InstagramApiError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'InstagramApiError';
    this.code = code;
  }
}

export function buildAuthorizeUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.appId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: INSTAGRAM_SCOPES.join(','),
    state: params.state,
  });
  return `${AUTH_URL}?${query.toString()}`;
}

/**
 * Graph ids - account ids and container ids alike - are numeric. Every id that
 * reaches a URL path goes through here, so none of them can add a path segment
 * or a host to a request we make. This matters most for container ids, which
 * arrive as request input on the finish endpoint rather than from our own store.
 */
function safeGraphId(value: string, kind: string): string {
  if (!/^\d+$/.test(value)) {
    throw new InstagramApiError('invalid_graph_id', `Instagram ${kind} is not numeric`);
  }
  return value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function readString(source: Record<string, unknown>, key: string, fallback = ''): string {
  const value = source[key];
  if (typeof value === 'string') return value;
  // user_id comes back as a number on the token endpoint and a string on /me.
  if (typeof value === 'number') return String(value);
  return fallback;
}

function readNumber(source: Record<string, unknown>, key: string, fallback = 0): number {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function throwIfError(payload: Record<string, unknown>): void {
  const error = asRecord(payload.error);
  if (Object.keys(error).length > 0) {
    const code = readString(error, 'type', 'instagram_error');
    throw new InstagramApiError(code, readString(error, 'message', code));
  }

  // The OAuth endpoints (/oauth/access_token, ig_exchange_token) do NOT use the
  // Graph API's nested `error` object - they return a FLAT body:
  //   { error_type: 'OAuthException', code: 400, error_message: 'Invalid client_secret' }
  // Without this branch that shape falls through to the bare "responded 400"
  // below, which is what made a wrong app secret indistinguishable from a
  // redirect-uri mismatch during setup.
  const flatMessage = readString(payload, 'error_message');
  if (flatMessage) {
    throw new InstagramApiError(readString(payload, 'error_type', 'instagram_error'), flatMessage);
  }
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const payload = asRecord(await response.json().catch(() => ({})));
  throwIfError(payload);
  if (!response.ok) {
    throw new InstagramApiError('http_error', `Instagram responded ${response.status}`);
  }
  return payload;
}

export interface InstagramTokens {
  accessToken: string;
  userId: string;
  /** Seconds until expiry. Short-lived tokens do not report one. */
  expiresIn: number;
}

/** Exchanges the OAuth code for a SHORT-lived token (about one hour). */
export async function exchangeCode(params: {
  appId: string;
  appSecret: string;
  code: string;
  redirectUri: string;
}): Promise<InstagramTokens> {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': FORM_CONTENT_TYPE },
    body: new URLSearchParams({
      client_id: params.appId,
      client_secret: params.appSecret,
      grant_type: 'authorization_code',
      redirect_uri: params.redirectUri,
      // Instagram returns the code URL-encoded and rejects the trailing #_ it
      // sometimes appends to the redirect.
      code: params.code.replace(/#_$/, ''),
    }),
  });
  const payload = await readJson(response);
  return {
    accessToken: readString(payload, 'access_token'),
    userId: readString(payload, 'user_id'),
    expiresIn: readNumber(payload, 'expires_in'),
  };
}

/**
 * Trades the one-hour token for a 60-day one. Every stored Instagram credential
 * must go through this - a short-lived token would strand the connection within
 * the hour, long before any schedule ran.
 */
export async function exchangeForLongLived(params: {
  appSecret: string;
  accessToken: string;
}): Promise<InstagramTokens> {
  const query = new URLSearchParams({
    grant_type: 'ig_exchange_token',
    client_secret: params.appSecret,
    access_token: params.accessToken,
  });
  const payload = await readJson(await fetch(`${GRAPH}/access_token?${query.toString()}`));
  return {
    accessToken: readString(payload, 'access_token'),
    userId: '',
    expiresIn: readNumber(payload, 'expires_in'),
  };
}

/** Extends a long-lived token. Only works while the current one is still valid. */
export async function refreshLongLived(accessToken: string): Promise<InstagramTokens> {
  const query = new URLSearchParams({
    grant_type: 'ig_refresh_token',
    access_token: accessToken,
  });
  const payload = await readJson(await fetch(`${GRAPH}/refresh_access_token?${query.toString()}`));
  return {
    accessToken: readString(payload, 'access_token'),
    userId: '',
    expiresIn: readNumber(payload, 'expires_in'),
  };
}

export async function fetchProfile(accessToken: string): Promise<InstagramProfile> {
  const query = new URLSearchParams({
    fields: 'user_id,username',
    access_token: accessToken,
  });
  const payload = await readJson(await fetch(`${GRAPH}/${GRAPH_VERSION}/me?${query.toString()}`));
  return {
    userId: readString(payload, 'user_id'),
    username: readString(payload, 'username'),
  };
}

export interface ReelUploadTarget {
  containerId: string;
  uploadUri: string;
}

/**
 * Opens a Reels container in resumable mode, which is what lets the panel push
 * raw bytes. The default `video_url` mode would require the MP4 to be reachable
 * on a public URL first, and the panel has nowhere to host one.
 */
export async function createResumableReel(params: {
  accessToken: string;
  igUserId: string;
  caption: string;
  shareToFeed: boolean;
}): Promise<ReelUploadTarget> {
  const body = new URLSearchParams({
    media_type: 'REELS',
    upload_type: 'resumable',
    caption: params.caption,
    share_to_feed: String(params.shareToFeed),
    access_token: params.accessToken,
  });
  const payload = await readJson(
    await fetch(`${GRAPH}/${GRAPH_VERSION}/${safeGraphId(params.igUserId, ACCOUNT_ID)}/media`, {
      method: 'POST',
      headers: { 'Content-Type': FORM_CONTENT_TYPE },
      body,
    })
  );
  return {
    containerId: readString(payload, 'id'),
    uploadUri: readString(payload, 'uri'),
  };
}

/**
 * Opens a Reels container from a public video_url. This is the ONLY container
 * mode graph.instagram.com (Instagram Login) supports for Reels: resumable byte
 * upload is Facebook-Login-for-Business only, so an Instagram-Login app answers
 * `{"error":"The parameter video_url is required"}`. Instagram fetches ("cURLs")
 * the URL server-side, so it must be public HTTPS and stay reachable until the
 * container finishes transcoding. Returns the container id to publish.
 */
export async function createReelFromUrl(params: {
  accessToken: string;
  igUserId: string;
  videoUrl: string;
  caption: string;
  shareToFeed: boolean;
}): Promise<string> {
  const body = new URLSearchParams({
    media_type: 'REELS',
    video_url: params.videoUrl,
    caption: params.caption,
    share_to_feed: String(params.shareToFeed),
    access_token: params.accessToken,
  });
  const payload = await readJson(
    await fetch(`${GRAPH}/${GRAPH_VERSION}/${safeGraphId(params.igUserId, ACCOUNT_ID)}/media`, {
      method: 'POST',
      headers: { 'Content-Type': FORM_CONTENT_TYPE },
      body,
    })
  );
  return readString(payload, 'id');
}

/** Pushes the whole file to the rupload endpoint the container handed back. */
export async function uploadReelBytes(params: {
  uploadUri: string;
  accessToken: string;
  bytes: Uint8Array;
}): Promise<void> {
  const size = params.bytes.byteLength;
  const response = await fetch(params.uploadUri, {
    method: 'POST',
    headers: {
      // Instagram wants the OAuth scheme here, not Bearer.
      Authorization: `OAuth ${params.accessToken}`,
      offset: '0',
      file_size: String(size),
      'Content-Type': 'application/octet-stream',
    },
    body: params.bytes as unknown as BodyInit,
  });
  if (!response.ok) {
    throw new InstagramApiError('upload_failed', `Upload failed with status ${response.status}`);
  }
}

export interface ContainerStatus {
  statusCode: string;
  error: string;
}

/** FINISHED means ready to publish; IN_PROGRESS means keep waiting. */
export async function fetchContainerStatus(params: {
  accessToken: string;
  containerId: string;
}): Promise<ContainerStatus> {
  const query = new URLSearchParams({
    fields: 'status_code,status',
    access_token: params.accessToken,
  });
  const payload = await readJson(
    await fetch(
      `${GRAPH}/${GRAPH_VERSION}/${safeGraphId(params.containerId, 'container id')}?${query.toString()}`
    )
  );
  return {
    statusCode: readString(payload, 'status_code'),
    error: readString(payload, 'status'),
  };
}

export async function publishContainer(params: {
  accessToken: string;
  igUserId: string;
  containerId: string;
}): Promise<string> {
  const payload = await readJson(
    await fetch(
      `${GRAPH}/${GRAPH_VERSION}/${safeGraphId(params.igUserId, ACCOUNT_ID)}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': FORM_CONTENT_TYPE },
        body: new URLSearchParams({
          creation_id: params.containerId,
          access_token: params.accessToken,
        }),
      }
    )
  );
  return readString(payload, 'id');
}

/** Instagram caps publishes per rolling 24h; worth surfacing before a schedule runs. */
export async function fetchPublishingLimit(params: {
  accessToken: string;
  igUserId: string;
}): Promise<{ used: number; cap: number }> {
  const query = new URLSearchParams({
    fields: 'config,quota_usage',
    access_token: params.accessToken,
  });
  const payload = await readJson(
    await fetch(
      `${GRAPH}/${GRAPH_VERSION}/${safeGraphId(params.igUserId, ACCOUNT_ID)}/content_publishing_limit?${query.toString()}`
    )
  );
  const first = asRecord(Array.isArray(payload.data) ? payload.data[0] : {});
  return {
    used: readNumber(first, 'quota_usage'),
    cap: readNumber(asRecord(first.config), 'quota_total', 50),
  };
}
