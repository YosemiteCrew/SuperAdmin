import { render, screen } from '@testing-library/react';
import AuthPage from '@/app/auth/[[...path]]/page';
import AuthLayout from '@/app/auth/layout';
import { usePathname, useSearchParams } from 'next/navigation';

jest.mock('supertokens-auth-react/recipe/emailpassword', () => ({
  signIn: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  submitNewPassword: jest.fn(),
}));

describe('Auth sign-in page', () => {
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
});
