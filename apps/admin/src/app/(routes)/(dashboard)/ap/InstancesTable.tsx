'use client';

import { useActionState } from 'react';
import type { APLicenseToken } from '@superadmin/database';
import { issueLicenseTokenAction, revokeLicenseTokenAction } from './actions';
import type { IssueResult } from './actions';

type TokenStatus = 'active' | 'expired' | 'revoked';

function getStatus(token: APLicenseToken): TokenStatus {
  if (token.revokedAt) return 'revoked';
  if (token.expiresAt < new Date()) return 'expired';
  return 'active';
}

function StatusBadge({ status }: { readonly status: TokenStatus }) {
  const classes = {
    active: 'bg-emerald-100 text-emerald-800',
    expired: 'bg-amber-100 text-amber-800',
    revoked: 'bg-red-100 text-red-800',
  };
  const labels = { active: 'Active', expired: 'Expired', revoked: 'Revoked' };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function TierBadge({ tier }: { readonly tier: string }) {
  const classes: Record<string, string> = {
    enterprise: 'bg-violet-100 text-violet-800',
    pro: 'bg-blue-100 text-blue-800',
    free: 'bg-gray-100 text-gray-700',
  };
  const cls = classes[tier] ?? 'bg-gray-100 text-gray-700';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {tier}
    </span>
  );
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
        className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        {isPending ? 'Revoking...' : 'Revoke'}
      </button>
    </form>
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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold text-gray-900">Issue new license token</h2>
      <form action={action} className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="ap-orgId" className="text-xs font-medium text-gray-700">
            Org ID
          </label>
          <input
            id="ap-orgId"
            name="orgId"
            required
            placeholder="org_abc123"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ap-domain" className="text-xs font-medium text-gray-700">
            Instance domain
          </label>
          <input
            id="ap-domain"
            name="instanceDomain"
            required
            placeholder="pims.vetclinic.com"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ap-tier" className="text-xs font-medium text-gray-700">
            Tier
          </label>
          <select
            id="ap-tier"
            name="tier"
            className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'Issuing...' : 'Issue token'}
        </button>
      </form>
      {result && !result.ok && <p className="mt-2 text-sm text-red-600">{result.error}</p>}
      {result?.ok && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-gray-700">
            Token issued. Copy it now — it will not be shown again.
          </p>
          <textarea
            readOnly
            rows={4}
            defaultValue={result.token}
            className="w-full rounded border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-800 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

export function InstancesTable({ tokens }: { readonly tokens: APLicenseToken[] }) {
  return (
    <div className="space-y-6">
      <IssueForm />

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {tokens.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-gray-500">
            No AP license tokens issued yet.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Domain</th>
                <th className="px-4 py-3">Org ID</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Issued</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tokens.map((token) => {
                const status = getStatus(token);
                return (
                  <tr key={token.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{token.instanceDomain}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{token.orgId}</td>
                    <td className="px-4 py-3">
                      <TierBadge tier={token.tier} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {token.issuedAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {token.expiresAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {status === 'active' && <RevokeButton tokenId={token.id} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
