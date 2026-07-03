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
 * Creates or updates Plunk contacts for the given emails. Contacts default to
 * unsubscribed: this panel has no marketing-consent source, so opt-in status
 * must come from the customer's own action (e.g. Plunk double opt-in) — never
 * be manufactured by a bulk sync.
 */
export async function syncContacts(
  emails: string[],
  opts?: { subscribed?: boolean }
): Promise<{ synced: number; failed: number }> {
  const subscribed = opts?.subscribed ?? false;
  let synced = 0;
  let failed = 0;

  for (const email of emails) {
    try {
      await trackContact({ email, subscribed });
      synced++;
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function broadcastCampaign(payload: {
  emails: string[];
  subject: string;
  body: string;
}): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of payload.emails) {
    try {
      await sendTransactional({
        to: email,
        subject: payload.subject,
        body: payload.body,
      });
      sent++;
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}
