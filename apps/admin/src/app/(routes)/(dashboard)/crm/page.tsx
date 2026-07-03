import type { Metadata } from 'next';
import Link from 'next/link';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getCampaigns } from '@/app/features/crm/campaigns/store';
import { getDiscordConfig } from '@/app/features/crm/discord/store';
import { serverEnv } from '@/app/config/env.server';

export const metadata: Metadata = { title: 'CRM' };

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default async function CrmPage() {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const [campaigns, discordConfig] = await Promise.all([getCampaigns(), getDiscordConfig()]);

  const plunkConfigured = Boolean(serverEnv.plunkApiKey);
  const discordConfigured = Boolean(discordConfig.webhookUrl);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-medium tracking-tight text-ink">CRM</h1>
          <p className="text-sm text-ink-3">Send campaigns via Plunk and post to Discord.</p>
        </div>
        <Link
          href="/crm/compose"
          className="h-10 rounded-xl bg-btn px-5 text-sm font-medium text-btn-ink inline-flex items-center"
        >
          New campaign
        </Link>
      </header>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-3">Plunk</p>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                plunkConfigured
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-ink-3/10 text-ink-3'
              }`}
            >
              {plunkConfigured ? 'Configured' : 'Not set'}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-3">{serverEnv.plunkApiEndpoint}</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-3">Discord</p>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                discordConfigured
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-ink-3/10 text-ink-3'
              }`}
            >
              {discordConfigured ? 'Connected' : 'Not set'}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-3">
            {discordConfigured
              ? discordConfig.channelName || 'Webhook active'
              : 'No webhook configured'}
          </p>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/crm/compose"
          className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)] hover:bg-raised transition-colors"
        >
          <p className="font-medium text-ink">Send campaign</p>
          <p className="mt-1 text-sm text-ink-3">Compose and send via Plunk</p>
        </Link>
        <Link
          href="/crm/discord"
          className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)] hover:bg-raised transition-colors"
        >
          <p className="font-medium text-ink">Discord</p>
          <p className="mt-1 text-sm text-ink-3">Configure webhook and broadcast</p>
        </Link>
      </div>

      {/* Campaign history */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(29,28,27,0.04),0_4px_12px_rgba(29,28,27,0.06)]">
        <div className="border-b border-line bg-raised px-5 py-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-ink-2">
            Recent campaigns
          </h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="p-5 text-sm text-ink-3">No campaigns sent yet.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-2">
                <th className="px-5 py-3">Subject</th>
                <th className="px-5 py-3">Audience</th>
                <th className="px-5 py-3">Sent</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">By</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-b-0">
                  <td className="px-5 py-3 font-medium text-ink">{c.subject}</td>
                  <td className="px-5 py-3 text-sm capitalize text-ink-2">{c.audience}</td>
                  <td className="px-5 py-3 text-sm text-ink-2">
                    {c.sentCount}
                    {c.failedCount > 0 ? (
                      <span className="ml-1 text-xs text-red-500">({c.failedCount} failed)</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-3 text-sm text-ink-2">{formatDate(c.sentAt)}</td>
                  <td className="px-5 py-3 text-sm text-ink-2">{c.sentByEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
