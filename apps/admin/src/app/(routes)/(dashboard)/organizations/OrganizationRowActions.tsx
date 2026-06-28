'use client';

import { useState } from 'react';

import type { VerificationState } from '@/app/features/organizations/verification';

import {
  reactivateOrganizationAction,
  suspendOrganizationAction,
  verifyOrganizationAction,
} from './actions';

const BTN = {
  primary:
    'rounded-lg border border-btn bg-btn px-3 py-1 text-xs font-medium text-btn-ink transition-colors hover:opacity-90 disabled:opacity-60',
  danger:
    'rounded-lg border border-danger-600 px-3 py-1 text-xs font-medium text-danger-600 transition-colors hover:bg-danger-600 hover:text-white disabled:opacity-60',
  plain:
    'rounded-lg border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-raised disabled:opacity-60',
} as const;

export function OrganizationRowActions({
  organizationId,
  name,
  state,
}: Readonly<{ organizationId: string; name: string; state: VerificationState }>) {
  const [pending, setPending] = useState(false);

  function gate(message: string) {
    return (event: React.SyntheticEvent<HTMLFormElement>) => {
      if (!globalThis.confirm(message)) {
        event.preventDefault();
        return;
      }
      setPending(true);
    };
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {state === 'pending' ? (
        <form
          action={verifyOrganizationAction}
          onSubmit={gate(
            `Verify ${name}?\n\nThis makes the business visible to pet parents in the mobile app.`
          )}
          className="inline"
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="organizationName" value={name} />
          <button type="submit" disabled={pending} className={BTN.primary}>
            Verify
          </button>
        </form>
      ) : null}

      {state === 'suspended' ? (
        <form
          action={reactivateOrganizationAction}
          onSubmit={gate(`Reactivate ${name}?`)}
          className="inline"
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="organizationName" value={name} />
          <button type="submit" disabled={pending} className={BTN.plain}>
            Reactivate
          </button>
        </form>
      ) : (
        <form
          action={suspendOrganizationAction}
          onSubmit={gate(
            `Suspend ${name}?\n\nIt will be hidden from pet parents until reactivated.`
          )}
          className="inline"
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          <input type="hidden" name="organizationName" value={name} />
          <button type="submit" disabled={pending} className={BTN.danger}>
            Suspend
          </button>
        </form>
      )}
    </div>
  );
}
