import type { Metadata } from 'next';
import Link from 'next/link';
import type { IconType } from 'react-icons';
import { IoLogoDiscord, IoMailOutline } from 'react-icons/io5';

import { ensureSuperTokensInit, requireSuperAdmin } from '@/app/config/backend';
import { getCampaigns } from '@/app/features/crm/campaigns/store';
import { getDiscordConfig } from '@/app/features/crm/discord/store';
import { serverEnv } from '@/app/config/env.server';

import { SyncContactsButton } from './SyncContactsButton';

export const metadata: Metadata = { title: 'CRM' };

const CARD =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const PANEL_LABEL =
  'text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const TH =
  'px-[18px] py-3 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const TD = 'px-[18px] py-3 text-[13.5px] text-[color:var(--ink-muted)]';

const BADGE =
  'inline-flex flex-none rounded-full border px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]';
/** The house green-status badge (VERIFICATION_META.verified, CorroborationFlag).
 *  The design's --status-completed-* trio maps onto it exactly. */
const BADGE_OK =
  'border-[var(--success)]/40 bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]';
const BADGE_IDLE = 'border-[color:var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Connection state for an outbound integration. Green here is a status, not
 * decoration: it fires only when the integration is actually wired up.
 */
function StatusCard({
  label,
  icon: Icon,
  connected,
  connectedLabel,
  detail,
  mono,
}: Readonly<{
  label: string;
  icon: IconType;
  connected: boolean;
  connectedLabel: string;
  detail: string;
  mono?: boolean;
}>) {
  return (
    <div className={`${CARD} flex flex-col gap-[6px] px-5 py-4`}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-[9px] text-[13.5px] font-bold text-[color:var(--ink)]">
          <span
            aria-hidden
            className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[10px] bg-[var(--nav-active-bg)] text-[15px] text-[color:var(--nav-active)]"
          >
            <Icon />
          </span>
          {label}
        </span>
        <span className={`${BADGE} ${connected ? BADGE_OK : BADGE_IDLE}`}>
          {connected ? connectedLabel : 'Not set'}
        </span>
      </div>
      <p
        className={`truncate text-[12px] text-[color:var(--ink-faint)] ${mono ? 'font-mono' : ''}`}
        title={detail}
      >
        {detail}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
}: Readonly<{ href: string; title: string; description: string }>) {
  return (
    <Link
      href={href}
      className={`${CARD} flex flex-col gap-[3px] px-[22px] py-[18px] transition-colors hover:bg-[var(--surface-soft)]`}
    >
      <p className="text-[13.5px] font-semibold text-[color:var(--ink)]">{title}</p>
      <p className="text-[12.5px] text-[color:var(--ink-muted)]">{description}</p>
    </Link>
  );
}

export default async function CrmPage() {
  ensureSuperTokensInit();
  await requireSuperAdmin();

  const [campaigns, discordConfig] = await Promise.all([getCampaigns(), getDiscordConfig()]);

  const plunkConfigured = Boolean(serverEnv.plunkApiKey);
  const discordConfigured = Boolean(discordConfig.webhookUrl);

  return (
    <div className="flex flex-col gap-[22px]">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-[3px]">
          <h1 className="font-[family-name:var(--font-serif-display)] text-[28px] font-normal leading-tight tracking-[-0.015em] text-[color:var(--ink)]">
            CRM
          </h1>
          <p className="text-[13.5px] text-[color:var(--ink-muted)]">
            Send campaigns via Plunk and post to Discord.
          </p>
        </div>
        <div className="flex items-start gap-[10px]">
          <SyncContactsButton />
          <Link
            href="/crm/compose"
            className="yc-primary-button inline-flex h-10 items-center justify-center rounded-full bg-[var(--btn)] px-5 text-[13.5px] font-semibold text-[color:var(--btn-ink)]"
          >
            <span>New campaign</span>
          </Link>
        </div>
      </header>

      {/* Status cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatusCard
          label="Plunk"
          icon={IoMailOutline}
          connected={plunkConfigured}
          connectedLabel="Configured"
          detail={serverEnv.plunkApiEndpoint}
          mono
        />
        <StatusCard
          label="Discord"
          icon={IoLogoDiscord}
          connected={discordConfigured}
          connectedLabel="Connected"
          detail={
            discordConfigured
              ? discordConfig.channelName || 'Webhook active'
              : 'No webhook configured'
          }
        />
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <QuickLink
          href="/crm/compose"
          title="Send campaign"
          description="Compose and send via Plunk"
        />
        <QuickLink
          href="/crm/discord"
          title="Discord"
          description="Configure webhook and broadcast"
        />
      </section>

      {/* Campaign history */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="border-b border-[var(--hairline)] bg-[var(--screen-2)] px-[18px] py-3">
          <h2 className={PANEL_LABEL}>Recent campaigns</h2>
        </div>
        {campaigns.length === 0 ? (
          <p className="p-5 text-[13.5px] text-[color:var(--ink-faint)]">No campaigns sent yet.</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[var(--hairline)] bg-[var(--screen-2)] text-left">
                <th className={TH}>Subject</th>
                <th className={TH}>Audience</th>
                <th className={TH}>Sent</th>
                <th className={TH}>Date</th>
                <th className={TH}>By</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]"
                >
                  <td className="px-[18px] py-3 text-[13.5px] font-semibold text-[color:var(--ink)]">
                    {c.subject}
                  </td>
                  <td className={`${TD} capitalize`}>{c.audience}</td>
                  <td className={`${TD} tabular-nums`}>
                    {c.sentCount}
                    {c.failedCount > 0 ? (
                      <span className="ml-1 text-[11.5px] font-semibold text-[color:var(--danger-text)]">
                        ({c.failedCount} failed)
                      </span>
                    ) : null}
                  </td>
                  <td className={TD}>{formatDate(c.sentAt)}</td>
                  <td className={TD}>{c.sentByEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {/* The store caps history at MAX_CAMPAIGNS (50), so the design's footnote
            states a real retention rule rather than decoration. */}
        <p className="border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]">
          Last 50 campaigns are kept. Plunk handles unsubscribe links and suppression.
        </p>
      </section>
    </div>
  );
}
