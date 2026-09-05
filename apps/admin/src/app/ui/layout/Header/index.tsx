'use client';

import { usePathname } from 'next/navigation';
import { IoSearchOutline } from 'react-icons/io5';
import { MdNotificationsActive } from 'react-icons/md';

import { COMMAND_PALETTE_EVENT } from '@/app/ui/overlays/CommandPalette';
import styles from '@/app/ui/layout/shell.module.css';

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
    <header className={styles.headerShell}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.headerKicker}>Super Admin</span>
          <span className={styles.headerTitle}>{title}</span>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Open command palette"
            className={styles.searchPill}
          >
            <span className={styles.searchIcon} aria-hidden>
              <IoSearchOutline size={15} />
            </span>
            <span className={styles.searchPlaceholder}>Search users, organizations</span>
            <span className={styles.keycap} aria-hidden>
              ⌘K
            </span>
          </button>

          <button type="button" aria-label="Notifications" className={styles.iconButton}>
            <MdNotificationsActive size={17} />
            <span className={styles.bellDot} aria-hidden />
          </button>

          <UserMenu email={email} firstName={firstName} lastName={lastName} />
        </div>
      </div>
    </header>
  );
}
