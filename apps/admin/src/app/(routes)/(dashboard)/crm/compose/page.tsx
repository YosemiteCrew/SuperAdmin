import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';

import { ComposeForm } from './ComposeForm';

export const metadata: Metadata = { title: 'New campaign' };

const BACK_LINK =
  'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]';

export default async function ComposePage() {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-2">
        <Link href="/crm" className={BACK_LINK}>
          ← Back to CRM
        </Link>
        <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
          New campaign
        </h1>
      </header>
      <ComposeForm />
    </div>
  );
}
