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
  MdOutlineCorporateFare,
  MdOutlineKeyboardDoubleArrowLeft,
  MdOutlineKeyboardDoubleArrowRight,
  MdOutlineMonitor,
} from 'react-icons/md';

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
      {
        name: 'Organizations',
        href: '/organizations',
        icon: MdOutlineCorporateFare,
      },
      { name: 'Admins', href: '/admins', icon: MdOutlineAdminPanelSettings },
    ],
  },
  {
    label: 'Insights',
    routes: [
      { name: 'Analytics', href: '/analytics', icon: IoAnalyticsOutline },
      { name: 'Audit log', href: '/audit', icon: MdHistory },
      { name: 'System Health', href: '/health', icon: MdOutlineMonitor },
    ],
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
      className={collapsed ? 'sidebar sidebar-collapsed' : 'sidebar'}
    >
      <div className="sidebar-top">
        <Link
          href="/dashboard"
          aria-label="Yosemite Crew Super Admin home"
          className={collapsed ? 'logo logo-collapsed' : 'logo'}
        >
          <Image
            src="/yosemite-crew-logo.png"
            alt="Yosemite Crew"
            width={112}
            height={52}
            priority
            style={{ width: 'auto' }}
          />
        </Link>
      </div>

      <div className="sidebar-routes">
        {ROUTE_GROUPS.map((group) => (
          <div className="sidebar-route-group" key={group.label}>
            {collapsed ? null : <div className="sidebar-route-group-label">{group.label}</div>}
            <div className="sidebar-route-group-items">
              {group.routes.map((route) => {
                const active = isActive(pathname, route.href);
                const RouteIcon = route.icon;
                const className = active ? 'route route-active' : 'route';

                if (collapsed) {
                  return (
                    <span className="yc-tooltip-host" key={route.name}>
                      <Link
                        href={route.href}
                        className={className}
                        aria-current={active ? 'page' : undefined}
                      >
                        <span className="sr-only">{route.name}</span>
                        <span className="route-collapsed-icon-wrap">
                          <span className="route-icon" aria-hidden>
                            <RouteIcon size={18} />
                          </span>
                        </span>
                      </Link>
                      <span className="yc-tooltip" role="tooltip">
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
                    <span className="route-icon" aria-hidden>
                      <RouteIcon size={18} />
                    </span>
                    <span className="route-label">{route.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <span className="yc-tooltip-host">
          <button
            type="button"
            onClick={handleToggle}
            className="sidebar-collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <MdOutlineKeyboardDoubleArrowRight size={21} />
            ) : (
              <MdOutlineKeyboardDoubleArrowLeft size={21} />
            )}
          </button>
          <span className="yc-tooltip" role="tooltip">
            {collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          </span>
        </span>
      </div>
    </nav>
  );
}
