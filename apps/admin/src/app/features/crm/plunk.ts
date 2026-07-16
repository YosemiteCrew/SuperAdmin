import 'server-only';

import { serverEnv } from '@/app/config/env.server';

interface PlunkContact {
  email: string;
  subscribed: boolean;
  data?: Record<string, string>;
}

interface PlunkSendPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
  name?: string;
}

interface PlunkResponse {
  success: boolean;
  [key: string]: unknown;
}

export function isPlunkConfigured(): boolean {
  return Boolean(serverEnv.plunkApiKey);
}

async function plunkFetch(path: string, body: unknown): Promise<PlunkResponse> {
  const { plunkApiKey, plunkApiEndpoint } = serverEnv;
  if (!plunkApiKey) throw new Error('PLUNK_API_KEY is not configured.');

  const res = await fetch(`${plunkApiEndpoint}/v1${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${plunkApiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Plunk ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<PlunkResponse>;
}

export async function trackContact(contact: PlunkContact): Promise<void> {
  await plunkFetch('/track', {
    event: 'contact.sync',
    email: contact.email,
    subscribed: contact.subscribed,
    data: contact.data ?? {},
  });
}

export async function sendTransactional(payload: PlunkSendPayload): Promise<void> {
  await plunkFetch('/send', {
    to: payload.to,
    subject: payload.subject,
    body: payload.body,
    from: payload.from ?? 'team@yosemitecrew.com',
    name: payload.name ?? 'Yosemite Crew',
  });
}

/**
 * How many Plunk calls are allowed in flight at once. Awaiting each recipient in
 * turn costs one round trip per address, which for a full campaign is minutes of
 * serial latency. Firing them all at once is worse: an 'all' campaign resolves
 * every user in the tenant, so Promise.all over that list would open thousands of
 * simultaneous connections to a third-party API and earn a rate-limit or a block.
 * A small pool gets the parallelism without the stampede.
 */
const PLUNK_CONCURRENCY = 8;

/**
 * Runs `task` over `items` with bounded concurrency, tallying outcomes. A failure
 * is counted, never thrown: one bad address must not abandon the rest of the
 * send, and the caller reports the tally.
 */
async function tallyBounded<T>(
  items: T[],
  task: (item: T) => Promise<unknown>
): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const item = items[cursor];
      cursor += 1;
      try {
        await task(item);
        ok += 1;
      } catch {
        failed += 1;
      }
    }
  }

  const workers = Math.min(PLUNK_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return { ok, failed };
}

/**
 * Creates or updates Plunk contacts for the given emails. Contacts default to
 * unsubscribed: this panel has no marketing-consent source, so opt-in status
 * must come from the customer's own action (e.g. Plunk double opt-in) and must
 * never be manufactured by a bulk sync. A caller that genuinely has consent
 * passes it explicitly.
 */
export async function syncContacts(
  emails: string[],
  opts?: { subscribed?: boolean }
): Promise<{ synced: number; failed: number }> {
  const subscribed = opts?.subscribed ?? false;
  const { ok, failed } = await tallyBounded(emails, (email) => trackContact({ email, subscribed }));
  return { synced: ok, failed };
}

export async function broadcastCampaign(payload: {
  emails: string[];
  subject: string;
  body: string;
}): Promise<{ sent: number; failed: number }> {
  const { ok, failed } = await tallyBounded(payload.emails, (email) =>
    sendTransactional({
      to: email,
      subject: payload.subject,
      body: payload.body,
    })
  );
  return { sent: ok, failed };
}
