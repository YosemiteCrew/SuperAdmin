'use client';

import { useState } from 'react';

import { Button } from '@/app/ui/components/Button';
import { Input } from '@/app/ui/components/Input';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ProfileForm({
  firstName,
  lastName,
}: Readonly<{ firstName: string; lastName: string }>) {
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('saving');
    setMessage('');
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: first.trim(), lastName: last.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setStatus('error');
        setMessage(data?.error ?? 'Could not save your profile.');
        return;
      }
      setStatus('saved');
      setMessage('Profile updated.');
    } catch {
      setStatus('error');
      setMessage('Network error — please try again.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="First name"
        id="firstName"
        name="firstName"
        value={first}
        onChange={(e) => setFirst(e.target.value)}
        required
      />
      <Input
        label="Last name"
        id="lastName"
        name="lastName"
        value={last}
        onChange={(e) => setLast(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save changes'}
        </Button>
        {message ? (
          <output className={status === 'error' ? 'text-sm text-danger-600' : 'text-sm text-ink-3'}>
            {message}
          </output>
        ) : null}
      </div>
    </form>
  );
}
