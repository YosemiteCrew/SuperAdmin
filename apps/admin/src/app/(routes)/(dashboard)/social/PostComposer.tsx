'use client';

import { useId, useState } from 'react';

import { MAX_TITLE_LENGTH, type PostMode } from '@/app/features/social/limits';
import { submitPost } from '@/app/features/social/postClient';
import type { TikTokPrivacyLevel } from '@/app/features/social/types';

const PRIVACY_LABELS: Record<TikTokPrivacyLevel, string> = {
  PUBLIC_TO_EVERYONE: 'Public - everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends - mutual follows',
  FOLLOWER_OF_CREATOR: 'Followers only',
  SELF_ONLY: 'Private - only me',
};

const FIELD =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

/** Interaction settings the account may itself have locked off. */
interface InteractionLocks {
  commentDisabled: boolean;
  duetDisabled: boolean;
  stitchDisabled: boolean;
}

interface Props extends InteractionLocks {
  privacyOptions: TikTokPrivacyLevel[];
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

function VideoField({ onPick }: Readonly<{ onPick: (file: File | null) => void }>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        Video
      </label>
      <input
        id={id}
        type="file"
        accept="video/mp4"
        // Deliberately not `required`: the empty case is handled on submit with a
        // role="alert" message, which a screen reader announces - the native
        // constraint only produces a transient browser tooltip.
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        className={FIELD}
      />
      <p className="mt-1 text-xs text-ink-3">MP4, up to 64MB. Vertical 1080x1920 works best.</p>
    </div>
  );
}

function DestinationField({
  mode,
  onChange,
}: Readonly<{ mode: PostMode; onChange: (mode: PostMode) => void }>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        Destination
      </label>
      <select
        id={id}
        value={mode}
        onChange={(event) => onChange(event.target.value === 'direct' ? 'direct' : 'draft')}
        className={FIELD}
      >
        <option value="draft">TikTok inbox - review in the app before posting</option>
        <option value="direct">Post straight to the profile</option>
      </select>
      <p className="mt-1 text-xs text-ink-3">
        Direct posting requires TikTok to have approved the app. Until then it is refused and the
        inbox draft is the working path.
      </p>
    </div>
  );
}

function CaptionField({
  title,
  onChange,
}: Readonly<{ title: string; onChange: (title: string) => void }>) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        Caption
      </label>
      <textarea
        id={id}
        value={title}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        maxLength={MAX_TITLE_LENGTH}
        placeholder="Caption and hashtags"
        className={FIELD}
      />
    </div>
  );
}

/** Audience and interaction controls, which only apply to a direct post. */
function AudienceFieldset({
  privacyOptions,
  privacy,
  onPrivacyChange,
  locks,
  off,
  onOffChange,
}: Readonly<{
  privacyOptions: TikTokPrivacyLevel[];
  privacy: TikTokPrivacyLevel;
  onPrivacyChange: (value: TikTokPrivacyLevel) => void;
  locks: InteractionLocks;
  off: { comment: boolean; duet: boolean; stitch: boolean };
  onOffChange: (key: 'comment' | 'duet' | 'stitch', value: boolean) => void;
}>) {
  const id = useId();
  return (
    <fieldset className="flex flex-col gap-3">
      <div>
        <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
          Audience
        </label>
        <select
          id={id}
          value={privacy}
          onChange={(event) => onPrivacyChange(event.target.value as TikTokPrivacyLevel)}
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
          checked={off.comment || locks.commentDisabled}
          disabled={locks.commentDisabled}
          onChange={(value) => onOffChange('comment', value)}
        />
        <Toggle
          label="Turn off Duet"
          checked={off.duet || locks.duetDisabled}
          disabled={locks.duetDisabled}
          onChange={(value) => onOffChange('duet', value)}
        />
        <Toggle
          label="Turn off Stitch"
          checked={off.stitch || locks.stitchDisabled}
          disabled={locks.stitchDisabled}
          onChange={(value) => onOffChange('stitch', value)}
        />
      </div>
    </fieldset>
  );
}

function StatusLine({ status }: Readonly<{ status: Status }>) {
  if (status.kind === 'done') {
    return (
      <p role="status" className="text-sm text-ink-2">
        {status.message}
      </p>
    );
  }
  if (status.kind === 'error') {
    return (
      <p role="alert" className="text-sm text-danger-600">
        {status.message}
      </p>
    );
  }
  return null;
}

function doneMessage(mode: string): string {
  return mode === 'draft'
    ? 'Sent to the TikTok inbox. Open the TikTok app to review and post it.'
    : 'Published to the profile.';
}

export function PostComposer({
  privacyOptions,
  commentDisabled,
  duetDisabled,
  stitchDisabled,
}: Readonly<Props>) {
  const [video, setVideo] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<TikTokPrivacyLevel>(privacyOptions[0] ?? 'SELF_ONLY');
  const [mode, setMode] = useState<PostMode>('draft');
  const [off, setOff] = useState({ comment: false, duet: false, stitch: false });
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  const locks = { commentDisabled, duetDisabled, stitchDisabled };

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
      disableComment: off.comment || commentDisabled,
      disableDuet: off.duet || duetDisabled,
      disableStitch: off.stitch || stitchDisabled,
    });
    setStatus(
      result.ok
        ? { kind: 'done', message: doneMessage(result.mode) }
        : { kind: 'error', message: result.error }
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <VideoField onPick={setVideo} />
      <DestinationField mode={mode} onChange={setMode} />
      <CaptionField title={title} onChange={setTitle} />

      {mode === 'direct' ? (
        <AudienceFieldset
          privacyOptions={privacyOptions}
          privacy={privacy}
          onPrivacyChange={setPrivacy}
          locks={locks}
          off={off}
          onOffChange={(key, value) => setOff((current) => ({ ...current, [key]: value }))}
        />
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="yc-primary-button inline-flex items-center justify-center rounded-xl border-[1.5px] border-btn bg-btn px-5 py-2.5 text-sm font-medium text-btn-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Uploading…' : 'Post to TikTok'}
        </button>
        <StatusLine status={status} />
      </div>
    </form>
  );
}
