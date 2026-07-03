import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DiscordSettings } from '@/app/(routes)/(dashboard)/crm/discord/DiscordSettings';

const saveMock = jest.fn();
const testMock = jest.fn();
const broadcastMock = jest.fn();
jest.mock('@/app/(routes)/(dashboard)/crm/discord/actions', () => ({
  saveDiscordConfigAction: (...args: unknown[]) => saveMock(...args),
  testDiscordWebhookAction: (...args: unknown[]) => testMock(...args),
  broadcastDiscordAction: (...args: unknown[]) => broadcastMock(...args),
}));

const EMPTY_CONFIG = { webhookUrl: '', channelName: '', notifyOnEvents: false };
const SAVED_CONFIG = {
  webhookUrl: 'https://discord.com/api/webhooks/1/x',
  channelName: '#announcements',
  notifyOnEvents: true,
};

beforeEach(() => {
  jest.clearAllMocks();
  saveMock.mockResolvedValue({ success: true });
  testMock.mockResolvedValue({ success: true });
  broadcastMock.mockResolvedValue({ success: true });
});

describe('DiscordSettings', () => {
  it('renders webhook URL and channel fields with existing values', () => {
    render(<DiscordSettings config={SAVED_CONFIG} />);
    expect(screen.getByLabelText(/Webhook URL/i)).toHaveValue(SAVED_CONFIG.webhookUrl);
    expect(screen.getByLabelText(/Channel name/i)).toHaveValue('#announcements');
  });

  it('disables Send test and broadcast when no webhook is configured', () => {
    render(<DiscordSettings config={EMPTY_CONFIG} />);
    expect(screen.getByRole('button', { name: /Send test/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Send to Discord/i })).toBeDisabled();
  });

  it('enables Send test and broadcast when a webhook is configured', () => {
    render(<DiscordSettings config={SAVED_CONFIG} />);
    expect(screen.getByRole('button', { name: /Send test/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Send to Discord/i })).toBeEnabled();
  });

  it('shows confirmation after saving the config', async () => {
    render(<DiscordSettings config={EMPTY_CONFIG} />);
    fireEvent.submit(
      screen.getByRole('button', { name: /^Save$/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/Configuration saved/i)).toBeInTheDocument();
    });
    expect(saveMock).toHaveBeenCalled();
  });

  it('shows the save error when the action rejects the URL', async () => {
    saveMock.mockResolvedValue({ error: 'Webhook URL must start with https://.' });
    render(<DiscordSettings config={EMPTY_CONFIG} />);
    fireEvent.submit(
      screen.getByRole('button', { name: /^Save$/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/must start with https/i)).toBeInTheDocument();
    });
  });

  it('shows confirmation after a successful broadcast', async () => {
    render(<DiscordSettings config={SAVED_CONFIG} />);
    fireEvent.change(screen.getByPlaceholderText(/Type your message/i), {
      target: { value: 'Hello channel' },
    });
    fireEvent.submit(
      screen.getByRole('button', { name: /Send to Discord/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/Message sent/i)).toBeInTheDocument();
    });
    expect(broadcastMock).toHaveBeenCalled();
  });

  it('shows the broadcast error and keeps the message for a retry', async () => {
    broadcastMock.mockResolvedValue({ error: 'Discord webhook failed (404): unknown webhook' });
    render(<DiscordSettings config={SAVED_CONFIG} />);
    const textarea = screen.getByPlaceholderText(/Type your message/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Hello channel' } });
    fireEvent.submit(
      screen.getByRole('button', { name: /Send to Discord/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/webhook failed \(404\)/i)).toBeInTheDocument();
    });
  });

  it('shows confirmation after a successful webhook test', async () => {
    render(<DiscordSettings config={SAVED_CONFIG} />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Send test/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/Test message sent/i)).toBeInTheDocument();
    });
    expect(testMock).toHaveBeenCalled();
  });

  it('shows the error when the webhook test fails', async () => {
    testMock.mockResolvedValue({ error: 'Save a valid webhook URL first.' });
    render(<DiscordSettings config={SAVED_CONFIG} />);
    fireEvent.submit(
      screen.getByRole('button', { name: /Send test/i }).closest('form') as HTMLFormElement
    );
    await waitFor(() => {
      expect(screen.getByText(/valid webhook URL first/i)).toBeInTheDocument();
    });
  });
});
