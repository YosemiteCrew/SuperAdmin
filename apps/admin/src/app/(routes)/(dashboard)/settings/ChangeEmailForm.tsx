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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Updating…' : 'Change email'}
        </Button>
        {result ? (
          <output className={result.ok ? 'text-sm text-ink-3' : 'text-sm text-danger-600'}>
            {result.message}
          </output>
        ) : null}
      </div>
    </form>
  );
}
