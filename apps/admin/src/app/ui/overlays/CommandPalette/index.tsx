'use client';

import { useEffect, useMemo, useReducer, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

export const COMMAND_PALETTE_EVENT = 'yc:command-palette-open';

type Module = 'overview' | 'users' | 'organizations' | 'analytics' | 'settings';

type SearchItem = {
  id: string;
  module: Module;
  title: string;
  subtitle: string;
  keywords: string;
  href: string;
  isQuick?: boolean;
};

const moduleLabels: Record<Module, string> = {
  overview: 'Overview',
  users: 'Users',
  organizations: 'Organizations',
  analytics: 'Analytics',
  settings: 'Settings',
};

const quickLinks: Array<{ module: Module; title: string; href: string }> = [
  { module: 'overview', title: 'Open Dashboard', href: '/dashboard' },
  { module: 'users', title: 'Open Users', href: '/users' },
  { module: 'organizations', title: 'Open Organizations', href: '/organizations' },
  { module: 'analytics', title: 'Open Analytics', href: '/analytics' },
  { module: 'settings', title: 'Open Settings', href: '/settings' },
];

const navigableItems: SearchItem[] = [
  {
    id: 'page:dashboard',
    module: 'overview',
    title: 'Dashboard',
    subtitle: 'Stats overview, recent signups',
    keywords: 'dashboard overview home stats signups',
    href: '/dashboard',
  },
  {
    id: 'page:users',
    module: 'users',
    title: 'Users',
    subtitle: 'Browse all users, search by email, paginate',
    keywords: 'users people accounts members search list',
    href: '/users',
  },
  {
    id: 'page:organizations',
    module: 'organizations',
    title: 'Organizations',
    subtitle: 'Manage tenants and organizations',
    keywords: 'organizations orgs tenants companies workspaces',
    href: '/organizations',
  },
  {
    id: 'page:analytics',
    module: 'analytics',
    title: 'Analytics',
    subtitle: 'Reports, metrics and trends',
    keywords: 'analytics metrics reports insights dashboards trends',
    href: '/analytics',
  },
  {
    id: 'page:settings',
    module: 'settings',
    title: 'Settings',
    subtitle: 'Account and admin configuration',
    keywords: 'settings preferences configuration account admin',
    href: '/settings',
  },
];

const getNextResultIndex = (activeIndex: number, resultCount: number, direction: 1 | -1) => {
  const safeCount = Math.max(resultCount, 1);
  return (activeIndex + direction + safeCount) % safeCount;
};

const buildResultItems = (query: string): SearchItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) {
    return quickLinks.map(
      (link): SearchItem => ({
        id: `quick:${link.href}`,
        module: link.module,
        title: link.title,
        subtitle: '',
        keywords: link.title,
        href: link.href,
        isQuick: true,
      })
    );
  }

  const tokens = q.split(/\s+/).filter(Boolean);
  return navigableItems
    .map((item) => {
      const haystack = `${item.title} ${item.subtitle} ${item.keywords}`.toLowerCase();
      const allTokensMatch = tokens.every((token) => haystack.includes(token));
      if (!allTokensMatch) return null;
      const score = tokens.reduce((total, token) => {
        const idx = haystack.indexOf(token);
        return total + (idx === -1 ? 9999 : idx);
      }, 0);
      return { item, score };
    })
    .filter((entry): entry is { item: SearchItem; score: number } => entry !== null)
    .sort((a, b) => a.score - b.score)
    .map((entry) => entry.item);
};

type PaletteState = { isOpen: boolean; query: string; activeIndex: number };
type PaletteAction =
  | { type: 'TOGGLE' }
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'CLOSE_AND_CLEAR' }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SET_ACTIVE'; index: number }
  | { type: 'NAVIGATE'; direction: 1 | -1; resultCount: number }
  | { type: 'SELECT_ITEM' }
  | { type: 'OPEN_RESET' };

const paletteInitial: PaletteState = { isOpen: false, query: '', activeIndex: 0 };

