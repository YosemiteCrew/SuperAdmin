import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuthPage from '@/app/auth/[[...path]]/page';
import AuthLayout from '@/app/auth/layout';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'supertokens-auth-react/recipe/emailpassword';

jest.mock('supertokens-auth-react/recipe/emailpassword', () => ({
  signIn: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  submitNewPassword: jest.fn(),
}));

describe('Auth sign-in page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathname as jest.Mock).mockReturnValue('/auth');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
  });

  it('renders the Yosemite Crew auth sign-in UI on /auth', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth');
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());

    render(
      <AuthLayout>
        <AuthPage />
      </AuthLayout>
    );

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveClass('yc-primary-button');
    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument();
  });

  it('returns an invite recipient to the acceptance page after sign-in', async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams({ returnTo: '/accept-invite?token=tok-1' })
    );
    (signIn as jest.Mock).mockResolvedValue({ status: 'OK' });

    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@x.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/accept-invite?token=tok-1'));
  });

  it('does not navigate to an external return target after sign-in', async () => {
    const push = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams({ returnTo: 'https://example.org/steal' })
    );
    (signIn as jest.Mock).mockResolvedValue({ status: 'OK' });

    render(<AuthPage />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@x.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Sign in' }).closest('form')!);

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard'));
  });
});
