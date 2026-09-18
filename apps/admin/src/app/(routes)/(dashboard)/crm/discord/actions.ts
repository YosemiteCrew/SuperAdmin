'use server';

import { revalidatePath } from 'next/cache';

import { requireSuperAdmin } from '@/app/config/backend';
import { sendDiscordMessage } from '@/app/features/crm/discord/dispatcher';
import { saveDiscordConfig } from '@/app/features/crm/discord/store';
import { isDiscordWebhookUrl } from '@/app/features/crm/discord/webhookUrl';

export interface DiscordActionResult {
  error?: string;
  success?: boolean;
}

export async function saveDiscordConfigAction(formData: FormData): Promise<DiscordActionResult> {
  await requireSuperAdmin();

  const webhookUrl = formData.get('webhookUrl');
  const channelName = formData.get('channelName');
  const notifyOnEvents = formData.get('notifyOnEvents') === 'on';

  const normalizedWebhookUrl = typeof webhookUrl === 'string' ? webhookUrl.trim() : '';
  if (normalizedWebhookUrl.length > 0 && !isDiscordWebhookUrl(normalizedWebhookUrl)) {
    return { error: 'Enter a valid Discord webhook URL.' };
  }

  await saveDiscordConfig({
    webhookUrl: normalizedWebhookUrl,
    channelName: typeof channelName === 'string' ? channelName.trim() : '',
    notifyOnEvents,
  });

  revalidatePath('/crm/discord');
  return { success: true };
}

export async function testDiscordWebhookAction(formData: FormData): Promise<DiscordActionResult> {
  await requireSuperAdmin();

  const webhookUrl = formData.get('webhookUrl');
  if (typeof webhookUrl !== 'string' || !isDiscordWebhookUrl(webhookUrl.trim())) {
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
