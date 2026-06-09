import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import { Sidebar } from '@/app/ui/layout/Sidebar';

const DASHBOARD_LINK_NAME = 'Dashboard';
const ARIA_CURRENT = 'aria-current';
const PAGE = 'page';

describe('Sidebar', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
  });

  it('renders all five nav items', () => {
    render(<Sidebar />);
    for (const label of ['Dashboard', 'Users', 'Organizations', 'Analytics', 'Settings']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
  });

  it('marks the Dashboard route as current when pathname is /dashboard', () => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: DASHBOARD_LINK_NAME })).toHaveAttribute(
      ARIA_CURRENT,
      PAGE
    );
  });

  it('marks the Users route as current when on a /users/:id route', () => {
    (usePathname as jest.Mock).mockReturnValue('/users/abc123');
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(ARIA_CURRENT, PAGE);
  });

  it('does NOT mark Dashboard active on /users routes (exact match for /dashboard)', () => {
    (usePathname as jest.Mock).mockReturnValue('/users');
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: DASHBOARD_LINK_NAME })).not.toHaveAttribute(
      ARIA_CURRENT,
      PAGE
    );
  });

  it('renders the collapse toggle button', () => {
    render(<Sidebar />);
    expect(
      screen.getByRole('button', { name: /collapse sidebar|expand sidebar/i })
    ).toBeInTheDocument();
  });
});
