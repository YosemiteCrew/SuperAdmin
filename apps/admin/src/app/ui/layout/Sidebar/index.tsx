'use client';

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MdClose,
  MdMenu,
  MdOutlineKeyboardDoubleArrowLeft,
  MdOutlineKeyboardDoubleArrowRight,
} from 'react-icons/md';

import styles from '../shell.module.css';

import { ROUTE_GROUPS } from '../nav';

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
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeCollapsed,
    isCollapsedByDefault,
    getCollapsedServerSnapshot
  );

  function handleToggle() {
    setCollapsedPreference(!collapsed);
    collapsedListeners.forEach((fn) => fn());
  }

  const showLabels = !collapsed || mobileOpen;
  const sidebarClassName = [
    styles.sidebar,
    collapsed ? styles.sidebarCollapsed : '',
    mobileOpen ? styles.sidebarMobileOpen : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <button
        type="button"
        className={styles.mobileNavToggle}
        aria-controls="main-navigation"
        aria-expanded={mobileOpen}
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        onClick={() => setMobileOpen((open) => !open)}
      >
        {mobileOpen ? <MdClose size={20} /> : <MdMenu size={20} />}
      </button>
      {mobileOpen ? (
        <button
          type="button"
          className={styles.sidebarBackdrop}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <nav id="main-navigation" aria-label="Main navigation" className={sidebarClassName}>
        <div>
          <Link
            href="/dashboard"
            aria-label="Yosemite Crew Super Admin home"
            className={showLabels ? styles.brand : `${styles.brand} ${styles.brandCollapsed}`}
            onClick={() => setMobileOpen(false)}
          >
            <Image
              src="/yosemite-crew-logo.png"
              alt="Yosemite Crew"
              width={30}
              height={30}
              priority
              className={styles.brandMark}
            />
            {showLabels ? (
              <span className={styles.brandText}>
                <span className={styles.brandName}>Yosemite Crew</span>
                <span className={styles.brandKicker}>Super Admin</span>
              </span>
            ) : null}
          </Link>
        </div>

        <div className={styles.routes}>
          {ROUTE_GROUPS.map((group) => (
            <div className={styles.routeGroup} key={group.label}>
              {showLabels ? <div className={styles.routeGroupLabel}>{group.label}</div> : null}
              <div className={styles.routeGroupItems}>
                {group.routes.map((route) => {
                  const active = isActive(pathname, route.href);
                  const RouteIcon = route.icon;
                  const className = active ? `${styles.route} ${styles.routeActive}` : styles.route;

                  if (!showLabels) {
                    return (
                      <span className={styles.tooltipHost} key={route.name}>
                        <Link
                          href={route.href}
                          className={className}
                          aria-current={active ? 'page' : undefined}
                          onClick={() => setMobileOpen(false)}
                        >
                          <span className="sr-only">{route.name}</span>
                          <span className={styles.routeCollapsedIconWrap}>
                            <span className={styles.routeIcon} aria-hidden>
                              <RouteIcon size={15} />
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
                      onClick={() => setMobileOpen(false)}
                    >
                      <span className={styles.routeIcon} aria-hidden>
                        <RouteIcon size={15} />
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
          {showLabels ? (
            <span className={styles.status}>
              <span className={styles.statusDot} aria-hidden />
              <span className={styles.statusLabel}>Core connected</span>
            </span>
          ) : null}
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
    </>
  );
}
