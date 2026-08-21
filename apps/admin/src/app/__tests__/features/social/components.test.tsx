import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const disconnectMock = jest.fn();
const disconnectInstagramMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/social/actions', () => ({
  disconnectTikTokAction: (...args: unknown[]) => disconnectMock(...args),
  disconnectInstagramAction: (...args: unknown[]) => disconnectInstagramMock(...args),
}));

jest.mock('@/app/features/social/postClient', () => ({ submitPost: jest.fn() }));
jest.mock('@/app/features/social/instagramClient', () => ({
  submitReel: jest.fn(),
  finishReel: jest.fn(),
}));

import { DisconnectButton } from '@/app/(routes)/(dashboard)/social/DisconnectButton';
import { PostComposer } from '@/app/(routes)/(dashboard)/social/PostComposer';
import { InstagramComposer } from '@/app/(routes)/(dashboard)/social/InstagramComposer';
import { finishReel, submitReel } from '@/app/features/social/instagramClient';
import { submitPost } from '@/app/features/social/postClient';

const submitPostMock = submitPost as jest.Mock;
const submitReelMock = submitReel as jest.Mock;
const finishReelMock = finishReel as jest.Mock;

function mp4(name = 'clip.mp4'): File {
  return new File([new Uint8Array(8)], name, { type: 'video/mp4' });
}

beforeEach(() => {
  jest.clearAllMocks();
  submitPostMock.mockResolvedValue({ ok: true, publishId: 'pid', mode: 'draft' });
  submitReelMock.mockResolvedValue({ ok: true, state: 'published' });
  finishReelMock.mockResolvedValue({ ok: true, state: 'published' });
});

describe('DisconnectButton', () => {
  it('does nothing when the confirmation is declined', async () => {
    jest.spyOn(globalThis, 'confirm').mockReturnValue(false);
    render(<DisconnectButton accountLabel="@yosemite_crew" />);
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(disconnectMock).not.toHaveBeenCalled();
  });

  it('disconnects once confirmed', async () => {
    jest.spyOn(globalThis, 'confirm').mockReturnValue(true);
    disconnectMock.mockResolvedValue({ ok: true, message: '' });
    render(<DisconnectButton accountLabel="@yosemite_crew" />);
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(disconnectMock).toHaveBeenCalled());
  });

  it('shows the reason when disconnecting fails', async () => {
    jest.spyOn(globalThis, 'confirm').mockReturnValue(true);
    disconnectMock.mockResolvedValue({ ok: false, message: 'Not configured on this host.' });
    render(<DisconnectButton accountLabel="@yosemite_crew" />);
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Not configured on this host.');
  });
});

