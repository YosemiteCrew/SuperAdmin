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
    document.documentElement.dataset.theme = resolveDark(next) ? 'dark' : 'light';
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex rounded-full border border-[color:var(--hairline)] bg-[var(--inset)] p-[3px]"
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
                ? 'flex h-[30px] items-center rounded-full bg-[var(--screen)] px-[15px] text-[12.5px] font-semibold text-[color:var(--ink)] shadow-[0_1px_2px_var(--sh10)]'
                : 'flex h-[30px] items-center rounded-full px-[15px] text-[12.5px] font-semibold text-[color:var(--ink-faint)] transition-colors hover:text-[color:var(--ink)]'
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
