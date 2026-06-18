import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ProfileForm } from '@/app/(routes)/(dashboard)/settings/ProfileForm';

describe('ProfileForm', () => {
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('renders the current name values', () => {
    render(<ProfileForm firstName="Ada" lastName="Lovelace" />);
    expect(screen.getByLabelText(/First name/i)).toHaveValue('Ada');
    expect(screen.getByLabelText(/Last name/i)).toHaveValue('Lovelace');
  });

  it('posts trimmed values and shows a success message', async () => {
    const fetchMock: jest.Mock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ status: 'OK' }),
    }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    render(<ProfileForm firstName="Ada" lastName="" />);
    fireEvent.change(screen.getByLabelText(/First name/i), { target: { value: '  Grace  ' } });
    fireEvent.submit(screen.getByRole('button', { name: /Save changes/i }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Profile updated/i));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body).toEqual({ firstName: 'Grace', lastName: '' });
  });

  it('shows the server error message on a failed save', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({ error: 'firstName is required' }),
    })) as unknown as typeof fetch;
    render(<ProfileForm firstName="" lastName="" />);
    fireEvent.submit(screen.getByRole('button', { name: /Save changes/i }).closest('form')!);
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/firstName is required/i)
    );
  });

  it('shows a network error when the request throws', async () => {
    globalThis.fetch = jest.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    render(<ProfileForm firstName="Ada" lastName="L" />);
    fireEvent.submit(screen.getByRole('button', { name: /Save changes/i }).closest('form')!);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/Network error/i));
  });
});
