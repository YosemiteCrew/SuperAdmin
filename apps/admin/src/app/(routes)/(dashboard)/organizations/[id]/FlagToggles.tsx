'use client';

import { useOptimistic, useTransition } from 'react';

import { FEATURE_FLAGS, type FeatureFlagKey } from '@/app/features/feature-flags/constants';
import type { OrgFlags } from '@/app/features/feature-flags/store';

import { toggleFlagAction } from './flagActions';

const FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];

export function FlagToggles({ orgId, flags }: { orgId: string; flags: OrgFlags }) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, addOptimistic] = useOptimistic(
    flags,
    (state: OrgFlags, { key, value }: { key: FeatureFlagKey; value: boolean }) => ({
      ...state,
      [key]: value,
    })
  );

  function toggle(key: FeatureFlagKey, currentValue: boolean) {
    const newValue = !currentValue;
    startTransition(async () => {
      addOptimistic({ key, value: newValue });
      const fd = new FormData();
      fd.set('orgId', orgId);
      fd.set('flag', key);
      fd.set('value', String(newValue));
      await toggleFlagAction(fd);
    });
  }

  return (
    <ul aria-busy={isPending}>
      {FLAG_KEYS.map((key) => {
        const meta = FEATURE_FLAGS[key];
        const enabled = optimistic[key];
        return (
          <li
            key={key}
            className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 last:border-b-0"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-ink">{meta.label}</span>
              <span className="text-xs text-ink-3">{meta.description}</span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => toggle(key, enabled)}
              disabled={isPending}
              className={`relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-btn disabled:cursor-not-allowed disabled:opacity-50 ${
                enabled ? 'bg-btn' : 'bg-raised'
              }`}
            >
              <span
                aria-hidden
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                  enabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
              <span className="sr-only">
                {enabled ? 'Disable' : 'Enable'} {meta.label}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