function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  switch (action.type) {
    case 'TOGGLE':
      return { ...state, isOpen: !state.isOpen };
    case 'OPEN':
      return { ...state, isOpen: true };
    case 'CLOSE':
      return { ...state, isOpen: false };
    case 'CLOSE_AND_CLEAR':
      return { ...state, isOpen: false, query: '', activeIndex: 0 };
    case 'SET_QUERY':
      return { ...state, query: action.query, activeIndex: 0 };
    case 'SET_ACTIVE':
      return { ...state, activeIndex: action.index };
    case 'NAVIGATE':
      return {
        ...state,
        activeIndex: getNextResultIndex(state.activeIndex, action.resultCount, action.direction),
      };
    case 'SELECT_ITEM':
      return { ...state, isOpen: false, query: '' };
    case 'OPEN_RESET':
      return { ...state, activeIndex: 0 };
    default:
      return state;
  }
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [{ isOpen, query, activeIndex }, dispatch] = useReducer(paletteReducer, paletteInitial);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);

  // Avoids SSR/client mismatch for the portal — server returns false, client returns true
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const resultItems = useMemo(() => buildResultItems(query), [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (typeof event.key !== 'string') return;
      const key = event.key.toLowerCase();
      const withCommandKey = event.metaKey || event.ctrlKey;

      if (withCommandKey && (key === 'k' || key === 'p')) {
        event.preventDefault();
        dispatch({ type: 'TOGGLE' });
        return;
      }

      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        dispatch({ type: 'CLOSE' });
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        dispatch({ type: 'NAVIGATE', direction: 1, resultCount: resultItems.length });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        dispatch({ type: 'NAVIGATE', direction: -1, resultCount: resultItems.length });
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        activeRowRef.current?.click();
      }
    };

    const onCustomOpen = () => dispatch({ type: 'OPEN' });

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener(COMMAND_PALETTE_EVENT, onCustomOpen);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener(COMMAND_PALETTE_EVENT, onCustomOpen);
    };
  }, [activeIndex, isOpen, resultItems]);

  useEffect(() => {
    dispatch({ type: 'CLOSE_AND_CLEAR' });
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return;
    dispatch({ type: 'OPEN_RESET' });
    const timeout = globalThis.window?.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 20);
    return () => {
      if (timeout) globalThis.window.clearTimeout(timeout);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1200] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.25),_rgba(48,47,46,0.45))] p-2 backdrop-blur-[8px] sm:p-6">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0"
        onClick={() => dispatch({ type: 'CLOSE' })}
      />
      <dialog
        open
        aria-modal="true"
        aria-label="Command palette"
        className="mx-auto mt-2 w-full max-w-2xl overflow-hidden rounded-2xl border border-white/40 bg-white/68 shadow-[0_24px_70px_rgba(29,28,27,0.24)] backdrop-blur-xl sm:mt-8"
      >
        <div className="border-b border-white/55 bg-gradient-to-r from-[var(--color-brand-100)]/60 via-white/65 to-white/55 px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/72 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-md">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => dispatch({ type: 'SET_QUERY', query: event.target.value })}
              placeholder="Search pages, users, organizations…"
              className="w-full border-0 bg-transparent font-[var(--font-satoshi)] text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
              aria-label="Command palette input"
            />
          </div>
        </div>

        <div className="scrollbar-custom max-h-[60vh] overflow-y-auto p-2.5 sm:p-3">
          {resultItems.length === 0 ? (
            <div className="px-4 py-7 text-center font-[var(--font-satoshi)] text-sm text-[var(--color-text-secondary)]">
              No matches found. Try a broader keyword.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Pages">
              {resultItems.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                  <li key={item.id}>
                    <button
                      ref={isActive ? activeRowRef : null}
                      type="button"
                      aria-current={isActive ? 'true' : undefined}
                      onMouseEnter={() => dispatch({ type: 'SET_ACTIVE', index })}
                      onClick={() => {
                        dispatch({ type: 'SELECT_ITEM' });
                        router.push(item.href);
                      }}
                      className={
                        isActive
                          ? 'flex w-full min-h-[64px] items-center rounded-2xl border border-[var(--color-brand-950)]/30 bg-[linear-gradient(135deg,rgba(242,248,255,0.92),rgba(255,255,255,0.88))] px-3 py-2.5 text-left shadow-[0_6px_18px_rgba(36,122,237,0.12)] transition-all duration-150'
                          : 'flex w-full min-h-[64px] items-center rounded-2xl border border-white/45 bg-white/62 px-3 py-2.5 text-left transition-all duration-150 hover:border-[var(--color-brand-950)]/25 hover:bg-white/78'
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate pr-2 font-[var(--font-satoshi)] text-sm text-[var(--color-text-primary)]">
                            {item.title}
                          </div>
                          <div className="shrink-0 rounded-xl border border-white/65 bg-white/72 px-2 py-0.5 font-[var(--font-satoshi)] text-[10px] font-medium uppercase tracking-[-0.22px] text-[var(--color-text-secondary)]">
                            {moduleLabels[item.module]}
                          </div>
                        </div>
                        {item.subtitle && !item.isQuick ? (
                          <div className="truncate pt-0.5 font-[var(--font-satoshi)] text-xs text-[var(--color-text-secondary)]">
                            {item.subtitle}
                          </div>
                        ) : null}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </dialog>
    </div>,
    document.body
  );
}
