'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const OPTIONS: ReadonlyArray<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

function resolveDark(theme: Theme): boolean {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = globalThis.localStorage?.getItem('theme') as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored);
    }
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    try {
      globalThis.localStorage?.setItem('theme', next);
    } catch {
      /* storage may be unavailable (private mode) — theme still applies for this session */
    }
    document.documentElement.setAttribute('data-theme', resolveDark(next) ? 'dark' : 'light');
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex rounded-xl border border-line bg-canvas p-1"
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => apply(option.value)}
            className={
              active
                ? 'rounded-lg bg-surface px-3 py-1.5 text-sm font-medium text-ink shadow-[0_1px_2px_rgba(29,28,27,0.08)]'
                : 'rounded-lg px-3 py-1.5 text-sm font-medium text-ink-3 transition-colors hover:text-ink'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
