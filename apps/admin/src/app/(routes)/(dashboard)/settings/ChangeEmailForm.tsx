'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/app/ui/components/Button';
import { Input } from '@/app/ui/components/Input';

import { changeEmailAction, type ChangeEmailResult } from './actions';

export function ChangeEmailForm({ currentEmail }: Readonly<{ currentEmail: string }>) {
  const [email, setEmail] = useState('');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ChangeEmailResult | null>(null);

  function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = email.trim();
    if (!next) return;
    if (
      !globalThis.confirm(
        `Change your sign-in email to ${next}?\n\nYou'll need to verify the new address, and you sign in with it from now on.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await changeEmailAction(next);
      setResult(res);
      if (res.ok) setEmail('');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Input
            label="New email"
            id="newEmail"
            name="newEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={currentEmail}
            required
          />
        </div>
        <Button type="submit" variant="secondary" size="sm" disabled={pending}>
          {pending ? 'Updating…' : 'Change email'}
        </Button>
      </div>
      <span className="text-[11.5px] text-[color:var(--ink-faint)]">
        The new address must be verified before it becomes the sign-in email.
      </span>
      {result ? (
        <output
          className={
            result.ok
              ? 'text-[12px] text-[color:var(--ink-faint)]'
              : 'text-[12px] text-[color:var(--danger-text)]'
          }
        >
          {result.message}
        </output>
      ) : null}
    </form>
  );
}
