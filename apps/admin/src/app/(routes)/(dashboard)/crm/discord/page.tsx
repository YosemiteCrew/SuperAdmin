import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getDiscordConfig } from '@/app/features/crm/discord/store';

import { DiscordSettings } from './DiscordSettings';

export const metadata: Metadata = { title: 'Discord integration' };

export default async function DiscordPage() {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const config = await getDiscordConfig();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <Link href="/crm" className="text-sm text-ink-2 hover:text-ink">
          ← Back to CRM
        </Link>
        <h1 className="text-2xl font-medium tracking-tight text-ink">Discord</h1>
        <p className="text-sm text-ink-3">
          Post campaign notifications and manual announcements to your Discord channel.
        </p>
      </header>
      <DiscordSettings config={config} />
    </div>
  );
}
