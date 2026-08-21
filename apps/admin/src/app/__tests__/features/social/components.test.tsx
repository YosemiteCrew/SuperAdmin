import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const disconnectMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/social/actions', () => ({
  disconnectTikTokAction: (...args: unknown[]) => disconnectMock(...args),
}));

jest.mock('@/app/features/social/postClient', () => ({ submitPost: jest.fn() }));

import { DisconnectButton } from '@/app/(routes)/(dashboard)/social/DisconnectButton';
import { PostComposer } from '@/app/(routes)/(dashboard)/social/PostComposer';
import { submitPost } from '@/app/features/social/postClient';

const submitPostMock = submitPost as jest.Mock;

function mp4(name = 'clip.mp4'): File {
  return new File([new Uint8Array(8)], name, { type: 'video/mp4' });
}

beforeEach(() => {
  jest.clearAllMocks();
  submitPostMock.mockResolvedValue({ ok: true, publishId: 'pid', mode: 'draft' });
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
