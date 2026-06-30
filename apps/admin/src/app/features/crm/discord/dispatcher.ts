import 'server-only';

import { getDiscordConfig } from './store';

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  timestamp?: string;
}

async function postWebhook(webhookUrl: string, payload: unknown): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Discord webhook failed (${res.status}): ${text}`);
  }
}

export async function sendDiscordMessage(message: string): Promise<void> {
  const config = await getDiscordConfig();
  if (!config.webhookUrl) throw new Error('Discord webhook URL is not configured.');
  await postWebhook(config.webhookUrl, { content: message });
}

export async function sendDiscordEmbed(embed: DiscordEmbed): Promise<void> {
  const config = await getDiscordConfig();
  if (!config.webhookUrl) throw new Error('Discord webhook URL is not configured.');
  await postWebhook(config.webhookUrl, { embeds: [embed] });
}

export async function notifyCampaignSent(params: {
  subject: string;
  sentCount: number;
  sentByEmail: string;
}): Promise<void> {
  const config = await getDiscordConfig();
  if (!config.webhookUrl || !config.notifyOnEvents) return;

  await postWebhook(config.webhookUrl, {
    embeds: [
      {
        title: 'Campaign sent',
        color: 0x10b981,
        fields: [
          { name: 'Subject', value: params.subject, inline: false },
          { name: 'Recipients', value: String(params.sentCount), inline: true },
          { name: 'Sent by', value: params.sentByEmail, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
}
