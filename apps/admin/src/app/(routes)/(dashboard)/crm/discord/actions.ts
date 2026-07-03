'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { sendDiscordMessage } from '@/app/features/crm/discord/dispatcher';
import { saveDiscordConfig } from '@/app/features/crm/discord/store';

export interface DiscordActionResult {
  error?: string;
  success?: boolean;
}

function isHttpsUrl(value: string): boolean {
  const at = value.indexOf('https://');
  return at === 0 && value.length > 8;
}

export async function saveDiscordConfigAction(formData: FormData): Promise<DiscordActionResult> {
  await requireSuperAdmin();

  const webhookUrl = formData.get('webhookUrl');
  const channelName = formData.get('channelName');
  const notifyOnEvents = formData.get('notifyOnEvents') === 'on';

  if (typeof webhookUrl !== 'string' || (webhookUrl.length > 0 && !isHttpsUrl(webhookUrl))) {
    return { error: 'Webhook URL must start with https://.' };
  }

  await saveDiscordConfig({
    webhookUrl: webhookUrl.trim(),
    channelName: typeof channelName === 'string' ? channelName.trim() : '',
    notifyOnEvents,
  });

  revalidatePath('/crm/discord');
  return { success: true };
}

export async function testDiscordWebhookAction(formData: FormData): Promise<DiscordActionResult> {
  await requireSuperAdmin();

  const webhookUrl = formData.get('webhookUrl');
  if (typeof webhookUrl !== 'string' || !isHttpsUrl(webhookUrl)) {
    return { error: 'Save a valid webhook URL first.' };
  }

  try {
    await sendDiscordMessage('Test message from Yosemite Crew SuperAdmin.');
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook test failed.' };
  }
}

export async function broadcastDiscordAction(formData: FormData): Promise<DiscordActionResult> {
  await requireSuperAdmin();

  const message = formData.get('message');
  if (typeof message !== 'string' || message.trim().length < 2) {
    return { error: 'Message cannot be empty.' };
  }

  try {
    await sendDiscordMessage(message.trim());
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to send message.' };
  }
}
