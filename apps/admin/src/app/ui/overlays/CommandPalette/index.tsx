'use client';

import { useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';

import type { Dispatch, RefObject } from 'react';

import { useDebounce } from '@/app/hooks/useDebounce';
import { NAV_ROUTES } from '@/app/ui/layout/nav';
import { Modal } from '@/app/ui/overlays/Modal';

import type { DirectoryHit } from './searchAction';

const LIVE_SEARCH_MIN_CHARS = 2;
const LIVE_SEARCH_DEBOUNCE_MS = 250;

export const COMMAND_PALETTE_EVENT = 'yc:command-palette-open';

type SearchItem = {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  keywords: string;
  href: string;
  isQuick?: boolean;
};

// Shortcuts shown while the query is empty, in this order. Each names a route
// in NAV_ROUTES; PaletteQuickLinks in the test suite pins that they all resolve.
const QUICK_LINK_HREFS = ['/dashboard', '/users', '/organizations', '/analytics', '/settings'];

// Every sidebar destination is searchable, and the badge is its sidebar group,
// so the palette and the sidebar cannot drift apart again (#556).
const navigableItems: SearchItem[] = NAV_ROUTES.map((route) => ({
  id: `page:${route.href.slice(1)}`,
  badge: route.group,
  title: route.name,
  subtitle: route.description ?? '',
  // The group label is searchable too: it is what makes "privacy" find both
  // Consent and Data requests without repeating the word in either entry.
  keywords: `${route.keywords ?? ''} ${route.group}`.trim(),
  href: route.href,
}));

const quickLinkItems: SearchItem[] = QUICK_LINK_HREFS.flatMap((href) => {
  const route = NAV_ROUTES.find((candidate) => candidate.href === href);
  return route
    ? [
        {
          id: `quick:${href}`,
          badge: route.group,
          title: `Open ${route.name}`,
          subtitle: '',
          keywords: route.name,
          href,
          isQuick: true,
        },
      ]
    : [];
});

const getNextResultIndex = (activeIndex: number, resultCount: number, direction: 1 | -1) => {
  const safeCount = Math.max(resultCount, 1);
  return (activeIndex + direction + safeCount) % safeCount;
};

const buildResultItems = (query: string): SearchItem[] => {
  const q = query.trim().toLowerCase();
  if (!q) return quickLinkItems;

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

function useLiveDirectorySearch(query: string, isOpen: boolean) {
  const [liveHits, setLiveHits] = useState<DirectoryHit[]>([]);
  const debouncedQuery = useDebounce(query, LIVE_SEARCH_DEBOUNCE_MS);
  // Monotonic sequence: a slow earlier response must never clobber the
  // results of a later query.
  const searchSeq = useRef(0);

  useEffect(() => {
    const q = debouncedQuery.trim();
    if (!isOpen || q.length < LIVE_SEARCH_MIN_CHARS) {
      const timeout = globalThis.setTimeout(() => setLiveHits([]), 0);
      return () => globalThis.clearTimeout(timeout);
    }
    const seq = ++searchSeq.current;
    // Lazy import: keeps the server-action module (and its server-only
    // dependency chain) out of every consumer that merely renders the palette.
    import('./searchAction')
      .then(({ searchDirectoryAction }) => searchDirectoryAction(q))
      .then((hits) => {
        if (searchSeq.current === seq) setLiveHits(hits);
      })
      .catch(() => {
        if (searchSeq.current === seq) setLiveHits([]);
      });
  }, [debouncedQuery, isOpen]);

  return liveHits;
}

function useResultItems(query: string, liveHits: DirectoryHit[]) {
  return useMemo(() => {
    // Live directory hits lead: typing an email means the admin wants the
    // account, not a page link.
    const liveItems = liveHits.map((hit): SearchItem => ({
      id: `live:${hit.kind}:${hit.id}`,
      badge: hit.kind === 'user' ? 'User' : 'Organization',
      title: hit.title,
      subtitle: hit.kind === 'user' ? 'Open user account' : 'Open organization',
      keywords: hit.title,
      href: hit.href,
    }));
    return query.trim().length >= LIVE_SEARCH_MIN_CHARS
      ? [...liveItems, ...buildResultItems(query)]
      : buildResultItems(query);
  }, [query, liveHits]);
}

type KeyboardOptions = {
  isOpen: boolean;
  resultItems: SearchItem[];
  activeRowRef: RefObject<HTMLButtonElement | null>;
  resultsRef: RefObject<HTMLUListElement | null>;
  dispatch: Dispatch<PaletteAction>;
};

function usePaletteKeyboard(options: KeyboardOptions) {
  const { isOpen, resultItems, activeRowRef, resultsRef, dispatch } = options;
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

      // Escape is NOT handled here: the overlay is a modal <dialog>, so the
      // platform fires `cancel` and Modal's own handler closes it. A second
      // branch here would dispatch CLOSE twice for one key press.

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
        // A focused result activates itself. Cancelling that keydown here would
        // suppress the button's own activation and click the highlighted row
        // instead, which is a different result once the operator has tabbed
        // (#551). Enter from the input, or from nowhere, still takes the
        // highlight.
        const target = event.target;
        if (target instanceof Node && resultsRef.current?.contains(target)) return;
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
  }, [activeRowRef, dispatch, isOpen, resultItems, resultsRef]);
}

