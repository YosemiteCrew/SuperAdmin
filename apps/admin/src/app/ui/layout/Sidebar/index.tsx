'use client';

import { useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { IconType } from 'react-icons';
import { IoAnalyticsOutline, IoPeopleOutline, IoSettingsOutline } from 'react-icons/io5';
import {
  MdDashboard,
  MdHistory,
  MdOutlineAdminPanelSettings,
  MdOutlineCampaign,
  MdOutlineCorporateFare,
  MdOutlineHowToReg,
  MdOutlineKeyboardDoubleArrowLeft,
  MdOutlineKeyboardDoubleArrowRight,
  MdOutlineHub,
  MdOutlineForwardToInbox,
  MdOutlineMailOutline,
  MdOutlineMonitor,
  MdOutlinePrivacyTip,
} from 'react-icons/md';
import { SiDiscord } from 'react-icons/si';

import styles from '../shell.module.css';

type RouteItem = {
  name: string;
  href: string;
  icon: IconType;
};

type RouteGroup = {
  label: string;
  routes: RouteItem[];
};

const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: 'Overview',
    routes: [{ name: 'Dashboard', href: '/dashboard', icon: MdDashboard }],
  },
  {
    label: 'People & Access',
    routes: [
      { name: 'Users', href: '/users', icon: IoPeopleOutline },
      { name: 'Approvals', href: '/approvals', icon: MdOutlineHowToReg },
      {
        name: 'Organizations',
        href: '/organizations',
        icon: MdOutlineCorporateFare,
      },
      { name: 'Admins', href: '/admins', icon: MdOutlineAdminPanelSettings },
      { name: 'Invites', href: '/invites', icon: MdOutlineMailOutline },
    ],
  },
  {
    label: 'Insights',
    routes: [
      { name: 'Analytics', href: '/analytics', icon: IoAnalyticsOutline },
      { name: 'Audit log', href: '/audit', icon: MdHistory },
      { name: 'Consent', href: '/consent', icon: MdOutlinePrivacyTip },
      { name: 'System Health', href: '/health', icon: MdOutlineMonitor },
    ],
  },
  {
    label: 'CRM',
    routes: [
      { name: 'Campaigns', href: '/crm', icon: MdOutlineCampaign },
      { name: 'Discord', href: '/crm/discord', icon: SiDiscord },
      { name: 'Contact requests', href: '/crm/requests', icon: MdOutlineForwardToInbox },
    ],
  },
  {
    label: 'Compliance',
    routes: [{ name: 'Data requests', href: '/privacy/requests', icon: MdOutlinePrivacyTip }],
  },
  {
    label: 'Federation',
    routes: [{ name: 'AP Instances', href: '/ap', icon: MdOutlineHub }],
  },
  {
    label: 'Account',
    routes: [{ name: 'Settings', href: '/settings', icon: IoSettingsOutline }],
  },
];

const COLLAPSE_STORAGE_KEY = 'yc-admin-sidebar-collapsed';

function isCollapsedByDefault(): boolean {
  if (globalThis.window === undefined) return false;
  try {
    return globalThis.localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function setCollapsedPreference(value: boolean): void {
  if (globalThis.window === undefined) return;
  try {
    globalThis.localStorage.setItem(COLLAPSE_STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* storage unavailable */
  }
}

const collapsedListeners = new Set<() => void>();

function subscribeCollapsed(listener: () => void) {
  collapsedListeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === COLLAPSE_STORAGE_KEY) listener();
  };
  globalThis.addEventListener('storage', onStorage);
  return () => {
    collapsedListeners.delete(listener);
    globalThis.removeEventListener('storage', onStorage);
  };
}

const getCollapsedServerSnapshot = () => false;

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname() ?? '';
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    isCollapsedByDefault,
    getCollapsedServerSnapshot
  );

  function handleToggle() {
    setCollapsedPreference(!collapsed);
    collapsedListeners.forEach((fn) => fn());
  }

  return (
    <nav
      aria-label="Main navigation"
      className={collapsed ? `${styles.sidebar} ${styles.sidebarCollapsed}` : styles.sidebar}
    >
      <div>
        <Link
          href="/dashboard"
          aria-label="Yosemite Crew Super Admin home"
          className={collapsed ? `${styles.brand} ${styles.brandCollapsed}` : styles.brand}
        >
          <Image
            src="/yosemite-crew-logo.png"
            alt="Yosemite Crew"
            width={30}
            height={30}
            priority
            className={styles.brandMark}
          />
          {collapsed ? null : (
            <span className={styles.brandText}>
              <span className={styles.brandName}>Yosemite Crew</span>
              <span className={styles.brandKicker}>Super Admin</span>
            </span>
          )}
        </Link>
      </div>

      <div className={styles.routes}>
        {ROUTE_GROUPS.map((group) => (
          <div className={styles.routeGroup} key={group.label}>
            {collapsed ? null : <div className={styles.routeGroupLabel}>{group.label}</div>}
            <div className={styles.routeGroupItems}>
              {group.routes.map((route) => {
                const active = isActive(pathname, route.href);
                const RouteIcon = route.icon;
                const className = active ? `${styles.route} ${styles.routeActive}` : styles.route;

                if (collapsed) {
                  return (
                    <span className={styles.tooltipHost} key={route.name}>
                      <Link
                        href={route.href}
                        className={className}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="sr-only">{route.name}</span>
                        <span className={styles.routeCollapsedIconWrap}>
                          <span className={styles.routeIcon} aria-hidden>
                            <RouteIcon size={18} />
                          </span>
                        </span>
                      </Link>
                      <span className={styles.tooltip} role="tooltip">
                        {group.label}: {route.name}
                      </span>
                    </span>
                  );
                }

                return (
                  <Link
                    key={route.name}
                    href={route.href}
                    className={className}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className={styles.routeIcon} aria-hidden>
                      <RouteIcon size={18} />
                    </span>
                    <span className={styles.routeLabel}>{route.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div
        className={
          collapsed
            ? `${styles.sidebarFooter} ${styles.sidebarFooterCollapsed}`
            : styles.sidebarFooter
        }
      >
        {collapsed ? null : (
          <span className={styles.status}>
            <span className={styles.statusDot} aria-hidden />
            <span className={styles.statusLabel}>Core connected</span>
          </span>
        )}
        <span className={styles.tooltipHost}>
          <button
            type="button"
            onClick={handleToggle}
            className={styles.collapseBtn}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <MdOutlineKeyboardDoubleArrowRight size={17} />
            ) : (
              <MdOutlineKeyboardDoubleArrowLeft size={17} />
            )}
          </button>
          <span className={styles.tooltip} role="tooltip">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </span>
        </span>
      </div>
    </nav>
  );
}
