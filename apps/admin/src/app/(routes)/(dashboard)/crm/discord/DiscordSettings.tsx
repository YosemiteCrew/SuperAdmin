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

const CARD =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] px-6 py-[22px] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const CARD_TITLE = 'text-[15.5px] font-bold text-[color:var(--ink)]';
const CARD_SUB = 'text-[12.5px] text-[color:var(--ink-faint)]';
const LABEL = 'mb-[5px] block text-[12px] font-semibold text-[color:var(--ink-soft)]';
const FIELD =
  'w-full rounded-xl border-[1.5px] border-[color:var(--hairline)] bg-[var(--field-bg)] px-[14px] text-[13.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint2)] focus:border-[color:var(--blue)]';
const PRIMARY_BTN =
  'yc-primary-button inline-flex h-10 items-center justify-center rounded-full bg-[var(--btn)] px-5 text-[13px] font-semibold text-[color:var(--btn-ink)] disabled:opacity-50';
/** Inline status copy sitting beside its button, per the design: green when the
 *  action succeeded, danger when it failed. Green reads as "good status" here,
 *  which is what the mockup shows — it is not decoration. */
const OK_TEXT = 'text-[12px] font-semibold text-[color:var(--success)]';
const ERROR_TEXT = 'text-[12px] font-semibold text-[color:var(--danger-text)]';

export function DiscordSettings({ config }: Readonly<{ config: DiscordConfig }>) {
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
    <div className="flex flex-col gap-[22px]">
      {/* Webhook configuration */}
      <section className={CARD}>
        <div className="mb-[14px] flex flex-col gap-0.5">
          <h2 className={CARD_TITLE}>Webhook configuration</h2>
          <p className={CARD_SUB}>
            Create a webhook in your Discord server under Channel Settings → Integrations.
          </p>
        </div>

        <form action={saveAction} className="flex flex-col gap-[14px]">
          <div>
            <label htmlFor="discord-url" className={LABEL}>
              Webhook URL
            </label>
            <input
              id="discord-url"
              type="url"
              name="webhookUrl"
              defaultValue={config.webhookUrl}
              placeholder="https://discord.com/api/webhooks/..."
              className={`h-10 font-mono text-[12.5px] ${FIELD}`}
            />
          </div>

          <div>
            <label htmlFor="discord-channel" className={LABEL}>
              Channel name{' '}
              <span className="font-medium text-[color:var(--ink-faint)]">(display only)</span>
            </label>
            <input
              id="discord-channel"
              type="text"
              name="channelName"
              defaultValue={config.channelName}
              placeholder="#announcements"
              className={`h-10 ${FIELD}`}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-[10px]">
            <input
              type="checkbox"
              name="notifyOnEvents"
              defaultChecked={config.notifyOnEvents}
              className="h-4 w-4 rounded-[5px] accent-[var(--btn)]"
            />
            <span className="text-[13px] text-[color:var(--ink)]">
              Notify this channel when a campaign is sent
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button type="submit" disabled={savePending} className={PRIMARY_BTN}>
              <span>{savePending ? 'Saving…' : 'Save'}</span>
            </button>
            {saveState.error ? <p className={ERROR_TEXT}>{saveState.error}</p> : null}
            {saveState.success ? <p className={OK_TEXT}>Configuration saved.</p> : null}
          </div>
        </form>

        {/* Sibling form — a form must never nest inside another form. */}
        <form
          action={testAction}
          className="mt-[14px] flex flex-wrap items-center gap-3 border-t border-[var(--hairline)] pt-[14px]"
        >
          <input type="hidden" name="webhookUrl" value={config.webhookUrl} />
          <button
            type="submit"
            disabled={testPending || !config.webhookUrl}
            className="inline-flex h-9 items-center justify-center rounded-full border border-[color:var(--divider)] bg-[var(--screen)] px-4 text-[12.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-40"
          >
            {testPending ? 'Testing…' : 'Send test'}
          </button>
          {testState.error ? <p className={ERROR_TEXT}>{testState.error}</p> : null}
          {testState.success ? <p className={OK_TEXT}>Test message sent.</p> : null}
        </form>
      </section>

      {/* Manual broadcast */}
      <section className={CARD}>
        <div className="mb-3 flex flex-col gap-0.5">
          <h2 className={CARD_TITLE}>Broadcast to Discord</h2>
          <p className={CARD_SUB}>Post a one-off message to the configured channel.</p>
        </div>

        <form ref={broadcastRef} action={broadcastAction} className="flex flex-col gap-3">
          <textarea
            name="message"
            rows={4}
            placeholder="Type your message…"
            disabled={!config.webhookUrl}
            className={`min-h-[90px] py-3 leading-[1.6] disabled:opacity-50 ${FIELD}`}
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={broadcastPending || !config.webhookUrl}
              className={PRIMARY_BTN}
            >
              <span>{broadcastPending ? 'Sending…' : 'Send to Discord'}</span>
            </button>
            {broadcastState.error ? <p className={ERROR_TEXT}>{broadcastState.error}</p> : null}
            {broadcastState.success ? <p className={OK_TEXT}>Message sent.</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}
