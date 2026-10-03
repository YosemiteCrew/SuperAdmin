import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ConnectButton } from '@/app/(routes)/(dashboard)/social/ConnectButton';

const pushMock = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }));

const fetchMock = jest.fn();

beforeAll(() => {
  globalThis.fetch = fetchMock;
});

beforeEach(() => {
  pushMock.mockReset();
  fetchMock.mockReset();
});

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function clickConnect() {
  render(<ConnectButton endpoint="/api/social/tiktok/connect" network="TikTok" />);
  fireEvent.click(screen.getByRole('button', { name: 'Connect TikTok' }));
}

it('starts the flow with a POST and sends the browser to the provider', async () => {
  fetchMock.mockResolvedValue(
    jsonResponse(200, { authorizeUrl: 'https://www.tiktok.com/v2/auth/authorize/?state=s' })
  );
  clickConnect();

  await waitFor(() =>
    expect(pushMock).toHaveBeenCalledWith('https://www.tiktok.com/v2/auth/authorize/?state=s')
  );
  expect(fetchMock).toHaveBeenCalledWith('/api/social/tiktok/connect', { method: 'POST' });
  expect(screen.getByRole('button', { name: 'Connecting…' })).toBeDisabled();
});

it('shows the server error and re-enables the button', async () => {
  fetchMock.mockResolvedValue(jsonResponse(503, { error: 'TikTok posting is not configured' }));
  clickConnect();

  expect(await screen.findByRole('alert')).toHaveTextContent('TikTok posting is not configured');
  expect(screen.getByRole('button', { name: 'Connect TikTok' })).toBeEnabled();
  expect(pushMock).not.toHaveBeenCalled();
});

it('falls back to a generic message when the body is not JSON', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 502,
    json: async () => {
      throw new SyntaxError('bad json');
    },
  } as unknown as Response);
  clickConnect();

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Could not start the TikTok connection. Try again.'
  );
});

it('does not navigate when a success response has no URL', async () => {
  fetchMock.mockResolvedValue(jsonResponse(200, {}));
  clickConnect();

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not start the TikTok');
  expect(pushMock).not.toHaveBeenCalled();
});

it('reports a network failure', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'));
  clickConnect();

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not start the TikTok');
});
