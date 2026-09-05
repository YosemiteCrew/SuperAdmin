'use client';

import { useActionState, useState } from 'react';
import type { APLicenseToken } from '@superadmin/database';
import { issueLicenseTokenAction, revokeLicenseTokenAction } from './actions';
import type { IssueResult } from './actions';

type TokenStatus = 'active' | 'expired' | 'revoked';

const CARD =
  'rounded-[18px] border border-[var(--hairline)] bg-[var(--screen)] shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]';
const TH =
  'px-5 py-[11px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-[color:var(--ink-faint)]';
const TD = 'px-5 py-[13px] text-[13px] text-[color:var(--ink-muted)]';
const BADGE =
  'inline-flex items-center rounded-full border px-[10px] py-[3px] text-[10px] font-bold uppercase tracking-[0.08em]';
const FIELD_LABEL = 'text-[11px] font-semibold text-[color:var(--ink-soft)]';
const FIELD =
  'h-[38px] rounded-[11px] border-[1.5px] border-[var(--hairline)] bg-[var(--field-bg)] px-3 text-[12.5px] text-[color:var(--ink)] outline-none transition-colors placeholder:text-[color:var(--ink-faint)] focus:border-[color:var(--blue)]';

/** Green is reserved for a good status: an active licence is exactly that.
 *  Split from the fill so the issued-token panel can take the border alone
 *  without a second `bg-*` fighting the card's own background. */
const GREEN_BORDER = 'border-[var(--success)]/40';
const GREEN = `${GREEN_BORDER} bg-[var(--avatar-green-bg)] text-[color:var(--avatar-green-ink)]`;

function getStatus(token: APLicenseToken): TokenStatus {
  if (token.revokedAt) return 'revoked';
  if (token.expiresAt < new Date()) return 'expired';
  return 'active';
}

const STATUS_CLASSES: Record<TokenStatus, string> = {
  active: GREEN,
  expired: 'border-[var(--warn-border)] bg-[var(--warn-bg)] text-[color:var(--warn-text)]',
  revoked: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[color:var(--danger-text)]',
};

const STATUS_LABELS: Record<TokenStatus, string> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
};

function StatusBadge({ status }: { readonly status: TokenStatus }) {
  return <span className={`${BADGE} ${STATUS_CLASSES[status]}`}>{STATUS_LABELS[status]}</span>;
}

const FREE_TIER_CLASS = 'border-[var(--hairline)] bg-[var(--inset)] text-[color:var(--ink-faint)]';

/**
 * `tier` is an unconstrained string column, so a value with no entry here is
 * reachable. The lookup is typed as possibly-undefined to say that out loud:
 * as a plain Record<string, string> the type claims every key resolves, which
 * makes the fallback below look like dead code while it is in fact the only
 * thing standing between an unknown tier and an `undefined` in the class list.
 */
const TIER_CLASSES: Record<string, string | undefined> = {
  pro: 'border-[var(--blue-soft)] bg-[var(--blue-soft)] text-[color:var(--blue-text)]',
  enterprise:
    'border-[var(--avatar-violet-bg)] bg-[var(--avatar-violet-bg)] text-[color:var(--avatar-violet-ink)]',
  free: FREE_TIER_CLASS,
};

function TierBadge({ tier }: { readonly tier: string }) {
  const cls = TIER_CLASSES[tier] ?? FREE_TIER_CLASS;
  return <span className={`${BADGE} ${cls}`}>{tier}</span>;
}

function RevokeButton({ tokenId }: { readonly tokenId: string }) {
  const [, action, isPending] = useActionState<null, FormData>(async (_prev, formData) => {
    await revokeLicenseTokenAction(formData);
    return null;
  }, null);
  return (
    <form action={action}>
      <input type="hidden" name="tokenId" value={tokenId} />
      <button
        type="submit"
        disabled={isPending}
        onClick={(e) => {
          if (
            !window.confirm(
              'Revoke this token? Federated instances will lose access within 24 hours.'
            )
          ) {
            e.preventDefault();
          }
        }}
        className="inline-flex h-7 items-center rounded-full border border-[var(--danger-border)] px-3 text-[11.5px] font-semibold text-[color:var(--danger-text)] transition-colors hover:bg-[var(--danger-bg)] disabled:opacity-60"
      >
        {isPending ? 'Revoking...' : 'Revoke'}
      </button>
    </form>
  );
}

/**
 * Copy affordance from the design. The token box below stays a readonly
 * textarea so the value is still selectable by hand when the async clipboard
 * API is unavailable (it requires a secure context).
 */
function CopyButton({ value }: { readonly value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        // lib.dom types navigator.clipboard as always present, but it is absent
        // outside a secure context, so hold it in a nullable alias: an optional
        // chain here reads as a guard against something the type calls
        // impossible, and the textarea below is the fallback either way.
        const clipboard: Clipboard | undefined = navigator.clipboard;
        if (!clipboard) return;
        clipboard.writeText(value).then(
          () => setCopied(true),
          () => setCopied(false)
        );
      }}
      className="inline-flex h-8 flex-none items-center rounded-full border border-[var(--divider)] px-3 text-[11.5px] font-semibold text-[color:var(--ink)] transition-colors hover:bg-[var(--surface-soft)]"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function IssuedTokenPanel({ token }: { readonly token: string }) {
  return (
    <section
      className={`rounded-[18px] border ${GREEN_BORDER} bg-[var(--screen)] px-5 py-4 shadow-[0_1px_2px_var(--sh03),0_8px_22px_var(--sh05)]`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12.5px] font-bold text-[color:var(--avatar-green-ink)]">
          Token issued. Copy it now — it will not be shown again.
        </p>
        <CopyButton value={token} />
      </div>
      <textarea
        readOnly
        rows={4}
        defaultValue={token}
        className="mt-2.5 w-full resize-none rounded-[10px] border border-[var(--hairline)] bg-[var(--field-bg)] p-2.5 font-mono text-[11px] leading-relaxed text-[color:var(--ink-2)] outline-none"
      />
    </section>
  );
}

