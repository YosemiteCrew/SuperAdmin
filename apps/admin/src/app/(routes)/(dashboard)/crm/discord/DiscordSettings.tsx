'use client';

import { useActionState, useRef } from 'react';

import type { DiscordConfig } from '@/app/features/crm/discord/store';

import {
  broadcastDiscordAction,
  saveDiscordConfigAction,
  testDiscordWebhookAction,
  type DiscordActionResult,
} from './actions';

const INIT: DiscordActionResult = {};

export function DiscordSettings({ config }: { config: DiscordConfig }) {
  const broadcastRef = useRef<HTMLFormElement>(null);

  const [saveState, saveAction, savePending] = useActionState(
    (_prev: DiscordActionResult, fd: FormData) => saveDiscordConfigAction(fd),
    INIT
  );
  const [testState, testAction, testPending] = useActionState(
    (_prev: DiscordActionResult, fd: FormData) => testDiscordWebhookAction(fd),
    INIT
  );
  const [broadcastState, broadcastAction, broadcastPending] = useActionState(
    async (_prev: DiscordActionResult, fd: FormData): Promise<DiscordActionResult> => {
      const result = await broadcastDiscordAction(fd);
      if (!result.error) broadcastRef.current?.reset();
      return result;
    },
    INIT
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Webhook configuration */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <h2 className="text-lg font-medium text-ink">Webhook configuration</h2>
        <p className="mt-1 mb-5 text-sm text-ink-3">
          Create a webhook in your Discord server under Channel Settings → Integrations.
        </p>

        <form action={saveAction} className="flex flex-col gap-4">
          <div>
            <label htmlFor="discord-url" className="mb-1.5 block text-sm font-medium text-ink">
              Webhook URL
            </label>
            <input
              id="discord-url"
              type="url"
              name="webhookUrl"
              defaultValue={config.webhookUrl}
              placeholder="https://discord.com/api/webhooks/..."
              className="h-10 w-full rounded-xl border border-line bg-raised px-4 text-sm text-ink placeholder:text-ink-3 focus:border-btn focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="discord-channel" className="mb-1.5 block text-sm font-medium text-ink">
              Channel name <span className="text-ink-3">(display only)</span>
            </label>
            <input
              id="discord-channel"
              type="text"
              name="channelName"
              defaultValue={config.channelName}
              placeholder="#announcements"
              className="h-10 w-full rounded-xl border border-line bg-raised px-4 text-sm text-ink placeholder:text-ink-3 focus:border-btn focus:outline-none"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              name="notifyOnEvents"
              defaultChecked={config.notifyOnEvents}
              className="h-4 w-4 rounded border-line accent-btn"
            />
            <span className="text-sm text-ink">Notify this channel when a campaign is sent</span>
          </label>

          {saveState.error ? <p className="text-sm text-red-500">{saveState.error}</p> : null}
          {saveState.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Configuration saved.</p>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={savePending}
              className="h-10 rounded-xl bg-btn px-5 text-sm font-medium text-btn-fg disabled:opacity-50"
            >
              {savePending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>

        {/* Sibling form — a form must never nest inside another form. */}
        <form action={testAction} className="mt-3">
          <input type="hidden" name="webhookUrl" value={config.webhookUrl} />
          <button
            type="submit"
            disabled={testPending || !config.webhookUrl}
            className="h-10 rounded-xl border border-line bg-surface px-5 text-sm font-medium text-ink disabled:opacity-40 hover:bg-raised"
          >
            {testPending ? 'Testing…' : 'Send test'}
          </button>
          {testState.error ? <p className="mt-2 text-sm text-red-500">{testState.error}</p> : null}
          {testState.success ? (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
              Test message sent.
            </p>
          ) : null}
        </form>
      </div>

      {/* Manual broadcast */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <h2 className="text-lg font-medium text-ink">Broadcast to Discord</h2>
        <p className="mt-1 mb-5 text-sm text-ink-3">
          Post a one-off message to the configured channel.
        </p>

        <form ref={broadcastRef} action={broadcastAction} className="flex flex-col gap-4">
          <textarea
            name="message"
            rows={4}
            placeholder="Type your message…"
            disabled={!config.webhookUrl}
            className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-sm text-ink placeholder:text-ink-3 focus:border-btn focus:outline-none disabled:opacity-50"
          />

          {broadcastState.error ? (
            <p className="text-sm text-red-500">{broadcastState.error}</p>
          ) : null}
          {broadcastState.success ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">Message sent.</p>
          ) : null}

          <div>
            <button
              type="submit"
              disabled={broadcastPending || !config.webhookUrl}
              className="h-10 rounded-xl bg-btn px-5 text-sm font-medium text-btn-fg disabled:opacity-50"
            >
              {broadcastPending ? 'Sending…' : 'Send to Discord'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
