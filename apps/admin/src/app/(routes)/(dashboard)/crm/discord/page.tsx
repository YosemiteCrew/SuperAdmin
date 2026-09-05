import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getDiscordConfig } from '@/app/features/crm/discord/store';

import { DiscordSettings } from './DiscordSettings';

export const metadata: Metadata = { title: 'Discord integration' };

const BACK_LINK =
  'inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--ink-muted)] transition-colors hover:text-[color:var(--ink)]';

export default async function DiscordPage() {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const config = await getDiscordConfig();

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-2">
        <Link href="/crm" className={BACK_LINK}>
          ← Back to CRM
        </Link>
        <div className="flex flex-col gap-[3px]">
          <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
            Discord
          </h1>
          <p className="text-[13.5px] text-[color:var(--ink-muted)]">
            Post campaign notifications and manual announcements to your Discord channel.
          </p>
        </div>
      </header>
      <DiscordSettings config={config} />
    </div>
  );
}
