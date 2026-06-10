import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import { GuestHeaderCta } from '@/app/auth/GuestHeaderCta';

describe('GuestHeaderCta', () => {
  it('shows Sign up CTA on /auth', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth');
    render(<GuestHeaderCta />);
    const link = screen.getByRole('link', { name: 'Sign up' });
    expect(link).toHaveAttribute('href', '/auth/signup');
  });

  it('shows Sign in CTA on /auth/signup', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth/signup');
    render(<GuestHeaderCta />);
    const link = screen.getByRole('link', { name: 'Sign in' });
    expect(link).toHaveAttribute('href', '/auth');
  });

  it('treats nested signup paths the same', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth/signup?step=2');
    render(<GuestHeaderCta />);
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('defaults to Sign up CTA on reset-password and unknown auth paths', () => {
    (usePathname as jest.Mock).mockReturnValue('/auth/reset-password');
    render(<GuestHeaderCta />);
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
  });

  it('handles null pathname (defaults to Sign up)', () => {
    (usePathname as jest.Mock).mockReturnValue(null);
    render(<GuestHeaderCta />);
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
  });
});
