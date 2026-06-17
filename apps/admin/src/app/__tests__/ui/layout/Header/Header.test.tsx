import { render, screen, fireEvent } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import { Header } from '@/app/ui/layout/Header';
import { COMMAND_PALETTE_EVENT } from '@/app/ui/overlays/CommandPalette';

jest.mock('supertokens-auth-react/recipe/emailpassword', () => ({
  signOut: jest.fn(),
}));

describe('Header', () => {
  it('shows the SUPER ADMIN kicker', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<Header email="admin@x.com" firstName="Admin" lastName={null} />);
    expect(screen.getByText(/Super Admin/i)).toBeInTheDocument();
  });

  it('resolves the section title from pathname', () => {
    (usePathname as jest.Mock).mockReturnValue('/users');
    render(<Header email="x@x.com" firstName={null} lastName={null} />);
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('falls back to Overview for unknown paths', () => {
    (usePathname as jest.Mock).mockReturnValue('/something-else');
    render(<Header email="x@x.com" firstName={null} lastName={null} />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('dispatches the command-palette open event on chip click', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    const handler = jest.fn();
    document.addEventListener(COMMAND_PALETTE_EVENT, handler);
    render(<Header email="x@x.com" firstName={null} lastName={null} />);
    fireEvent.click(screen.getByRole('button', { name: /open command palette/i }));
    expect(handler).toHaveBeenCalled();
    document.removeEventListener(COMMAND_PALETTE_EVENT, handler);
  });
});