describe('PostComposer', () => {
  const PROPS = {
    privacyOptions: ['SELF_ONLY', 'PUBLIC_TO_EVERYONE'] as const,
    commentDisabled: false,
    duetDisabled: false,
    stitchDisabled: false,
  };

  function renderComposer(overrides: Partial<React.ComponentProps<typeof PostComposer>> = {}) {
    return render(
      <PostComposer {...PROPS} privacyOptions={[...PROPS.privacyOptions]} {...overrides} />
    );
  }

  it('defaults to the inbox draft rather than posting to the profile', () => {
    renderComposer();
    expect(screen.getByLabelText('Destination')).toHaveValue('draft');
    // Audience controls only matter for a direct post.
    expect(screen.queryByLabelText('Audience')).not.toBeInTheDocument();
  });

  it('refuses to submit without a file', async () => {
    renderComposer();
    fireEvent.submit(screen.getByRole('button', { name: 'Post to TikTok' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose an MP4 to post.');
    expect(submitPostMock).not.toHaveBeenCalled();
  });

  it('sends the chosen file and reports where a draft landed', async () => {
    renderComposer();
    await userEvent.upload(screen.getByLabelText('Video'), mp4());
    await userEvent.type(screen.getByLabelText('Caption'), 'vet humour');
    await userEvent.click(screen.getByRole('button', { name: 'Post to TikTok' }));

    await waitFor(() => expect(submitPostMock).toHaveBeenCalled());
    expect(submitPostMock.mock.calls[0][0]).toMatchObject({
      title: 'vet humour',
      mode: 'draft',
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Sent to the TikTok inbox');
  });

  it('reveals the audience controls and posts directly when switched', async () => {
    submitPostMock.mockResolvedValue({ ok: true, publishId: 'pid', mode: 'direct' });
    renderComposer();
    await userEvent.selectOptions(screen.getByLabelText('Destination'), 'direct');
    await userEvent.upload(screen.getByLabelText('Video'), mp4());
    await userEvent.selectOptions(screen.getByLabelText('Audience'), 'PUBLIC_TO_EVERYONE');
    await userEvent.click(screen.getByLabelText('Turn off comments'));
    await userEvent.click(screen.getByLabelText('Turn off Duet'));
    await userEvent.click(screen.getByLabelText('Turn off Stitch'));
    await userEvent.click(screen.getByRole('button', { name: 'Post to TikTok' }));

    await waitFor(() => expect(submitPostMock).toHaveBeenCalled());
    expect(submitPostMock.mock.calls[0][0]).toMatchObject({
      mode: 'direct',
      privacy: 'PUBLIC_TO_EVERYONE',
      disableComment: true,
      disableDuet: true,
      disableStitch: true,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Published to the profile.');
  });

  it('locks an interaction toggle the account itself has disabled', async () => {
    renderComposer({ commentDisabled: true });
    await userEvent.selectOptions(screen.getByLabelText('Destination'), 'direct');
    const toggle = screen.getByLabelText('Turn off comments (locked by the account)');
    expect(toggle).toBeChecked();
    expect(toggle).toBeDisabled();
  });

  it('switches back to the draft destination, hiding the audience controls again', async () => {
    renderComposer();
    const destination = screen.getByLabelText('Destination');
    await userEvent.selectOptions(destination, 'direct');
    expect(screen.getByLabelText('Audience')).toBeInTheDocument();

    await userEvent.selectOptions(destination, 'draft');
    expect(screen.queryByLabelText('Audience')).not.toBeInTheDocument();
    expect(destination).toHaveValue('draft');
  });

  it('clears the selection when the file input is emptied', async () => {
    renderComposer();
    const input = screen.getByLabelText('Video') as HTMLInputElement;
    await userEvent.upload(input, mp4());
    // Re-firing change with no files is what a browser does when the picker is
    // cancelled; the composer must fall back to "no video chosen".
    fireEvent.change(input, { target: { files: [] } });
    await userEvent.click(screen.getByRole('button', { name: 'Post to TikTok' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose an MP4 to post.');
    expect(submitPostMock).not.toHaveBeenCalled();
  });

  it('surfaces the server error', async () => {
    submitPostMock.mockResolvedValue({ ok: false, error: 'TikTok is not connected' });
    renderComposer();
    await userEvent.upload(screen.getByLabelText('Video'), mp4());
    await userEvent.click(screen.getByRole('button', { name: 'Post to TikTok' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('TikTok is not connected');
  });

  it('falls back to a private audience when the account offers no options', async () => {
    renderComposer({ privacyOptions: [] });
    await userEvent.upload(screen.getByLabelText('Video'), mp4());
    await userEvent.click(screen.getByRole('button', { name: 'Post to TikTok' }));
    await waitFor(() => expect(submitPostMock).toHaveBeenCalled());
    expect(submitPostMock.mock.calls[0][0].privacy).toBe('SELF_ONLY');
  });
});

describe('InstagramComposer', () => {
  it('refuses to submit without a file', async () => {
    render(<InstagramComposer />);
    fireEvent.submit(screen.getByRole('button', { name: 'Post to Instagram' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose an MP4 to post.');
    expect(submitReelMock).not.toHaveBeenCalled();
  });

  it('posts the Reel with share-to-feed on by default', async () => {
    render(<InstagramComposer />);
    await userEvent.upload(screen.getByLabelText('Reel video'), mp4('reel.mp4'));
    await userEvent.type(screen.getByLabelText('Caption'), 'vet humour');
    await userEvent.click(screen.getByRole('button', { name: 'Post to Instagram' }));

    await waitFor(() => expect(submitReelMock).toHaveBeenCalled());
    expect(submitReelMock.mock.calls[0][0]).toMatchObject({
      caption: 'vet humour',
      shareToFeed: true,
    });
    expect(await screen.findByRole('status')).toHaveTextContent('Published to Instagram.');
  });

  it('honours unticking share-to-feed', async () => {
    render(<InstagramComposer />);
    await userEvent.upload(screen.getByLabelText('Reel video'), mp4('reel.mp4'));
    await userEvent.click(screen.getByLabelText('Also show on the profile grid'));
    await userEvent.click(screen.getByRole('button', { name: 'Post to Instagram' }));
    await waitFor(() => expect(submitReelMock).toHaveBeenCalled());
    expect(submitReelMock.mock.calls[0][0].shareToFeed).toBe(false);
  });

  it('offers a Publish now button while the container is transcoding, then finishes it', async () => {
    submitReelMock.mockResolvedValue({ ok: true, state: 'processing', containerId: '17909' });
    render(<InstagramComposer />);
    await userEvent.upload(screen.getByLabelText('Reel video'), mp4('reel.mp4'));
    await userEvent.click(screen.getByRole('button', { name: 'Post to Instagram' }));

    const publishNow = await screen.findByRole('button', { name: 'Publish now' });
    expect(await screen.findByRole('status')).toHaveTextContent('still processing');

    await userEvent.click(publishNow);
    await waitFor(() => expect(finishReelMock).toHaveBeenCalledWith('17909'));
    expect(await screen.findByRole('status')).toHaveTextContent('Published to Instagram.');
  });

  it('keeps the Publish now button when the container is still not ready', async () => {
    submitReelMock.mockResolvedValue({ ok: true, state: 'processing', containerId: '17909' });
    finishReelMock.mockResolvedValue({ ok: true, state: 'processing', containerId: '17909' });
    render(<InstagramComposer />);
    await userEvent.upload(screen.getByLabelText('Reel video'), mp4('reel.mp4'));
    await userEvent.click(screen.getByRole('button', { name: 'Post to Instagram' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Publish now' }));
    expect(await screen.findByRole('button', { name: 'Publish now' })).toBeInTheDocument();
  });

  it('surfaces the server error', async () => {
    submitReelMock.mockResolvedValue({ ok: false, error: 'Instagram is not connected' });
    render(<InstagramComposer />);
    await userEvent.upload(screen.getByLabelText('Reel video'), mp4('reel.mp4'));
    await userEvent.click(screen.getByRole('button', { name: 'Post to Instagram' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Instagram is not connected');
  });
});

describe('DisconnectButton platform routing', () => {
  it('calls the Instagram action when told to', async () => {
    jest.spyOn(globalThis, 'confirm').mockReturnValue(true);
    disconnectInstagramMock.mockResolvedValue({ ok: true, message: '' });
    render(<DisconnectButton accountLabel="@yosemite_crew" platform="instagram" />);
    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }));
    await waitFor(() => expect(disconnectInstagramMock).toHaveBeenCalled());
    expect(disconnectMock).not.toHaveBeenCalled();
  });
});
