'use client';

import { usePathname } from 'next/navigation';
import { MdNotificationsActive } from 'react-icons/md';

import { COMMAND_PALETTE_EVENT } from '@/app/ui/overlays/CommandPalette';

import { UserMenu } from './UserMenu';

const SECTION_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Users',
  '/organizations': 'Organizations',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

function resolveTitle(pathname: string): string {
  for (const prefix of Object.keys(SECTION_TITLES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return SECTION_TITLES[prefix];
    }
  }
  return 'Overview';
}

function openCommandPalette() {
  document.dispatchEvent(new Event(COMMAND_PALETTE_EVENT));
}

export function Header({
  email,
  firstName,
  lastName,
}: Readonly<{
  email: string;
  firstName: string | null;
  lastName: string | null;
}>) {
  const pathname = usePathname() ?? '/dashboard';
  const title = resolveTitle(pathname);

  return (
    <header className="yc-user-header-shell">
      <div className="yc-user-header">
        <div className="yc-header-left">
          <span className="yc-header-kicker">Super Admin</span>
          <span className="yc-header-title">{title}</span>
        </div>

        <div className="yc-header-actions">
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            className="yc-command-button"
          >
            <span className="yc-command-key">⌘</span>
            <span className="yc-command-divider">/</span>
            <span className="yc-command-key">Ctrl</span>
            <span className="yc-command-divider">+</span>
            <span className="yc-command-key">K</span>
          </button>

          <button type="button" aria-label="Notifications" className="yc-icon-button">
            <MdNotificationsActive size={19} />
          </button>

          <UserMenu email={email} firstName={firstName} lastName={lastName} />
        </div>
      </div>
    </header>
  );
}
