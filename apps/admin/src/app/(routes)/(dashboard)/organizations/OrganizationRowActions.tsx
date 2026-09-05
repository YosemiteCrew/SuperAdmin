'use client';

import { useState } from 'react';

import type { ApiEnvironment } from '@/app/config/apiEnvironment';
import type { VerificationState } from '@/app/features/organizations/verification';

import {
  reactivateOrganizationAction,
  suspendOrganizationAction,
  verifyOrganizationAction,
} from './actions';

const BTN = {
  primary:
    'inline-flex h-[30px] items-center rounded-full border border-[var(--btn)] bg-[var(--btn)] px-[14px] text-xs font-semibold text-[color:var(--btn-ink)] transition-opacity hover:opacity-90 disabled:opacity-60',
  danger:
    'inline-flex h-[30px] items-center rounded-full border border-[var(--danger-border)] px-[14px] text-xs font-semibold text-[color:var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)] disabled:opacity-60',
  plain:
    'inline-flex h-[30px] items-center rounded-full border border-[var(--divider)] px-[14px] text-xs font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--screen-2)] disabled:opacity-60',
} as const;

/**
 * Every action carries the environment the row was listed from, so a business
 * read from one backend can only ever be mutated on that same backend.
 */
function ActionFields({
  organizationId,
  name,
  environment,
}: Readonly<{ organizationId: string; name: string; environment: ApiEnvironment }>) {
  return (
    <>
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="organizationName" value={name} />
      <input type="hidden" name="env" value={environment} />
    </>
  );
}

export function OrganizationRowActions({
  organizationId,
  name,
  state,
  environment,
}: Readonly<{
  organizationId: string;
  name: string;
  state: VerificationState;
  environment: ApiEnvironment;
}>) {
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
          <ActionFields organizationId={organizationId} name={name} environment={environment} />
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
          <ActionFields organizationId={organizationId} name={name} environment={environment} />
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
          <ActionFields organizationId={organizationId} name={name} environment={environment} />
          <button type="submit" disabled={pending} className={BTN.danger}>
            Suspend
          </button>
        </form>
      )}
    </div>
  );
}
