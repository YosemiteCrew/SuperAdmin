'use client';

import { useId, useState } from 'react';

import { submitPost } from '@/app/features/social/postClient';
import type { TikTokPrivacyLevel } from '@/app/features/social/types';

const PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: 'Public — everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends — mutual follows',
  FOLLOWER_OF_CREATOR: 'Followers only',
  SELF_ONLY: 'Private — only me',
};

const FIELD =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

interface Props {
  privacyOptions: TikTokPrivacyLevel[];
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
}

export function PostComposer({
  privacyOptions,
  commentDisabled,
  duetDisabled,
  stitchDisabled,
}: Readonly<Props>) {
  const ids = { video: useId(), title: useId(), privacy: useId(), mode: useId() };
  const [video, setVideo] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<TikTokPrivacyLevel>(privacyOptions[0] ?? 'SELF_ONLY');
  const [mode, setMode] = useState<'direct' | 'draft'>('draft');
  const [noComment, setNoComment] = useState(false);
  const [noDuet, setNoDuet] = useState(false);
  const [noStitch, setNoStitch] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!video) {
      setStatus({ kind: 'error', message: 'Choose an MP4 to post.' });
      return;
    }
    setStatus({ kind: 'sending' });
    const result = await submitPost({
      video,
      title,
      privacy,
      mode,
      disableComment: noComment,
      disableDuet: noDuet,
      disableStitch: noStitch,
    });
    if (result.ok) {
      setStatus({
        kind: 'done',
        message:
          result.mode === 'draft'
            ? 'Sent to the TikTok inbox. Open the TikTok app to review and post it.'
            : 'Published to the profile.',
      });
      return;
    }
    setStatus({ kind: 'error', message: result.error });
  }

  const sending = status.kind === 'sending';

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <div>
        <label htmlFor={ids.video} className="mb-1.5 block text-sm font-medium text-ink">
          Video
        </label>
        <input
          id={ids.video}
          type="file"
          accept="video/mp4"
          // Deliberately not `required`: the empty case is handled below with a
          // role="alert" message, which a screen reader announces — the native
          // constraint only produces a transient browser tooltip.
          onChange={(event) => setVideo(event.target.files?.[0] ?? null)}
          className={FIELD}
        />
        <p className="mt-1 text-xs text-ink-3">MP4, up to 64MB. Vertical 1080x1920 works best.</p>
      </div>

      <div>
        <label htmlFor={ids.mode} className="mb-1.5 block text-sm font-medium text-ink">
          Destination
        </label>
        <select
          id={ids.mode}
          value={mode}
          onChange={(event) => setMode(event.target.value === 'direct' ? 'direct' : 'draft')}
          className={FIELD}
        >
          <option value="draft">TikTok inbox — review in the app before posting</option>
          <option value="direct">Post straight to the profile</option>
        </select>
        <p className="mt-1 text-xs text-ink-3">
          Direct posting requires TikTok to have approved the app. Until then it is refused and the
          inbox draft is the working path.
        </p>
      </div>

      <div>
        <label htmlFor={ids.title} className="mb-1.5 block text-sm font-medium text-ink">
          Caption
        </label>
        <textarea
          id={ids.title}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          rows={3}
          maxLength={2200}
          placeholder="Caption and hashtags"
          className={FIELD}
        />
      </div>

      {mode === 'direct' ? (
        <fieldset className="flex flex-col gap-3">
          <div>
            <label htmlFor={ids.privacy} className="mb-1.5 block text-sm font-medium text-ink">
              Audience
            </label>
            <select
              id={ids.privacy}
              value={privacy}
              onChange={(event) => setPrivacy(event.target.value as TikTokPrivacyLevel)}
              className={FIELD}
            >
              {privacyOptions.map((option) => (
                <option key={option} value={option}>
                  {PRIVACY_LABELS[option]}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Toggle
              label="Turn off comments"
              checked={noComment || commentDisabled}
              disabled={commentDisabled}
              onChange={setNoComment}
            />
            <Toggle
              label="Turn off Duet"
              checked={noDuet || duetDisabled}
              disabled={duetDisabled}
              onChange={setNoDuet}
            />
            <Toggle
              label="Turn off Stitch"
              checked={noStitch || stitchDisabled}
              disabled={stitchDisabled}
              onChange={setNoStitch}
            />
          </div>
        </fieldset>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={sending}
          className="yc-primary-button inline-flex items-center justify-center rounded-xl border-[1.5px] border-btn bg-btn px-5 py-2.5 text-sm font-medium text-btn-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {sending ? 'Uploading…' : 'Post to TikTok'}
        </button>
        {status.kind === 'done' ? (
          <p role="status" className="text-sm text-ink-2">
            {status.message}
          </p>
        ) : null}
        {status.kind === 'error' ? (
          <p role="alert" className="text-sm text-danger-600">
            {status.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: Readonly<{
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}>) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-line accent-[var(--color-btn)]"
      />
      <label htmlFor={id} className="text-sm text-ink-2">
        {label}
        {disabled ? ' (locked by the account)' : ''}
      </label>
    </span>
  );
}
