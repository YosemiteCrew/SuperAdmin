'use client';

import { useId, useRef, useState } from 'react';

import { finishReel, submitReel } from '@/app/features/social/instagramClient';
import { MAX_CAPTION_LENGTH } from '@/app/features/social/postRequest';

const FIELD =
  'w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none focus-visible:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink';

type Status =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'processing'; containerId: string }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string };

export function InstagramComposer() {
  const videoId = useId();
  const captionId = useId();
  const feedId = useId();
  // Read on submit only, so picking a file does not re-render the form.
  const videoInput = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [shareToFeed, setShareToFeed] = useState(true);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  function applyResult(result: Awaited<ReturnType<typeof submitReel>>) {
    if (!result.ok) {
      setStatus({ kind: 'error', message: result.error });
      return;
    }
    if (result.state === 'processing') {
      setStatus({ kind: 'processing', containerId: result.containerId });
      return;
    }
    setStatus({
      kind: 'done',
      message: result.alreadyPublished
        ? 'Already published to Instagram.'
        : 'Published to Instagram.',
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const video = videoInput.current?.files?.[0];
    if (!video) {
      setStatus({ kind: 'error', message: 'Choose an MP4 to post.' });
      return;
    }
    setStatus({ kind: 'sending' });
    applyResult(await submitReel({ video, caption, shareToFeed }));
  }

  async function handleFinish(containerId: string) {
    setStatus({ kind: 'sending' });
    applyResult(await finishReel(containerId));
  }

  const busy = status.kind === 'sending';

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
      <div>
        <label htmlFor={videoId} className="mb-1.5 block text-sm font-medium text-ink">
          Reel video
        </label>
        <input id={videoId} ref={videoInput} type="file" accept="video/mp4" className={FIELD} />
        <p className="mt-1 text-xs text-ink-3">
          MP4, up to 64MB. Vertical 1080x1920, 3 seconds to 15 minutes.
        </p>
      </div>

      <div>
        <label htmlFor={captionId} className="mb-1.5 block text-sm font-medium text-ink">
          Caption
        </label>
        <textarea
          id={captionId}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          rows={3}
          maxLength={MAX_CAPTION_LENGTH}
          placeholder="Caption and hashtags"
          className={FIELD}
        />
      </div>

      <span className="inline-flex items-center gap-2">
        <input
          id={feedId}
          type="checkbox"
          checked={shareToFeed}
          onChange={(event) => setShareToFeed(event.target.checked)}
          className="size-4 rounded border-line accent-[var(--color-btn)]"
        />
        <label htmlFor={feedId} className="text-sm text-ink-2">
          Also show on the profile grid
        </label>
      </span>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="yc-primary-button inline-flex items-center justify-center rounded-xl border-[1.5px] border-btn bg-btn px-5 py-2.5 text-sm font-medium text-btn-ink transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {busy ? 'Uploading…' : 'Post to Instagram'}
        </button>

        {status.kind === 'processing' ? (
          <>
            <p role="status" className="text-sm text-ink-2">
              Uploaded. Instagram is still processing the video.
            </p>
            <button
              type="button"
              onClick={() => handleFinish(status.containerId)}
              className="rounded-xl border border-line-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-raised"
            >
              Publish now
            </button>
          </>
        ) : null}
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
