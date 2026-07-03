import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';

import { ComposeForm } from './ComposeForm';

export const metadata: Metadata = { title: 'New campaign' };

export default async function ComposePage() {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href="/crm" className="text-sm text-ink-2 hover:text-ink">
          ← Back to CRM
        </Link>
        <h1 className="text-2xl font-medium tracking-tight text-ink">New campaign</h1>
      </header>
      <ComposeForm />
    </div>
  );
}