type LifecycleOptions = {
  isOpen: boolean;
  pathname: string;
  activeIndex: number;
  inputRef: RefObject<HTMLInputElement | null>;
  activeRowRef: RefObject<HTMLButtonElement | null>;
  dispatch: Dispatch<PaletteAction>;
};

function usePaletteLifecycle(options: LifecycleOptions) {
  const { isOpen, pathname, activeIndex, inputRef, activeRowRef, dispatch } = options;
  useEffect(() => {
    dispatch({ type: 'CLOSE_AND_CLEAR' });
  }, [dispatch, pathname]);

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
  }, [dispatch, inputRef, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, activeRowRef, isOpen]);

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);
}

type PaletteResultsProps = {
  readonly resultItems: SearchItem[];
  readonly activeIndex: number;
  readonly activeRowRef: RefObject<HTMLButtonElement | null>;
  readonly resultsRef: RefObject<HTMLUListElement | null>;
  readonly onActivate: (index: number) => void;
  readonly onSelect: (href: string) => void;
};

function PaletteResults(props: PaletteResultsProps) {
  const { resultItems, activeIndex, activeRowRef, resultsRef, onActivate, onSelect } = props;
  if (resultItems.length === 0) {
    return (
      <div className="px-4 py-7 text-center font-[var(--font-satoshi)] text-sm text-[var(--color-text-secondary)]">
        No matches found. Try a broader keyword.
      </div>
    );
  }

  return (
    <ul ref={resultsRef} className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Pages">
      {resultItems.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <li key={item.id}>
            <button
              ref={isActive ? activeRowRef : null}
              type="button"
              aria-current={isActive ? 'true' : undefined}
              onMouseEnter={() => onActivate(index)}
              onFocus={() => onActivate(index)}
              onClick={() => onSelect(item.href)}
              className={
                isActive
                  ? 'flex w-full min-h-[64px] items-center rounded-2xl border border-[var(--blue)]/30 bg-[var(--blue-soft)] px-3 py-2.5 text-left shadow-[0_6px_18px_var(--sh12)] transition-all duration-150'
                  : 'flex w-full min-h-[64px] items-center rounded-2xl border border-line bg-surface/62 px-3 py-2.5 text-left transition-all duration-150 hover:border-[var(--blue)]/25 hover:bg-surface/78'
              }
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate pr-2 font-[var(--font-satoshi)] text-sm text-[var(--color-text-primary)]">
                    {item.title}
                  </div>
                  <div className="shrink-0 rounded-xl border border-line bg-surface/72 px-2 py-0.5 font-[var(--font-satoshi)] text-[10px] font-medium uppercase tracking-[-0.22px] text-[var(--color-text-secondary)]">
                    {item.badge}
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
  );
}

type PaletteDialogProps = PaletteResultsProps & {
  readonly query: string;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly onQueryChange: (query: string) => void;
  readonly onClose: () => void;
};

function PaletteDialog(props: PaletteDialogProps) {
  const { query, inputRef, onQueryChange, onClose, ...resultsProps } = props;
  return (
    <Modal
      isOpen
      label="Command palette"
      onClose={onClose}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-2 backdrop:bg-[var(--glass-93)] backdrop:backdrop-blur-[8px] sm:p-6"
    >
      <div className="mx-auto mt-2 w-full max-w-2xl overflow-hidden rounded-2xl border border-[var(--ink-faint)]/80 bg-surface/68 shadow-[0_28px_70px_var(--sh12)] backdrop-blur-xl sm:mt-8">
        <div className="border-b border-line bg-[var(--blue-soft)] px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface/72 px-3 py-2 shadow-[inset_0_1px_0_var(--hairline-soft)] backdrop-blur-md">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search pages, users, organizations…"
              className="w-full border-0 bg-transparent font-[var(--font-satoshi)] text-sm text-[var(--color-text-primary)] outline-none placeholder:text-[var(--color-text-tertiary)]"
              aria-label="Command palette input"
            />
          </div>
        </div>
        <div className="scrollbar-custom max-h-[60vh] overflow-y-auto p-2.5 sm:p-3">
          <PaletteResults {...resultsProps} />
        </div>
      </div>
    </Modal>
  );
}

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();
  const [{ isOpen, query, activeIndex }, dispatch] = useReducer(paletteReducer, paletteInitial);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRowRef = useRef<HTMLButtonElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const liveHits = useLiveDirectorySearch(query, isOpen);
  const resultItems = useResultItems(query, liveHits);

  usePaletteKeyboard({ isOpen, resultItems, activeRowRef, resultsRef, dispatch });
  usePaletteLifecycle({ isOpen, pathname, activeIndex, inputRef, activeRowRef, dispatch });

  if (!isMounted || !isOpen) return null;

  return createPortal(
    <PaletteDialog
      query={query}
      resultItems={resultItems}
      activeIndex={activeIndex}
      inputRef={inputRef}
      activeRowRef={activeRowRef}
      resultsRef={resultsRef}
      onClose={() => dispatch({ type: 'CLOSE' })}
      onQueryChange={(nextQuery) => dispatch({ type: 'SET_QUERY', query: nextQuery })}
      onActivate={(index) => dispatch({ type: 'SET_ACTIVE', index })}
      onSelect={(href) => {
        dispatch({ type: 'SELECT_ITEM' });
        router.push(href);
      }}
    />,
    document.body
  );
}
