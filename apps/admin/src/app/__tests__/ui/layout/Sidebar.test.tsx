import { act, fireEvent, render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';

import { Sidebar } from '@/app/ui/layout/Sidebar';

const DASHBOARD_LINK_NAME = 'Dashboard';
const ARIA_CURRENT = 'aria-current';
const PAGE = 'page';
const COLLAPSE_KEY = 'yc-admin-sidebar-collapsed';

describe('Sidebar', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/dashboard');
    globalThis.localStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.localStorage.clear();
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

  it('renders without an active route when the pathname is null', () => {
    (usePathname as jest.Mock).mockReturnValue(null);
    render(<Sidebar />);
    expect(screen.getByRole('link', { name: DASHBOARD_LINK_NAME })).not.toHaveAttribute(
      ARIA_CURRENT,
      PAGE
    );
  });

  it('starts collapsed when the stored preference is set', () => {
    globalThis.localStorage.setItem(COLLAPSE_KEY, '1');
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
    // Route links remain reachable by their accessible (sr-only) names.
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
  });

  it('toggles and persists the collapsed preference when the button is clicked', () => {
    render(<Sidebar />);
    const toggle = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(toggle);
    expect(globalThis.localStorage.getItem(COLLAPSE_KEY)).toBe('1');
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it('reacts to a storage event for the collapse key and ignores other keys', () => {
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();

    act(() => {
      globalThis.dispatchEvent(new StorageEvent('storage', { key: 'unrelated-key' }));
    });
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();

    globalThis.localStorage.setItem(COLLAPSE_KEY, '1');
    act(() => {
      globalThis.dispatchEvent(new StorageEvent('storage', { key: COLLAPSE_KEY }));
    });
    expect(screen.getByRole('button', { name: /expand sidebar/i })).toBeInTheDocument();
  });

  it('falls back to expanded when reading localStorage throws', () => {
    jest.spyOn(globalThis.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<Sidebar />);
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });

  it('swallows errors when writing the preference fails', () => {
    jest.spyOn(globalThis.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    render(<Sidebar />);
    const toggle = screen.getByRole('button', { name: /collapse sidebar/i });
    // The write throws and is swallowed; since the collapsed state is derived
    // from storage, it stays expanded rather than crashing.
    expect(() => fireEvent.click(toggle)).not.toThrow();
    expect(screen.getByRole('button', { name: /collapse sidebar/i })).toBeInTheDocument();
  });
});
