'use client';

import { useState, useTransition } from 'react';

import { type SendCampaignResult, sendCampaignAction } from './actions';

const INITIAL: SendCampaignResult = {};

const LABEL = 'mb-[5px] block text-[12px] font-semibold text-[color:var(--ink-soft)]';
const FIELD =
  'w-full rounded-xl border-[1.5px] border-[color:var(--hairline)] bg-[var(--field-bg)] px-[14px] text-[13.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint2)] focus:border-[color:var(--blue)]';
const HINT = 'mt-[5px] text-[11.5px] text-[color:var(--ink-faint)]';

function CampaignResult({ result }: Readonly<{ result: SendCampaignResult }>) {
  if (result.sent === undefined) return null;

  const totalFailure = result.sent === 0 && Boolean(result.failed);

  return (
    <div
      role={totalFailure ? 'alert' : 'status'}
      className={`flex flex-col gap-[3px] rounded-[18px] border bg-[var(--screen)] px-[18px] py-[14px] ${
        totalFailure ? 'border-[var(--danger)]/40' : 'border-[var(--success)]/40'
      }`}
    >
      <p
        className={`text-[12.5px] font-bold ${
          totalFailure ? 'text-[color:var(--danger-text)]' : 'text-[color:var(--avatar-green-ink)]'
        }`}
      >
        {totalFailure ? 'Campaign delivery failed' : 'Campaign delivered'}
      </p>
      <p className="text-[12px] text-[color:var(--ink-muted)]">
        Sent to {result.sent} recipient{result.sent === 1 ? '' : 's'}
        {result.failed && result.failed > 0 ? ` (${result.failed} failed)` : ''}.
      </p>
    </div>
  );
}

export function ComposeForm() {
  const [audience, setAudience] = useState('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [state, setState] = useState<SendCampaignResult>(INITIAL);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await sendCampaignAction(formData);
      setState(result);
      if ((result.sent ?? 0) > 0) {
        setAudience('all');
        setSubject('');
        setBody('');
      }
    });
  }
  return (
    <div className="rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] px-6 py-[22px] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]">
      <div className="mb-[14px] flex flex-col gap-0.5">
        <h2 className="text-[15.5px] font-bold text-[color:var(--ink)]">Compose</h2>
        <p className="text-[12.5px] text-[color:var(--ink-faint)]">
          Sent via your self-hosted Plunk instance to all matched contacts.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
        <div>
          <label htmlFor="campaign-audience" className={LABEL}>
            Audience
          </label>
          <select
            id="campaign-audience"
            name="audience"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            className={`h-10 ${FIELD}`}
          >
            <option value="all">All users</option>
            <option value="admins">Super-admins only</option>
          </select>
        </div>

        <div>
          <label htmlFor="campaign-subject" className={LABEL}>
            Subject
          </label>
          <input
            id="campaign-subject"
            type="text"
            name="subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            placeholder="What's new at Yosemite Crew"
            required
            className={`h-10 ${FIELD}`}
          />
        </div>

        <div>
          <label htmlFor="campaign-body" className={LABEL}>
            Body
          </label>
          <textarea
            id="campaign-body"
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={8}
            placeholder="Write your message here…"
            required
            className={`py-3 ${FIELD}`}
          />
          <p className={HINT}>Plain text or HTML. Plunk handles unsubscribe links.</p>
        </div>

        {state.error ? (
          <p role="alert" className="text-[13px] font-semibold text-[color:var(--danger-text)]">
            {state.error}
          </p>
        ) : null}

        {/* Delivery results keep the detail neutral while the border and headline
            distinguish a total failure from a campaign that reached recipients. */}
        <CampaignResult result={state} />

        <div>
          <button
            type="submit"
            disabled={pending}
            className="yc-primary-button inline-flex h-10 items-center justify-center rounded-full bg-[var(--btn)] px-[22px] text-[13.5px] font-semibold text-[color:var(--btn-ink)] disabled:opacity-50"
          >
            {pending ? 'Sending…' : 'Send campaign'}
          </button>
        </div>
      </form>
    </div>
  );
}