function IssueForm() {
  const [result, action, isPending] = useActionState<IssueResult | null, FormData>(
    async (_prev, formData) => {
      return issueLicenseTokenAction(formData);
    },
    null
  );

  return (
    <div
      className={
        result?.ok ? 'grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.35fr_1fr]' : undefined
      }
    >
      <section className={`${CARD} flex flex-col gap-2.5 px-5 py-4`}>
        <h2 className="text-[13px] font-bold text-[color:var(--ink)]">Issue new license token</h2>
        <form action={action} className="flex flex-wrap items-end gap-2.5">
          <div className="flex w-[170px] flex-col gap-1.5">
            <label htmlFor="ap-orgId" className={FIELD_LABEL}>
              Org ID
            </label>
            <input
              id="ap-orgId"
              name="orgId"
              required
              placeholder="org_abc123"
              className={`${FIELD} font-mono`}
            />
          </div>
          <div className="flex min-w-[190px] flex-1 flex-col gap-1.5">
            <label htmlFor="ap-domain" className={FIELD_LABEL}>
              Instance domain
            </label>
            <input
              id="ap-domain"
              name="instanceDomain"
              required
              placeholder="pims.vetclinic.com"
              className={`${FIELD} font-mono`}
            />
          </div>
          <div className="flex w-[130px] flex-col gap-1.5">
            <label htmlFor="ap-tier" className={FIELD_LABEL}>
              Tier
            </label>
            <select id="ap-tier" name="tier" className={FIELD}>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="yc-primary-button inline-flex h-[38px] flex-none items-center justify-center rounded-full bg-[var(--btn)] px-5 text-[12.5px] font-semibold text-[color:var(--btn-ink)] disabled:opacity-60"
          >
            <span>{isPending ? 'Issuing...' : 'Issue token'}</span>
          </button>
        </form>
        {result && !result.ok && (
          <p className="text-[12.5px] font-semibold text-[color:var(--danger-text)]">
            {result.error}
          </p>
        )}
        <p className="text-[11.5px] text-[color:var(--ink-faint)]">
          Tokens are RS256 JWTs valid for 90 days; instances verify them against the published
          signing key.
        </p>
      </section>

      {result?.ok && <IssuedTokenPanel token={result.token} />}
    </div>
  );
}

function TokenRow({ token }: { readonly token: APLicenseToken }) {
  const status = getStatus(token);
  return (
    <tr className="border-b border-[var(--hairline)] transition-colors last:border-b-0 hover:bg-[var(--surface-soft)]">
      <td className="truncate px-5 py-[13px] font-mono text-[12px] font-semibold text-[color:var(--ink)]">
        {token.instanceDomain}
      </td>
      <td className="px-5 py-[13px] font-mono text-[11.5px] text-[color:var(--ink-muted)]">
        {token.orgId}
      </td>
      <td className="px-5 py-[13px]">
        <TierBadge tier={token.tier} />
      </td>
      <td className={TD}>{token.issuedAt.toLocaleDateString()}</td>
      <td className={TD}>{token.expiresAt.toLocaleDateString()}</td>
      <td className="px-5 py-[13px]">
        <StatusBadge status={status} />
      </td>
      <td className="px-5 py-[13px] text-right">
        {status === 'active' && <RevokeButton tokenId={token.id} />}
      </td>
    </tr>
  );
}

export function InstancesTable({ tokens }: { readonly tokens: APLicenseToken[] }) {
  return (
    <div className="flex flex-col gap-4">
      <IssueForm />

      {tokens.length === 0 ? (
        <div className={`${CARD} p-10 text-center text-[13.5px] text-[color:var(--ink-muted)]`}>
          No AP license tokens issued yet.
        </div>
      ) : (
        <section className={`${CARD} overflow-hidden`}>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--hairline)] bg-[var(--screen-2)]">
                  <th className={`${TH} w-[25%]`}>Domain</th>
                  <th className={`${TH} w-[17%]`}>Org ID</th>
                  <th className={`${TH} w-[13%]`}>Tier</th>
                  <th className={`${TH} w-[14%]`}>Issued</th>
                  <th className={`${TH} w-[14%]`}>Expires</th>
                  <th className={`${TH} w-[16%]`}>Status</th>
                  <th className={`${TH} w-[110px] text-right`} />
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <TokenRow key={token.id} token={token} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-[var(--hairline)] px-5 py-3 text-[12px] text-[color:var(--ink-faint)]">
            Revoking publishes the token id to the revocation list; federated instances lose access
            within 24 hours.
          </p>
        </section>
      )}
    </div>
  );
}
